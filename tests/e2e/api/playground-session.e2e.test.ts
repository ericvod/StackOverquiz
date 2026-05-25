import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { users } from "../../../src/db/schema";
import { createOrPromoteAdmin } from "../../../src/modules/users/admin.service";
import { makeUserInput } from "../../factories/user.factory";
import { readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";
import { resetDatabase } from "../../helpers/db";

const app = createTestApp();

type AuthEnvelope = {
  success: boolean;
  data: {
    user: {
      id: string;
      role: "user" | "admin";
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  meta: {
    apiVersion: string;
  };
};

type SessionEnvelope = {
  success: boolean;
  data: {
    authenticated: boolean;
  };
  meta: {
    apiVersion: string;
  };
};

type ErrorEnvelope = {
  success: boolean;
  error: {
    code: string;
    message: string;
  };
  meta: {
    apiVersion: string;
  };
};

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

function extractCookiePair(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    return null;
  }

  return setCookieHeader.split(";")[0] ?? null;
}

describe("Playground session gateway", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("allows admin users to open, use, and close a playground session", async () => {
    const adminInput = makeUserInput({
      username: `playground_admin_${Date.now().toString(36)}`,
      email: `playground_admin_${Date.now().toString(36)}@example.com`,
    });

    await createOrPromoteAdmin({
      email: adminInput.email,
      username: adminInput.username,
      password: adminInput.password,
    });

    const loginResponse = await postJson("/v1/auth/login", {
      email: adminInput.email,
      password: adminInput.password,
    });
    const loginPayload = await readJson<AuthEnvelope>(loginResponse);

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.success).toBe(true);
    expect(loginPayload.data.user.role).toBe("admin");

    const bootstrapResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "POST",
        headers: {
          authorization: `Bearer ${loginPayload.data.tokens.accessToken}`,
        },
      }),
    );
    const bootstrapPayload = await readJson<SessionEnvelope>(bootstrapResponse);

    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapPayload.success).toBe(true);
    expect(bootstrapPayload.meta.apiVersion).toBe("v1");
    expect(bootstrapPayload.data.authenticated).toBe(true);

    const setCookieHeader = bootstrapResponse.headers.get("set-cookie");

    expect(setCookieHeader).toContain("stackoverquiz_playground=");
    expect(setCookieHeader).toContain("HttpOnly");

    const playgroundCookie = extractCookiePair(setCookieHeader);
    expect(playgroundCookie).toBeTruthy();

    const sessionResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const sessionPayload = await readJson<SessionEnvelope>(sessionResponse);

    expect(sessionResponse.status).toBe(200);
    expect(sessionPayload.success).toBe(true);
    expect(sessionPayload.meta.apiVersion).toBe("v1");
    expect(sessionPayload.data.authenticated).toBe(true);

    const appResponse = await app.handle(
      new Request("http://localhost/playground/app", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const appHtml = await appResponse.text();

    expect(appResponse.status).toBe(200);
    expect(appHtml).toContain("StackOverquiz API Playground");

    const navigationAssetResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-navigation.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const navigationAsset = await navigationAssetResponse.text();

    expect(navigationAssetResponse.status).toBe(200);
    expect(navigationAsset).toContain("global.PlaygroundNavigation");

    const logoutResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "DELETE",
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const logoutPayload = await readJson<SessionEnvelope>(logoutResponse);

    expect(logoutResponse.status).toBe(200);
    expect(logoutPayload.success).toBe(true);
    expect(logoutPayload.meta.apiVersion).toBe("v1");
    expect(logoutPayload.data.authenticated).toBe(false);
    expect(logoutResponse.headers.get("set-cookie")).toContain("Max-Age=0");

    const noSessionResponse = await app.handle(new Request("http://localhost/playground/session"));
    const noSessionPayload = await readJson<ErrorEnvelope>(noSessionResponse);

    expect(noSessionResponse.status).toBe(401);
    expect(noSessionPayload.success).toBe(false);
    expect(noSessionPayload.meta.apiVersion).toBe("v1");
    expect(noSessionPayload.error.code).toBe("UNAUTHORIZED");
  });

  test("denies non-admin users when trying to bootstrap playground session", async () => {
    const regularUserInput = makeUserInput({
      username: `playground_user_${Date.now().toString(36)}`,
      email: `playground_user_${Date.now().toString(36)}@example.com`,
    });

    const registerResponse = await postJson("/v1/auth/register", regularUserInput);
    const registerPayload = await readJson<AuthEnvelope>(registerResponse);

    expect(registerResponse.status).toBe(200);
    expect(registerPayload.success).toBe(true);
    expect(registerPayload.data.user.role).toBe("user");

    const bootstrapResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "POST",
        headers: {
          authorization: `Bearer ${registerPayload.data.tokens.accessToken}`,
        },
      }),
    );
    const bootstrapPayload = await readJson<ErrorEnvelope>(bootstrapResponse);

    expect(bootstrapResponse.status).toBe(403);
    expect(bootstrapPayload.success).toBe(false);
    expect(bootstrapPayload.meta.apiVersion).toBe("v1");
    expect(bootstrapPayload.error.code).toBe("FORBIDDEN");
    expect(bootstrapPayload.error.message).toBe("Admin access required");
    expect(bootstrapResponse.headers.get("set-cookie")).toBeNull();

    const appResponse = await app.handle(new Request("http://localhost/playground/app"));

    expect(appResponse.status).toBe(302);
    expect(appResponse.headers.get("location")).toBe("/playground");
  });

  test("blocks a previously bootstrapped session after admin role revocation", async () => {
    const adminInput = makeUserInput({
      username: `playground_revoked_${Date.now().toString(36)}`,
      email: `playground_revoked_${Date.now().toString(36)}@example.com`,
    });

    await createOrPromoteAdmin({
      email: adminInput.email,
      username: adminInput.username,
      password: adminInput.password,
    });

    const loginResponse = await postJson("/v1/auth/login", {
      email: adminInput.email,
      password: adminInput.password,
    });
    const loginPayload = await readJson<AuthEnvelope>(loginResponse);

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.success).toBe(true);
    expect(loginPayload.data.user.role).toBe("admin");

    const bootstrapResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "POST",
        headers: {
          authorization: `Bearer ${loginPayload.data.tokens.accessToken}`,
        },
      }),
    );

    const playgroundCookie = extractCookiePair(bootstrapResponse.headers.get("set-cookie"));

    expect(bootstrapResponse.status).toBe(200);
    expect(playgroundCookie).toBeTruthy();

    await db
      .update(users)
      .set({
        role: "user",
      })
      .where(eq(users.id, loginPayload.data.user.id));

    const revokedSessionResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const revokedSessionPayload = await readJson<ErrorEnvelope>(revokedSessionResponse);

    expect(revokedSessionResponse.status).toBe(403);
    expect(revokedSessionPayload.success).toBe(false);
    expect(revokedSessionPayload.meta.apiVersion).toBe("v1");
    expect(revokedSessionPayload.error.code).toBe("FORBIDDEN");

    const appResponse = await app.handle(
      new Request("http://localhost/playground/app", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );

    expect(appResponse.status).toBe(302);
    expect(appResponse.headers.get("location")).toBe("/playground/forbidden");

    const assetResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-core.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );

    expect(assetResponse.status).toBe(403);
    expect(await assetResponse.text()).toContain("Forbidden");
  });
});
