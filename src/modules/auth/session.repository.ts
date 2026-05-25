import { createHash } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "../../config/database";
import { userSessions } from "../../db/schema";

type SessionExecutor = Pick<typeof db, "query" | "insert" | "update">;

export interface CreateSessionInput {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(input: CreateSessionInput, executor: SessionExecutor = db) {
  const [session] = await executor
    .insert(userSessions)
    .values({
      id: input.id,
      userId: input.userId,
      refreshTokenHash: hashRefreshToken(input.refreshToken),
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })
    .returning();

  return session!;
}

export async function getSessionById(sessionId: string, executor: SessionExecutor = db) {
  return await executor.query.userSessions.findFirst({
    where: eq(userSessions.id, sessionId),
  });
}

export async function rotateSession(
  sessionId: string,
  refreshToken: string,
  expiresAt: Date,
  executor: SessionExecutor = db,
) {
  const [session] = await executor
    .update(userSessions)
    .set({
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      revokedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(userSessions.id, sessionId))
    .returning();

  return session ?? null;
}

export async function revokeSession(sessionId: string, executor: SessionExecutor = db) {
  const [session] = await executor
    .update(userSessions)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)))
    .returning();

  return session ?? null;
}

export async function revokeAllUserSessions(
  userId: string,
  options: { exceptSessionId?: string } = {},
  executor: SessionExecutor = db,
) {
  const conditions = [eq(userSessions.userId, userId), isNull(userSessions.revokedAt)];
  if (options.exceptSessionId) {
    conditions.push(ne(userSessions.id, options.exceptSessionId));
  }

  const now = new Date();
  await executor
    .update(userSessions)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(...conditions));
}
