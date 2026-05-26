import type { users } from "../../db/schema";

type UserRow = Pick<typeof users.$inferSelect, "id" | "username" | "email" | "role" | "xp" | "level" | "createdAt">;

export function toAdminUserItem(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    xp: row.xp,
    level: row.level,
    createdAt: row.createdAt.toISOString(),
  };
}
