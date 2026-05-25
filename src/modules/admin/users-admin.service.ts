import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../../config/database";
import { users } from "../../db/schema";
import { paginate, paginatedResponse } from "../../shared/pagination";

/**
 * Returns a paginated list of all users, optionally filtered by search term or role.
 * Intended for admin use only — includes email addresses.
 */
export async function listUsers(opts: {
  search?: string;
  role?: "user" | "admin";
  page?: number;
  limit?: number;
}) {
  const { page, limit, offset } = paginate({ page: opts.page, limit: opts.limit });

  const conditions = [];

  if (opts.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(or(ilike(users.username, pattern), ilike(users.email, pattern)));
  }

  if (opts.role) {
    conditions.push(eq(users.role, opts.role));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        xp: users.xp,
        level: users.level,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(users).where(where),
  ]);

  return paginatedResponse(rows, Number(totals?.total ?? 0), page, limit);
}
