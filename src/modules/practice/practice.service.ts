import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { categories, questionCategories, questions, userQuestionProgress } from "../../db/schema";
import { getQuestionXpReward, QUESTION_DIFFICULTIES, type QuestionDifficulty } from "../../shared/content";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { addXp } from "../auth/auth.service";
import { syncUserQuestionProgress } from "../questions/question-progress.service";
import { toPublicQuestionDetail } from "../questions/questions.mapper";

function parseDifficulties(value?: string): QuestionDifficulty[] | undefined {
  if (!value) {
    return undefined;
  }

  const difficulties = value
    .split(",")
    .map((difficulty) => difficulty.trim())
    .filter(Boolean);

  for (const difficulty of difficulties) {
    if (!QUESTION_DIFFICULTIES.includes(difficulty as QuestionDifficulty)) {
      throw new ValidationError(`Invalid difficulty: ${difficulty}`);
    }
  }

  return difficulties as QuestionDifficulty[];
}

async function resolveCategoryQuestionIds(categorySlug?: string) {
  if (!categorySlug) {
    return undefined;
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, categorySlug),
  });

  if (!category) {
    return [];
  }

  const links = await db
    .select({ questionId: questionCategories.questionId })
    .from(questionCategories)
    .where(eq(questionCategories.categoryId, category.id));

  return links.map((link) => link.questionId);
}

export async function getPracticeQuestions(opts: {
  limit?: number;
  difficulty?: QuestionDifficulty;
  difficulties?: string;
  category?: string;
  excludeAnswered?: boolean;
  includeAnswered?: boolean;
  viewerUserId?: string;
}) {
  const limit = opts.limit ?? 10;
  const difficulties = parseDifficulties(opts.difficulties);
  const conditions = [eq(questions.status, "approved")];

  if (difficulties && difficulties.length > 0) {
    conditions.push(inArray(questions.difficulty, difficulties));
  } else if (opts.difficulty) {
    conditions.push(eq(questions.difficulty, opts.difficulty));
  }

  const categoryQuestionIds = await resolveCategoryQuestionIds(opts.category);
  if (categoryQuestionIds) {
    if (categoryQuestionIds.length === 0) {
      return [];
    }

    conditions.push(inArray(questions.id, categoryQuestionIds));
  }

  if (opts.excludeAnswered && !opts.includeAnswered) {
    if (!opts.viewerUserId) {
      throw new UnauthorizedError("Authentication required to exclude answered questions");
    }

    conditions.push(
      notInArray(
        questions.id,
        db
          .select({ questionId: userQuestionProgress.questionId })
          .from(userQuestionProgress)
          .where(eq(userQuestionProgress.userId, opts.viewerUserId)),
      ),
    );
  }

  const result = await db.query.questions.findMany({
    where: and(...conditions),
    orderBy: () => [sql`RANDOM()`],
    limit,
    with: {
      author: { columns: { id: true, username: true, avatarUrl: true } },
      questionCategories: { with: { category: true } },
    },
  });

  return result.map(toPublicQuestionDetail);
}

export async function answerPracticeQuestion(data: {
  userId?: string;
  questionId: string;
  selectedOptionIndex: number;
  timeSpentSeconds?: number;
}) {
  const question = await db.query.questions.findFirst({
    where: and(eq(questions.id, data.questionId), eq(questions.status, "approved")),
  });

  if (!question) {
    throw new NotFoundError("Question");
  }

  if (data.selectedOptionIndex >= question.options.length) {
    throw new ValidationError(
      "selectedOptionIndex is outside the available options",
      ERROR_CODES.QUIZ_INVALID_OPTION_INDEX,
    );
  }

  const isCorrect = data.selectedOptionIndex === question.correctOptionIndex;
  const processedAnswer = {
    questionId: question.id,
    selectedOptionIndex: data.selectedOptionIndex,
    isCorrect,
    difficulty: question.difficulty,
    xpReward: getQuestionXpReward(question.difficulty),
  };

  if (!data.userId) {
    return {
      questionId: question.id,
      isCorrect,
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation,
      xpGained: 0,
      alreadyAnswered: false,
      timeSpentSeconds: data.timeSpentSeconds,
    };
  }

  return await db.transaction(async (tx) => {
    const progressUpdate = await syncUserQuestionProgress(tx, data.userId!, [processedAnswer]);
    const alreadyAnswered = !progressUpdate.newlyAnsweredQuestionIds.includes(question.id);
    const xpGained = isCorrect && !alreadyAnswered ? processedAnswer.xpReward : 0;

    if (xpGained > 0) {
      await addXp(data.userId!, xpGained, tx);
    }

    return {
      questionId: question.id,
      isCorrect,
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation,
      xpGained,
      alreadyAnswered,
      timeSpentSeconds: data.timeSpentSeconds,
    };
  });
}
