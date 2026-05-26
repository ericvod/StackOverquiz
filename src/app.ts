import { Elysia } from "elysia";
import { categoriesAdminController } from "./modules/admin/categories-admin.controller";
import { contentAdminController } from "./modules/admin/content-admin.controller";
import { usersAdminController } from "./modules/admin/users-admin.controller";
import { aiController } from "./modules/ai/ai.controller";
import { authController } from "./modules/auth/auth.controller";
import { jwtPlugin } from "./modules/auth/auth.middleware";
import { createAuthSession, getSessionClientInfo, getTokenLifetimeSeconds } from "./modules/auth/auth.service";
import { categoriesController } from "./modules/categories/categories.controller";
import { practiceController } from "./modules/practice/practice.controller";
import { questionsController } from "./modules/questions/questions.controller";
import { quizzesController } from "./modules/quizzes/quizzes.controller";
import { ratingsController } from "./modules/ratings/ratings.controller";
import { uploadsController } from "./modules/uploads/uploads.controller";
import { usersController } from "./modules/users/users.controller";
import { corsPlugin } from "./plugins/cors";
import { swaggerPlugin } from "./plugins/swagger";
import { errorPlugin, ForbiddenError, UnauthorizedError } from "./shared/errors";
import { getHealthSnapshot } from "./shared/health/health.service";
import {
  renderApiPlaygroundActionsJs,
  renderApiPlaygroundApiClientJs,
  renderApiPlaygroundCoreJs,
  renderApiPlaygroundCss,
  renderApiPlaygroundEventsJs,
  renderApiPlaygroundForbiddenHtml,
  renderApiPlaygroundHtml,
  renderApiPlaygroundI18nJs,
  renderApiPlaygroundJs,
  renderApiPlaygroundLoginCss,
  renderApiPlaygroundLoginHtml,
  renderApiPlaygroundLoginJs,
  renderApiPlaygroundModalJs,
  renderApiPlaygroundNavigationJs,
  renderApiPlaygroundShellJs,
  renderApiPlaygroundStateJs,
  renderApiPlaygroundViewsJs,
} from "./shared/http/api-playground";
import { ok } from "./shared/http/api-response";
import {
  assertAdminUserRole,
  assertPlaygroundAdminSession,
  clearPlaygroundSessionCookie,
  createPlaygroundSessionCookie,
  getActiveAccessTokenSessionId,
} from "./shared/http/playground-session";
import { requestIdPlugin } from "./shared/http/request-id";

type JwtVerifier = {
  verify(token?: string): Promise<unknown | false>;
};

type PlaygroundAccessState = "ok" | "unauthorized" | "forbidden";

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
    },
  });
}

async function resolvePlaygroundAccess(request: Request, jwt: JwtVerifier): Promise<PlaygroundAccessState> {
  try {
    await assertPlaygroundAdminSession(jwt, request);
    return "ok";
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return "forbidden";
    }

    if (error instanceof UnauthorizedError) {
      return "unauthorized";
    }

    throw error;
  }
}

