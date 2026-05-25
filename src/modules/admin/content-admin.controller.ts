import { Elysia, t } from "elysia";
import { ForbiddenError } from "../../shared/errors";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import {
  adminQuestionMutationSchema,
  adminQuestionReviewSchema,
  adminQuizMutationSchema,
  adminQuizReviewDetailSchema,
  adminQuizReviewSummarySchema,
  approveQuizBody,
  listModerationContentQuery,
  rejectContentBody,
} from "./content-admin.schema";
import * as contentAdminService from "./content-admin.service";

/**
 * Admin-only content moderation routes for questions and quizzes.
 */
export const contentAdminController = new Elysia({
  prefix: "/admin/content",
  detail: { tags: ["Admin Content"] },
})
  .use(authGuard)
  .onBeforeHandle(({ userRole }) => {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  })

  .get(
    "/questions",
    async ({ query }) => {
      return await contentAdminService.listQuestionsForReview(query);
    },
    {
      query: listModerationContentQuery,
      response: {
        200: tPaged(adminQuestionReviewSchema, "Paginated list of questions pending moderation"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List Questions for Moderation",
        description:
          "Returns a paginated list of questions, optionally filtered by their review status. Used by admins to overview pending content.",
      },
    },
  )

  .post(
    "/questions/:id/approve",
    async ({ params, userId }) => {
      const question = await contentAdminService.approveQuestion(params.id, userId);
      return ok(question);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(adminQuestionMutationSchema, "The approved question"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Approve Question",
        description: "Sets a pending question's status to 'approved'. It becomes visible publicly immediately.",
      },
    },
  )

  .post(
    "/questions/:id/reject",
    async ({ params, body, userId }) => {
      const question = await contentAdminService.rejectQuestion(params.id, userId, body.reason);
      return ok(question);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: rejectContentBody,
      response: {
        200: tSuccess(adminQuestionMutationSchema, "The rejected question"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Reject Question",
        description: "Sets a pending question's status to 'rejected' along with a mandatory reason.",
      },
    },
  )

  .get(
    "/quizzes",
    async ({ query }) => {
      return await contentAdminService.listQuizzesForReview(query);
    },
    {
      query: listModerationContentQuery,
      response: {
        200: tPaged(adminQuizReviewSummarySchema, "Paginated list of quizzes pending moderation"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List Quizzes for Moderation",
        description: "Returns a paginated list of quizzes, optionally filtered by their review status.",
      },
    },
  )

  .get(
    "/quizzes/:id",
    async ({ params }) => {
      const quiz = await contentAdminService.getQuizForReview(params.id);
      return ok(quiz);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(adminQuizReviewDetailSchema, "The detailed quiz moderation view"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get Quiz Moderation Details",
        description:
          "Returns full details of a pending quiz, including its questions and their current statuses, to allow holistic moderation.",
      },
    },
  )

  .post(
    "/quizzes/:id/approve",
    async ({ params, body, userId }) => {
      const quiz = await contentAdminService.approveQuiz(params.id, userId, body);
      return ok(quiz);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: approveQuizBody,
      response: {
        200: tSuccess(adminQuizMutationSchema, "The approved quiz"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Approve Quiz",
        description:
          "Approves a quiz. If approveQuestions=true is provided, forcefully approves all pending questions within the quiz too.",
      },
    },
  )

  .post(
    "/quizzes/:id/reject",
    async ({ params, body, userId }) => {
      const quiz = await contentAdminService.rejectQuiz(params.id, userId, body.reason);
      return ok(quiz);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: rejectContentBody,
      response: {
        200: tSuccess(adminQuizMutationSchema, "The rejected quiz"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Reject Quiz",
        description: "Rejects a quiz with a mandatory reason.",
      },
    },
  );
