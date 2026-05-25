import { t } from "elysia";
import { questionSchema } from "../questions/questions.schema";

export const createQuizBody = t.Object({
  title: t.String({ minLength: 3, maxLength: 300 }),
  description: t.Optional(t.String()),
  isPublic: t.Optional(t.Boolean({ default: true })),
  timeLimitSeconds: t.Optional(t.Number({ minimum: 30 })),
  questionIds: t.Array(t.String({ format: "uuid" }), { minItems: 1, maxItems: 50 }),
});

export const updateQuizBody = t.Partial(
  t.Object({
    title: t.String({ minLength: 3, maxLength: 300 }),
    description: t.Optional(t.String()),
    isPublic: t.Optional(t.Boolean()),
    timeLimitSeconds: t.Optional(t.Number({ minimum: 30 })),
  }),
);

export const submitAttemptBody = t.Object({
  answers: t.Array(
    t.Object({
      questionId: t.String({ format: "uuid" }),
      selectedOptionIndex: t.Number({ minimum: 0 }),
    }),
  ),
  timeSpentSeconds: t.Optional(t.Number({ minimum: 0 })),
});

export const listQuizzesQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  search: t.Optional(t.String()),
  author: t.Optional(
    t.String({
      description:
        "Filter by quiz creator. Pass a user UUID, or `me` as a shortcut for the authenticated user. When filtering by self, pending and rejected quizzes are also returned, even if private.",
    }),
  ),
});

// Response Schemas

export const quizAttemptSummarySchema = t.Object({
  attempted: t.Boolean(),
  attemptCount: t.Optional(t.Number()),
  bestScore: t.Optional(t.Union([t.Number(), t.Null()])),
  lastScore: t.Optional(t.Union([t.Number(), t.Null()])),
  lastAttemptAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
});

export const quizCreatorSummarySchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
});

const difficultyBreakdownSchema = t.Object({
  beginner: t.Number(),
  easy: t.Number(),
  medium: t.Number(),
  hard: t.Number(),
  expert: t.Number(),
});

export const quizSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String(),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  isPublic: t.Boolean(),
  timeLimitSeconds: t.Optional(t.Union([t.Number(), t.Null()])),
  createdAt: t.String({ format: "date-time" }),
  creator: quizCreatorSummarySchema,
  questionCount: t.Number(),
  estimatedDurationSeconds: t.Number(),
  difficultyBreakdown: difficultyBreakdownSchema,
  attemptedByViewer: t.Optional(t.Boolean()),
  viewerBestScore: t.Optional(t.Union([t.Number(), t.Null()])),
  viewerLastAttemptAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  viewerAttemptSummary: t.Optional(quizAttemptSummarySchema),
  // For details view
  questions: t.Optional(t.Array(questionSchema)),
});

export const quizMutationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  creatorId: t.String({ format: "uuid" }),
  title: t.String(),
  description: t.Union([t.String(), t.Null()]),
  isPublic: t.Boolean(),
  status: t.Union([t.Literal("pending"), t.Literal("approved"), t.Literal("rejected")]),
  aiGenerated: t.Boolean(),
  reviewedBy: t.Union([t.String({ format: "uuid" }), t.Null()]),
  reviewedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  rejectionReason: t.Union([t.String(), t.Null()]),
  timeLimitSeconds: t.Union([t.Number(), t.Null()]),
  createdAt: t.String({ format: "date-time" }),
});

export const quizAttemptResultSchema = t.Object({
  id: t.Union([t.String({ format: "uuid" }), t.Null()]),
  quizId: t.String({ format: "uuid" }),
  score: t.Number(),
  totalQuestions: t.Number(),
  timeSpentSeconds: t.Number(),
  xpGained: t.Number(),
  isNewBest: t.Boolean(),
  isPerfect: t.Boolean(),
  saved: t.Boolean(),
});

export const leaderboardEntrySchema = t.Object({
  rank: t.Number(),
  user: t.Object({
    id: t.String({ format: "uuid" }),
    username: t.String(),
    avatarUrl: t.Union([t.String(), t.Null()]),
  }),
  score: t.Number(),
  totalQuestions: t.Number(),
  timeSpentSeconds: t.Number(),
  completedAt: t.String({ format: "date-time" }),
});