function deniedPlaygroundAssetResponse(state: PlaygroundAccessState) {
  const status = state === "forbidden" ? 403 : 401;
  const message = state === "forbidden" ? "Forbidden" : "Unauthorized";

  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export function createApp() {
  const apiV1 = new Elysia({ prefix: "/v1" })
    .use(authController)
    .use(questionsController)
    .use(quizzesController)
    .use(practiceController)
    .use(categoriesController)
    .use(ratingsController)
    .use(uploadsController)
    .use(aiController)
    .use(contentAdminController)
    .use(categoriesAdminController)
    .use(usersAdminController)
    .use(usersController);

  return new Elysia()
    .use(requestIdPlugin)
    .use(corsPlugin)
    .use(swaggerPlugin)
    .use(jwtPlugin)
    .get("/docs", () => redirect("/swagger"), { detail: { hide: true } })
    .get(
      "/playground/shared-assets/api-playground-i18n.js",
      () =>
        new Response(renderApiPlaygroundI18nJs(), {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
          },
        }),
    )
    .get(
      "/playground/login-assets/api-playground-login.css",
      () =>
        new Response(renderApiPlaygroundLoginCss(), {
          headers: {
            "content-type": "text/css; charset=utf-8",
          },
        }),
    )
    .get(
      "/playground/login-assets/api-playground-login.js",
      () =>
        new Response(renderApiPlaygroundLoginJs(), {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
          },
        }),
    )
    .get("/playground/assets/api-playground.css", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundCss(), {
        headers: {
          "content-type": "text/css; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-core.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundCoreJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-state.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundStateJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-api-client.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundApiClientJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-views.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundViewsJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-shell.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundShellJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-navigation.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundNavigationJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-actions.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundActionsJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-events.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundEventsJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground-modal.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundModalJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get("/playground/assets/api-playground.js", async ({ request, jwt }) => {
      const state = await resolvePlaygroundAccess(request, jwt);

      if (state !== "ok") {
        return deniedPlaygroundAssetResponse(state);
      }

      return new Response(renderApiPlaygroundJs(), {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    })
    .get(
      "/playground",
      () =>
        new Response(renderApiPlaygroundLoginHtml(), {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        }),
      { detail: { hide: true } },
    )
    .get(
      "/playground/forbidden",
      () =>
        new Response(renderApiPlaygroundForbiddenHtml(), {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        }),
      { detail: { hide: true } },
    )
    .get(
      "/playground/app",
      async ({ request, jwt }) => {
        const state = await resolvePlaygroundAccess(request, jwt);

        if (state === "unauthorized") {
          return redirect("/playground");
        }

        if (state === "forbidden") {
          return redirect("/playground/forbidden");
        }

        return new Response(renderApiPlaygroundHtml(), {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        });
      },
      { detail: { hide: true } },
    )
    .get(
      "/playground/session",
      async ({ request, jwt }) => {
        const state = await resolvePlaygroundAccess(request, jwt);

        if (state === "unauthorized") {
          throw new UnauthorizedError("Playground admin session required");
        }

        if (state === "forbidden") {
          throw new ForbiddenError("Admin access required");
        }

        return ok({
          authenticated: true,
        });
      },
      { detail: { hide: true } },
    )
    .post(
      "/playground/session",
      async ({ request, jwt, set }) => {
        const { userId, sessionId, role } = await getActiveAccessTokenSessionId(
          jwt,
          request.headers.get("authorization") ?? undefined,
        );

        if (role !== "admin") {
          throw new ForbiddenError("Admin access required");
        }

        await assertAdminUserRole(userId);

        set.headers["set-cookie"] = await createPlaygroundSessionCookie(jwt, {
          userId,
          sessionId,
        });

        return ok({
          authenticated: true,
        });
      },
      { detail: { hide: true } },
    )
    .delete(
      "/playground/session",
      ({ set }) => {
        set.headers["set-cookie"] = clearPlaygroundSessionCookie();

        return ok({
          authenticated: false,
        });
      },
      { detail: { hide: true } },
    )
    .get(
      "/playground/session-tokens",
      async ({ request, jwt }) => {
        const { userId } = await assertPlaygroundAdminSession(jwt, request);

        const { accessToken, refreshToken } = await createAuthSession(
          jwt,
          { id: userId, role: "admin" },
          getSessionClientInfo({
            "user-agent": request.headers.get("user-agent") ?? undefined,
            "x-forwarded-for": request.headers.get("x-forwarded-for") ?? undefined,
          }),
        );

        return ok({
          tokens: {
            accessToken,
            refreshToken,
            ...getTokenLifetimeSeconds(),
          },
        });
      },
      { detail: { hide: true } },
    )
    .get(
      "/health",
      async ({ set }) => {
        const healthSnapshot = await getHealthSnapshot();

        if (healthSnapshot.status !== "ok") {
          set.status = 503;
        }

        return ok(healthSnapshot);
      },
      {
        detail: {
          tags: ["System"],
          summary: "Health check",
          description: "Returns the current health status of the API and its dependencies.",
        },
      },
    )
    .use(apiV1)
    .use(errorPlugin);
}

export type App = ReturnType<typeof createApp>;
