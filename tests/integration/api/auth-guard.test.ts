import { describe, expect, test } from "bun:test";
import { readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";

describe("GET /v1/auth/me", () => {
  test("returns the standard error envelope when the bearer token is missing", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/v1/auth/me"));
    const payload = await readJson<{
      success: boolean;
      error: { code: string; message: string };
      meta: { apiVersion: string };
    }>(response);

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(payload.success).toBe(false);
    expect(payload.meta.apiVersion).toBe("v1");
    expect(payload.error.code).toBe("AUTH_INVALID_ACCESS_TOKEN");
  });
});
