import type { ErrorCode } from "./error-codes";
import { type ApiMeta, buildPaginationMeta, withApiMeta } from "./http-meta";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export function ok<T>(data: T, meta?: Omit<ApiMeta, "apiVersion">): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: withApiMeta(meta),
  };
}

export function created<T>(data: T, meta?: Omit<ApiMeta, "apiVersion">): ApiSuccessResponse<T> {
  return ok(data, meta);
}

export function noContent(meta?: Omit<ApiMeta, "apiVersion">): ApiSuccessResponse<null> {
  return ok(null, meta);
}

export function paged<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  meta?: Omit<ApiMeta, "apiVersion" | "pagination">,
): ApiSuccessResponse<T[]> {
  return ok(data, {
    ...meta,
    pagination: buildPaginationMeta(total, page, limit),
  });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  meta?: Omit<ApiMeta, "apiVersion">,
): ApiErrorResponse {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
    meta: withApiMeta(meta),
  };
}
