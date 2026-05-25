import { Elysia, t } from "elysia";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import * as ratingsService from "./ratings.service";

/**
 * HTTP routes for rating and reporting questions.
 */
export const ratingsController = new Elysia({ prefix: "/questions", detail: { tags: ["Ratings"] } })
  .use(authGuard)

  // ─── Rate ──────────────────────────────────────────────────────────────
  .post(
    "/:id/rate",
    async ({ params, body, userId }) => {
      const result = await ratingsService.rateQuestion({
        questionId: params.id,
        userId,
        score: body.score,
        feedback: body.feedback,
      });
      return ok({
        avgRating: result.stats.avgRating,
        totalRatings: result.stats.ratingCount,
      });
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        score: t.Number({ minimum: 1, maximum: 5 }),
        feedback: t.Optional(t.String({ maxLength: 500 })),
      }),
      response: {
        200: tSuccess(
          t.Object({
            avgRating: t.Number(),
            totalRatings: t.Number(),
          }),
          "The updated rating stats for the question",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Rate Question",
        description: "Submit a 1 to 5 star rating for a question. Optionally provide feedback.",
      },
    },
  )

  // ─── Report ────────────────────────────────────────────────────────────
  .post(
    "/:id/report",
    async ({ params, body, userId }) => {
      const report = await ratingsService.reportQuestion({
        questionId: params.id,
        reporterId: userId,
        reason: body.reason,
        description: body.description,
      });
      return ok(report);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: t.Object({
        reason: t.Union([t.Literal("incorrect"), t.Literal("duplicate"), t.Literal("offensive"), t.Literal("unclear")]),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
      response: {
        200: tSuccess(
          t.Object({
            id: t.String({ format: "uuid" }),
            questionId: t.String({ format: "uuid" }),
            reporterId: t.String({ format: "uuid" }),
            status: t.String(),
          }),
          "The submitted report data",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        404: defaultErrorResponses[404],
        409: defaultErrorResponses[409],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Report Question",
        description: "Reports a question for abuse, incorrect facts, or duplication.",
      },
    },
  );
