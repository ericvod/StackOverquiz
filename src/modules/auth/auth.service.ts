import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { users } from "../../db/schema";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors";
import { ERROR_CODES, type ErrorCode } from "../../shared/http/error-codes";
import type { JwtPayload } from "../../shared/types";
import { calculateLevel } from "../../shared/types";
import type { RefreshTokenPayload, SessionClientInfo, TokenSigner } from "./auth.types";
import {
  createSession,
  getSessionById,
  hashRefreshToken,
  revokeAllUserSessions,
  revokeSession,
  rotateSession,
} from "./session.repository";

const SALT_ROUNDS = 12;
type UserMutationExecutor = Pick<typeof db, "query" | "update">;
const ACCESS_TOKEN_TYPE = "access";
const REFRESH_TOKEN_TYPE = "refresh";

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Creates a local account after enforcing unique email and username constraints.
 *
 * @remarks Side effects: writes a new row to `users` with a bcrypt password hash.
 * @throws {ConflictError} When the email or username is already in use.
 */
export async function register(data: { username: string; email: string; password: string }) {
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, data.email), eq(users.username, data.username)),
  });

  if (existing) {
    throw new ConflictError(existing.email === data.email ? "Email already registered" : "Username already taken");
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      username: data.username,
      email: data.email,
      passwordHash,
    })
    .returning();

  return user!;
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticates a local account using email and password.
 *
 * @throws {UnauthorizedError} When the credentials are invalid or the account is OAuth-only.
 */
export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password", ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password", ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  return user;
}

// ─── OAuth: Find or Create ────────────────────────────────────────────────────

/**
 * Resolves an OAuth identity into an application user.
 *
 * @remarks Side effects: may update an existing user to link the provider or create a new account.
 */
export async function findOrCreateOAuthUser(data: {
  email: string;
  username: string;
  avatarUrl?: string;
  provider: "google" | "github";
  oauthId: string;
}) {
  // Check if already linked
  const existing = await db.query.users.findFirst({
    where: and(eq(users.oauthProvider, data.provider), eq(users.oauthId, data.oauthId)),
  });

  if (existing) return existing;

  // Check if email exists (link accounts)
  const emailUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (emailUser) {
    const isLinkedToAnotherOAuthIdentity =
      emailUser.oauthProvider !== null &&
      emailUser.oauthId !== null &&
      (emailUser.oauthProvider !== data.provider || emailUser.oauthId !== data.oauthId);

    if (isLinkedToAnotherOAuthIdentity) {
      throw new ConflictError("Email already linked to another OAuth provider");
    }

    const [updated] = await db
      .update(users)
      .set({ oauthProvider: data.provider, oauthId: data.oauthId, avatarUrl: data.avatarUrl ?? emailUser.avatarUrl })
      .where(eq(users.id, emailUser.id))
      .returning();
    return updated!;
  }

  // Ensure unique username
  let username = data.username.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 45);
  const usernameExists = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (usernameExists) {
    username = `${username}_${Date.now().toString(36)}`;
  }

  const [user] = await db
    .insert(users)
    .values({
      username,
      email: data.email,
      avatarUrl: data.avatarUrl,
      oauthProvider: data.provider,
      oauthId: data.oauthId,
    })
    .returning();

  return user!;
}

function parseDurationToMs(duration: string): number {
  const normalized = duration.trim();
  const match = normalized.match(/^(\d+)([smhd])$/i);

  if (!match) {
    throw new BadRequestError(`Invalid duration format: ${duration}`, ERROR_CODES.CONFIG_INVALID_DURATION);
  }

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new BadRequestError(`Unsupported duration unit: ${duration}`, ERROR_CODES.CONFIG_INVALID_DURATION);
  }
}

function getRefreshTokenExpiryDate() {
  return new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRY));
}

/**
 * Returns token expiration values in seconds for API clients.
 */
