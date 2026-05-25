import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { questions, quizAttempts, quizQuestions, quizzes, users } from "../../db/schema";
import { deriveQuizTimeLimitSeconds } from "../../shared/content";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { paginate, paginatedResponse } from "../../shared/pagination";
import { addXp } from "../auth/auth.service";
import { syncUserQuestionProgress } from "../questions/question-progress.service";
import {
  toPublicQuizDetail,
  toPublicQuizSummary,
  toQuizMutationResponse,
  type ViewerQuizDetailSummary,
  type ViewerQuizSummary,
} from "./quizzes.mapper";
import { calculateQuizAttemptXp, ensureUniqueQuizQuestionIds, evaluateQuizAttempt } from "./quizzes.rules";

type QuizStatus = "pending" | "approved" | "rejected";

async function getViewerQuizSummaryMap(viewerUserId: string | undefined, quizIds: string[]) {
  const summaries = new Map<string, ViewerQuizSummary>();

  if (!viewerUserId || quizIds.length === 0) {
    return summaries;
  }

  const rows = await db
    .select({
      quizId: quizAttempts.quizId,
      attemptCount: sql<number>`count(*)`,
      bestScore: sql<number | null>`max(${quizAttempts.score})`,
      lastAttemptAt: sql<Date | string | null>`max(${quizAttempts.completedAt})`,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, viewerUserId), inArray(quizAttempts.quizId, quizIds)))
    .groupBy(quizAttempts.quizId);

  for (const row of rows) {
    summaries.set(row.quizId, {
      attempted: Number(row.attemptCount) > 0,
      bestScore: row.bestScore === null ? null : Number(row.bestScore),
      lastAttemptAt: row.lastAttemptAt ?? null,
    });
  }

  return summaries;
}

