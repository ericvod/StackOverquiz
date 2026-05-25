import { t } from "elysia";
import { questionDifficultySchema } from "../../shared/content";

const questionOptionSchema = t.Object({
  text: t.String({ minLength: 1 }),
  code: t.Optional(t.Union([t.String(), t.Null()])),
});

const questionOptionsSchema = t.Array(questionOptionSchema, { minItems: 2, maxItems: 6 });

export const createQuestionBody = t.Object({
  title: t.String({ minLength: 5, maxLength: 300 }),
  body: t.String({ minLength: 10 }),
  imageUrl: t.Optional(t.String()),
  difficulty: questionDifficultySchema,
  estimatedTimeSeconds: t.Optional(t.Number({ minimum: 15, maximum: 900 })),
  options: questionOptionsSchema,
  correctOptionIndex: t.Number({ minimum: 0 }),
  explanation: t.Optional(t.String()),
  categoryIds: t.Array(t.String({ format: "uuid" }), { minItems: 1 }),
});

export const updateQuestionBody = t.Object({
  title: t.Optional(t.String({ minLength: 5, maxLength: 300 })),
  body: t.Optional(t.String({ minLength: 10 })),
  imageUrl: t.Optional(t.String()),
  difficulty: t.Optional(questionDifficultySchema),
  estimatedTimeSeconds: t.Optional(t.Number({ minimum: 15, maximum: 900 })),
  options: t.Optional(questionOptionsSchema),
  correctOptionIndex: t.Optional(t.Number({ minimum: 0 })),
  explanation: t.Optional(t.String()),
  categoryIds: t.Optional(t.Array(t.String({ format: "uuid" }), { minItems: 0 })),
});

export const listQuestionsQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  category: t.Optional(t.String()),
  difficulty: t.Optional(questionDifficultySchema),
  sort: t.Optional(t.Union([t.Literal("rating"), t.Literal("popular"), t.Literal("recent")])),
  search: t.Optional(t.String()),
  excludeAnswered: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
  author: t.Optional(
    t.String({
      description:
        "Filter by question author. Pass a user UUID, or `me` as a shortcut for the authenticated user. When filtering by self, pending and rejected questions are also returned.",
    }),
  ),
});

// Response Schemas

export const questionCategorySummarySchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  slug: t.String(),
  description: t.Union([t.String(), t.Null()]),
  icon: t.Union([t.String(), t.Null()]),
  type: t.Union([t.Literal("language"), t.Literal("area"), t.Literal("framework")]),
});

export const questionAuthorSummarySchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
});

export const questionSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  body: t.Optional(t.String()), // Can be empty on lists if we only show preview
  bodyPreview: t.Optional(t.String()),
  imageUrl: t.Union([t.String(), t.Null()]),
  difficulty: questionDifficultySchema,
  estimatedTimeSeconds: t.Number(),
  options: t.Optional(
    t.Array(
      t.Object({
        text: t.String(),
        code: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    ),
  ),
  avgRating: t.Number(),
  ratingCount: t.Number(),
  aiGenerated: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  author: questionAuthorSummarySchema,
  categories: t.Array(questionCategorySummarySchema),
});

export const questionMutationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  authorId: t.String({ format: "uuid" }),
  title: t.String(),
  body: t.String(),
  imageUrl: t.Union([t.String(), t.Null()]),
  difficulty: questionDifficultySchema,
  estimatedTimeSeconds: t.Number(),
  options: t.Array(questionOptionSchema),
  correctOptionIndex: t.Number(),
  explanation: t.Union([t.String(), t.Null()]),
  status: t.Union([t.Literal("pending"), t.Literal("approved"), t.Literal("rejected")]),
  avgRating: t.Number(),
  ratingCount: t.Number(),
  highRatingBonusAwarded: t.Boolean(),
  aiGenerated: t.Boolean(),
  reviewedBy: t.Union([t.String({ format: "uuid" }), t.Null()]),
  reviewedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  rejectionReason: t.Union([t.String(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});
