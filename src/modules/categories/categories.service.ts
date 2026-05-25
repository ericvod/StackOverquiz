import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../../config/database";
import { categories, questionCategories, questions, userQuestionProgress } from "../../db/schema";
import { NotFoundError, UnauthorizedError } from "../../shared/errors";
import { paginate, paginatedResponse } from "../../shared/pagination";
import { toPublicQuestionSummary } from "../questions/questions.mapper";

/**
 * Lists all categories ordered for predictable browsing in the client.
 */
export async function listCategories() {
  return await db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
  });
}

/**
 * Loads a category by its public slug.
 *
 * @throws {NotFoundError} When the slug does not exist.
 */
export async function getCategoryBySlug(slug: string) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });

  if (!category) throw new NotFoundError("Category");
  return category;
}

/**
 * Lists approved public questions that belong to a category.
 */
export async function getCategoryQuestions(
  slug: string,
  opts: { page?: number; limit?: number; excludeAnswered?: boolean; viewerUserId?: string },
) {
  const category = await getCategoryBySlug(slug);
  const { page, limit, offset } = paginate(opts);

  const linkedQuestionIds = await db
    .select({ questionId: questionCategories.questionId })
    .from(questionCategories)
    .where(eq(questionCategories.categoryId, category.id));

  const questionIds = linkedQuestionIds.map((linkedQuestion) => linkedQuestion.questionId);
  if (questionIds.length === 0) {
    return paginatedResponse([], 0, page, limit, { category });
  }

  const conditions = [eq(questions.status, "approved"), inArray(questions.id, questionIds)];

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

  const where = and(...conditions);
  const [data, countResult] = await Promise.all([
    db.query.questions.findMany({
      where,
      limit,
      offset,
      orderBy: (question, { desc }) => [desc(question.createdAt)],
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true } },
        questionCategories: { with: { category: true } },
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(questions).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return paginatedResponse(data.map(toPublicQuestionSummary), total, page, limit, { category });
}