async function getViewerQuizDetailSummary(
  viewerUserId: string | undefined,
  quizId: string,
): Promise<ViewerQuizDetailSummary | undefined> {
  if (!viewerUserId) {
    return undefined;
  }

  const [aggregate] = await db
    .select({
      attemptCount: sql<number>`count(*)`,
      bestScore: sql<number | null>`max(${quizAttempts.score})`,
      lastAttemptAt: sql<Date | string | null>`max(${quizAttempts.completedAt})`,
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, viewerUserId), eq(quizAttempts.quizId, quizId)));

  const attemptCount = Number(aggregate?.attemptCount ?? 0);
  if (attemptCount === 0) {
    return {
      attempted: false,
      attemptCount: 0,
      bestScore: null,
      lastScore: null,
      lastAttemptAt: null,
    };
  }

  const lastAttempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.userId, viewerUserId), eq(quizAttempts.quizId, quizId)),
    orderBy: (attempt, { desc }) => [desc(attempt.completedAt)],
    columns: { score: true },
  });

  return {
    attempted: true,
    attemptCount,
    bestScore: aggregate?.bestScore == null ? null : Number(aggregate.bestScore),
    lastScore: lastAttempt?.score ?? null,
    lastAttemptAt: aggregate?.lastAttemptAt ?? null,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Creates a quiz and persists its ordered question links in a single transaction.
 *
 * @remarks Side effects: writes to `quizzes` and `quiz_questions`.
 * @throws {ValidationError} When the payload contains duplicate `questionIds`.
 */
export async function createQuiz(data: {
  creatorId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  timeLimitSeconds?: number;
  questionIds: string[];
  status?: QuizStatus;
  aiGenerated?: boolean;
}) {
  ensureUniqueQuizQuestionIds(data.questionIds);

  const selectedQuestions = await db.query.questions.findMany({
    where: inArray(questions.id, data.questionIds),
    columns: {
      id: true,
      estimatedTimeSeconds: true,
    },
  });

  if (selectedQuestions.length !== data.questionIds.length) {
    throw new ValidationError(
      "Quiz questionIds must reference existing questions",
      ERROR_CODES.QUIZ_UNKNOWN_QUESTION_IDS,
    );
  }

  const derivedTimeLimitSeconds = deriveQuizTimeLimitSeconds(
    selectedQuestions.map((question) => question.estimatedTimeSeconds),
  );

  return await db.transaction(async (tx) => {
    const [quiz] = await tx
      .insert(quizzes)
      .values({
        creatorId: data.creatorId,
        title: data.title,
        description: data.description,
        isPublic: data.isPublic ?? true,
        status: data.status ?? "pending",
        aiGenerated: data.aiGenerated ?? false,
        timeLimitSeconds: data.timeLimitSeconds ?? derivedTimeLimitSeconds,
      })
      .returning();

    await tx.insert(quizQuestions).values(
      data.questionIds.map((qId, i) => ({
        quizId: quiz!.id,
        questionId: qId,
        order: i + 1,
      })),
    );

    return toQuizMutationResponse(quiz!);
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveAuthorFilter(author: string | undefined, viewerUserId: string | undefined): string | undefined {
  if (!author) {
    return undefined;
  }

  if (author === "me") {
    if (!viewerUserId) {
      throw new UnauthorizedError("Authentication required to filter by author=me");
    }
    return viewerUserId;
  }

  if (!UUID_REGEX.test(author)) {
    throw new ValidationError("author must be a UUID or the literal 'me'");
  }

  return author;
}

/**
 * Lists public quizzes with search and pagination metadata for client feeds.
 *
 * @remarks When `author` resolves to the viewer themselves, private/pending/rejected quizzes
 * created by them are also included.
 */
export async function listQuizzes(opts: {
  page?: number;
  limit?: number;
  search?: string;
  author?: string;
  viewerUserId?: string;
}) {
  const { page, limit, offset } = paginate({ page: opts.page, limit: opts.limit });

  const creatorId = resolveAuthorFilter(opts.author, opts.viewerUserId);
  const isSelfAuthored = creatorId !== undefined && creatorId === opts.viewerUserId;

  const conditions = [];
  if (!isSelfAuthored) {
    conditions.push(eq(quizzes.isPublic, true), eq(quizzes.status, "approved" as const));
  }
  if (creatorId) {
    conditions.push(eq(quizzes.creatorId, creatorId));
  }
  if (opts.search) {
    conditions.push(ilike(quizzes.title, `%${opts.search}%`));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.quizzes.findMany({
      where,
      orderBy: () => [desc(quizzes.createdAt)],
      limit,
      offset,
      with: {
        creator: { columns: { id: true, username: true, avatarUrl: true } },
        quizQuestions: {
          columns: {},
          with: {
            question: {
              columns: { status: true, difficulty: true, estimatedTimeSeconds: true },
            },
          },
        },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(quizzes).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const viewerSummaries = await getViewerQuizSummaryMap(
    opts.viewerUserId,
    data.map((quiz) => quiz.id),
  );
  const defaultViewerSummary = opts.viewerUserId
    ? {
        attempted: false,
        bestScore: null,
        lastAttemptAt: null,
      }
    : undefined;
  const formatted = data.map((quiz) => toPublicQuizSummary(quiz, viewerSummaries.get(quiz.id) ?? defaultViewerSummary));

  return paginatedResponse(formatted, total, page, limit);
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Loads a public quiz detail including ordered public question payloads.
 *
 * @throws {NotFoundError} When the quiz does not exist, is not public or is not approved.
 */
export async function getQuizById(id: string, viewerUserId?: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, id), eq(quizzes.isPublic, true), eq(quizzes.status, "approved")),
    with: {
      creator: { columns: { id: true, username: true, avatarUrl: true } },
      quizQuestions: {
        orderBy: (qq, { asc }) => [asc(qq.order)],
        with: {
          question: {
            with: {
              author: { columns: { id: true, username: true, avatarUrl: true } },
              questionCategories: { with: { category: true } },
            },
          },
        },
      },
    },
  });

  if (!quiz) throw new NotFoundError("Quiz");
  const viewerSummary = await getViewerQuizDetailSummary(viewerUserId, quiz.id);
  return toPublicQuizDetail(quiz, viewerSummary);
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates a quiz owned by the requesting user.
 *
 * @remarks Side effects: updates mutable quiz metadata in `quizzes`.
 * @throws {ForbiddenError} When the actor is not the quiz owner.
 */
export async function updateQuiz(
  id: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    isPublic?: boolean;
    timeLimitSeconds?: number;
  },
) {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, id) });
  if (!quiz) throw new NotFoundError("Quiz");
  if (quiz.creatorId !== userId) throw new ForbiddenError("You can only edit your own quizzes");

  const [updated] = await db.update(quizzes).set(data).where(eq(quizzes.id, id)).returning();
  return toQuizMutationResponse(updated!);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a quiz owned by the actor or, for admins, any quiz.
 *
 * @remarks Side effects: deletes the quiz and cascades related rows through foreign keys.
 */
export async function deleteQuiz(id: string, userId: string, userRole: string) {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, id) });
  if (!quiz) throw new NotFoundError("Quiz");
  if (quiz.creatorId !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only delete your own quizzes");
  }

  await db.delete(quizzes).where(eq(quizzes.id, id));
}

// ─── Submit Attempt ──────────────────────────────────────────────────────────

/**
 * Validates and persists a quiz attempt against the server-side question set.
 *
 * @remarks Side effects: writes to `quiz_attempts` and may grant XP inside the same transaction.
 * Public users can only answer approved questions; quiz owners and admins can see the full set.
 */