export function getTokenLifetimeSeconds() {
  return {
    accessTokenExpiresInSeconds: Math.floor(parseDurationToMs(env.JWT_ACCESS_EXPIRY) / 1000),
    refreshTokenExpiresInSeconds: Math.floor(parseDurationToMs(env.JWT_REFRESH_EXPIRY) / 1000),
  };
}

function buildClientIp(rawHeader: string | undefined) {
  return rawHeader?.split(",")[0]?.trim() || undefined;
}

/**
 * Extracts request metadata persisted alongside a session for audit and traceability.
 */
export function getSessionClientInfo(headers: Record<string, string | undefined>): SessionClientInfo {
  return {
    userAgent: headers["user-agent"],
    ipAddress: buildClientIp(headers["x-forwarded-for"]),
  };
}

async function signAccessToken(jwt: TokenSigner, userId: string, role: "user" | "admin", sessionId: string) {
  return await jwt.sign({
    sub: userId,
    role,
    sid: sessionId,
    type: ACCESS_TOKEN_TYPE,
    jti: randomUUID(),
    exp: env.JWT_ACCESS_EXPIRY,
  });
}

async function signRefreshToken(jwt: TokenSigner, userId: string, role: "user" | "admin", sessionId: string) {
  return await jwt.sign({
    sub: userId,
    role,
    sid: sessionId,
    type: REFRESH_TOKEN_TYPE,
    jti: randomUUID(),
    exp: env.JWT_REFRESH_EXPIRY,
  });
}

function ensurePayloadShape(payload: unknown, code: ErrorCode, message: string): JwtPayload {
  if (!payload || typeof payload !== "object") {
    throw new UnauthorizedError(message, code);
  }

  const parsedPayload = payload as Partial<JwtPayload>;
  if (!parsedPayload.sub || !parsedPayload.role || !parsedPayload.sid || !parsedPayload.type) {
    throw new UnauthorizedError(message, code);
  }

  return parsedPayload as JwtPayload;
}

/**
 * Verifies a refresh token and guarantees that its payload belongs to the refresh-token family.
 *
 * @throws {UnauthorizedError} When the JWT is invalid or carries the wrong token type.
 */
