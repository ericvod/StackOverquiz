import { and, desc, eq, ilike, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../config/database";
import type { QuestionOption } from "../../db/schema";
import { categories, questionCategories, questionRatings, questions, userQuestionProgress } from "../../db/schema";
import { getDefaultQuestionEstimatedTimeSeconds, type QuestionDifficulty } from "../../shared/content";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { paginate, paginatedResponse } from "../../shared/pagination";
import { toPublicQuestionDetail, toPublicQuestionSummary, toQuestionMutationResponse } from "./questions.mapper";

// ─── Create ───────────────────────────────────────────────────────────────────

interface CreateQuestionData {
  authorId: string;
  title: string;
  body: string;
  imageUrl?: string;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds?: number;
  options: QuestionOption[];
  correctOptionIndex: number;
  explanation?: string;
  categoryIds: string[];
  aiGenerated?: boolean;
  status?: "pending" | "approved" | "rejected";
}

function validateCorrectOptionIndex(options: QuestionOption[], correctOptionIndex: number) {
  if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
    throw new ValidationError(
      "correctOptionIndex must be less than the number of options",
      ERROR_CODES.QUESTION_INVALID_CORRECT_OPTION_INDEX,
    );
  }
}

/**
 * Creates a question and links it to the requested categories.
 *
 * @remarks Side effects: writes to `questions` and optionally `question_categories`.
 * @throws {ValidationError} When `correctOptionIndex` is outside the available options.
 */
export async function createQuestion(data: CreateQuestionData) {
  validateCorrectOptionIndex(data.options, data.correctOptionIndex);

  const [question] = await db
    .insert(questions)
    .values({
      authorId: data.authorId,
      title: data.title,
      body: data.body,
      imageUrl: data.imageUrl,
      difficulty: data.difficulty,
      estimatedTimeSeconds: data.estimatedTimeSeconds ?? getDefaultQuestionEstimatedTimeSeconds(data.difficulty),
      options: data.options,
      correctOptionIndex: data.correctOptionIndex,
      explanation: data.explanation,
      aiGenerated: data.aiGenerated ?? false,
      status: data.status ?? "pending",
    })
    .returning();

  // Link categories
  if (data.categoryIds.length > 0) {
    await db.insert(questionCategories).values(
      data.categoryIds.map((categoryId) => ({
        questionId: question!.id,
        categoryId,
      })),
    );
  }

  return toQuestionMutationResponse(question!);
}

// ─── List ─────────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the `author` query parameter into a user UUID.
 *
 * Accepts a literal UUID or the alias `"me"` (which requires an authenticated viewer).
 *
 * @throws {UnauthorizedError} When `"me"` is used without authentication.
 * @throws {ValidationError} When the value is neither `"me"` nor a valid UUID.
 */
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

interface ListQuestionsOptions {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: QuestionDifficulty;
  sort?: "rating" | "popular" | "recent";
  search?: string;
  excludeAnswered?: boolean;
  author?: string;
  viewerUserId?: string;
}

/**
 * Lists approved public questions with filtering, sorting and pagination metadata.
 *
 * @remarks When `author` resolves to the viewer themselves, pending and rejected questions
 * are also returned so the author can see their own drafts and moderated content.
 */
