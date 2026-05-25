export const API_VERSION = "v1" as const;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiMeta {
  apiVersion: typeof API_VERSION;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

export function withApiMeta(meta: Omit<ApiMeta, "apiVersion"> = {}): ApiMeta {
  return {
    apiVersion: API_VERSION,
    ...meta,
  };
}
