import { Elysia, t } from "elysia";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { optionalAuth } from "../auth/auth.middleware";
import { questionSchema } from "../questions/questions.schema";
import { categorySchema } from "./categories.schema";
import * as categoriesService from "./categories.service";

/**
 * HTTP routes for category discovery and category-scoped question feeds.
 */
export const categoriesController = new Elysia({ prefix: "/categories", detail: { tags: ["Categories"] } })
  .use(optionalAuth)

  .get(
    "/",
    async () => {
      const categories = await categoriesService.listCategories();
      return ok(categories);
    },
    {
      response: {
        200: tSuccess(t.Array(categorySchema), "List of all categories"),
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List categories",
        description: "Returns a list of all available global categories to filter questions and quizzes.",
      },
    },
  )

  .get(
    "/:slug",
    async ({ params }) => {
      const category = await categoriesService.getCategoryBySlug(params.slug);
      return ok(category);
    },
    {
      params: t.Object({ slug: t.String() }),
      response: {
        200: tSuccess(categorySchema, "The category details"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get category by slug",
        description: "Returns the details of a specific category by its slug.",
      },
    },
  )

  .get(
    "/:slug/questions",
    async ({ params, query, viewerUserId }) => {
      return await categoriesService.getCategoryQuestions(params.slug, {
        ...query,
        excludeAnswered: query.excludeAnswered === "true",
        viewerUserId,
      });
    },
    {
      params: t.Object({ slug: t.String() }),
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
        excludeAnswered: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
      }),
      response: {
        200: tPaged(questionSchema, "Paginated list of questions in the category"),
        400: defaultErrorResponses[400],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get category questions",
        description: "Returns a paginated list of published questions belonging to a specific category slug.",
      },
    },
  );
