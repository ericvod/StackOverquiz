const DEV_JWT_SECRET = "dev-only-jwt-secret-change-before-production";

type NodeEnv = "development" | "production" | "test";
type StorageDriver = "minio" | "gcs";

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function readStringEnv(key: string, fallback = "") {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function readNumberEnv(key: string): number | undefined;
function readNumberEnv(key: string, fallback: number): number;
function readNumberEnv(key: string, fallback?: number) {
  const value = process.env[key]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric env var: ${key}`);
  }

  return parsed;
}

function parseStorageDriver(value: string | undefined): StorageDriver {
  const normalizedValue = value?.toLowerCase();

  if (!normalizedValue || normalizedValue === "minio") {
    return "minio";
  }

  if (normalizedValue === "gcs") {
    return normalizedValue;
  }

  throw new Error("Invalid STORAGE_DRIVER. Expected one of: minio, gcs");
}

function readBooleanEnv(key: string, fallback: boolean) {
  const value = process.env[key]?.trim();
  const normalizedValue = value?.toLowerCase();
  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error(`Invalid boolean env var: ${key}`);
}

function ensureProductionSafety(config: {
  DATABASE_URL: string;
  GCS_BUCKET: string;
  JWT_SECRET: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  NODE_ENV: NodeEnv;
  STORAGE_DRIVER: StorageDriver;
}) {
  if (config.NODE_ENV !== "production") {
    return;
  }

  const missingRequiredVars = [
    !process.env.DATABASE_URL?.trim() && "DATABASE_URL",
    !process.env.JWT_SECRET?.trim() && "JWT_SECRET",
    config.STORAGE_DRIVER === "minio" && !process.env.MINIO_ACCESS_KEY?.trim() && "MINIO_ACCESS_KEY",
    config.STORAGE_DRIVER === "minio" && !process.env.MINIO_SECRET_KEY?.trim() && "MINIO_SECRET_KEY",
    config.STORAGE_DRIVER === "gcs" && !process.env.GCS_BUCKET?.trim() && "GCS_BUCKET",
  ].filter((value): value is string => Boolean(value));

  if (missingRequiredVars.length > 0) {
    throw new Error(`Production env vars must be explicitly set: ${missingRequiredVars.join(", ")}`);
  }

  const isSafeSecret = config.JWT_SECRET !== DEV_JWT_SECRET && config.JWT_SECRET.length >= 32;
  const usesDefaultMinioCredentials =
    config.MINIO_ACCESS_KEY === "minioadmin" || config.MINIO_SECRET_KEY === "minioadmin";

  if (!isSafeSecret) {
    throw new Error("JWT_SECRET must be explicitly set with at least 32 characters in production");
  }

  if (config.STORAGE_DRIVER === "minio" && usesDefaultMinioCredentials) {
    throw new Error("MINIO_ACCESS_KEY and MINIO_SECRET_KEY cannot use default development credentials in production");
  }
}

function ensureAdminSeedConfig(config: {
  SEED_ADMIN_ENABLED: boolean;
  SEED_ADMIN_USERNAME: string;
  SEED_ADMIN_EMAIL: string;
  SEED_ADMIN_PASSWORD: string;
}) {
  if (!config.SEED_ADMIN_ENABLED) {
    return;
  }

  const missingVars = [
    !config.SEED_ADMIN_USERNAME && "SEED_ADMIN_USERNAME",
    !config.SEED_ADMIN_EMAIL && "SEED_ADMIN_EMAIL",
    !config.SEED_ADMIN_PASSWORD && "SEED_ADMIN_PASSWORD",
  ].filter(Boolean);

  if (missingVars.length > 0) {
    throw new Error(`Missing required admin seed env vars: ${missingVars.join(", ")}`);
  }

  if (config.SEED_ADMIN_PASSWORD.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must have at least 12 characters");
  }
}

/**
 * Loads application configuration and blocks insecure production defaults.
 */
function loadEnv() {
  const NODE_ENV = parseNodeEnv(process.env.NODE_ENV);
  const STORAGE_DRIVER = parseStorageDriver(readStringEnv("STORAGE_DRIVER", "minio"));

  const config = {
    DATABASE_URL: readStringEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/stackoverquiz"),
    DATABASE_SOCKET_PATH: readStringEnv("DATABASE_SOCKET_PATH"),
    JWT_SECRET: readStringEnv("JWT_SECRET", DEV_JWT_SECRET),
    JWT_ACCESS_EXPIRY: readStringEnv("JWT_ACCESS_EXPIRY", "15m"),
    JWT_REFRESH_EXPIRY: readStringEnv("JWT_REFRESH_EXPIRY", "7d"),

    GEMINI_API_KEY: readStringEnv("GEMINI_API_KEY"),

    MINIO_ENDPOINT: readStringEnv("MINIO_ENDPOINT", "localhost"),
    MINIO_PORT: readNumberEnv("MINIO_PORT"), // Allow undefined for S3 default ports
    MINIO_ACCESS_KEY: readStringEnv("MINIO_ACCESS_KEY", "minioadmin"),
    MINIO_SECRET_KEY: readStringEnv("MINIO_SECRET_KEY", "minioadmin"),
    MINIO_BUCKET: readStringEnv("MINIO_BUCKET", "stackoverquiz"),
    MINIO_USE_SSL: readBooleanEnv("MINIO_USE_SSL", false),
    MINIO_PUBLIC_ENDPOINT: readStringEnv("MINIO_PUBLIC_ENDPOINT"),

    STORAGE_DRIVER,
    GCS_PROJECT_ID: readStringEnv("GCS_PROJECT_ID"),
    GCS_BUCKET: readStringEnv("GCS_BUCKET", readStringEnv("MINIO_BUCKET", "stackoverquiz")),

    GOOGLE_CLIENT_ID: readStringEnv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: readStringEnv("GOOGLE_CLIENT_SECRET"),
    GOOGLE_REDIRECT_URI: readStringEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/v1/auth/google/callback"),

    GITHUB_CLIENT_ID: readStringEnv("GITHUB_CLIENT_ID"),
    GITHUB_CLIENT_SECRET: readStringEnv("GITHUB_CLIENT_SECRET"),
    GITHUB_REDIRECT_URI: readStringEnv("GITHUB_REDIRECT_URI", "http://localhost:3000/v1/auth/github/callback"),

    PORT: readNumberEnv("PORT", 3000),
    NODE_ENV,
    CORS_ORIGINS: readStringEnv("CORS_ORIGINS", "*"),
    SEED_ADMIN_ENABLED: readBooleanEnv("SEED_ADMIN_ENABLED", false),
    SEED_ADMIN_USERNAME: readStringEnv("SEED_ADMIN_USERNAME"),
    SEED_ADMIN_EMAIL: readStringEnv("SEED_ADMIN_EMAIL"),
    SEED_ADMIN_PASSWORD: readStringEnv("SEED_ADMIN_PASSWORD"),
  };

  ensureProductionSafety(config);
  ensureAdminSeedConfig(config);

  return config;
}

export const env = loadEnv();
export type Env = ReturnType<typeof loadEnv>;
