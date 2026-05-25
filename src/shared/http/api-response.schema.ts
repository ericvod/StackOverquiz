import { type TSchema, t } from "elysia";

export const apiMetaSchema = t.Object({
  apiVersion: t.Literal("v1"),
  pagination: t.Optional(
    t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
      hasNext: t.Boolean(),
      hasPrev: t.Boolean(),
    }),
  ),
});

export const tSuccess = <T extends TSchema>(dataSchema: T, description?: string) =>
  t.Unsafe<unknown>(
    t.Object(
      {
        success: t.Literal(true),
        data: dataSchema,
        meta: apiMetaSchema,
      },
      { description },
    ),
  );

export const tPaged = <T extends TSchema>(itemSchema: T, description?: string) =>
  t.Unsafe<unknown>(
    t.Object(
      {
        success: t.Literal(true),
        data: t.Array(itemSchema),
        meta: apiMetaSchema,
      },
      { description },
    ),
  );

export const tError = (description?: string) =>
  t.Unsafe<unknown>(
    t.Object(
      {
        success: t.Literal(false),
        error: t.Object({
          code: t.String(),
          message: t.String(),
          details: t.Optional(t.Any()),
        }),
        meta: apiMetaSchema,
      },
      { description },
    ),
  );

export const defaultErrorResponses = {
  400: tError("Bad Request"),
  401: tError("Unauthorized"),
  403: tError("Forbidden"),
  404: tError("Not Found"),
  409: tError("Conflict"),
  422: tError("Validation Error"),
  500: tError("Internal Server Error"),
};
