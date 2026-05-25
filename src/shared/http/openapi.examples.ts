import { errorResponse, ok, paged } from "./api-response";
import { ERROR_CODES } from "./error-codes";

export const OPENAPI_EXAMPLES = {
  SuccessEnvelope: {
    summary: "Successful resource response",
    value: ok({
      id: "2b1b8e33-d0c0-47db-96d4-e44e62f9307f",
      title: "Sample resource",
    }),
  },
  PaginatedEnvelope: {
    summary: "Paginated list response",
    value: paged(
      [
        {
          id: "2b1b8e33-d0c0-47db-96d4-e44e62f9307f",
          title: "Sample question",
        },
      ],
      42,
      1,
      20,
    ),
  },
  ErrorEnvelope: {
    summary: "Domain error response",
    value: errorResponse(ERROR_CODES.VALIDATION_ERROR, "Quiz answers must include every question exactly once"),
  },
};
