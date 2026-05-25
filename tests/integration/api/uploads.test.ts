import { describe, expect, test } from "bun:test";
import { createTestApp } from "../../helpers/create-test-app";

describe("GET /v1/uploads/*", () => {
  test("is publicly accessible (does not require auth) and matches nested object keys via the wildcard segment", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/v1/uploads/questions/example.png"));

    // The route must not be auth-gated (no 401) and must match the wildcard (no 404 from Elysia routing).
    // The actual status depends on whether the storage backend is reachable in this environment.
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(404);
  });
});
