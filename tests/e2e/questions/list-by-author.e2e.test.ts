import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { categories, questions } from "../../../src/db/schema";
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
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

async function registerViaApi() {
  const response = await postJson("/v1/auth/register", makeUserInput());
  const payload = await readJson<{
    data: { user: { id: string }; tokens: { accessToken: string } };
  }>(response);
  return { userId: payload.data.user.id, accessToken: payload.data.tokens.accessToken };
}

async function listQuestions(query: string, headers: Record<string, string> = {}) {
  const response = await app.handle(new Request(`http://localhost/v1/questions${query}`, { headers }));
  const payload = await readJson<{
    success: boolean;
    data?: Array<{ id: string; status?: string }>;
    error?: { code: string; message: string };
  }>(response);
  return { status: response.status, payload };
}

async function seedCategory() {
  const [category] = await db
    .insert(categories)
    .values({
      name: "Web",
      slug: "web",
      type: "area",
      description: "Web development",
      icon: "globe",
    })
    .returning();
  return category!;
}

describe("GET /v1/questions?author=", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("filters approved questions by author UUID for any viewer", async () => {
    const author = await register(makeUserInput({ username: "the_author", email: "the_author@example.com" }));
    const otherAuthor = await register(makeUserInput({ username: "other_author", email: "other_author@example.com" }));
    const category = await seedCategory();

    const authorQuestion = await createQuestion({
      authorId: author.id,
      title: "Author's approved question",
      body: "Body of the author question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    // Approve it manually
    await db.update(questions).set({ status: "approved" }).where(eq(questions.id, authorQuestion.id));

    // Other author's approved question
    const otherQuestion = await createQuestion({
      authorId: otherAuthor.id,
      title: "Other author's approved question",
      body: "Body of the other question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    await db.update(questions).set({ status: "approved" }).where(eq(questions.id, otherQuestion.id));

    const { status, payload } = await listQuestions(`?author=${author.id}`);
    expect(status).toBe(200);
    expect(payload.data!.length).toBe(1);
    expect(payload.data![0]!.id).toBe(authorQuestion.id);
  });

  test("hides pending questions when filtering by another user's UUID", async () => {
    const author = await register(makeUserInput({ username: "pending_author", email: "pending_author@example.com" }));
    const category = await seedCategory();

    // Create one pending and one approved by the same author
    const pending = await createQuestion({
      authorId: author.id,
      title: "Still pending",
      body: "Body of the pending question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    const approved = await createQuestion({
      authorId: author.id,
      title: "Already approved",
      body: "Body of the approved question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    await db.update(questions).set({ status: "approved" }).where(eq(questions.id, approved.id));

    const { status, payload } = await listQuestions(`?author=${author.id}`);
    expect(status).toBe(200);
    const ids = payload.data!.map((q) => q.id);
    expect(ids).toContain(approved.id);
    expect(ids).not.toContain(pending.id);
  });

  test("`author=me` returns the viewer's own pending and approved questions", async () => {
    const viewer = await registerViaApi();
    const category = await seedCategory();

    const pending = await createQuestion({
      authorId: viewer.userId,
      title: "My pending draft",
      body: "Body of the pending question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    const approved = await createQuestion({
      authorId: viewer.userId,
      title: "My approved question",
      body: "Body of the approved question.",
      difficulty: "easy",
      options: [{ text: "A" }, { text: "B" }],
      correctOptionIndex: 0,
      categoryIds: [category.id],
    });
    await db.update(questions).set({ status: "approved" }).where(eq(questions.id, approved.id));

    const { status, payload } = await listQuestions("?author=me", createBearerTokenHeader(viewer.accessToken));
    expect(status).toBe(200);
    const ids = payload.data!.map((q) => q.id);
    expect(ids).toContain(pending.id);
    expect(ids).toContain(approved.id);
  });

  test("`author=me` without authentication returns 401", async () => {
    const { status, payload } = await listQuestions("?author=me");
    expect(status).toBe(401);
    expect(payload.success).toBe(false);
  });

  test("`author=invalid` returns 422 validation error", async () => {
    const { status, payload } = await listQuestions("?author=not-a-uuid");
    expect(status).toBe(422);
    expect(payload.error?.message).toContain("author");
  });
});
