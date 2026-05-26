import { describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { createOrPromoteAdmin } from "../../../src/modules/users/admin.service";
import { readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";

interface AuthEnvelope {
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
}

function extractCookiePair(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    return null;
  }

  return setCookieHeader.split(";")[0] ?? null;
}

async function canUseDatabase() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

function buildUniqueUser(overrides = {}) {
  const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  return {
    username: `playground_user_${suffix}`,
    email: `playground_user_${suffix}@example.com`,
    password: "test-password-123",
    ...overrides,
  };
}

describe("GET /playground", () => {
  test("renders the public admin login gateway instead of the protected app", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/playground"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Acesso administrativo");
    expect(html).toContain("/playground/shared-assets/api-playground-i18n.js");
    expect(html).toContain("/playground/login-assets/api-playground-login.css");
    expect(html).toContain("/playground/login-assets/api-playground-login.js");
  });

  test("redirects legacy /docs entrypoint to /swagger", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/docs"));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/swagger");
  });

  test("serves the login gateway assets without requiring an admin cookie", async () => {
    const app = createTestApp();
    const cssResponse = await app.handle(
      new Request("http://localhost/playground/login-assets/api-playground-login.css"),
    );
    const jsResponse = await app.handle(
      new Request("http://localhost/playground/login-assets/api-playground-login.js"),
    );

    const css = await cssResponse.text();
    const js = await jsResponse.text();

    expect(cssResponse.status).toBe(200);
    expect(cssResponse.headers.get("content-type")).toContain("text/css");
    expect(css).toContain(".gateway-layout");
    expect(css).toContain(".gateway-panel");

    expect(jsResponse.status).toBe(200);
    expect(jsResponse.headers.get("content-type")).toContain("application/javascript");
    expect(js).toContain("detectExistingSession");
    expect(js).toContain("openPlaygroundSession");
  });

  test("blocks app route and protected assets when no playground admin session exists", async () => {
    const app = createTestApp();
    const appResponse = await app.handle(new Request("http://localhost/playground/app"));
    const cssResponse = await app.handle(new Request("http://localhost/playground/assets/api-playground.css"));
    const coreResponse = await app.handle(new Request("http://localhost/playground/assets/api-playground-core.js"));
    const stateResponse = await app.handle(new Request("http://localhost/playground/assets/api-playground-state.js"));
    const apiClientResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-api-client.js"),
    );
    const viewsResponse = await app.handle(new Request("http://localhost/playground/assets/api-playground-views.js"));
    const shellResponse = await app.handle(new Request("http://localhost/playground/assets/api-playground-shell.js"));
    const navigationResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-navigation.js"),
    );
    const actionsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-actions.js"),
    );
    const eventsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-events.js"),
    );

    expect(appResponse.status).toBe(302);
    expect(appResponse.headers.get("location")).toBe("/playground");

    expect(cssResponse.status).toBe(401);
    expect(await cssResponse.text()).toContain("Unauthorized");
    expect(coreResponse.status).toBe(401);
    expect(await coreResponse.text()).toContain("Unauthorized");
    expect(stateResponse.status).toBe(401);
    expect(await stateResponse.text()).toContain("Unauthorized");
    expect(apiClientResponse.status).toBe(401);
    expect(await apiClientResponse.text()).toContain("Unauthorized");
    expect(viewsResponse.status).toBe(401);
    expect(await viewsResponse.text()).toContain("Unauthorized");
    expect(shellResponse.status).toBe(401);
    expect(await shellResponse.text()).toContain("Unauthorized");
    expect(navigationResponse.status).toBe(401);
    expect(await navigationResponse.text()).toContain("Unauthorized");
    expect(actionsResponse.status).toBe(401);
    expect(await actionsResponse.text()).toContain("Unauthorized");
    expect(eventsResponse.status).toBe(401);
    expect(await eventsResponse.text()).toContain("Unauthorized");
  });

  test("rejects non-admin accounts when creating playground session cookie", async () => {
    if (!(await canUseDatabase())) {
      return;
    }

    const app = createTestApp();
    const user = buildUniqueUser();

    const registerResponse = await app.handle(
      new Request("http://localhost/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(user),
      }),
    );

    const payload = await readJson<AuthEnvelope>(registerResponse);
    const accessToken = payload.data.tokens.accessToken;

    const bootstrapResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    expect(bootstrapResponse.status).toBe(403);
    expect(bootstrapResponse.headers.get("set-cookie")).toBeNull();
  });

  test("issues admin playground cookie and serves protected app plus assets", async () => {
    if (!(await canUseDatabase())) {
      return;
    }

    const app = createTestApp();
    const adminUser = buildUniqueUser({
      username: `playground_admin_${Date.now().toString(36)}`,
    });

    await createOrPromoteAdmin({
      email: adminUser.email,
      username: adminUser.username,
      password: adminUser.password,
    });

    const loginResponse = await app.handle(
      new Request("http://localhost/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: adminUser.email,
          password: adminUser.password,
        }),
      }),
    );

    const loginPayload = await readJson<AuthEnvelope>(loginResponse);
    const accessToken = loginPayload.data.tokens.accessToken;

    const bootstrapResponse = await app.handle(
      new Request("http://localhost/playground/session", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    expect(bootstrapResponse.status).toBe(200);
    const setCookieHeader = bootstrapResponse.headers.get("set-cookie");
    expect(setCookieHeader).toContain("stackoverquiz_playground=");
    expect(setCookieHeader).toContain("HttpOnly");

    const playgroundCookie = extractCookiePair(setCookieHeader);
    expect(playgroundCookie).toBeTruthy();

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
    expect(appHtml).toContain("exitPlaygroundBtn");
    expect(appHtml).toContain("/playground/assets/api-playground-core.js");
    expect(appHtml).toContain("/playground/assets/api-playground-state.js");
    expect(appHtml).toContain("/playground/assets/api-playground-api-client.js");
    expect(appHtml).toContain("/playground/assets/api-playground-views.js");
    expect(appHtml).toContain("/playground/assets/api-playground-shell.js");
    expect(appHtml).toContain("/playground/assets/api-playground-navigation.js");
    expect(appHtml).toContain("/playground/assets/api-playground-actions.js");
    expect(appHtml).toContain("/playground/assets/api-playground-events.js");

    const cssResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground.css", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const coreResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-core.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const stateResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-state.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const apiClientResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-api-client.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const viewsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-views.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const shellResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-shell.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const navigationResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-navigation.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const actionsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-actions.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const eventsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground-events.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const jsResponse = await app.handle(
      new Request("http://localhost/playground/assets/api-playground.js", {
        headers: {
          cookie: playgroundCookie!,
        },
      }),
    );
    const css = await cssResponse.text();
    const core = await coreResponse.text();
    const stateModule = await stateResponse.text();
    const apiClientModule = await apiClientResponse.text();
    const viewsModule = await viewsResponse.text();
    const shellModule = await shellResponse.text();
    const navigationModule = await navigationResponse.text();
    const actionsModule = await actionsResponse.text();
    const eventsModule = await eventsResponse.text();
    const js = await jsResponse.text();

    expect(cssResponse.status).toBe(200);
    expect(coreResponse.status).toBe(200);
    expect(stateResponse.status).toBe(200);
    expect(apiClientResponse.status).toBe(200);
    expect(viewsResponse.status).toBe(200);
    expect(shellResponse.status).toBe(200);
    expect(navigationResponse.status).toBe(200);
    expect(actionsResponse.status).toBe(200);
    expect(eventsResponse.status).toBe(200);
    expect(jsResponse.status).toBe(200);

    expect(css).toContain(".content-layout");
    expect(core).toContain("global.PlaygroundCore");
    expect(stateModule).toContain("global.PlaygroundState");
    expect(apiClientModule).toContain("global.PlaygroundApiClient");
    expect(viewsModule).toContain("global.PlaygroundViews");
    expect(shellModule).toContain("global.PlaygroundShell");
    expect(navigationModule).toContain("global.PlaygroundNavigation");
    expect(actionsModule).toContain("global.PlaygroundActions");
    expect(eventsModule).toContain("global.PlaygroundEvents");
    expect(js).toContain("const stateModule = window.PlaygroundState");
    expect(js).toContain("const viewsModule = window.PlaygroundViews");
    expect(js).toContain("const shellModule = window.PlaygroundShell");
    expect(js).toContain("const navigationModule = window.PlaygroundNavigation");
    expect(js).toContain("const actionsModule = window.PlaygroundActions");
    expect(js).toContain("const eventsModule = window.PlaygroundEvents");
    expect(js).toContain("function bootstrap()");
  });
});
