import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../config/database";
import { userQuestionProgress } from "../../db/schema";

type QuestionProgressMutationExecutor = Pick<typeof db, "query" | "insert" | "update">;

type QuestionAnswerProgressInput = {
  questionId: string;
  isCorrect: boolean;
  xpReward: number;
};

type UserQuestionProgressRow = typeof userQuestionProgress.$inferSelect;

export type UserQuestionProgressUpdate = {
  newlyAnsweredQuestionIds: string[];
  newlyCorrectQuestionIds: string[];
};

/**
 * Returns the set of question ids that the user has already answered at least once.
 */
export async function getAnsweredQuestionIds(userId: string, questionIds: string[]) {
  if (questionIds.length === 0) {
    return new Set<string>();
  }

  const rows = await db.query.userQuestionProgress.findMany({
    where: and(eq(userQuestionProgress.userId, userId), inArray(userQuestionProgress.questionId, questionIds)),
    columns: {
      questionId: true,
    },
  });

  return new Set(rows.map((row) => row.questionId));
}

function toProgressUpdateData(progress: UserQuestionProgressRow, answer: QuestionAnswerProgressInput) {
  return {
    lastAnsweredAt: new Date(),
    lastAnswerCorrect: answer.isCorrect,
    attemptCount: progress.attemptCount + 1,
    correctAttemptCount: progress.correctAttemptCount + (answer.isCorrect ? 1 : 0),
  };
}

/**
 * Persists per-question attempt progress so XP and feed filtering can reason about first-time answers.
 *
 * @remarks
 * - A question becomes "answered" on the first attempt, regardless of correctness.
 * - XP for the question is awarded only on that first answer and only if it was correct.
 */
export async function syncUserQuestionProgress(
  executor: QuestionProgressMutationExecutor,
  userId: string,
  answers: QuestionAnswerProgressInput[],
): Promise<UserQuestionProgressUpdate> {
  if (answers.length === 0) {
    return {
      newlyAnsweredQuestionIds: [],
      newlyCorrectQuestionIds: [],
    };
  }

  const questionIds = answers.map((answer) => answer.questionId);
  const existingProgress = await executor.query.userQuestionProgress.findMany({
    where: and(eq(userQuestionProgress.userId, userId), inArray(userQuestionProgress.questionId, questionIds)),
  });

  const existingByQuestionId = new Map(existingProgress.map((progress) => [progress.questionId, progress]));
  const newlyAnsweredQuestionIds: string[] = [];
  const newlyCorrectQuestionIds: string[] = [];
  const newRows: Array<typeof userQuestionProgress.$inferInsert> = [];
  const updateStatements = [];

  for (const answer of answers) {
    const progress = existingByQuestionId.get(answer.questionId);

    if (!progress) {
      newlyAnsweredQuestionIds.push(answer.questionId);
      if (answer.isCorrect) {
        newlyCorrectQuestionIds.push(answer.questionId);
      }

      const now = new Date();
      newRows.push({
        userId,
        questionId: answer.questionId,
        firstAnsweredAt: now,
        lastAnsweredAt: now,
        attemptCount: 1,
        firstAnswerCorrect: answer.isCorrect,
        lastAnswerCorrect: answer.isCorrect,
        correctAttemptCount: answer.isCorrect ? 1 : 0,
        xpAwarded: answer.isCorrect ? answer.xpReward : 0,
      });
      continue;
    }

    updateStatements.push(
      executor
        .update(userQuestionProgress)
        .set(toProgressUpdateData(progress, answer))
        .where(eq(userQuestionProgress.id, progress.id)),
    );
  }

  if (newRows.length > 0) {
    await executor.insert(userQuestionProgress).values(newRows);
  }

  if (updateStatements.length > 0) {
    await Promise.all(updateStatements);
  }

  return {
    newlyAnsweredQuestionIds,
    newlyCorrectQuestionIds,
  };
}
