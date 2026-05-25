import { and, eq, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { questionRatings, questionReports, questions } from "../../db/schema";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { XP_REWARDS } from "../../shared/types";
import { addXp } from "../auth/auth.service";
import { buildQuestionRatingStats, getAutoModerationStatus, shouldAwardHighRatingBonus } from "./ratings.rules";

// ─── Rate Question ────────────────────────────────────────────────────────────

/**
 * Creates or updates a user's rating for a question and refreshes moderation aggregates.
 *
 * @remarks Side effects: writes to `question_ratings`, updates aggregate fields in `questions`
 * and may grant the author a one-time high-rating XP bonus.
 */
export async function rateQuestion(data: { questionId: string; userId: string; score: number; feedback?: string }) {
  return await db.transaction(async (tx) => {
    const question = await tx.query.questions.findFirst({
      where: eq(questions.id, data.questionId),
      columns: {
        id: true,
        authorId: true,
        status: true,
        highRatingBonusAwarded: true,
      },
    });

    if (!question) {
      throw new NotFoundError("Question");
    }

    const existing = await tx.query.questionRatings.findFirst({
      where: and(eq(questionRatings.questionId, data.questionId), eq(questionRatings.userId, data.userId)),
    });

    const [rating] = existing
      ? await tx
          .update(questionRatings)
          .set({ score: data.score, feedback: data.feedback })
          .where(eq(questionRatings.id, existing.id))
          .returning()
      : await tx
          .insert(questionRatings)
          .values({
            questionId: data.questionId,
            userId: data.userId,
            score: data.score,
            feedback: data.feedback,
          })
          .returning();

    const [aggregate] = await tx
      .select({
        avg: sql<number>`COALESCE(AVG(${questionRatings.score}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(questionRatings)
      .where(eq(questionRatings.questionId, data.questionId));

    const stats = buildQuestionRatingStats(aggregate?.avg, aggregate?.count);
    const autoModerationStatus = getAutoModerationStatus(question.status, stats);
    const shouldAwardBonus = shouldAwardHighRatingBonus(stats, question.highRatingBonusAwarded);

    await tx
      .update(questions)
      .set({
        avgRating: stats.avgRating,
        ratingCount: stats.ratingCount,
        ...(autoModerationStatus ? { status: autoModerationStatus } : {}),
        ...(shouldAwardBonus ? { highRatingBonusAwarded: true } : {}),
      })
      .where(eq(questions.id, data.questionId));

    if (shouldAwardBonus) {
      await addXp(question.authorId, XP_REWARDS.HIGH_RATING_BONUS, tx);
    }

    return {
      rating: rating!,
      stats: {
        ...stats,
        bonusAwarded: shouldAwardBonus,
      },
    };
  });
}

// ─── Report Question ─────────────────────────────────────────────────────────

/**
 * Registers a moderation report for a question.
 *
 * @remarks Side effects: writes to `question_reports` and may auto-reject a pending question after repeated reports.
 */
export async function reportQuestion(data: {
  questionId: string;
  reporterId: string;
  reason: "incorrect" | "duplicate" | "offensive" | "unclear";
  description?: string;
}) {
  return await db.transaction(async (tx) => {
    const question = await tx.query.questions.findFirst({
      where: eq(questions.id, data.questionId),
      columns: {
        id: true,
        status: true,
      },
    });

    if (!question) {
      throw new NotFoundError("Question");
    }

    const [report] = await tx
      .insert(questionReports)
      .values({
        questionId: data.questionId,
        reporterId: data.reporterId,
        reason: data.reason,
        description: data.description,
      })
      .onConflictDoNothing({
        target: [questionReports.questionId, questionReports.reporterId],
      })
      .returning();

    if (!report) {
      throw new ConflictError("You have already reported this question", ERROR_CODES.QUESTION_DUPLICATE_REPORT);
    }

    const [aggregate] = await tx
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(questionReports)
      .where(eq(questionReports.questionId, data.questionId));

    if (question.status === "pending" && Number(aggregate?.count ?? 0) >= 3) {
      await tx.update(questions).set({ status: "rejected" }).where(eq(questions.id, data.questionId));
    }

    return report!;
  });
}
