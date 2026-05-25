import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const databaseSocketPath = process.env.DATABASE_SOCKET_PATH?.trim();

if (!connectionString) {
  console.error("❌ DATABASE_URL is not provided for migration!");
  process.exit(1);
}

const migrationClient = postgres(connectionString, {
  max: 1,
  ...(databaseSocketPath ? { path: `${databaseSocketPath.replace(/\/$/, "")}/.s.PGSQL.5432` } : {}),
});
const db = drizzle(migrationClient);

async function runMigrations() {
  console.log("⏳ Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("✅ Migrations complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed", error);
    process.exit(1);
  }
}

runMigrations();