export async function submitAttempt(data: {
  quizId: string;
  userId?: string;
  userRole?: string;
  answers: Array<{ questionId: string; selectedOptionIndex: number }>;
  timeSpentSeconds?: number;
}) {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, data.quizId),
    with: {
      quizQuestions: {
        orderBy: (qq, { asc }) => [asc(qq.order)],
        with: {
          question: true,
        },
      },
    },
  });

  if (!quiz) throw new NotFoundError("Quiz");

  const isPrivilegedActor = !!data.userId && (quiz.creatorId === data.userId || data.userRole === "admin");
  const canAccessQuiz = (quiz.isPublic && quiz.status === "approved") || isPrivilegedActor;
  if (!canAccessQuiz) {
    throw new ForbiddenError("You do not have access to this quiz");
  }

  const visibleQuizQuestions = isPrivilegedActor
    ? quiz.quizQuestions
    : quiz.quizQuestions.filter((quizQuestion) => quizQuestion.question.status === "approved");

  if (visibleQuizQuestions.length === 0) {
    throw new ValidationError("Quiz has no available questions");
  }

  const attemptResult = evaluateQuizAttempt(
    visibleQuizQuestions.map((quizQuestion) => ({
      questionId: quizQuestion.questionId,
      correctOptionIndex: quizQuestion.question.correctOptionIndex,
      optionCount: quizQuestion.question.options.length,
      difficulty: quizQuestion.question.difficulty,
    })),
    data.answers,
  );

  if (!data.userId) {
    return {
      id: null,
      quizId: data.quizId,
      score: attemptResult.score,
      totalQuestions: attemptResult.totalQuestions,
      timeSpentSeconds: data.timeSpentSeconds ?? 0,
      xpGained: 0,
      isNewBest: false,
      isPerfect: attemptResult.isPerfect,
      saved: false,
    };
  }

  const userId = data.userId;

  const [previousBest] = await db
    .select({ bestScore: sql<number | null>`max(${quizAttempts.score})` })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, data.quizId)));
  const previousBestScore = previousBest?.bestScore == null ? null : Number(previousBest.bestScore);

  return await db.transaction(async (tx) => {
    const [attempt] = await tx
      .insert(quizAttempts)
      .values({
        quizId: data.quizId,
        userId,
        score: attemptResult.score,
        totalQuestions: attemptResult.totalQuestions,
        timeSpentSeconds: data.timeSpentSeconds,
        answers: attemptResult.processedAnswers,
      })
      .returning();

    const questionProgressUpdate = await syncUserQuestionProgress(tx, userId, attemptResult.processedAnswers);
    const xpSummary = calculateQuizAttemptXp({
      processedAnswers: attemptResult.processedAnswers,
      totalQuestions: attemptResult.totalQuestions,
      isPerfect: attemptResult.isPerfect,
      newlyAnsweredQuestionIds: questionProgressUpdate.newlyAnsweredQuestionIds,
    });

    if (xpSummary.xpGained > 0) {
      await addXp(userId, xpSummary.xpGained, tx);
    }

    return {
      id: attempt!.id,
      quizId: attempt!.quizId,
      score: attempt!.score,
      totalQuestions: attempt!.totalQuestions,
      timeSpentSeconds: attempt!.timeSpentSeconds ?? 0,
      xpGained: xpSummary.xpGained,
      isNewBest: previousBestScore === null || attemptResult.score > previousBestScore,
      isPerfect: attemptResult.isPerfect,
      saved: true,
    };
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Returns the public leaderboard for a public quiz.
 *
 * @remarks Each user appears at most once, showing their best attempt (highest score,
 * then fastest time as tiebreaker). Uses DISTINCT ON so a user who attempts the quiz
 * multiple times never inflates the ranking.
 */
export async function getQuizLeaderboard(quizId: string, limit = 20) {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.isPublic, true), eq(quizzes.status, "approved")),
    columns: { id: true },
  });

  if (!quiz) throw new NotFoundError("Quiz");

  // Inner subquery: pick the best attempt per user via DISTINCT ON.
  // DISTINCT ON requires ORDER BY to start with the distinct column, so the outer
  // query re-sorts by score/time to produce the final ranking.
  const bestPerUser = db
    .selectDistinctOn([quizAttempts.userId], {
      userId: quizAttempts.userId,
      score: quizAttempts.score,
      totalQuestions: quizAttempts.totalQuestions,
      timeSpentSeconds: quizAttempts.timeSpentSeconds,
      completedAt: quizAttempts.completedAt,
    })
    .from(quizAttempts)
    .where(eq(quizAttempts.quizId, quizId))
    .orderBy(quizAttempts.userId, desc(quizAttempts.score), asc(quizAttempts.timeSpentSeconds))
    .as("best_per_user");

  const results = await db
    .select({
      score: bestPerUser.score,
      totalQuestions: bestPerUser.totalQuestions,
      timeSpentSeconds: bestPerUser.timeSpentSeconds,
      completedAt: bestPerUser.completedAt,
      userId: bestPerUser.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(bestPerUser)
    .innerJoin(users, eq(users.id, bestPerUser.userId))
    .orderBy(desc(bestPerUser.score), asc(bestPerUser.timeSpentSeconds))
    .limit(limit);

  return results.map((r, i) => ({
    rank: i + 1,
    user: { id: r.userId, username: r.username, avatarUrl: r.avatarUrl },
    score: r.score,
    totalQuestions: r.totalQuestions,
    timeSpentSeconds: r.timeSpentSeconds ?? 0,
    completedAt: r.completedAt.toISOString(),
  }));
}
