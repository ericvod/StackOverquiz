import { Elysia, t } from "elysia";
import { BadRequestError, UnauthorizedError } from "../../shared/errors";
import { created, noContent, ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tError, tSuccess } from "../../shared/http/api-response.schema";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { authGuard, jwtPlugin } from "./auth.middleware";
import {
  authResponseSchema,
  changePasswordBody,
  loginBody,
  logoutBody,
  refreshBody,
  refreshResponseSchema,
  registerBody,
  userSchema,
} from "./auth.schema";
import * as authService from "./auth.service";
import { getGithubAuthUrl, getGithubUser } from "./oauth/github";
import { getGoogleAuthUrl, getGoogleUser } from "./oauth/google";
import { consumeOAuthState, issueOAuthState } from "./oauth/oauth.state";

function toAuthenticatedUser(user: {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  role: "user" | "admin";
  xp?: number;
  level?: number;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    createdAt: user.createdAt?.toISOString() ?? null,
  };
}

function toTokenBundle(accessToken: string, refreshToken: string) {
  return {
    tokenType: "Bearer" as const,
    accessToken,
    refreshToken,
    ...authService.getTokenLifetimeSeconds(),
  };
}

/**
 * HTTP routes for account lifecycle, OAuth handoff and session management.
 */
export const authController = new Elysia({ prefix: "/auth", detail: { tags: ["Auth"] } })
  .use(jwtPlugin)

  // ─── Register ──────────────────────────────────────────────────────────
  .post(
    "/register",
    async ({ body, jwt, headers }) => {
      const user = await authService.register(body);

      const { accessToken, refreshToken } = await authService.createAuthSession(
        jwt,
        { id: user.id, role: user.role },
        authService.getSessionClientInfo(headers),
      );

      return created({
        user: toAuthenticatedUser(user),
        tokens: toTokenBundle(accessToken, refreshToken),
      });
    },
    {
      body: registerBody,
      response: {
        201: tSuccess(authResponseSchema, "User created and authenticated successfully"),
        400: defaultErrorResponses[400],
        409: defaultErrorResponses[409],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Register a new user",
        description: "Creates a new local user account and issues session tokens.",
      },
    },
  )

  // ─── Login ─────────────────────────────────────────────────────────────
  .post(
    "/login",
    async ({ body, jwt, headers }) => {
      const user = await authService.login(body.email, body.password);

      const { accessToken, refreshToken } = await authService.createAuthSession(
        jwt,
        { id: user.id, role: user.role },
        authService.getSessionClientInfo(headers),
      );

      return ok({
        user: toAuthenticatedUser(user),
        tokens: toTokenBundle(accessToken, refreshToken),
      });
    },
    {
      body: loginBody,
      response: {
        200: tSuccess(authResponseSchema, "User authenticated successfully"),
        400: defaultErrorResponses[400],
        401: tError("Invalid email or password"),
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Login user",
        description: "Authenticates a local user using email and password.",
      },
    },
  )

  // ─── Refresh ───────────────────────────────────────────────────────────
  .post(
    "/refresh",
    async ({ body, jwt }) => {
      const payload = await authService.verifyRefreshTokenPayload(jwt, body.refreshToken);
      const { accessToken, refreshToken } = await authService.rotateAuthSession(jwt, payload, body.refreshToken);

      return ok({
        tokens: toTokenBundle(accessToken, refreshToken),
      });
    },
    {
      body: refreshBody,
      response: {
        200: tSuccess(refreshResponseSchema, "Session refreshed successfully"),
        400: defaultErrorResponses[400],
        401: tError("Invalid or expired refresh token"),
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Refresh session",
        description: "Rotates the authentication session using a valid refresh token.",
      },
    },
  )

  // ─── Google OAuth ──────────────────────────────────────────────────────
  .get("/google", ({ redirect }) => {
    const state = issueOAuthState("google");
    return redirect(getGoogleAuthUrl(state));
  })
  .get(
    "/google/callback",
    async ({ query, jwt, headers }) => {
      if (!consumeOAuthState("google", query.state)) {
        throw new BadRequestError("Invalid Google OAuth state", ERROR_CODES.AUTH_INVALID_OAUTH_STATE);
      }

      const googleUser = await getGoogleUser(query.code);
      const user = await authService.findOrCreateOAuthUser(googleUser);
      const { accessToken, refreshToken } = await authService.createAuthSession(
        jwt,
        { id: user.id, role: user.role },
        authService.getSessionClientInfo(headers),
      );

      return ok({
        user: toAuthenticatedUser(user),
        tokens: toTokenBundle(accessToken, refreshToken),
      });
    },
    {
      query: t.Object({ code: t.String(), state: t.String() }),
      response: {
        200: tSuccess(authResponseSchema, "Google OAuth authentication successful"),
        400: tError("Invalid Google OAuth state or missing code"),
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Google OAuth Callback",
        description:
          "Handles the callback from Google OAuth, exchanging the code for user information and issuing session tokens.",
        hide: true,
      },
    },
  )

  // ─── GitHub OAuth ──────────────────────────────────────────────────────
  .get("/github", ({ redirect }) => {
    const state = issueOAuthState("github");
    return redirect(getGithubAuthUrl(state));
  })
  .get(
    "/github/callback",
    async ({ query, jwt, headers }) => {
      if (!consumeOAuthState("github", query.state)) {
        throw new BadRequestError("Invalid GitHub OAuth state", ERROR_CODES.AUTH_INVALID_OAUTH_STATE);
      }

      const githubUser = await getGithubUser(query.code);
      const user = await authService.findOrCreateOAuthUser(githubUser);
      const { accessToken, refreshToken } = await authService.createAuthSession(
        jwt,
        { id: user.id, role: user.role },
        authService.getSessionClientInfo(headers),
      );

      return ok({
        user: toAuthenticatedUser(user),
        tokens: toTokenBundle(accessToken, refreshToken),
      });
    },
    {
      query: t.Object({ code: t.String(), state: t.String() }),
      response: {
        200: tSuccess(authResponseSchema, "GitHub OAuth authentication successful"),
        400: tError("Invalid GitHub OAuth state or missing code"),
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "GitHub OAuth Callback",
        description:
          "Handles the callback from GitHub OAuth, exchanging the code for user information and issuing session tokens.",
        hide: true,
      },
    },
  )

  // ─── Me ────────────────────────────────────────────────────────────────
  .use(authGuard)
  .get(
    "/me",
    async ({ userId }) => {
      const user = await authService.getUserById(userId);
      return ok(toAuthenticatedUser(user));
    },
    {
      response: {
        200: tSuccess(userSchema, "Authenticated user data"),
        401: defaultErrorResponses[401],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get current user",
        description:
          "Returns the profile information of the currently authenticated user based on the active access token.",
      },
    },
  )
  // ─── Change Password ──────────────────────────────────────────────────
  .post(
    "/change-password",
    async ({ body, userId, sessionId }) => {
      await authService.changePassword({
        userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        currentSessionId: sessionId,
      });
      return noContent();
    },
    {
      body: changePasswordBody,
      response: {
        200: tSuccess(t.Null(), "Password updated successfully"),
        400: defaultErrorResponses[400],
        401: tError("Current password is incorrect or session is invalid"),
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Change own password",
        description:
          "Updates the authenticated user's password after verifying the current one. All other active sessions for this user are revoked — only the calling session keeps working.",
      },
    },
  )

  .post(
    "/logout",
    async ({ body, jwt, userId }) => {
      const payload = await authService.verifyRefreshTokenPayload(jwt, body.refreshToken);

      if (payload.sub !== userId) {
        throw new UnauthorizedError(
          "Refresh token does not belong to the authenticated user",
          ERROR_CODES.AUTH_REFRESH_TOKEN_SUBJECT_MISMATCH,
        );
      }

      await authService.revokeAuthSession(payload, body.refreshToken);

      return noContent();
    },
    {
      body: logoutBody,
      response: {
        200: tSuccess(t.Null(), "Session revoked successfully"),
        400: defaultErrorResponses[400],
        401: tError("Refresh token does not belong to the authenticated user or is invalid"),
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Logout user",
        description: "Revokes the provided refresh token session.",
      },
    },
  );
