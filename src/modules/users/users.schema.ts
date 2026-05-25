import { t } from "elysia";

export const userProfileParams = t.Object({
  id: t.String({ format: "uuid" }),
});

export const patchMeBody = t.Partial(
  t.Object({
    username: t.String({ minLength: 3, maxLength: 50 }),
    avatarUrl: t.Union([t.String({ format: "uri", maxLength: 500 }), t.Null()]),
  }),
);

export const userHistoryQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

// Response Schemas

export const publicProfileSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  role: t.Union([t.Literal("user"), t.Literal("admin")]),
  xp: t.Number(),
  level: t.Number(),
  createdAt: t.String({ format: "date-time" }),
  stats: t.Object({
    quizzesAttempted: t.Number(),
    questionsCreated: t.Number(),
    totalCorrectAnswers: t.Number(),
    totalQuestionsAnswered: t.Number(),
    accuracy: t.Number(),
  }),
});

export const leaderboardUserSchema = t.Object({
  rank: t.Number(),
  id: t.String({ format: "uuid" }),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  xp: t.Number(),
  level: t.Number(),
});

export const userHistoryItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  quiz: t.Union([
    t.Object({
      id: t.String({ format: "uuid" }),
      title: t.String(),
    }),
    t.Null(),
  ]),
  score: t.Number(),
  totalQuestions: t.Number(),
  percentage: t.Number(),
  timeSpentSeconds: t.Union([t.Number(), t.Null()]),
  completedAt: t.String({ format: "date-time" }),
});
