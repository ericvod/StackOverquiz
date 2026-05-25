import { t } from "elysia";

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerBody = t.Object({
  username: t.String({ minLength: 3, maxLength: 50 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

export const refreshBody = t.Object({
  refreshToken: t.String(),
});

export const logoutBody = t.Object({
  refreshToken: t.String(),
});

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePasswordBody = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
});

// Response Schemas

export const userSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  email: t.String({ format: "email" }),
  avatarUrl: t.Union([t.String(), t.Null()]),
  role: t.Union([t.Literal("user"), t.Literal("admin")]),
  xp: t.Number(),
  level: t.Number(),
  createdAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});

export const tokenBundleSchema = t.Object({
  tokenType: t.Literal("Bearer"),
  accessToken: t.String(),
  refreshToken: t.String(),
  accessTokenExpiresInSeconds: t.Number(),
  refreshTokenExpiresInSeconds: t.Number(),
});

export const authResponseSchema = t.Object({
  user: userSchema,
  tokens: tokenBundleSchema,
});

export const refreshResponseSchema = t.Object({
  tokens: tokenBundleSchema,
});
