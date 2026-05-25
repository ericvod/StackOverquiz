import { Elysia, t } from "elysia";
import { noContent, ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard, optionalAuth } from "../auth/auth.middleware";
import {
  createQuizBody,
  leaderboardEntrySchema,
  listQuizzesQuery,
  quizAttemptResultSchema,
  quizMutationSchema,
  quizSchema,
  submitAttemptBody,
  updateQuizBody,
} from "./quizzes.schema";
import * as quizzesService from "./quizzes.service";

/**
 * HTTP routes for public quiz browsing, author management and attempt submission.
 */
export const quizzesController = new Elysia({ prefix: "/quizzes", detail: { tags: ["Quizzes"] } })
  .use(optionalAuth)

  // ─── List (public) ─────────────────────────────────────────────────────
  .get(
    "/",
    async ({ query, viewerUserId }) => {
      return await quizzesService.listQuizzes({ ...query, viewerUserId });
    },
    {
      query: listQuizzesQuery,
      response: {
        200: tPaged(quizSchema, "Paginated list of approved quizzes"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List public quizzes",
        description:
          "Returns a paginated list of public, approved quizzes. Filterable by search and author (UUID or `me`). When the viewer filters by their own authorship, private/pending/rejected quizzes are included.",
      },
    },
  )

  // ─── Get by ID (public) ───────────────────────────────────────────────
  .get(
    "/:id",
    async ({ params, viewerUserId }) => {
      const quiz = await quizzesService.getQuizById(params.id, viewerUserId);
      return ok(quiz);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(quizSchema, "The quiz details, including its questions"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get quiz details",
        description:
          "Returns the public details of an approved quiz, including the public presentation of its questions.",
      },
    },
  )

  // ─── Leaderboard (public) ─────────────────────────────────────────────
  .get(
    "/:id/leaderboard",
    async ({ params, query }) => {
      const leaderboard = await quizzesService.getQuizLeaderboard(params.id, query.limit);
      return ok(leaderboard);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      query: t.Object({ limit: t.Optional(t.Numeric({ default: 20 })) }),
      response: {
        200: tSuccess(t.Array(leaderboardEntrySchema), "The quiz leaderboard"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get quiz leaderboard",
        description: "Returns the top user scores for a specific quiz.",
      },
    },
  )

  // ─── Submit Attempt (optional auth — anonymous users get feedback, no XP) ──
  .post(
    "/:id/attempt",
    async ({ params, body, viewerUserId, viewerUserRole }) => {
      const result = await quizzesService.submitAttempt({
        quizId: params.id,
        userId: viewerUserId,
        userRole: viewerUserRole,
        answers: body.answers,
        timeSpentSeconds: body.timeSpentSeconds,
      });
      return ok(result);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: submitAttemptBody,
      response: {
        200: tSuccess(quizAttemptResultSchema, "The result of the attempt"),
        400: defaultErrorResponses[400],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Submit quiz attempt",
        description:
          "Evaluates a completed quiz and returns score and per-question feedback. Authenticated users also receive XP and have the attempt persisted to their history.",
      },
    },
  )

  // ─── Authenticated routes ─────────────────────────────────────────────
  .use(authGuard)

  // ─── Create ────────────────────────────────────────────────────────────
  .post(
    "/",
    async ({ body, userId }) => {
      const quiz = await quizzesService.createQuiz({ ...body, creatorId: userId });
      return ok(quiz);
    },
    {
      body: createQuizBody,
      response: {
        200: tSuccess(quizMutationSchema, "Created quiz draft"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Create a quiz",
        description: "Creates a new quiz. The quiz begins with status=pending and requires admin approval.",
      },
    },
  )

  // ─── Update ────────────────────────────────────────────────────────────
  .put(
    "/:id",
    async ({ params, body, userId }) => {
      const quiz = await quizzesService.updateQuiz(params.id, userId, body);
      return ok(quiz);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: updateQuizBody,
      response: {
        200: tSuccess(quizMutationSchema, "Updated quiz"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Update quiz",
        description: "Updates an existing quiz. Only the creator or an admin can do this.",
      },
    },
  )

  // ─── Delete ────────────────────────────────────────────────────────────
  .delete(
    "/:id",
    async ({ params, userId, userRole }) => {
      await quizzesService.deleteQuiz(params.id, userId, userRole);
      return noContent();
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(t.Null(), "Quiz deleted"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Delete quiz",
        description: "Deletes a quiz. Only the creator or an admin can do this.",
      },
    },
  );
