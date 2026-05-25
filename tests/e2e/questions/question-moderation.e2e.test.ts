import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, questionReports, questions } from "../../../src/db/schema";
import { register } from "../../../src/modules/auth/auth.service";
import { createQuestion } from "../../../src/modules/questions/questions.service";
import { makeUserInput } from "../../factories/user.factory";
import { createBearerTokenHeader, readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";
import { resetDatabase } from "../../helpers/db";

const app = createTestApp();

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function registerUserViaApi() {
  const response = await postJson("/v1/auth/register", makeUserInput());
  const payload = await readJson<{
    success: boolean;
    data: {
      user: { id: string };
      tokens: { accessToken: string };
    };
  }>(response);

  return {
    userId: payload.data.user.id,
    accessToken: payload.data.tokens.accessToken,
  };
}

describe("Question moderation reports", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("rejects duplicate reports from the same user", async () => {
    const author = await register(makeUserInput({ username: "author_report", email: "author_report@example.com" }));
    const reporter = await registerUserViaApi();

    const [category] = await db
      .insert(categories)
      .values({
        name: "Security",
        slug: "security",
        type: "area",
        description: "Security questions",
        icon: "lock",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.id,
      title: "What is CSRF?",
      body: "Select the best description of CSRF.",
      difficulty: "medium",
      options: [
        { text: "A client-side rendering pattern" },
        { text: "A cross-site request forgery attack" },
        { text: "A SQL indexing strategy" },
        { text: "A browser cache policy" },
        { text: "A package lock format" },
      ],
      correctOptionIndex: 1,
      explanation: "CSRF tricks a browser into issuing unwanted authenticated requests.",
      categoryIds: [category!.id],
      status: "pending",
    });

    const firstReportResponse = await postJson(
      `/v1/questions/${question.id}/report`,
      {
        reason: "unclear",
        description: "The wording is ambiguous",
      },
      createBearerTokenHeader(reporter.accessToken),
    );

    expect(firstReportResponse.status).toBe(200);

    const duplicateReportResponse = await postJson(
      `/v1/questions/${question.id}/report`,
      {
        reason: "duplicate",
      },
      createBearerTokenHeader(reporter.accessToken),
    );
    const duplicateReportPayload = await readJson<{
      success: boolean;
      error: {
        code: string;
      };
      meta: { apiVersion: string };
    }>(duplicateReportResponse);

    expect(duplicateReportResponse.status).toBe(409);
    expect(duplicateReportPayload.success).toBe(false);
    expect(duplicateReportPayload.meta.apiVersion).toBe("v1");
    expect(duplicateReportPayload.error.code).toBe("QUESTION_DUPLICATE_REPORT");

    const reports = await db.query.questionReports.findMany({
      where: eq(questionReports.questionId, question.id),
    });
    const storedQuestion = await db.query.questions.findFirst({
      where: eq(questions.id, question.id),
      columns: { status: true },
    });

    expect(reports).toHaveLength(1);
    expect(storedQuestion?.status).toBe("pending");
  });

  test("auto-rejects a pending question after three reports from distinct users", async () => {
    const author = await register(makeUserInput({ username: "author_distinct", email: "author_distinct@example.com" }));
    const reporters = await Promise.all([registerUserViaApi(), registerUserViaApi(), registerUserViaApi()]);

    const [category] = await db
      .insert(categories)
      .values({
        name: "Databases",
        slug: "databases",
        type: "area",
        description: "Database questions",
        icon: "db",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.id,
      title: "Which normal form removes transitive dependencies?",
      body: "Pick the correct answer about normalization.",
      difficulty: "hard",
      options: [{ text: "1NF" }, { text: "2NF" }, { text: "3NF" }, { text: "BCNF" }, { text: "5NF" }],
      correctOptionIndex: 2,
      explanation: "3NF removes transitive dependencies.",
      categoryIds: [category!.id],
      status: "pending",
    });

    for (const reporter of reporters) {
      const response = await postJson(
        `/v1/questions/${question.id}/report`,
        {
          reason: "incorrect",
        },
        createBearerTokenHeader(reporter.accessToken),
      );

      expect(response.status).toBe(200);
    }

    const storedQuestion = await db.query.questions.findFirst({
      where: eq(questions.id, question.id),
      columns: { status: true },
    });

    expect(storedQuestion?.status).toBe("rejected");
  });
});
