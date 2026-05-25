import { t } from "elysia";
import { questionDifficultySchema } from "../../shared/content";

export const practiceQuestionsQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50, default: 10 })),
  difficulty: t.Optional(questionDifficultySchema),
  difficulties: t.Optional(t.String()),
  category: t.Optional(t.String()),
  excludeAnswered: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
  includeAnswered: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
  mixCategories: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
});

export const practiceAnswerBody = t.Object({
  questionId: t.String({ format: "uuid" }),
  selectedOptionIndex: t.Number({ minimum: 0 }),
  timeSpentSeconds: t.Optional(t.Number({ minimum: 0 })),
});

// Response Schemas

export const practiceAnswerResultSchema = t.Object({
  questionId: t.String({ format: "uuid" }),
  isCorrect: t.Boolean(),
  correctOptionIndex: t.Number(),
  explanation: t.Optional(t.Union([t.String(), t.Null()])),
  xpGained: t.Number(),
  alreadyAnswered: t.Boolean(),
  timeSpentSeconds: t.Optional(t.Number()),
});
