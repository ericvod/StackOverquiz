import { count, eq } from "drizzle-orm";
import { db } from "../../config/database";
import { categories, questionCategories } from "../../db/schema";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Creates a new category.
 *
 * @throws {ConflictError} When name or slug is already taken.
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  type: "language" | "area" | "framework";
}) {
  const existing = await db.query.categories.findFirst({
    where: (c, { or }) => or(eq(c.name, data.name), eq(c.slug, data.slug)),
    columns: { name: true, slug: true },
  });

  if (existing) {
    const field = existing.name === data.name ? "name" : "slug";
    throw new ConflictError(`Category ${field} already in use`, ERROR_CODES.CONFLICT);
  }

  const [category] = await db
    .insert(categories)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      type: data.type,
    })
    .returning();

  return category!;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates mutable fields of a category.
 *
 * @throws {NotFoundError} When the category does not exist.
 * @throws {ConflictError} When the new name or slug is already taken by another category.
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
    type?: "language" | "area" | "framework";
  },
) {
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!existing) throw new NotFoundError("Category");

  if (data.name && data.name !== existing.name) {
    const taken = await db.query.categories.findFirst({
      where: eq(categories.name, data.name),
      columns: { id: true },
    });
    if (taken) throw new ConflictError("Category name already in use", ERROR_CODES.CONFLICT);
  }

  if (data.slug && data.slug !== existing.slug) {
    const taken = await db.query.categories.findFirst({
      where: eq(categories.slug, data.slug),
      columns: { id: true },
    });
    if (taken) throw new ConflictError("Category slug already in use", ERROR_CODES.CONFLICT);
  }

  const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return updated!;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Deletes a category.
 *
 * @throws {NotFoundError} When the category does not exist.
 * @throws {ConflictError} When one or more questions are still linked to this category.
 */
export async function deleteCategory(id: string) {
  const existing = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!existing) throw new NotFoundError("Category");

  const [linkCount] = await db
    .select({ total: count() })
    .from(questionCategories)
    .where(eq(questionCategories.categoryId, id));

  const linkedQuestions = Number(linkCount?.total ?? 0);
  if (linkedQuestions > 0) {
    throw new ConflictError(
      `Cannot delete category: ${linkedQuestions} question(s) are still linked to it`,
      ERROR_CODES.CONFLICT,
      { linkedQuestions },
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
}
