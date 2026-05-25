import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, users } from "../../../src/db/schema";
import { register } from "../../../src/modules/auth/auth.service";
import { createQuestion } from "../../../src/modules/questions/questions.service";
import { createQuiz } from "../../../src/modules/quizzes/quizzes.service";
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

describe("Question progress and first-answer XP", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("grants XP only on the first answer and hides answered questions when requested", async () => {
    const author = await register(makeUserInput({ username: "author_user", email: "author@example.com" }));

    const registerResponse = await postJson("/v1/auth/register", makeUserInput());
    const registerPayload = await readJson<{
      success: boolean;
      data: {
        user: {
          id: string;
        };
        tokens: {
          accessToken: string;
        };
      };
    }>(registerResponse);

    const playerId = registerPayload.data.user.id;
    const playerAccessToken = registerPayload.data.tokens.accessToken;

    const [category] = await db
      .insert(categories)
      .values({
        name: "HTTP",
        slug: "http",
        type: "area",
        description: "Networking questions",
        icon: "🌐",
      })
      .returning();

    const question = await createQuestion({
      authorId: author.id,
      title: "What does HTTP stand for?",
      body: "Choose the correct expansion for HTTP.",
      difficulty: "easy",
      options: [
        { text: "HyperText Transfer Protocol" },
        { text: "High Transfer Text Process" },
        { text: "Host Transfer Text Protocol" },
        { text: "Hyperlink Trace Transport Process" },
        { text: "Hyper Transfer Token Path" },
      ],
      correctOptionIndex: 0,
      explanation: "HTTP stands for HyperText Transfer Protocol.",
      categoryIds: [category!.id],
      status: "approved",
    });

    const quiz = await createQuiz({
      creatorId: author.id,
      title: "HTTP Basics",
      description: "A quiz with one approved question",
      isPublic: true,
      status: "approved",
      questionIds: [question.id],
    });

    const firstAttemptResponse = await postJson(
      `/v1/quizzes/${quiz.id}/attempt`,
      {
        answers: [{ questionId: question.id, selectedOptionIndex: 0 }],
      },
      createBearerTokenHeader(playerAccessToken),
    );
    const firstAttemptPayload = await readJson<{
      success: boolean;
      data: {
        xpGained: number;
        isPerfect: boolean;
      };
    }>(firstAttemptResponse);

    expect(firstAttemptResponse.status).toBe(200);
    expect(firstAttemptPayload.success).toBe(true);
    expect(firstAttemptPayload.data.isPerfect).toBe(true);
    expect(firstAttemptPayload.data.xpGained).toBe(110);

    const quizListResponse = await getJson("/v1/quizzes", createBearerTokenHeader(playerAccessToken));
    const quizListPayload = await readJson<{
      success: boolean;
      data: Array<{
        id: string;
        attemptedByViewer?: boolean;
        viewerBestScore?: number | null;
        viewerLastAttemptAt?: string | null;
      }>;
    }>(quizListResponse);
    const listedQuiz = quizListPayload.data.find((item) => item.id === quiz.id);

    expect(quizListResponse.status).toBe(200);
    expect(quizListPayload.success).toBe(true);
    expect(listedQuiz?.attemptedByViewer).toBe(true);
    expect(listedQuiz?.viewerBestScore).toBe(1);
    expect(listedQuiz?.viewerLastAttemptAt).toBeTruthy();

    const quizDetailResponse = await getJson(`/v1/quizzes/${quiz.id}`, createBearerTokenHeader(playerAccessToken));
    const quizDetailPayload = await readJson<{
      success: boolean;
      data: {
        viewerAttemptSummary?: {
          attempted: boolean;
          attemptCount: number;
          bestScore: number | null;
          lastScore: number | null;
          lastAttemptAt: string | null;
        };
      };
    }>(quizDetailResponse);

    expect(quizDetailResponse.status).toBe(200);
    expect(quizDetailPayload.success).toBe(true);
    expect(quizDetailPayload.data.viewerAttemptSummary?.attempted).toBe(true);
    expect(quizDetailPayload.data.viewerAttemptSummary?.attemptCount).toBe(1);
    expect(quizDetailPayload.data.viewerAttemptSummary?.bestScore).toBe(1);
    expect(quizDetailPayload.data.viewerAttemptSummary?.lastScore).toBe(1);
    expect(quizDetailPayload.data.viewerAttemptSummary?.lastAttemptAt).toBeTruthy();

    const playerAfterFirstAttempt = await db.query.users.findFirst({
      where: eq(users.id, playerId),
      columns: {
        xp: true,
      },
    });

    expect(playerAfterFirstAttempt?.xp).toBe(110);

    const secondAttemptResponse = await postJson(
      `/v1/quizzes/${quiz.id}/attempt`,
      {
        answers: [{ questionId: question.id, selectedOptionIndex: 0 }],
      },
      createBearerTokenHeader(playerAccessToken),
    );
    const secondAttemptPayload = await readJson<{
      success: boolean;
      data: {
        xpGained: number;
      };
    }>(secondAttemptResponse);

    expect(secondAttemptResponse.status).toBe(200);
    expect(secondAttemptPayload.success).toBe(true);
    expect(secondAttemptPayload.data.xpGained).toBe(0);

    const playerAfterSecondAttempt = await db.query.users.findFirst({
      where: eq(users.id, playerId),
      columns: {
        xp: true,
      },
    });

    expect(playerAfterSecondAttempt?.xp).toBe(110);

    const filteredQuestionsResponse = await getJson(
      "/v1/questions?excludeAnswered=true",
      createBearerTokenHeader(playerAccessToken),
    );
    const filteredQuestionsPayload = await readJson<{
      success: boolean;
      data: Array<{ id: string }>;
      meta: {
        pagination?: {
          total: number;
        };
      };
    }>(filteredQuestionsResponse);

    expect(filteredQuestionsResponse.status).toBe(200);
    expect(filteredQuestionsPayload.success).toBe(true);
    expect(filteredQuestionsPayload.data).toHaveLength(0);
    expect(filteredQuestionsPayload.meta.pagination?.total).toBe(0);
  });
});
