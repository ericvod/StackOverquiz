import { type Static, t } from "elysia";
import { paged } from "./http/api-response";
import type { ApiMeta } from "./http/http-meta";

export const paginationQuery = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export type PaginationQuery = Static<typeof paginationQuery>;

export function paginate(query: PaginationQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  meta?: Omit<ApiMeta, "apiVersion" | "pagination">,
) {
  return paged(data, total, page, limit, meta);
}
