import { Elysia, t } from "elysia";
import { ForbiddenError } from "../../shared/errors";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import * as authService from "../auth/auth.service";
import {
  adminUserItemSchema,
  listUsersQuery,
  resetPasswordBody,
  resetPasswordResponseSchema,
} from "./users-admin.schema";
import * as usersAdminService from "./users-admin.service";

/**
 * Admin-only routes for managing user accounts.
 */
export const usersAdminController = new Elysia({
  prefix: "/admin/users",
  detail: { tags: ["Admin Users"] },
})
  .use(authGuard)
  .onBeforeHandle(({ userRole }) => {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  })

  // ─── List Users ──────────────────────────────────────────────────────────
  .get(
    "/",
    async ({ query }) => {
      return await usersAdminService.listUsers(query);
    },
    {
      query: listUsersQuery,
      response: {
        200: tPaged(adminUserItemSchema, "Paginated list of all users"),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "List users",
        description:
          "Returns a paginated list of all registered users. Supports filtering by username/email search and role. Results are ordered by registration date (most recent first). Includes email addresses — admin only.",
      },
    },
  )

  // ─── Reset Password ───────────────────────────────────────────────────────
  .post(
    "/:id/reset-password",
    async ({ params, body }) => {
      const result = await authService.adminResetPassword({
        targetUserId: params.id,
        newPassword: body.password,
      });
      return ok(result);
    },
    {
      params: t.Object({ id: t.String({ format: "uuid" }) }),
      body: resetPasswordBody,
      response: {
        200: tSuccess(
          resetPasswordResponseSchema,
          "The new password. `generated: true` indicates the server picked a random one to share with the user.",
        ),
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Reset user password",
        description:
          "Forces a password reset for any user. Pass `password` to set a specific one, or omit it to let the server generate a temporary password. All active sessions for the target user are revoked.",
      },
    },
  );