export async function listQuestions(opts: ListQuestionsOptions) {
  const { page, limit, offset } = paginate({ page: opts.page, limit: opts.limit });

  const authorId = resolveAuthorFilter(opts.author, opts.viewerUserId);
  const isSelfAuthored = authorId !== undefined && authorId === opts.viewerUserId;

  const conditions = [];
  if (!isSelfAuthored) {
    conditions.push(eq(questions.status, "approved"));
  }

  if (authorId) {
    conditions.push(eq(questions.authorId, authorId));
  }

  if (opts.difficulty) {
    conditions.push(eq(questions.difficulty, opts.difficulty));
  }

  if (opts.search) {
    conditions.push(ilike(questions.title, `%${opts.search}%`));
  }

  if (opts.excludeAnswered) {
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

  // If filtering by category slug, find matching question IDs
  if (opts.category) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, opts.category),
    });

    if (!cat) {
      return paginatedResponse([], 0, page, limit);
    }

    const linkedQIds = await db
      .select({ questionId: questionCategories.questionId })
      .from(questionCategories)
      .where(eq(questionCategories.categoryId, cat.id));

    const ids = linkedQIds.map((r) => r.questionId);
    if (ids.length > 0) {
      conditions.push(inArray(questions.id, ids));
    } else {
      return paginatedResponse([], 0, page, limit);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Sort
  const orderBy =
    opts.sort === "rating"
      ? desc(questions.avgRating)
      : opts.sort === "popular"
        ? desc(questions.ratingCount)
        : desc(questions.createdAt);

  const [data, countResult] = await Promise.all([
    db.query.questions.findMany({
      where,
      orderBy: () => [orderBy],
      limit,
      offset,
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true } },
        questionCategories: {
          with: { category: true },
        },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(questions).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const formatted = data.map(toPublicQuestionSummary);

  return paginatedResponse(formatted, total, page, limit);
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

/**
 * Loads the public detail payload for an approved question.
 *
 * @throws {NotFoundError} When the question does not exist or is not approved.
 */
export async function getQuestionById(id: string) {
  const question = await db.query.questions.findFirst({
    where: and(eq(questions.id, id), eq(questions.status, "approved")),
    with: {
      author: { columns: { id: true, username: true, avatarUrl: true } },
      questionCategories: {
        with: { category: true },
      },
    },
  });

  if (!question) throw new NotFoundError("Question");
  return toPublicQuestionDetail(question);
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates a question owned by the author or editable by an admin.
 *
 * @remarks Side effects: updates `questions` and may replace links in `question_categories`.
 */
export async function updateQuestion(id: string, userId: string, userRole: string, data: Partial<CreateQuestionData>) {
  const question = await db.query.questions.findFirst({ where: eq(questions.id, id) });

  if (!question) throw new NotFoundError("Question");
  if (question.authorId !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only edit your own questions");
  }

  const { categoryIds, ...updateData } = data;
  const nextOptions = updateData.options ?? question.options;
  const nextCorrectOptionIndex = updateData.correctOptionIndex ?? question.correctOptionIndex;
  const hasQuestionUpdates = Object.keys(updateData).length > 0;

  validateCorrectOptionIndex(nextOptions, nextCorrectOptionIndex);

  return await db.transaction(async (tx) => {
    let updated = question;

    if (hasQuestionUpdates) {
      const [updatedQuestion] = await tx.update(questions).set(updateData).where(eq(questions.id, id)).returning();
      updated = updatedQuestion!;
    }

    if (categoryIds !== undefined) {
      await tx.delete(questionCategories).where(eq(questionCategories.questionId, id));

      if (categoryIds.length > 0) {
        await tx.insert(questionCategories).values(categoryIds.map((categoryId) => ({ questionId: id, categoryId })));
      }
    }

    return toQuestionMutationResponse(updated);
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a question owned by the author or removable by an admin.
 *
 * @remarks Side effects: cascades through ratings, reports and quiz links via foreign keys.
 */
export async function deleteQuestion(id: string, userId: string, userRole: string) {
  const question = await db.query.questions.findFirst({ where: eq(questions.id, id) });

  if (!question) throw new NotFoundError("Question");
  if (question.authorId !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only delete your own questions");
  }

  await db.delete(questions).where(eq(questions.id, id));
}

// ─── Random ───────────────────────────────────────────────────────────────────

/**
 * Returns one random approved question, optionally filtered by difficulty and category slug.
 */
export async function getRandomQuestion(opts?: {
  difficulty?: QuestionDifficulty;
  category?: string;
  excludeAnswered?: boolean;
  viewerUserId?: string;
}) {
  const conditions = [eq(questions.status, "approved")];

  if (opts?.difficulty) {
    conditions.push(eq(questions.difficulty, opts.difficulty));
  }

  if (opts?.category) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.slug, opts.category),
    });

    if (!category) {
      throw new NotFoundError("Question");
    }

    const linkedQIds = await db
      .select({ questionId: questionCategories.questionId })
      .from(questionCategories)
      .where(eq(questionCategories.categoryId, category.id));

    const ids = linkedQIds.map((linkedQuestion) => linkedQuestion.questionId);
    if (ids.length === 0) {
      throw new NotFoundError("Question");
    }

    conditions.push(inArray(questions.id, ids));
  }

  if (opts?.excludeAnswered) {
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
    limit: 1,
    with: {
      author: { columns: { id: true, username: true, avatarUrl: true } },
      questionCategories: { with: { category: true } },
    },
  });

  if (result.length === 0) throw new NotFoundError("Question");
  return toPublicQuestionDetail(result[0]!);
}

// ─── Recalculate Rating ──────────────────────────────────────────────────────

/**
 * Recomputes aggregate rating fields and auto-moderation status for a question.
 *
 * @remarks Side effects: updates `questions.avgRating`, `questions.ratingCount` and may auto-approve or reject.
 */
export async function recalculateRating(questionId: string) {
  const result = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${questionRatings.score}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(questionRatings)
    .where(eq(questionRatings.questionId, questionId));

  const avg = Number(result[0]?.avg ?? 0);
  const count = Number(result[0]?.count ?? 0);

  await db.update(questions).set({ avgRating: avg, ratingCount: count }).where(eq(questions.id, questionId));

  // Auto-approve: 5+ ratings with avg >= 3.5
  if (count >= 5 && avg >= 3.5) {
    await db
      .update(questions)
      .set({ status: "approved" })
      .where(and(eq(questions.id, questionId), eq(questions.status, "pending")));
  }

  // Auto-reject: rating < 2.0 with 10+ ratings
  if (count >= 10 && avg < 2.0) {
    await db
      .update(questions)
      .set({ status: "rejected" })
      .where(and(eq(questions.id, questionId), eq(questions.status, "pending")));
  }

  return { avgRating: avg, ratingCount: count };
}