export async function verifyRefreshTokenPayload(jwt: TokenSigner, refreshToken: string): Promise<RefreshTokenPayload> {
  const payload = ensurePayloadShape(
    await jwt.verify(refreshToken),
    ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN,
    "Invalid refresh token",
  );

  if (payload.type !== REFRESH_TOKEN_TYPE) {
    throw new UnauthorizedError("Invalid refresh token", ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
  }

  return payload as RefreshTokenPayload;
}

/**
 * Creates a persisted auth session and returns the initial access/refresh token pair.
 *
 * @remarks Side effects: writes a row to `user_sessions` with the hashed refresh token.
 */
export async function createAuthSession(
  jwt: TokenSigner,
  user: { id: string; role: "user" | "admin" },
  clientInfo: SessionClientInfo = {},
) {
  const sessionId = randomUUID();
  const accessToken = await signAccessToken(jwt, user.id, user.role, sessionId);
  const refreshToken = await signRefreshToken(jwt, user.id, user.role, sessionId);

  await createSession({
    id: sessionId,
    userId: user.id,
    refreshToken,
    expiresAt: getRefreshTokenExpiryDate(),
    userAgent: clientInfo.userAgent,
    ipAddress: clientInfo.ipAddress,
  });

  return {
    accessToken,
    refreshToken,
    sessionId,
  };
}

/**
 * Rotates a valid auth session by replacing the persisted refresh token hash and issuing fresh tokens.
 *
 * @remarks Side effects: updates `user_sessions.updatedAt`, `refreshTokenHash` and `expiresAt`.
 * @throws {UnauthorizedError} When the session is missing, revoked, expired or does not match the provided token.
 */
export async function rotateAuthSession(jwt: TokenSigner, payload: RefreshTokenPayload, refreshToken: string) {
  const session = await getSessionById(payload.sid);
  if (!session || session.userId !== payload.sub) {
    throw new UnauthorizedError("Invalid refresh token", ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
  }

  const isExpired = session.expiresAt.getTime() <= Date.now();
  const isRevoked = session.revokedAt !== null;
  const matchesStoredToken = session.refreshTokenHash === hashRefreshToken(refreshToken);

  if (isExpired || isRevoked || !matchesStoredToken) {
    throw new UnauthorizedError("Invalid refresh token", ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
  }

  const user = await getUserById(payload.sub);
  const accessToken = await signAccessToken(jwt, user.id, user.role, session.id);
  const newRefreshToken = await signRefreshToken(jwt, user.id, user.role, session.id);

  await rotateSession(session.id, newRefreshToken, getRefreshTokenExpiryDate());

  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Revokes the persisted session associated with the provided refresh token.
 *
 * @remarks Side effects: sets `user_sessions.revokedAt`.
 * @throws {UnauthorizedError} When the token does not match the stored session state.
 */
export async function revokeAuthSession(payload: RefreshTokenPayload, refreshToken: string) {
  const session = await getSessionById(payload.sid);
  if (!session || session.userId !== payload.sub) {
    throw new UnauthorizedError("Invalid refresh token", ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
  }

  if (session.refreshTokenHash !== hashRefreshToken(refreshToken)) {
    throw new UnauthorizedError("Invalid refresh token", ERROR_CODES.AUTH_INVALID_REFRESH_TOKEN);
  }

  await revokeSession(session.id);
}

// ─── Change Password ─────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's password after validating the current one.
 *
 * @remarks Side effects: updates `users.passwordHash` and revokes every other active session
 * for the same user — only the caller's current session keeps working.
 * @throws {BadRequestError} When the account has no local password (OAuth-only).
 * @throws {UnauthorizedError} When the current password does not match.
 */
export async function changePassword(data: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  currentSessionId: string;
}) {
  const user = await getUserById(data.userId);

  if (!user.passwordHash) {
    throw new BadRequestError("Account uses OAuth and has no password to change", ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Current password is incorrect", ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const newHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, data.userId));
  await revokeAllUserSessions(data.userId, { exceptSessionId: data.currentSessionId });
}

// ─── Admin Reset Password ────────────────────────────────────────────────────

function generateTemporaryPassword() {
  // 12 chars: letters + digits, no ambiguous characters (0/O/1/l/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Replaces a user's password without requiring the previous one. Admin-only flow.
 *
 * @remarks Side effects: updates `users.passwordHash` and revokes every active session
 * for the target user, forcing a re-login with the new credentials.
 * @returns The password that was set — generated when the caller did not provide one.
 */
export async function adminResetPassword(data: { targetUserId: string; newPassword?: string }) {
  const user = await getUserById(data.targetUserId);

  const password = data.newPassword ?? generateTemporaryPassword();
  const newHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, user.id));
  await revokeAllUserSessions(user.id);

  return { password, generated: !data.newPassword };
}

// ─── Get User by ID ──────────────────────────────────────────────────────────

/**
 * Loads a user by id for authenticated flows.
 *
 * @throws {NotFoundError} When the user does not exist.
 */
export async function getUserById(id: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) throw new NotFoundError("User");
  return user;
}

// ─── Add XP ──────────────────────────────────────────────────────────────────

/**
 * Applies XP to a user and recalculates the derived level.
 *
 * @remarks Side effects: updates `users.xp`, `users.level` and `users.updatedAt`.
 * The optional executor allows this mutation to run inside an existing transaction.
 */
export async function addXp(userId: string, amount: number, executor: UserMutationExecutor = db) {
  const user = await executor.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new NotFoundError("User");

  const newXp = user.xp + amount;
  const newLevel = calculateLevel(newXp);

  await executor.update(users).set({ xp: newXp, level: newLevel, updatedAt: new Date() }).where(eq(users.id, userId));

  return { xp: newXp, level: newLevel };
}
