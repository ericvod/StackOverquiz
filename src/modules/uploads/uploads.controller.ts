import { Elysia, t } from "elysia";
import { ok } from "../../shared/http/api-response";
import { defaultErrorResponses, tSuccess } from "../../shared/http/api-response.schema";
import { authGuard } from "../auth/auth.middleware";
import * as uploadsService from "./uploads.service";

/**
 * HTTP routes for upload and retrieval of question images.
 * GET /* is public so anonymous users can view question images.
 * POST /image requires authentication.
 */
export const uploadsController = new Elysia({ prefix: "/uploads", detail: { tags: ["Uploads"] } })

  // ─── Get Presigned URL (public) ────────────────────────────────────────
  .get(
    "/*",
    async ({ params }) => {
      const key = params["*"];
      const url = await uploadsService.getPresignedUrl(key);
      return ok({ url });
    },
    {
      response: {
        200: tSuccess(
          t.Object({
            url: t.String(),
          }),
          "The temporary signed URL",
        ),
        404: defaultErrorResponses[404],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Get Pre-signed Image URL",
        description: "Generates a temporary pre-signed URL to read an existing uploaded object.",
      },
    },
  )

  // ─── Upload Image (requires auth) ─────────────────────────────────────
  .use(authGuard)
  .post(
    "/image",
    async ({ body, query }) => {
      const key = await uploadsService.uploadImage(body.file, query.folder);
      const url = await uploadsService.getPresignedUrl(key);

      return ok({ key, url });
    },
    {
      body: t.Object({
        file: t.File({ maxSize: "5m", type: ["image/jpeg", "image/png", "image/webp", "image/gif"] }),
      }),
      query: t.Object({
        folder: t.Optional(
          t.Union([t.Literal("questions"), t.Literal("avatars"), t.Literal("quizzes")], {
            default: "questions",
            description: "Storage folder prefix. Defaults to 'questions'.",
          }),
        ),
      }),
      response: {
        200: tSuccess(
          t.Object({
            key: t.String(),
            url: t.String(),
          }),
          "The uploaded file key and a temporary presigned URL",
        ),
        400: defaultErrorResponses[400],
        401: defaultErrorResponses[401],
        422: defaultErrorResponses[422],
        500: defaultErrorResponses[500],
      },
      detail: {
        summary: "Upload image",
        description:
          "Uploads an image (up to 5MB) to object storage and returns its storage key and a temporary signed read URL. Use the 'folder' query param to separate objects by context (questions, avatars, quizzes).",
      },
    },
  );
