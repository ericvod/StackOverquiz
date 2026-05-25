import { Elysia, t } from "elysia";
import { ForbiddenError } from "../../shared/errors";
import { noContent, ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import { categoryAdminSchema, createCategoryBody, updateCategoryBody } from "./categories-admin.schema";
import * as categoriesAdminService from "./categories-admin.service";

/**
 * Admin-only CRUD routes for managing platform categories.
 */
export const categoriesAdminController = new Elysia({
  prefix: "/admin/categories",
  detail: { tags: ["Admin Categories"] },
})
  .use(authGuard)
  .onBeforeHandle(({ userRole }) => {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  })

  // ─── Create ───────────────────────────────────────────────────────────────
  .post(
    "/",
    async ({ body }) => {
      const category = await categoriesAdminService.createCategory(body);
      return ok(category);
    },
    {
      body: createCategoryBody,
      response: {
        200: tSuccess(categoryAdminSchema, "The created category"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        409: defaultErrorResponses[409],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Create category",
        description:
          "Creates a new category. Name and slug must be globally unique. Slug must be lowercase and hyphen-separated.",
      },
    },
  )

  // ─── Update ───────────────────────────────────────────────────────────────
  .put(
    "/:id",
    async ({ params, body }) => {
      const category = await categoriesAdminService.updateCategory(params.id, body);
      return ok(category);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: updateCategoryBody,
      response: {
        200: tSuccess(categoryAdminSchema, "The updated category"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        409: defaultErrorResponses[409],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Update category",
        description: "Updates a category's metadata. Only provided fields are changed.",
      },
    },
  )

  // ─── Delete ───────────────────────────────────────────────────────────────
  .delete(
    "/:id",
    async ({ params }) => {
      await categoriesAdminService.deleteCategory(params.id);
      return noContent();
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      response: {
        200: tSuccess(t.Null(), "Category deleted"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        409: defaultErrorResponses[409],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Delete category",
        description:
          "Deletes a category. Fails with 409 if any questions are still linked to it — unlink or reassign them first.",
      },
    },
  );
