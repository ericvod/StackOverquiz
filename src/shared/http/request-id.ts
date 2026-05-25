import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import { AppError } from "../errors";
import { logger } from "../logging/logger";

interface RequestTrace {
  requestId: string;
  startedAt: number;
}

const HEADER_NAME = "x-request-id";
const requestTraceStore = new WeakMap<Request, RequestTrace>();

function normalizeStatus(status: unknown, fallback = 200) {
  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as { name?: unknown; message?: unknown };

    return {
      errorName: typeof candidate.name === "string" ? candidate.name : "UnknownError",
      errorMessage: typeof candidate.message === "string" ? candidate.message : "Unexpected error",
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: String(error),
  };
}

function getOrCreateTrace(request: Request, set?: { headers: Record<string, unknown> }) {
  const existingTrace = requestTraceStore.get(request);
  if (existingTrace) {
    if (set) {
      set.headers[HEADER_NAME] = existingTrace.requestId;
    }

    return existingTrace;
  }

  const incomingRequestId = request.headers.get(HEADER_NAME)?.trim();
  const trace = {
    requestId: incomingRequestId && incomingRequestId.length > 0 ? incomingRequestId : randomUUID(),
    startedAt: Date.now(),
  } satisfies RequestTrace;

  requestTraceStore.set(request, trace);
  if (set) {
    set.headers[HEADER_NAME] = trace.requestId;
  }

  return trace;
}

/**
 * Attaches a stable request id to every response and emits structured request lifecycle logs.
 */
export const requestIdPlugin = new Elysia({ name: "request-id" })
  .onRequest(({ request, set }) => {
    getOrCreateTrace(request, set);
  })
  .derive({ as: "global" }, ({ request, set }) => {
    const trace = getOrCreateTrace(request, set);

    return {
      requestId: trace.requestId,
    };
  })
  .onAfterHandle(({ request, path, set }) => {
    const trace = getOrCreateTrace(request, set);
    const statusCode = normalizeStatus(set.status, 200);

    logger.info("request_completed", {
      requestId: trace.requestId,
      method: request.method,
      path,
      statusCode,
      durationMs: Date.now() - trace.startedAt,
    });

    requestTraceStore.delete(request);
  })
  .onError(({ request, path, set, error, code }) => {
    const trace = getOrCreateTrace(request, set);
    const statusCode = error instanceof AppError ? error.statusCode : normalizeStatus(set.status, 500);
    const level = statusCode >= 500 ? "error" : "warn";
    const { errorName, errorMessage } = getErrorSummary(error);

    logger[level]("request_failed", {
      requestId: trace.requestId,
      method: request.method,
      path,
      statusCode,
      durationMs: Date.now() - trace.startedAt,
      errorName,
      errorMessage,
      errorCode: error instanceof AppError ? error.code : code,
    });

    requestTraceStore.delete(request);
  });
