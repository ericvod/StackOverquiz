import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { questions, quizzes } from "../../db/schema";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { paginate, paginatedResponse } from "../../shared/pagination";
import {
  type ModerationStatus,
  toAdminQuestionReview,
  toAdminQuizReviewDetail,
  toAdminQuizReviewSummary,
  toModerationMutationResponse,
} from "./content-admin.mapper";

export async function listQuestionsForReview(opts: {
  page?: number;
  limit?: number;
  status?: ModerationStatus;
  search?: string;
}) {
  const { page, limit, offset } = paginate({ page: opts.page, limit: opts.limit });
  const status = opts.status ?? "pending";
  const conditions = [eq(questions.status, status)];

  if (opts.search) {
    conditions.push(ilike(questions.title, `%${opts.search}%`));
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.questions.findMany({
      where,
      orderBy: () => [desc(questions.createdAt)],
      limit,
      offset,
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true } },
        reviewer: { columns: { id: true, username: true, avatarUrl: true } },
        questionCategories: { with: { category: { columns: { id: true, name: true, slug: true, type: true } } } },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(questions).where(where),
  ]);

  return paginatedResponse(data.map(toAdminQuestionReview), Number(countResult[0]?.count ?? 0), page, limit);
}

export async function approveQuestion(id: string, reviewerId: string) {
  const [question] = await db
    .update(questions)
    .set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: null,
    })
    .where(eq(questions.id, id))
    .returning();

  if (!question) {
    throw new NotFoundError("Question");
  }

  return toModerationMutationResponse(question);
}

export async function rejectQuestion(id: string, reviewerId: string, reason: string) {
  const [question] = await db
    .update(questions)
    .set({
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(questions.id, id))
    .returning();

  if (!question) {
    throw new NotFoundError("Question");
  }

  return toModerationMutationResponse(question);
}

export async function listQuizzesForReview(opts: {
  page?: number;
  limit?: number;
  status?: ModerationStatus;
  search?: string;
}) {
  const { page, limit, offset } = paginate({ page: opts.page, limit: opts.limit });
  const status = opts.status ?? "pending";
  const conditions = [eq(quizzes.status, status)];

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
        reviewer: { columns: { id: true, username: true, avatarUrl: true } },
        quizQuestions: {
          orderBy: (quizQuestion, { asc }) => [asc(quizQuestion.order)],
          columns: { order: true },
          with: {
            question: {
              columns: {
                id: true,
                title: true,
                difficulty: true,
                status: true,
                aiGenerated: true,
                estimatedTimeSeconds: true,
              },
            },
          },
        },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(quizzes).where(where),
  ]);

  return paginatedResponse(data.map(toAdminQuizReviewSummary), Number(countResult[0]?.count ?? 0), page, limit);
}

export async function getQuizForReview(id: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, id),
    with: {
      creator: { columns: { id: true, username: true, avatarUrl: true } },
      reviewer: { columns: { id: true, username: true, avatarUrl: true } },
      quizQuestions: {
        orderBy: (quizQuestion, { asc }) => [asc(quizQuestion.order)],
        columns: { order: true },
        with: {
          question: {
            columns: {
              id: true,
              title: true,
              difficulty: true,
              status: true,
              aiGenerated: true,
              estimatedTimeSeconds: true,
            },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new NotFoundError("Quiz");
  }

  return toAdminQuizReviewDetail(quiz);
}

export async function approveQuiz(id: string, reviewerId: string, opts: { approveQuestions?: boolean } = {}) {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, id),
    with: {
      quizQuestions: {
        with: {
          question: { columns: { id: true, status: true } },
        },
      },
    },
  });

  if (!quiz) {
    throw new NotFoundError("Quiz");
  }

  const pendingQuestionIds = quiz.quizQuestions
    .filter((quizQuestion) => quizQuestion.question.status !== "approved")
    .map((quizQuestion) => quizQuestion.question.id);

  if (pendingQuestionIds.length > 0 && !opts.approveQuestions) {
    throw new ValidationError(
      "Quiz has linked questions that are not approved",
      ERROR_CODES.QUIZ_HAS_UNAPPROVED_QUESTIONS,
      { questionIds: pendingQuestionIds },
    );
  }

  return await db.transaction(async (tx) => {
    const reviewedAt = new Date();

    if (pendingQuestionIds.length > 0) {
      await tx
        .update(questions)
        .set({
          status: "approved",
          reviewedBy: reviewerId,
          reviewedAt,
          rejectionReason: null,
        })
        .where(inArray(questions.id, pendingQuestionIds));
    }

    const [approvedQuiz] = await tx
      .update(quizzes)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt,
        rejectionReason: null,
      })
      .where(eq(quizzes.id, id))
      .returning();

    return toModerationMutationResponse(approvedQuiz!);
  });
}

export async function rejectQuiz(id: string, reviewerId: string, reason: string) {
  const [quiz] = await db
    .update(quizzes)
    .set({
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(quizzes.id, id))
    .returning();

  if (!quiz) {
    throw new NotFoundError("Quiz");
  }

  return toModerationMutationResponse(quiz);
}
