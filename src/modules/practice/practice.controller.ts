import { Elysia, t } from "elysia";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tError, tSuccess } from "../../shared/http/api-response.schema";
import { optionalAuth } from "../auth/auth.middleware";
import { questionSchema } from "../questions/questions.schema";
import { practiceAnswerBody, practiceAnswerResultSchema, practiceQuestionsQuery } from "./practice.schema";
import * as practiceService from "./practice.service";

/**
 * Routes for free practice outside a fixed quiz attempt.
 */
export const practiceController = new Elysia({ prefix: "/practice", detail: { tags: ["Practice"] } })
  .use(optionalAuth)

  .get(
    "/questions",
    async ({ query, viewerUserId }) => {
      const questions = await practiceService.getPracticeQuestions({
        ...query,
        excludeAnswered: query.excludeAnswered === "true",
        includeAnswered: query.includeAnswered === "true",
        viewerUserId,
      });

      return ok(questions);
    },
    {
      query: practiceQuestionsQuery,
      response: {
        200: tSuccess(t.Array(questionSchema), "A batch of questions for practice"),
        400: defaultErrorResponses[400],
        401: tError("Authentication required for excludeAnswered=true without includeAnswered=true"),
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get practice questions",
        description:
          "Returns a random batch of questions for free practice mode. Supports complex filtering and mixing.",
      },
    },
  )

  .post(
    "/answer",
    async ({ body, viewerUserId }) => {
      const result = await practiceService.answerPracticeQuestion({
        userId: viewerUserId,
        questionId: body.questionId,
        selectedOptionIndex: body.selectedOptionIndex,
        timeSpentSeconds: body.timeSpentSeconds,
      });

      return ok(result);
    },
    {
      body: practiceAnswerBody,
      response: {
        200: tSuccess(practiceAnswerResultSchema, "Feedback for the submitted answer"),
        400: defaultErrorResponses[400],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Answer practice question",
        description:
          "Submits an answer for a single practice question and returns immediate feedback. Authenticated users earn XP and have their progress tracked; anonymous users receive feedback only.",
      },
    },
  );
