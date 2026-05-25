import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { users } from "../../db/schema";
import { getSessionById } from "../../modules/auth/session.repository";
import { ForbiddenError, UnauthorizedError } from "../errors";

const PLAYGROUND_SESSION_COOKIE_NAME = "stackoverquiz_playground";
const PLAYGROUND_SESSION_EXPIRY = "8h";
const PLAYGROUND_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

interface TokenVerifier {
  verify(token?: string): Promise<unknown | false>;
}

interface TokenSigner extends TokenVerifier {
  sign(payload: Record<string, unknown>): Promise<string>;
}

interface PlaygroundSessionPayload {
  sub: string;
  role: "admin";
  sid: string;
  type: "playground";
  jti?: string;
  exp?: number;
  iat?: number;
}

function parseCookieHeader(rawCookieHeader: string | null | undefined) {
  if (!rawCookieHeader) {
    return {} as Record<string, string>;
  }

  const pairs = rawCookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      try {
        return [key, decodeURIComponent(value)] as const;
      } catch {
        return [key, value] as const;
      }
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(pairs);
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge: number;
    path: string;
    httpOnly: boolean;
    sameSite: "Lax" | "Strict" | "None";
    secure: boolean;
  },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Max-Age=${options.maxAge}`, `Path=${options.path}`];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  parts.push(`SameSite=${options.sameSite}`);

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function isPlaygroundSessionPayload(payload: unknown): payload is PlaygroundSessionPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<PlaygroundSessionPayload>;

  return (
    candidate.type === "playground" &&
    candidate.role === "admin" &&
    typeof candidate.sub === "string" &&
    candidate.sub.length > 0 &&
    typeof candidate.sid === "string" &&
    candidate.sid.length > 0
  );
}

function getPlaygroundSessionToken(request: Request) {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies[PLAYGROUND_SESSION_COOKIE_NAME] ?? null;
}

function getAccessTokenFromAuthorizationHeader(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  return authorization.slice(7);
}

function getSessionCookieOptions(maxAge: number) {
  return {
    maxAge,
    path: "/playground",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: env.NODE_ENV === "production",
  };
}

async function assertAdminUser(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError("Playground session is invalid or expired");
  }

  if (user.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }

  return user;
}

/**
 * Reads and validates an access token from the authorization header and returns its active session id.
 */
export async function getActiveAccessTokenSessionId(jwt: TokenVerifier, authorization: string | undefined) {
  const accessToken = getAccessTokenFromAuthorizationHeader(authorization);
  const payload = await jwt.verify(accessToken);

  if (!payload || typeof payload !== "object") {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const candidate = payload as { sub?: string; sid?: string; role?: string; type?: string };

  if (candidate.type !== "access" || !candidate.sub || !candidate.sid) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const session = await getSessionById(candidate.sid);
  const sessionExpired = !session || session.expiresAt.getTime() <= Date.now();
  const sessionRevoked = session?.revokedAt !== null;

  if (sessionExpired || sessionRevoked || session.userId !== candidate.sub) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return {
    userId: candidate.sub,
    sessionId: candidate.sid,
    role: candidate.role,
  };
}

/**
 * Ensures the user exists and still carries the admin role.
 */
export async function assertAdminUserRole(userId: string) {
  return await assertAdminUser(userId);
}

/**
 * Creates an HttpOnly cookie value that represents an admin-only playground session.
 */
export async function createPlaygroundSessionCookie(jwt: TokenSigner, input: { userId: string; sessionId: string }) {
  const token = await jwt.sign({
    sub: input.userId,
    role: "admin",
    sid: input.sessionId,
    type: "playground",
    jti: randomUUID(),
    exp: PLAYGROUND_SESSION_EXPIRY,
  });

  return serializeCookie(
    PLAYGROUND_SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(PLAYGROUND_SESSION_MAX_AGE_SECONDS),
  );
}

/**
 * Returns a cookie string that clears the active playground session.
 */
export function clearPlaygroundSessionCookie() {
  return serializeCookie(PLAYGROUND_SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
}

/**
 * Asserts that the incoming request carries a valid admin playground session cookie.
 */
export async function assertPlaygroundAdminSession(jwt: TokenVerifier, request: Request) {
  const token = getPlaygroundSessionToken(request);

  if (!token) {
    throw new UnauthorizedError("Playground admin session required");
  }

  const payload = await jwt.verify(token);

  if (!isPlaygroundSessionPayload(payload)) {
    throw new UnauthorizedError("Playground session is invalid or expired");
  }

  const session = await getSessionById(payload.sid);
  const sessionExpired = !session || session.expiresAt.getTime() <= Date.now();
  const sessionRevoked = session?.revokedAt !== null;

  if (sessionExpired || sessionRevoked || session.userId !== payload.sub) {
    throw new UnauthorizedError("Playground session is invalid or expired");
  }

  const user = await assertAdminUser(payload.sub);

  return {
    userId: user.id,
    sessionId: payload.sid,
  };
}
