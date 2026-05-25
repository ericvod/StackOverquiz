import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, users } from "../../../src/db/schema";
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

async function getJson(path: string, headers: Record<string, string> = {}) {
  return await app.handle(new Request(`http://localhost${path}`, { headers }));
}

async function registerUserViaApi(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  const response = await postJson("/v1/auth/register", makeUserInput(overrides));
  const payload = await readJson<{
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

describe("Practice mode", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("returns random approved questions and grants XP only for the first correct answer", async () => {
    const author = await register(makeUserInput({ username: "practice_author", email: "practice_author@example.com" }));
    const player = await registerUserViaApi({ username: "practice_player", email: "practice_player@example.com" });

    const [category] = await db
      .insert(categories)
      .values({
        name: "Practice HTTP",
        slug: "practice-http",
        type: "area",
        description: "Practice questions",
        icon: "practice",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.id,
      title: "What does HTTP 200 mean?",
      body: "Choose the best description of a successful HTTP 200 response.",
      difficulty: "easy",
      options: [
        { text: "The request succeeded" },
        { text: "The request was redirected permanently" },
        { text: "The server timed out" },
        { text: "The client sent invalid syntax" },
        { text: "The resource was not found" },
      ],
      correctOptionIndex: 0,
      explanation: "HTTP 200 means the request succeeded.",
      categoryIds: [category!.id],
      status: "approved",
    });

    const questionsResponse = await getJson("/v1/practice/questions?limit=5&category=practice-http");
    const questionsPayload = await readJson<{
      success: boolean;
      data: Array<Record<string, unknown> & { id: string; options: unknown[] }>;
    }>(questionsResponse);

    expect(questionsResponse.status).toBe(200);
    expect(questionsPayload.success).toBe(true);
    expect(questionsPayload.data).toHaveLength(1);
    expect(questionsPayload.data[0]?.id).toBe(question.id);
    expect(questionsPayload.data[0]?.options).toHaveLength(5);
    expect("correctOptionIndex" in questionsPayload.data[0]!).toBe(false);
    expect("explanation" in questionsPayload.data[0]!).toBe(false);

    const firstAnswerResponse = await postJson(
      "/v1/practice/answer",
      {
        questionId: question.id,
        selectedOptionIndex: 0,
      },
      createBearerTokenHeader(player.accessToken),
    );
    const firstAnswerPayload = await readJson<{
      success: boolean;
      data: {
        isCorrect: boolean;
        xpGained: number;
        alreadyAnswered: boolean;
        correctOptionIndex: number;
      };
    }>(firstAnswerResponse);

    expect(firstAnswerResponse.status).toBe(200);
    expect(firstAnswerPayload.success).toBe(true);
    expect(firstAnswerPayload.data.isCorrect).toBe(true);
    expect(firstAnswerPayload.data.correctOptionIndex).toBe(0);
    expect(firstAnswerPayload.data.xpGained).toBe(10);
    expect(firstAnswerPayload.data.alreadyAnswered).toBe(false);

    const playerAfterFirstAnswer = await db.query.users.findFirst({
      where: eq(users.id, player.userId),
      columns: { xp: true },
    });
    expect(playerAfterFirstAnswer?.xp).toBe(10);

    const secondAnswerResponse = await postJson(
      "/v1/practice/answer",
      {
        questionId: question.id,
        selectedOptionIndex: 0,
      },
      createBearerTokenHeader(player.accessToken),
    );
    const secondAnswerPayload = await readJson<{
      data: {
        xpGained: number;
        alreadyAnswered: boolean;
      };
    }>(secondAnswerResponse);

    expect(secondAnswerResponse.status).toBe(200);
    expect(secondAnswerPayload.data.xpGained).toBe(0);
    expect(secondAnswerPayload.data.alreadyAnswered).toBe(true);

    const filteredResponse = await getJson(
      "/v1/practice/questions?excludeAnswered=true",
      createBearerTokenHeader(player.accessToken),
    );
    const filteredPayload = await readJson<{
      success: boolean;
      data: unknown[];
    }>(filteredResponse);

    expect(filteredResponse.status).toBe(200);
    expect(filteredPayload.success).toBe(true);
    expect(filteredPayload.data).toHaveLength(0);
  });
});
