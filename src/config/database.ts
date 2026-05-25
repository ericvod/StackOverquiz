import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { env } from "./env";

function buildDatabaseOptions(maxConnections: number) {
  const socketPath = env.DATABASE_SOCKET_PATH
    ? `${env.DATABASE_SOCKET_PATH.replace(/\/$/, "")}/.s.PGSQL.5432`
    : undefined;

  return {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    ...(socketPath ? { path: socketPath } : {}),
  };
}

const client = postgres(env.DATABASE_URL, {
  ...buildDatabaseOptions(10),
});

export const db = drizzle(client, { schema });
export const dbClient = client;

export async function closeDatabase() {
  await client.end();
}

export type Database = typeof db;
