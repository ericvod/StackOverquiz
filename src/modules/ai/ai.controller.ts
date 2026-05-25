import { Elysia, t } from "elysia";
import { questionDifficultySchema } from "../../shared/content";
import { ForbiddenError } from "../../shared/errors";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import { questionMutationSchema } from "../questions/questions.schema";
import { quizMutationSchema } from "../quizzes/quizzes.schema";
import * as aiService from "./ai.service";

const difficultyMixSchema = t.Object({
  beginner: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  easy: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  medium: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  hard: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  expert: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
});

/**
 * Admin-only HTTP routes for generating question content through AI.
 */
export const aiController = new Elysia({ prefix: "/ai", detail: { tags: ["AI"] } })
  .use(authGuard)
  .onBeforeHandle(({ userRole }) => {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  })

  // ─── Generate Questions ────────────────────────────────────────────────
  .post(
    "/generate",
    async ({ body, userId }) => {
      const questions = await aiService.generateAndSaveQuestions({
        category: body.category,
        difficulty: body.difficulty,
        count: body.count,
        language: body.language,
        geminiApiKey: body.geminiApiKey,
        authorId: userId,
        categoryIds: body.categoryIds,
      });

      return ok({
        generated: questions.length,
        questions,
      });
    },
    {
      body: t.Object({
        category: t.String({ minLength: 1 }),
        difficulty: questionDifficultySchema,
        count: t.Number({ minimum: 1, maximum: 20, default: 5 }),
        language: t.Optional(t.String({ default: "pt-BR" })),
        geminiApiKey: t.Optional(t.String({ minLength: 1 })),
        categoryIds: t.Array(t.String({ format: "uuid" }), { minItems: 1 }),
      }),
      response: {
        200: tSuccess(
          t.Object({
            generated: t.Number(),
            questions: t.Array(questionMutationSchema),
          }),
          "Result of the AI generation",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Generate basic questions",
        description:
          "Uses Google Gemini AI to generate a batch of questions for a specific category and difficulty. The generated content is saved as 'pending' for admin review.",
      },
    },
  )

  // ─── Generate Complete Quiz ───────────────────────────────────────────
  .post(
    "/generate-quiz",
    async ({ body, userId }) => {
      const result = await aiService.generateAndSaveQuiz({
        authorId: userId,
        title: body.title,
        description: body.description,
        category: body.category,
        categoryIds: body.categoryIds,
        difficultyMix: body.difficultyMix,
        language: body.language,
        geminiApiKey: body.geminiApiKey,
      });

      return ok(result);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 300 }),
        description: t.Optional(t.String()),
        category: t.String({ minLength: 1 }),
        categoryIds: t.Array(t.String({ format: "uuid" }), { minItems: 1 }),
        difficultyMix: difficultyMixSchema,
        language: t.Optional(t.String({ default: "pt-BR" })),
        geminiApiKey: t.Optional(t.String({ minLength: 1 })),
      }),
      response: {
        200: tSuccess(
          t.Object({
            quiz: quizMutationSchema,
            questions: t.Array(questionMutationSchema),
            generated: t.Number(),
          }),
          "The newly generated Quiz bundle",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Generate full Quiz via AI",
        description:
          "Uses Google Gemini AI to generate a complete Quiz draft with multiple questions according to a target difficulty mix. Saves the entire bundle as 'pending'.",
      },
    },
  )

  // ─── Batch Generate ────────────────────────────────────────────────────
  .post(
    "/generate/batch",
    async ({ body, userId }) => {
      const results = [];

      for (const batch of body.batches) {
        const questions = await aiService.generateAndSaveQuestions({
          category: batch.category,
          difficulty: batch.difficulty,
          count: batch.count,
          language: body.language,
          geminiApiKey: body.geminiApiKey,
          authorId: userId,
          categoryIds: batch.categoryIds,
        });
        results.push({
          category: batch.category,
          difficulty: batch.difficulty,
          generated: questions.length,
        });
      }

      return ok({
        totalGenerated: results.reduce((sum, r) => sum + r.generated, 0),
        batches: results,
      });
    },
    {
      body: t.Object({
        language: t.Optional(t.String({ default: "pt-BR" })),
        geminiApiKey: t.Optional(t.String({ minLength: 1 })),
        batches: t.Array(
          t.Object({
            category: t.String({ minLength: 1 }),
            difficulty: questionDifficultySchema,
            count: t.Number({ minimum: 1, maximum: 20 }),
            categoryIds: t.Array(t.String({ format: "uuid" }), { minItems: 1 }),
          }),
        ),
      }),
      response: {
        200: tSuccess(
          t.Object({
            totalGenerated: t.Number(),
            batches: t.Array(
              t.Object({
                category: t.String(),
                difficulty: questionDifficultySchema,
                generated: t.Number(),
              }),
            ),
          }),
          "Multi-batch AI generation result",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Batch Generate Questions",
        description:
          "Executes multiple generation batches in sequence. Excellent for seeding a new platform with initial content variations.",
      },
    },
  );
