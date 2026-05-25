import { t } from "elysia";
import { questionDifficultySchema } from "../../shared/content";

export const moderationStatusSchema = t.Union([t.Literal("pending"), t.Literal("approved"), t.Literal("rejected")]);

const nullableDateTimeSchema = t.Union([t.String({ format: "date-time" }), t.Null()]);

const moderationUserSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
});

const moderationCategorySchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  slug: t.String(),
  type: t.Union([t.Literal("language"), t.Literal("area"), t.Literal("framework")]),
});

const difficultyBreakdownSchema = t.Object({
  beginner: t.Number(),
  easy: t.Number(),
  medium: t.Number(),
  hard: t.Number(),
  expert: t.Number(),
});

const moderationQuestionOptionSchema = t.Object({
  text: t.String(),
  code: t.Optional(t.Union([t.String(), t.Null()])),
});

export const adminQuestionReviewSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  body: t.String(),
  imageUrl: t.Union([t.String(), t.Null()]),
  difficulty: questionDifficultySchema,
  estimatedTimeSeconds: t.Number(),
  options: t.Array(moderationQuestionOptionSchema),
  correctOptionIndex: t.Number(),
  explanation: t.Union([t.String(), t.Null()]),
  status: moderationStatusSchema,
  aiGenerated: t.Boolean(),
  reviewedAt: nullableDateTimeSchema,
  rejectionReason: t.Union([t.String(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  author: t.Union([moderationUserSchema, t.Null()]),
  reviewer: t.Union([moderationUserSchema, t.Null()]),
  categories: t.Array(moderationCategorySchema),
});

export const adminQuestionMutationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  status: moderationStatusSchema,
  reviewedBy: t.Union([t.String({ format: "uuid" }), t.Null()]),
  reviewedAt: nullableDateTimeSchema,
  rejectionReason: t.Union([t.String(), t.Null()]),
});

export const adminQuizReviewQuestionSchema = t.Object({
  order: t.Number(),
  id: t.String({ format: "uuid" }),
  title: t.String(),
  difficulty: questionDifficultySchema,
  status: moderationStatusSchema,
  aiGenerated: t.Boolean(),
  estimatedTimeSeconds: t.Number(),
});

export const adminQuizReviewSummarySchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  description: t.Union([t.String(), t.Null()]),
  isPublic: t.Boolean(),
  status: moderationStatusSchema,
  aiGenerated: t.Boolean(),
  reviewedAt: nullableDateTimeSchema,
  rejectionReason: t.Union([t.String(), t.Null()]),
  timeLimitSeconds: t.Union([t.Number(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  creator: t.Union([moderationUserSchema, t.Null()]),
  reviewer: t.Union([moderationUserSchema, t.Null()]),
  questionCount: t.Number(),
  approvedQuestionCount: t.Number(),
  pendingQuestionCount: t.Number(),
  rejectedQuestionCount: t.Number(),
  estimatedDurationSeconds: t.Number(),
  difficultyBreakdown: difficultyBreakdownSchema,
});

export const adminQuizReviewDetailSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  description: t.Union([t.String(), t.Null()]),
  isPublic: t.Boolean(),
  status: moderationStatusSchema,
  aiGenerated: t.Boolean(),
  reviewedAt: nullableDateTimeSchema,
  rejectionReason: t.Union([t.String(), t.Null()]),
  timeLimitSeconds: t.Union([t.Number(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
  creator: t.Union([moderationUserSchema, t.Null()]),
  reviewer: t.Union([moderationUserSchema, t.Null()]),
  questionCount: t.Number(),
  approvedQuestionCount: t.Number(),
  pendingQuestionCount: t.Number(),
  rejectedQuestionCount: t.Number(),
  estimatedDurationSeconds: t.Number(),
  difficultyBreakdown: difficultyBreakdownSchema,
  questions: t.Array(adminQuizReviewQuestionSchema),
});

export const adminQuizMutationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  status: moderationStatusSchema,
  reviewedBy: t.Union([t.String({ format: "uuid" }), t.Null()]),
  reviewedAt: nullableDateTimeSchema,
  rejectionReason: t.Union([t.String(), t.Null()]),
});

export const listModerationContentQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  status: t.Optional(moderationStatusSchema),
  search: t.Optional(t.String()),
});

export const rejectContentBody = t.Object({
  reason: t.String({ minLength: 1, maxLength: 500 }),
});

export const approveQuizBody = t.Object({
  approveQuestions: t.Optional(t.Boolean({ default: false })),
});
