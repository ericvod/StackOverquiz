import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { env } from "../../config/env";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import type { JwtPayload } from "../../shared/types";
import { getSessionById } from "./session.repository";

export const jwtPlugin = new Elysia({ name: "jwt" }).use(
  jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
  }),
);

async function verifyActiveAccessToken(jwt: { verify(token?: string): Promise<unknown | false> }, token: string) {
  const payload = (await jwt.verify(token)) as JwtPayload | false;

  if (!payload || payload.type !== "access" || !payload.sid) {
    throw new UnauthorizedError("Invalid or expired token", ERROR_CODES.AUTH_INVALID_ACCESS_TOKEN);
  }

  const session = await getSessionById(payload.sid);
  const sessionExpired = !session || session.expiresAt.getTime() <= Date.now();
  const sessionRevoked = session?.revokedAt !== null;

  if (sessionExpired || sessionRevoked || session.userId !== payload.sub) {
    throw new UnauthorizedError("Invalid or expired token", ERROR_CODES.AUTH_INVALID_ACCESS_TOKEN);
  }

  return payload;
}

export const authGuard = new Elysia({ name: "auth-guard", seed: "auth-guard" })
  .use(jwtPlugin)
  .derive(
    { as: "scoped" },
    async ({ jwt, headers }): Promise<{ userId: string; userRole: string; sessionId: string }> => {
      const authorization = headers.authorization;

      if (!authorization?.startsWith("Bearer ")) {
        throw new UnauthorizedError("Missing or invalid authorization header", ERROR_CODES.AUTH_INVALID_ACCESS_TOKEN);
      }

      const token = authorization.slice(7);
      const payload = await verifyActiveAccessToken(jwt, token);

      return {
        userId: payload.sub,
        userRole: payload.role,
        sessionId: payload.sid,
      };
    },
  );

export const optionalAuth = new Elysia({ name: "optional-auth", seed: "optional-auth" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }): Promise<{ viewerUserId?: string; viewerUserRole?: string }> => {
    const authorization = headers.authorization;

    if (!authorization) {
      return {};
    }

    if (!authorization.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header", ERROR_CODES.AUTH_INVALID_ACCESS_TOKEN);
    }

    const token = authorization.slice(7);
    const payload = await verifyActiveAccessToken(jwt, token);

    return {
      viewerUserId: payload.sub,
      viewerUserRole: payload.role,
    };
  });

export const adminGuard = new Elysia({ name: "admin-guard", seed: "admin-guard" })
  .use(authGuard)
  .onBeforeHandle({ as: "scoped" }, ({ userRole }) => {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  });
