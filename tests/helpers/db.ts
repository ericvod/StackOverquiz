import { sql } from "drizzle-orm";
import { closeDatabase, db } from "../../src/config/database";

const TEST_TABLES = [
  "question_reports",
  "question_ratings",
  "quiz_attempts",
  "user_question_progress",
  "quiz_questions",
  "question_categories",
  "questions",
  "quizzes",
  "user_sessions",
  "categories",
  "users",
] as const;

function assertTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("test")) {
    throw new Error("DATABASE_URL must point to a test database before using the test DB helpers");
  }
}

export async function resetDatabase() {
  assertTestDatabase();

  await db.execute(
    sql.raw(`TRUNCATE TABLE ${TEST_TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`),
  );
}

export async function closeTestDatabase() {
  await closeDatabase();
}
