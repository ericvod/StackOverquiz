import { beforeEach, describe, expect, test } from "bun:test";
import { createOrPromoteAdmin } from "../../../src/modules/users/admin.service";
import { makeUserInput } from "../../factories/user.factory";
import { createBearerTokenHeader, readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";
import { resetDatabase } from "../../helpers/db";

const app = createTestApp();

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

async function registerUser(input = makeUserInput()) {
  const response = await postJson("/v1/auth/register", input);
  const payload = await readJson<{
    data: {
      user: { id: string; email: string };
      tokens: { accessToken: string; refreshToken: string };
    };
  }>(response);
  return { input, ...payload.data };
}

async function loginUser(email: string, password: string) {
  const response = await postJson("/v1/auth/login", { email, password });
  return {
    status: response.status,
    payload: await readJson<{
      success: boolean;
      data?: { tokens: { accessToken: string; refreshToken: string } };
      error?: { code: string };
    }>(response),
  };
}

describe("POST /v1/auth/change-password", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("updates the password and lets the user log in with the new one", async () => {
    const { input, tokens } = await registerUser();

    const changeResponse = await postJson(
      "/v1/auth/change-password",
      { currentPassword: input.password, newPassword: "brand-new-pass-456" },
      createBearerTokenHeader(tokens.accessToken),
    );
    expect(changeResponse.status).toBe(200);

    const oldLogin = await loginUser(input.email, input.password);
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.payload.error?.code).toBe("AUTH_INVALID_CREDENTIALS");

    const newLogin = await loginUser(input.email, "brand-new-pass-456");
    expect(newLogin.status).toBe(200);
    expect(newLogin.payload.success).toBe(true);
  });

  test("rejects an incorrect current password", async () => {
    const { tokens } = await registerUser();

    const response = await postJson(
      "/v1/auth/change-password",
      { currentPassword: "wrong-password", newPassword: "brand-new-pass-456" },
      createBearerTokenHeader(tokens.accessToken),
    );
    const payload = await readJson<{ success: boolean; error: { code: string } }>(response);

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  test("keeps the calling session alive but revokes other sessions of the same user", async () => {
    const { input } = await registerUser();

    // Create a second session by logging in again with the same credentials.
    const secondSession = await loginUser(input.email, input.password);
    expect(secondSession.status).toBe(200);
    const callerToken = secondSession.payload.data!.tokens.accessToken;
    const otherSession = await loginUser(input.email, input.password);
    const otherAccessToken = otherSession.payload.data!.tokens.accessToken;

    // Change password using the second session as caller.
    const changeResponse = await postJson(
      "/v1/auth/change-password",
      { currentPassword: input.password, newPassword: "another-fresh-pass-789" },
      createBearerTokenHeader(callerToken),
    );
    expect(changeResponse.status).toBe(200);

    // Caller token still works.
    const meCaller = await app.handle(
      new Request("http://localhost/v1/auth/me", { headers: createBearerTokenHeader(callerToken) }),
    );
    expect(meCaller.status).toBe(200);

    // Other session's access token is revoked.
    const meOther = await app.handle(
      new Request("http://localhost/v1/auth/me", { headers: createBearerTokenHeader(otherAccessToken) }),
    );
    expect(meOther.status).toBe(401);
  });

  test("returns 400 when the account has no local password (OAuth-only)", async () => {
    const { input, user, tokens } = await registerUser();

    // Simulate an OAuth-only account by stripping the local password hash.
    const { eq } = await import("drizzle-orm");
    const { db } = await import("../../../src/config/database");
    const { users } = await import("../../../src/db/schema");
    await db.update(users).set({ passwordHash: null }).where(eq(users.id, user.id));

    const response = await postJson(
      "/v1/auth/change-password",
      { currentPassword: input.password, newPassword: "brand-new-pass-456" },
      createBearerTokenHeader(tokens.accessToken),
    );
    const payload = await readJson<{ success: boolean; error: { code: string } }>(response);

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });
});

describe("POST /v1/admin/users/:id/reset-password", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function loginAsAdmin() {
    await createOrPromoteAdmin({
      email: "admin@example.com",
      username: "admin_user",
      password: "super-strong-pass-123",
    });
    const result = await loginUser("admin@example.com", "super-strong-pass-123");
    expect(result.status).toBe(200);
    return result.payload.data!.tokens.accessToken;
  }

  test("lets an admin set a specific password and the target user can log in with it", async () => {
    const adminToken = await loginAsAdmin();
    const target = await registerUser();

    const response = await postJson(
      `/v1/admin/users/${target.user.id}/reset-password`,
      { password: "admin-chosen-pass-1" },
      createBearerTokenHeader(adminToken),
    );
    const payload = await readJson<{
      success: boolean;
      data: { password: string; generated: boolean };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.data.password).toBe("admin-chosen-pass-1");
    expect(payload.data.generated).toBe(false);

    const login = await loginUser(target.input.email, "admin-chosen-pass-1");
    expect(login.status).toBe(200);
  });

  test("generates a temporary password when none is provided", async () => {
    const adminToken = await loginAsAdmin();
    const target = await registerUser();

    const response = await postJson(
      `/v1/admin/users/${target.user.id}/reset-password`,
      {},
      createBearerTokenHeader(adminToken),
    );
    const payload = await readJson<{
      data: { password: string; generated: boolean };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.data.generated).toBe(true);
    expect(payload.data.password.length).toBeGreaterThanOrEqual(12);

    const login = await loginUser(target.input.email, payload.data.password);
    expect(login.status).toBe(200);
  });

  test("revokes every active session of the target user", async () => {
    const adminToken = await loginAsAdmin();
    const target = await registerUser();

    const response = await postJson(
      `/v1/admin/users/${target.user.id}/reset-password`,
      { password: "admin-chosen-pass-2" },
      createBearerTokenHeader(adminToken),
    );
    expect(response.status).toBe(200);

    const meResponse = await app.handle(
      new Request("http://localhost/v1/auth/me", { headers: createBearerTokenHeader(target.tokens.accessToken) }),
    );
    expect(meResponse.status).toBe(401);
  });

  test("denies the route to non-admin users", async () => {
    const requester = await registerUser();
    const target = await registerUser();

    const response = await postJson(
      `/v1/admin/users/${target.user.id}/reset-password`,
      { password: "should-not-be-set-1" },
      createBearerTokenHeader(requester.tokens.accessToken),
    );

    expect(response.status).toBe(403);
  });
});
