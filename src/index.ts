import { createApp } from "./app";
import { env } from "./config/env";
import { BUCKET_NAME, ensureBucket, STORAGE_DRIVER } from "./config/storage";
import { logger } from "./shared/logging/logger";

createApp().listen(env.PORT);

ensureBucket().catch((err) => {
  logger.warn("storage_bucket_setup_failed", {
    bucket: BUCKET_NAME,
    driver: STORAGE_DRIVER,
    errorMessage: err instanceof Error ? err.message : "Unknown storage error",
  });
});

logger.info("server_started", {
  port: env.PORT,
  environment: env.NODE_ENV,
  storageDriver: STORAGE_DRIVER,
  apiBaseUrl: `http://localhost:${env.PORT}/v1`,
  swaggerUrl: `http://localhost:${env.PORT}/swagger`,
});
