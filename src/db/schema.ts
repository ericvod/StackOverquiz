import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { QuestionDifficulty } from "../shared/content";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum("difficulty", ["beginner", "easy", "medium", "hard", "expert"]);
export const questionStatusEnum = pgEnum("question_status", ["pending", "approved", "rejected"]);
export const quizStatusEnum = pgEnum("quiz_status", ["pending", "approved", "rejected"]);
export const categoryTypeEnum = pgEnum("category_type", ["language", "area", "framework"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "github"]);
export const reportReasonEnum = pgEnum("report_reason", ["incorrect", "duplicate", "offensive", "unclear"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    oauthProvider: oauthProviderEnum("oauth_provider"),
    oauthId: varchar("oauth_id", { length: 255 }),
    role: userRoleEnum("role").notNull().default("user"),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("oauth_unique_idx").on(table.oauthProvider, table.oauthId)],
);

// ─── User Sessions ────────────────────────────────────────────────────────────

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: varchar("user_agent", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expires_idx").on(table.expiresAt)],
);

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  type: categoryTypeEnum("type").notNull(),
});

// ─── Questions ────────────────────────────────────────────────────────────────

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    difficulty: difficultyEnum("difficulty").notNull(),
    estimatedTimeSeconds: integer("estimated_time_seconds").notNull(),
    options: jsonb("options").notNull().$type<QuestionOption[]>(),
    correctOptionIndex: integer("correct_option_index").notNull(),
    explanation: text("explanation"),
    status: questionStatusEnum("status").notNull().default("pending"),
    avgRating: real("avg_rating").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    highRatingBonusAwarded: boolean("high_rating_bonus_awarded").notNull().default(false),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("questions_author_idx").on(table.authorId),
    index("questions_status_idx").on(table.status),
    index("questions_difficulty_idx").on(table.difficulty),
  ],
);

// ─── Question Categories (M2M) ───────────────────────────────────────────────

export const questionCategories = pgTable(
  "question_categories",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("question_category_unique_idx").on(table.questionId, table.categoryId)],
);

// ─── Question Ratings ─────────────────────────────────────────────────────────

export const questionRatings = pgTable(
  "question_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 1-5
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rating_unique_idx").on(table.questionId, table.userId)],
);

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(true),
    status: quizStatusEnum("status").notNull().default("pending"),
    aiGenerated: boolean("ai_generated").notNull().default(false),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    timeLimitSeconds: integer("time_limit_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quizzes_creator_idx").on(table.creatorId),
    index("quizzes_status_idx").on(table.status),
    index("quizzes_public_status_idx").on(table.isPublic, table.status),
  ],
);

// ─── Quiz Questions (M2M) ────────────────────────────────────────────────────

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
  },
  (table) => [uniqueIndex("quiz_question_unique_idx").on(table.quizId, table.questionId)],
);

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    timeSpentSeconds: integer("time_spent_seconds"),
    answers: jsonb("answers").notNull().$type<AttemptAnswer[]>(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attempts_quiz_idx").on(table.quizId),
    index("attempts_user_idx").on(table.userId),
    index("attempts_user_quiz_idx").on(table.userId, table.quizId),
  ],
);

// ─── User Question Progress ──────────────────────────────────────────────────

export const userQuestionProgress = pgTable(
  "user_question_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    firstAnsweredAt: timestamp("first_answered_at", { withTimezone: true }).notNull().defaultNow(),
    lastAnsweredAt: timestamp("last_answered_at", { withTimezone: true }).notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(1),
    firstAnswerCorrect: boolean("first_answer_correct").notNull(),
    lastAnswerCorrect: boolean("last_answer_correct").notNull(),
    correctAttemptCount: integer("correct_attempt_count").notNull().default(0),
    xpAwarded: integer("xp_awarded").notNull().default(0),
  },
  (table) => [
    index("question_progress_user_idx").on(table.userId),
    index("question_progress_question_idx").on(table.questionId),
    uniqueIndex("question_progress_user_question_unique_idx").on(table.userId, table.questionId),
  ],
);

// ─── Question Reports ─────────────────────────────────────────────────────────

export const questionReports = pgTable(
  "question_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: reportReasonEnum("reason").notNull(),
    description: text("description"),
    status: reportStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reports_question_idx").on(table.questionId),
    uniqueIndex("report_unique_idx").on(table.questionId, table.reporterId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  authoredQuestions: many(questions, { relationName: "question_author" }),
  reviewedQuestions: many(questions, { relationName: "question_reviewer" }),
  ratings: many(questionRatings),
  createdQuizzes: many(quizzes, { relationName: "quiz_creator" }),
  reviewedQuizzes: many(quizzes, { relationName: "quiz_reviewer" }),
  attempts: many(quizAttempts),
  questionProgress: many(userQuestionProgress),
  reports: many(questionReports),
  sessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  questionCategories: many(questionCategories),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, {
    fields: [questions.authorId],
    references: [users.id],
    relationName: "question_author",
  }),
  reviewer: one(users, {
    fields: [questions.reviewedBy],
    references: [users.id],
    relationName: "question_reviewer",
  }),
  questionCategories: many(questionCategories),
  ratings: many(questionRatings),
  quizQuestions: many(quizQuestions),
  userProgress: many(userQuestionProgress),
  reports: many(questionReports),
}));

export const questionCategoriesRelations = relations(questionCategories, ({ one }) => ({
  question: one(questions, { fields: [questionCategories.questionId], references: [questions.id] }),
  category: one(categories, { fields: [questionCategories.categoryId], references: [categories.id] }),
}));

export const questionRatingsRelations = relations(questionRatings, ({ one }) => ({
  question: one(questions, { fields: [questionRatings.questionId], references: [questions.id] }),
  user: one(users, { fields: [questionRatings.userId], references: [users.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  creator: one(users, {
    fields: [quizzes.creatorId],
    references: [users.id],
    relationName: "quiz_creator",
  }),
  reviewer: one(users, {
    fields: [quizzes.reviewedBy],
    references: [users.id],
    relationName: "quiz_reviewer",
  }),
  quizQuestions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
  question: one(questions, { fields: [quizQuestions.questionId], references: [questions.id] }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  user: one(users, { fields: [quizAttempts.userId], references: [users.id] }),
}));

export const userQuestionProgressRelations = relations(userQuestionProgress, ({ one }) => ({
  user: one(users, { fields: [userQuestionProgress.userId], references: [users.id] }),
  question: one(questions, { fields: [userQuestionProgress.questionId], references: [questions.id] }),
}));

export const questionReportsRelations = relations(questionReports, ({ one }) => ({
  question: one(questions, { fields: [questionReports.questionId], references: [questions.id] }),
  reporter: one(users, { fields: [questionReports.reporterId], references: [users.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionOption {
  text: string;
  code?: string | null;
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  difficulty: QuestionDifficulty;
  xpReward: number;
}
