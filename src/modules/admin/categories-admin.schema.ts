import { t } from "elysia";

const categoryTypeSchema = t.Union([t.Literal("language"), t.Literal("area"), t.Literal("framework")]);

export const categoryAdminSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  icon: t.Union([t.String(), t.Null()]),
  type: categoryTypeSchema,
});

export const createCategoryBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 100 }),
  slug: t.String({ minLength: 2, maxLength: 100, pattern: "^[a-z0-9-]+$" }),
  description: t.Optional(t.String({ maxLength: 500 })),
  icon: t.Optional(t.String({ maxLength: 50 })),
  type: categoryTypeSchema,
});

export const updateCategoryBody = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  slug: t.Optional(t.String({ minLength: 2, maxLength: 100, pattern: "^[a-z0-9-]+$" })),
  description: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
  icon: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
  type: t.Optional(categoryTypeSchema),
});
