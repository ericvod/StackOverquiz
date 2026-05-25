import { sql } from "drizzle-orm";
import { db } from "../../config/database";
import { env } from "../../config/env";
import { BUCKET_NAME, bucketExists } from "../../config/storage";

interface DependencyHealth {
  status: "ok" | "error" | "skipped";
  latencyMs: number;
  detail?: string;
}

export interface HealthSnapshot {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
  dependencies: {
    database: DependencyHealth;
    storage: DependencyHealth;
  };
}

async function measureDependencyCheck(run: () => Promise<void>): Promise<DependencyHealth> {
  const startedAt = Date.now();

  try {
    await run();

    return {
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : "Unexpected dependency failure",
    };
  }
}

function buildSkippedDependency(detail: string): DependencyHealth {
  return {
    status: "skipped",
    latencyMs: 0,
    detail,
  };
}

/**
 * Builds the health payload used by `/health`, including critical dependency checks outside the test environment.
 */
export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const isTestEnvironment = env.NODE_ENV === "test";

  const database = isTestEnvironment
    ? buildSkippedDependency("database checks are skipped during automated tests")
    : await measureDependencyCheck(async () => {
        await db.execute(sql`select 1`);
      });

  const storage = isTestEnvironment
    ? buildSkippedDependency("storage checks are skipped during automated tests")
    : await measureDependencyCheck(async () => {
        const exists = await bucketExists();

        if (!exists) {
          throw new Error(`Bucket "${BUCKET_NAME}" is not available`);
        }
      });

  const status = [database, storage].some((dependency) => dependency.status === "error") ? "degraded" : "ok";

  return {
    status,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    dependencies: {
      database,
      storage,
    },
  };
}
