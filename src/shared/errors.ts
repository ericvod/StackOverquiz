import { Elysia } from "elysia";
import { errorResponse } from "./http/api-response";
import { ERROR_CODES, type ErrorCode } from "./http/error-codes";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: ErrorCode,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  toResponse() {
    return new Response(JSON.stringify(errorResponse(this.code, this.message, this.details)), {
      status: this.statusCode,
      headers: {
        "content-type": "application/json",
      },
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super(404, `${resource} not found`, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(403, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.CONFLICT, details?: unknown) {
    super(409, message, code, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.BAD_REQUEST, details?: unknown) {
    super(400, message, code, details);
  }
}

export class BadGatewayError extends AppError {
  constructor(message = "Upstream service failed", code: ErrorCode = ERROR_CODES.BAD_GATEWAY, details?: unknown) {
    super(502, message, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = ERROR_CODES.VALIDATION_ERROR, details?: unknown) {
    super(422, message, code, details);
  }
}

export const errorPlugin = new Elysia({ name: "error-handler" }).onError(({ error, code, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return errorResponse(error.code, error.message, error.details);
  }

  if (code === "VALIDATION") {
    set.status = 422;
    return errorResponse(ERROR_CODES.VALIDATION_ERROR, "Validation failed", error.message);
  }

  set.status = 500;
  return errorResponse(ERROR_CODES.INTERNAL_ERROR, "An unexpected error occurred");
});
