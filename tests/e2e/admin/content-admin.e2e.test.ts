import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, questions, users } from "../../../src/db/schema";
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
  return await app.handle(new Request(`http://localhost${path}`, { headers }));
}

async function registerUserViaApi(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  const input = makeUserInput(overrides);
  const response = await postJson("/v1/auth/register", input);
  const payload = await readJson<{
    data: {
      user: { id: string };
      tokens: { accessToken: string };
    };
  }>(response);

  return {
    userId: payload.data.user.id,
    email: input.email,
    password: input.password,
    accessToken: payload.data.tokens.accessToken,
  };
}

async function registerAdminViaApi() {
  const admin = await registerUserViaApi({
    username: "content_admin",
    email: "content_admin@example.com",
  });

  await db.update(users).set({ role: "admin" }).where(eq(users.id, admin.userId));

  const loginResponse = await postJson("/v1/auth/login", {
    email: admin.email,
    password: admin.password,
  });
  const loginPayload = await readJson<{
    data: {
      tokens: { accessToken: string };
    };
  }>(loginResponse);

  return {
    ...admin,
    accessToken: loginPayload.data.tokens.accessToken,
  };
}

async function createCategory() {
  const [category] = await db
    .insert(categories)
    .values({
      name: "Admin Review",
      slug: "admin-review",
      type: "area",
      description: "Review test content",
      icon: "review",
    })
    .returning();

  return category!;
}

function questionInput(authorId: string, categoryId: string, title = "What does review protect?") {
  return {
    authorId,
    title,
    body: "Choose the best description for content review.",
    difficulty: "easy" as const,
    options: [
      { text: "It prevents unapproved content from going public" },
      { text: "It deletes all rejected users" },
      { text: "It disables quizzes permanently" },
      { text: "It skips validation rules" },
      { text: "It changes passwords automatically" },
    ],
    correctOptionIndex: 0,
    explanation: "Review keeps public feeds safe until an admin approves the content.",
    categoryIds: [categoryId],
    status: "pending" as const,
  };
}

describe("Admin content moderation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("approves a pending question before it becomes public", async () => {
    const admin = await registerAdminViaApi();
    const author = await registerUserViaApi({ username: "review_author", email: "review_author@example.com" });
    const category = await createCategory();
    const question = await createQuestion(questionInput(author.userId, category.id));

    const hiddenResponse = await getJson(`/v1/questions/${question.id}`);
    expect(hiddenResponse.status).toBe(404);

    const approveResponse = await postJson(
      `/v1/admin/content/questions/${question.id}/approve`,
      {},
      createBearerTokenHeader(admin.accessToken),
    );
    const approvePayload = await readJson<{
      success: boolean;
      data: { status: string; reviewedBy: string };
    }>(approveResponse);

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("approved");
    expect(approvePayload.data.reviewedBy).toBe(admin.userId);

    const publicResponse = await getJson(`/v1/questions/${question.id}`);
    expect(publicResponse.status).toBe(200);
  });

  test("approves a pending quiz and optionally approves linked questions", async () => {
    const admin = await registerAdminViaApi();
    const author = await registerUserViaApi({ username: "quiz_review_author", email: "quiz_review@example.com" });
    const category = await createCategory();
    const question = await createQuestion(questionInput(author.userId, category.id, "What should quiz review check?"));
    const quiz = await createQuiz({
      creatorId: author.userId,
      title: "Review Flow",
      description: "Pending quiz with pending question",
      isPublic: true,
      questionIds: [question.id],
    });

    const blockedApproveResponse = await postJson(
      `/v1/admin/content/quizzes/${quiz.id}/approve`,
      { approveQuestions: false },
      createBearerTokenHeader(admin.accessToken),
    );
    const blockedApprovePayload = await readJson<{
      success: boolean;
      error: { code: string };
    }>(blockedApproveResponse);

    expect(blockedApproveResponse.status).toBe(422);
    expect(blockedApprovePayload.success).toBe(false);
    expect(blockedApprovePayload.error.code).toBe("QUIZ_HAS_UNAPPROVED_QUESTIONS");

    const approveResponse = await postJson(
      `/v1/admin/content/quizzes/${quiz.id}/approve`,
      { approveQuestions: true },
      createBearerTokenHeader(admin.accessToken),
    );
    const approvePayload = await readJson<{
      success: boolean;
      data: { status: string; reviewedBy: string };
    }>(approveResponse);

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.success).toBe(true);
    expect(approvePayload.data.status).toBe("approved");
    expect(approvePayload.data.reviewedBy).toBe(admin.userId);

    const storedQuestion = await db.query.questions.findFirst({
      where: eq(questions.id, question.id),
      columns: { status: true, reviewedBy: true },
    });
    expect(storedQuestion?.status).toBe("approved");
    expect(storedQuestion?.reviewedBy).toBe(admin.userId);

    const publicQuizResponse = await getJson(`/v1/quizzes/${quiz.id}`);
    expect(publicQuizResponse.status).toBe(200);
  });

  test("lists pending quizzes using the moderation response contract", async () => {
    const admin = await registerAdminViaApi();
    const author = await registerUserViaApi({ username: "quiz_list_author", email: "quiz_list@example.com" });
    const category = await createCategory();
    const question = await createQuestion(questionInput(author.userId, category.id, "Which quiz needs review?"));

    const quiz = await createQuiz({
      creatorId: author.userId,
      title: "Pending Review List",
      description: "Pending quiz list contract",
      isPublic: true,
      questionIds: [question.id],
    });

    const listResponse = await getJson(
      "/v1/admin/content/quizzes?status=pending",
      createBearerTokenHeader(admin.accessToken),
    );
    const listPayload = await readJson<{
      success: boolean;
      data: Array<{
        id: string;
        status: string;
        questionCount: number;
        pendingQuestionCount: number;
        difficultyBreakdown: {
          easy: number;
        };
      }>;
      meta: {
        pagination: {
          total: number;
        };
      };
    }>(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listPayload.success).toBe(true);
    expect(listPayload.meta.pagination.total).toBe(1);
    expect(listPayload.data[0]?.id).toBe(quiz.id);
    expect(listPayload.data[0]?.status).toBe("pending");
    expect(listPayload.data[0]?.questionCount).toBe(1);
    expect(listPayload.data[0]?.pendingQuestionCount).toBe(1);
    expect(listPayload.data[0]?.difficultyBreakdown.easy).toBe(1);
  });
});
