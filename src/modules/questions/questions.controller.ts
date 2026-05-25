import { Elysia, t } from "elysia";
import { questionDifficultySchema } from "../../shared/content";
import { noContent, ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tError, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard, optionalAuth } from "../auth/auth.middleware";
import {
  createQuestionBody,
  listQuestionsQuery,
  questionMutationSchema,
  questionSchema,
  updateQuestionBody,
} from "./questions.schema";
import * as questionsService from "./questions.service";

/**
 * HTTP routes for public question browsing and authenticated question management.
 */
export const questionsController = new Elysia({ prefix: "/questions", detail: { tags: ["Questions"] } })
  .use(optionalAuth)

  // ─── List (public) ─────────────────────────────────────────────────────
  .get(
    "/",
    async ({ query, viewerUserId }) => {
      return await questionsService.listQuestions({
        ...query,
        excludeAnswered: query.excludeAnswered === "true",
        viewerUserId,
      });
    },
    {
      query: listQuestionsQuery,
      response: {
        200: tPaged(questionSchema, "Paginated list of approved questions"),
        400: defaultErrorResponses[400],
        401: tError("Authentication required for excludeAnswered=true or author=me"),
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List public questions",
        description:
          "Returns a paginated list of public, approved questions. Filterable by category, difficulty, search, sort and author (UUID or `me`). When the viewer filters by their own authorship, pending and rejected questions are included.",
      },
    },
  )

  // ─── Random (public) ──────────────────────────────────────────────────
  .get(
    "/random",
    async ({ query, viewerUserId }) => {
      const question = await questionsService.getRandomQuestion({
        ...query,
        excludeAnswered: query.excludeAnswered === "true",
        viewerUserId,
      });
      return ok(question);
    },
    {
      query: t.Object({
        difficulty: t.Optional(questionDifficultySchema),
        category: t.Optional(t.String()),
        excludeAnswered: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
      }),
      response: {
        200: tSuccess(questionSchema, "A randomly selected question"),
        400: defaultErrorResponses[400],
        401: tError("Authentication required for excludeAnswered=true"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get random question",
        description: "Returns a single random, approved question. Supports category and difficulty filtering.",
      },
    },
  )

  // ─── Get by ID (public) ───────────────────────────────────────────────
  .get(
    "/:id",
    async ({ params }) => {
      const question = await questionsService.getQuestionById(params.id);
      return ok(question);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(questionSchema, "The question details"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get question details",
        description: "Returns the public details of an approved question without the correct answer flag.",
      },
    },
  )

  // ─── Authenticated routes ─────────────────────────────────────────────
  .use(authGuard)

  // ─── Create ────────────────────────────────────────────────────────────
  .post(
    "/",
    async ({ body, userId }) => {
      const question = await questionsService.createQuestion({
        ...body,
        authorId: userId,
      });
      return ok(question);
    },
    {
      body: createQuestionBody,
      response: {
        200: tSuccess(questionMutationSchema, "Created question"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Create a question",
        description: "Creates a new question. Content begins with status=pending.",
      },
    },
  )

  // ─── Update ────────────────────────────────────────────────────────────
  .put(
    "/:id",
    async ({ params, body, userId, userRole }) => {
      const question = await questionsService.updateQuestion(params.id, userId, userRole, body);
      return ok(question);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: updateQuestionBody,
      response: {
        200: tSuccess(questionMutationSchema, "Updated question"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Update question",
        description: "Updates an existing question. Can only be done by the author or an admin.",
      },
    },
  )

  // ─── Delete ────────────────────────────────────────────────────────────
  .delete(
    "/:id",
    async ({ params, userId, userRole }) => {
      await questionsService.deleteQuestion(params.id, userId, userRole);
      return noContent();
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(t.Null(), "Question deleted"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Delete question",
        description: "Deletes a question. Can only be done by the author or an admin.",
      },
    },
  );
