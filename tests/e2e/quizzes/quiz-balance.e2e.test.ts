import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, quizzes } from "../../../src/db/schema";
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

async function getJson(path: string, headers: Record<string, string> = {}) {
  return await app.handle(
    new Request(`http://localhost${path}`, {
      headers,
    }),
  );
}

async function registerUserViaApi(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  const response = await postJson("/v1/auth/register", makeUserInput(overrides));
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

describe("Quiz composition balance", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("derives time limit and exposes difficulty breakdown for a mixed quiz", async () => {
    const author = await registerUserViaApi({ username: "quiz_author", email: "quiz_author@example.com" });

    const [category] = await db
      .insert(categories)
      .values({
        name: "TypeScript Balance",
        slug: "typescript-balance",
        type: "language",
        description: "TypeScript balance questions",
        icon: "ts",
      })
      .returning();

    const beginnerQuestion = await createQuestion({
      authorId: author.userId,
      title: "What is a variable?",
      body: "Pick the best description of a variable in programming.",
      difficulty: "beginner",
      estimatedTimeSeconds: 45,
      options: [
        { text: "A way to store a value" },
        { text: "A network protocol" },
        { text: "A CSS selector" },
        { text: "A Git branch" },
        { text: "A database constraint" },
      ],
      correctOptionIndex: 0,
      categoryIds: [category!.id],
      status: "approved",
    });

    const mediumQuestion = await createQuestion({
      authorId: author.userId,
      title: "What does union type mean?",
      body: "Choose the best explanation for a union type in TypeScript.",
      difficulty: "medium",
      estimatedTimeSeconds: 90,
      options: [
        { text: "A function with two parameters" },
        { text: "A value that can match one of multiple declared types" },
        { text: "A runtime bundle optimization" },
        { text: "A database join" },
        { text: "A linter rule category" },
      ],
      correctOptionIndex: 1,
      categoryIds: [category!.id],
      status: "approved",
    });

    const expertQuestion = await createQuestion({
      authorId: author.userId,
      title: "When can distributive conditional types surprise you?",
      body: "Pick the scenario that best describes a distributive conditional type edge case.",
      difficulty: "expert",
      estimatedTimeSeconds: 180,
      options: [
        { text: "When evaluating over unions" },
        { text: "When importing CSS modules" },
        { text: "When calling JSON.parse" },
        { text: "When sorting arrays alphabetically" },
        { text: "When formatting a README" },
      ],
      correctOptionIndex: 0,
      categoryIds: [category!.id],
      status: "approved",
    });

    const createResponse = await postJson(
      "/v1/quizzes",
      {
        title: "TypeScript Mixed Depth",
        description: "Quiz com progressao de dificuldade",
        isPublic: true,
        questionIds: [beginnerQuestion.id, mediumQuestion.id, expertQuestion.id],
      },
      createBearerTokenHeader(author.accessToken),
    );
    const createPayload = await readJson<{
      success: boolean;
      data: {
        id: string;
        status: "pending" | "approved" | "rejected";
        timeLimitSeconds: number;
      };
    }>(createResponse);

    expect(createResponse.status).toBe(200);
    expect(createPayload.success).toBe(true);
    expect(createPayload.data.status).toBe("pending");
    expect(createPayload.data.timeLimitSeconds).toBe(390);

    const pendingDetailResponse = await getJson(`/v1/quizzes/${createPayload.data.id}`);
    expect(pendingDetailResponse.status).toBe(404);

    await db.update(quizzes).set({ status: "approved" }).where(eq(quizzes.id, createPayload.data.id));

    const detailResponse = await getJson(`/v1/quizzes/${createPayload.data.id}`);
    const detailPayload = await readJson<{
      success: boolean;
      data: {
        questionCount: number;
        estimatedDurationSeconds: number;
        difficultyBreakdown: {
          beginner: number;
          easy: number;
          medium: number;
          hard: number;
          expert: number;
        };
      };
    }>(detailResponse);

    expect(detailResponse.status).toBe(200);
    expect(detailPayload.success).toBe(true);
    expect(detailPayload.data.questionCount).toBe(3);
    expect(detailPayload.data.estimatedDurationSeconds).toBe(315);
    expect(detailPayload.data.difficultyBreakdown).toEqual({
      beginner: 1,
      easy: 0,
      medium: 1,
      hard: 0,
      expert: 1,
    });
  });
});
