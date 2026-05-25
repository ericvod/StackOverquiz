import { Elysia, t } from "elysia";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tPaged, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import {
  leaderboardUserSchema,
  patchMeBody,
  publicProfileSchema,
  userHistoryItemSchema,
  userHistoryQuery,
  userProfileParams,
} from "./users.schema";
import * as usersService from "./users.service";

/**
 * HTTP routes for public profiles, leaderboard data and private history access.
 */
export const usersController = new Elysia({ detail: { tags: ["Users"] } })

  // ─── User Profile (public) ────────────────────────────────────────────
  .get(
    "/users/:id/profile",
    async ({ params }) => {
      const profile = await usersService.getUserProfile(params.id);
      return ok(profile);
    },
    {
      params: userProfileParams,
      response: {
        200: tSuccess(publicProfileSchema, "The user profile data"),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get public profile",
        description: "Returns public information and platform statistics for any user.",
      },
    },
  )

  // ─── Global Leaderboard ───────────────────────────────────────────────
  .get(
    "/leaderboard",
    async ({ query }) => {
      const leaderboard = await usersService.getLeaderboard(query.limit);
      return ok(leaderboard);
    },
    {
      query: t.Object({ limit: t.Optional(t.Numeric({ default: 50 })) }),
      response: {
        200: tSuccess(t.Array(leaderboardUserSchema), "The current global leaderboard ranking"),
        400: defaultErrorResponses[400],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get global leaderboard",
        description: "Returns the top users on the platform ranked by XP.",
      },
    },
  )

  // ─── Authenticated routes ─────────────────────────────────────────────
  .use(authGuard)

  // ─── Update Own Profile ───────────────────────────────────────────────
  .patch(
    "/users/me",
    async ({ body, userId }) => {
      const updated = await usersService.updateProfile(userId, body);
      return ok(updated);
    },
    {
      body: patchMeBody,
      response: {
        200: tSuccess(
          t.Object({
            id: t.String({ format: "uuid" }),
            username: t.String(),
            avatarUrl: t.Union([t.String(), t.Null()]),
          }),
          "Updated profile fields",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Update my profile",
        description: "Updates the authenticated user's mutable profile fields (username, avatar).",
      },
    },
  )

  // ─── User History (private) ───────────────────────────────────────────
  .get(
    "/users/:id/history",
    async ({ params, query, userId, userRole }) => {
      return await usersService.getUserHistory(params.id, userId, userRole, query);
    },
    {
      params: userProfileParams,
      query: userHistoryQuery,
      response: {
        200: tPaged(userHistoryItemSchema, "Paginated list of the user's completed quizzes"),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        403: defaultErrorResponses[403],
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get private user history",
        description: "Returns the quiz attempt history. Can only be accessed by the user themselves or by an admin.",
      },
    },
  );
