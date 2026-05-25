import { beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, questionCategories } from "../../../src/db/schema";
import { createQuestion } from "../../../src/modules/questions/questions.service";
import { makeUserInput } from "../../factories/user.factory";
import { createBearerTokenHeader, readJson } from "../../helpers/auth";
import { createTestApp } from "../../helpers/create-test-app";
import { resetDatabase } from "../../helpers/db";

const app = createTestApp();

async function registerUserViaApi(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  const response = await app.handle(
    new Request("http://localhost/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(makeUserInput(overrides)),
    }),
  );
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

async function putJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await app.handle(
    new Request(`http://localhost${path}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("Question updates", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("rejects updates that leave correctOptionIndex outside the available options", async () => {
    const author = await registerUserViaApi({ username: "question_author", email: "question_author@example.com" });

    const [category] = await db
      .insert(categories)
      .values({
        name: "HTTP Update",
        slug: "http-update",
        type: "area",
        description: "HTTP update questions",
        icon: "http",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.userId,
      title: "What does status 201 mean?",
      body: "Choose the best HTTP status description.",
      difficulty: "easy",
      options: [
        { text: "Accepted" },
        { text: "Created" },
        { text: "No Content" },
        { text: "Moved Permanently" },
        { text: "Bad Gateway" },
      ],
      correctOptionIndex: 1,
      explanation: "201 indicates a resource was created.",
      categoryIds: [category!.id],
      status: "approved",
    });

    const response = await putJson(
      `/v1/questions/${question.id}`,
      {
        options: [
          { text: "Accepted" },
          { text: "Created" },
          { text: "No Content" },
          { text: "Moved Permanently" },
          { text: "Bad Gateway" },
        ],
        correctOptionIndex: 5,
      },
      createBearerTokenHeader(author.accessToken),
    );
    const payload = await readJson<{
      success: boolean;
      error: {
        code: string;
      };
      meta: { apiVersion: string };
    }>(response);

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(payload.meta.apiVersion).toBe("v1");
    expect(payload.error.code).toBe("QUESTION_INVALID_CORRECT_OPTION_INDEX");
  });

  test("allows clearing all linked categories without requiring other field updates", async () => {
    const author = await registerUserViaApi({ username: "category_author", email: "category_author@example.com" });

    const [category] = await db
      .insert(categories)
      .values({
        name: "Algorithms Update",
        slug: "algorithms-update",
        type: "area",
        description: "Algorithms update questions",
        icon: "algo",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.userId,
      title: "What is Big O?",
      body: "Choose the best definition of Big O notation.",
      difficulty: "easy",
      options: [
        { text: "A database transaction type" },
        { text: "A way to describe algorithmic complexity" },
        { text: "A CSS layout primitive" },
        { text: "A Git branching strategy" },
        { text: "A package manager command" },
      ],
      correctOptionIndex: 1,
      explanation: "Big O describes asymptotic complexity.",
      categoryIds: [category!.id],
      status: "approved",
    });

    const response = await putJson(
      `/v1/questions/${question.id}`,
      {
        categoryIds: [],
      },
      createBearerTokenHeader(author.accessToken),
    );
    const payload = await readJson<{
      success: boolean;
      data: {
        id: string;
      };
      meta: { apiVersion: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe(question.id);

    const links = await db.query.questionCategories.findMany({
      where: and(eq(questionCategories.questionId, question.id), eq(questionCategories.categoryId, category!.id)),
    });

    expect(links).toHaveLength(0);
  });
});
