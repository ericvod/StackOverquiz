import { t } from "elysia";

export const listUsersQuery = t.Object({
  search: t.Optional(t.String({ description: "Filter by username or email (case-insensitive, partial match)" })),
  role: t.Optional(t.Union([t.Literal("user"), t.Literal("admin")])),
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const adminUserItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String(),
  email: t.String({ format: "email" }),
  role: t.Union([t.Literal("user"), t.Literal("admin")]),
  xp: t.Number(),
  level: t.Number(),
  createdAt: t.String({ format: "date-time" }),
});

export const resetPasswordBody = t.Object({
  password: t.Optional(t.String({ minLength: 8, maxLength: 128 })),
});

export const resetPasswordResponseSchema = t.Object({
  password: t.String(),
  generated: t.Boolean(),
});
