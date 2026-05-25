import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { questions, quizAttempts, users } from "../../db/schema";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors";
import { paginate, paginatedResponse } from "../../shared/pagination";
import { toPublicUserProfile, toUserHistoryItem } from "./users.mapper";

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * Builds the public profile payload consumed by API clients.
 *
 * @remarks Side effects: none. Aggregates stats from authored questions and quiz attempts.
 */
export async function getUserProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      avatarUrl: true,
      role: true,
      xp: true,
      level: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundError("User");

  // Get stats
  const [questionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.authorId, userId));

  const [attemptStats] = await db
    .select({
      totalAttempts: sql<number>`count(*)`,
      totalCorrect: sql<number>`COALESCE(SUM(score), 0)`,
      totalQuestions: sql<number>`COALESCE(SUM(total_questions), 0)`,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId));

  const stats = {
    questionsCreated: Number(questionCount?.count ?? 0),
    quizzesAttempted: Number(attemptStats?.totalAttempts ?? 0),
    totalCorrectAnswers: Number(attemptStats?.totalCorrect ?? 0),
    totalQuestionsAnswered: Number(attemptStats?.totalQuestions ?? 0),
    accuracy:
      Number(attemptStats?.totalQuestions ?? 0) > 0
        ? Math.round((Number(attemptStats?.totalCorrect ?? 0) / Number(attemptStats?.totalQuestions ?? 1)) * 100)
        : 0,
  };

  return toPublicUserProfile(user, stats);
}

// ─── Update Profile ───────────────────────────────────────────────────────────

/**
 * Updates mutable profile fields for the requesting user.
 *
 * @throws {ValidationError} When the chosen username is already taken.
 */
export async function updateProfile(userId: string, data: { username?: string; avatarUrl?: string | null }) {
  if (data.username) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, data.username),
      columns: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new ValidationError("Username is already taken");
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(data.username !== undefined && { username: data.username }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id, username: users.username, avatarUrl: users.avatarUrl });

  return updated!;
}

// ─── User History ─────────────────────────────────────────────────────────────

/**
 * Lists private quiz attempt history for the profile owner or an admin.
 *
 * @throws {ForbiddenError} When a regular user tries to read another user's history.
 */
export async function getUserHistory(
  requestedUserId: string,
  actorUserId: string,
  actorUserRole: string,
  opts: { page?: number; limit?: number },
) {
  if (requestedUserId !== actorUserId && actorUserRole !== "admin") {
    throw new ForbiddenError("You can only view your own history");
  }

  const { page, limit, offset } = paginate(opts);

  const [attempts, countResult] = await Promise.all([
    db.query.quizAttempts.findMany({
      where: eq(quizAttempts.userId, requestedUserId),
      orderBy: () => [desc(quizAttempts.completedAt)],
      limit,
      offset,
      with: {
        quiz: { columns: { id: true, title: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(quizAttempts).where(eq(quizAttempts.userId, requestedUserId)),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  return paginatedResponse(attempts.map(toUserHistoryItem), total, page, limit);
}

// ─── Global Leaderboard ──────────────────────────────────────────────────────

/**
 * Returns the global XP leaderboard.
 */
export async function getLeaderboard(limit = 50) {
  const topUsers = await db.query.users.findMany({
    orderBy: (u, { desc }) => [desc(u.xp)],
    limit,
    columns: {
      id: true,
      username: true,
      avatarUrl: true,
      xp: true,
      level: true,
    },
  });

  return topUsers.map((u, i) => ({
    rank: i + 1,
    ...u,
  }));
}
