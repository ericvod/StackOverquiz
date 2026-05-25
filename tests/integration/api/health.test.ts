import { describe, expect, test } from "bun:test";
import { readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";

describe("GET /health", () => {
  test("returns the standard success envelope", async () => {
    const app = createTestApp();
    const response = await app.handle(new Request("http://localhost/health"));
    const payload = await readJson<{
      success: boolean;
      data: {
        status: string;
        version: string;
        dependencies: {
          database: { status: string };
          storage: { status: string };
        };
      };
      meta: { apiVersion: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(payload.success).toBe(true);
    expect(payload.meta.apiVersion).toBe("v1");
    expect(payload.data.status).toBe("ok");
    expect(payload.data.version).toBe("1.0.0");
    expect(payload.data.dependencies.database.status).toBe("skipped");
    expect(payload.data.dependencies.storage.status).toBe("skipped");
  });

  test("echoes an incoming x-request-id for traceability", async () => {
    const app = createTestApp();
    const response = await app.handle(
      new Request("http://localhost/health", {
        headers: {
          "x-request-id": "health-test-request-id",
        },
      }),
    );

    expect(response.headers.get("x-request-id")).toBe("health-test-request-id");
  });
});
