import { afterAll } from "bun:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.JWT_ACCESS_EXPIRY ??= "15m";
process.env.JWT_REFRESH_EXPIRY ??= "7d";
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:7204/stackoverquiz_test";
process.env.STORAGE_DRIVER ??= "minio";
process.env.MINIO_ENDPOINT ??= "localhost";
process.env.MINIO_PORT ??= "9000";
process.env.MINIO_ACCESS_KEY ??= "minioadmin";
process.env.MINIO_SECRET_KEY ??= "minioadmin";
process.env.MINIO_BUCKET ??= "stackoverquiz-test";
process.env.MINIO_USE_SSL ??= "false";
process.env.GCS_BUCKET ??= "stackoverquiz-test";
process.env.CORS_ORIGINS ??= "*";
process.env.GOOGLE_REDIRECT_URI ??= "http://localhost:7200/v1/auth/google/callback";
process.env.GITHUB_REDIRECT_URI ??= "http://localhost:7200/v1/auth/github/callback";
process.env.SEED_ADMIN_ENABLED ??= "false";

afterAll(async () => {
  const { closeDatabase } = await import("../../src/config/database");
  await closeDatabase();
});
