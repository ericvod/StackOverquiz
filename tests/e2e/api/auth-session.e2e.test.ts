import { beforeEach, describe, expect, test } from "bun:test";
import { makeUserInput } from "../../factories/user.factory";
import { createBearerTokenHeader, readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";
import { resetDatabase } from "../../helpers/db";

const app = createTestApp();

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("Auth session flow", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("registers a user and returns an authenticated profile compatible with the mobile contract", async () => {
    const userInput = makeUserInput();

    const registerResponse = await postJson("/v1/auth/register", userInput);
    const registerPayload = await readJson<{
      success: boolean;
      data: {
        user: {
          id: string;
          username: string;
          email: string;
          role: "user" | "admin";
          xp: number;
          level: number;
          avatarUrl: string | null;
          createdAt: string | null;
        };
        tokens: {
          tokenType: "Bearer";
          accessToken: string;
          refreshToken: string;
          accessTokenExpiresInSeconds: number;
          refreshTokenExpiresInSeconds: number;
        };
      };
      meta: { apiVersion: string };
    }>(registerResponse);

    expect(registerResponse.status).toBe(200);
    expect(registerPayload.success).toBe(true);
    expect(registerPayload.meta.apiVersion).toBe("v1");
    expect(registerPayload.data.user.email).toBe(userInput.email);
    expect(registerPayload.data.tokens.tokenType).toBe("Bearer");
    expect(registerPayload.data.tokens.accessToken.length).toBeGreaterThan(20);
    expect(registerPayload.data.tokens.refreshToken.length).toBeGreaterThan(20);

    const meResponse = await app.handle(
      new Request("http://localhost/v1/auth/me", {
        headers: createBearerTokenHeader(registerPayload.data.tokens.accessToken),
      }),
    );
    const mePayload = await readJson<{
      success: boolean;
      data: {
        id: string;
        username: string;
        email: string;
        role: "user" | "admin";
      };
      meta: { apiVersion: string };
    }>(meResponse);

    expect(meResponse.status).toBe(200);
    expect(mePayload.success).toBe(true);
    expect(mePayload.meta.apiVersion).toBe("v1");
    expect(mePayload.data.id).toBe(registerPayload.data.user.id);
    expect(mePayload.data.username).toBe(userInput.username);
    expect(mePayload.data.email).toBe(userInput.email);
  });

  test("rotates refresh tokens and rejects reuse of the previous token", async () => {
    const registerResponse = await postJson("/v1/auth/register", makeUserInput());
    const registerPayload = await readJson<{
      data: {
        tokens: {
          refreshToken: string;
        };
      };
    }>(registerResponse);

    const firstRefreshToken = registerPayload.data.tokens.refreshToken;

    const refreshResponse = await postJson("/v1/auth/refresh", {
      refreshToken: firstRefreshToken,
    });
    const refreshPayload = await readJson<{
      success: boolean;
      data: {
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      };
      meta: { apiVersion: string };
    }>(refreshResponse);

    expect(refreshResponse.status).toBe(200);
    expect(refreshPayload.success).toBe(true);
    expect(refreshPayload.meta.apiVersion).toBe("v1");
    expect(refreshPayload.data.tokens.refreshToken).not.toBe(firstRefreshToken);
    expect(refreshPayload.data.tokens.accessToken.length).toBeGreaterThan(20);

    const staleRefreshResponse = await postJson("/v1/auth/refresh", {
      refreshToken: firstRefreshToken,
    });
    const staleRefreshPayload = await readJson<{
      success: boolean;
      error: {
        code: string;
      };
      meta: { apiVersion: string };
    }>(staleRefreshResponse);

    expect(staleRefreshResponse.status).toBe(401);
    expect(staleRefreshPayload.success).toBe(false);
    expect(staleRefreshPayload.meta.apiVersion).toBe("v1");
    expect(staleRefreshPayload.error.code).toBe("AUTH_INVALID_REFRESH_TOKEN");
  });

  test("revokes the current session on logout and immediately invalidates the access token", async () => {
    const registerResponse = await postJson("/v1/auth/register", makeUserInput());
    const registerPayload = await readJson<{
      success: boolean;
      data: {
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      };
    }>(registerResponse);

    const accessToken = registerPayload.data.tokens.accessToken;
    const refreshToken = registerPayload.data.tokens.refreshToken;

    const logoutResponse = await postJson(
      "/v1/auth/logout",
      { refreshToken },
      createBearerTokenHeader(accessToken),
    );
    const logoutPayload = await readJson<{
      success: boolean;
      data: null;
      meta: { apiVersion: string };
    }>(logoutResponse);

    expect(logoutResponse.status).toBe(200);
    expect(logoutPayload.success).toBe(true);
    expect(logoutPayload.meta.apiVersion).toBe("v1");

    const meResponse = await app.handle(
      new Request("http://localhost/v1/auth/me", {
        headers: createBearerTokenHeader(accessToken),
      }),
    );
    const mePayload = await readJson<{
      success: boolean;
      error: {
        code: string;
      };
      meta: { apiVersion: string };
    }>(meResponse);

    expect(meResponse.status).toBe(401);
    expect(mePayload.success).toBe(false);
    expect(mePayload.meta.apiVersion).toBe("v1");
    expect(mePayload.error.code).toBe("AUTH_INVALID_ACCESS_TOKEN");
  });
});
