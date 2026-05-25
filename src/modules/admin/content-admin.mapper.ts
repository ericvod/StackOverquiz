import type { QuestionOption } from "../../db/schema";
import { buildDifficultyBreakdown, type DifficultyBreakdown, type QuestionDifficulty } from "../../shared/content";

export type ModerationStatus = "pending" | "approved" | "rejected";

interface AdminUserRelation {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface AdminCategoryRelation {
  category: {
    id: string;
    name: string;
    slug: string;
    type: "language" | "area" | "framework";
  };
}

interface AdminQuestionShape {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds: number;
  options: QuestionOption[];
  correctOptionIndex: number;
  explanation: string | null;
  status: ModerationStatus;
  aiGenerated: boolean;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  author: AdminUserRelation | null;
  reviewer: AdminUserRelation | null;
  questionCategories: AdminCategoryRelation[];
}

interface AdminQuizQuestionShape {
  order: number;
  question: {
    id: string;
    title: string;
    difficulty: QuestionDifficulty;
    status: ModerationStatus;
    aiGenerated: boolean;
    estimatedTimeSeconds: number;
  } | null;
}

interface AdminQuizShape {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  status: ModerationStatus;
  aiGenerated: boolean;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  timeLimitSeconds: number | null;
  createdAt: Date;
  creator: AdminUserRelation | null;
  reviewer: AdminUserRelation | null;
  quizQuestions: AdminQuizQuestionShape[];
}

interface ModerationMutationShape {
  id: string;
  status: ModerationStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

function toAdminUser(user: AdminUserRelation | null) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

function buildQuestionStatusBreakdown(statuses: ModerationStatus[]) {
  return {
    pending: statuses.filter((status) => status === "pending").length,
    approved: statuses.filter((status) => status === "approved").length,
    rejected: statuses.filter((status) => status === "rejected").length,
  };
}

function summarizeQuizQuestions(quizQuestions: AdminQuizQuestionShape[]): {
  questionCount: number;
  approvedQuestionCount: number;
  pendingQuestionCount: number;
  rejectedQuestionCount: number;
  estimatedDurationSeconds: number;
  difficultyBreakdown: DifficultyBreakdown;
} {
  const linkedQuestions = quizQuestions
    .map((quizQuestion) => quizQuestion.question)
    .filter((question): question is NonNullable<AdminQuizQuestionShape["question"]> => question !== null);
  const statusBreakdown = buildQuestionStatusBreakdown(linkedQuestions.map((question) => question.status));

  return {
    questionCount: linkedQuestions.length,
    approvedQuestionCount: statusBreakdown.approved,
    pendingQuestionCount: statusBreakdown.pending,
    rejectedQuestionCount: statusBreakdown.rejected,
    estimatedDurationSeconds: linkedQuestions.reduce((sum, question) => sum + question.estimatedTimeSeconds, 0),
    difficultyBreakdown: buildDifficultyBreakdown(linkedQuestions.map((question) => question.difficulty)),
  };
}

export function toAdminQuestionReview(question: AdminQuestionShape) {
  return {
    id: question.id,
    title: question.title,
    body: question.body,
    imageUrl: question.imageUrl,
    difficulty: question.difficulty,
    estimatedTimeSeconds: question.estimatedTimeSeconds,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
    status: question.status,
    aiGenerated: question.aiGenerated,
    reviewedAt: question.reviewedAt?.toISOString() ?? null,
    rejectionReason: question.rejectionReason,
    createdAt: question.createdAt.toISOString(),
    author: toAdminUser(question.author),
    reviewer: toAdminUser(question.reviewer),
    categories: question.questionCategories.map(({ category }) => category),
  };
}

export function toAdminQuizReviewSummary(quiz: AdminQuizShape) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    isPublic: quiz.isPublic,
    status: quiz.status,
    aiGenerated: quiz.aiGenerated,
    reviewedAt: quiz.reviewedAt?.toISOString() ?? null,
    rejectionReason: quiz.rejectionReason,
    timeLimitSeconds: quiz.timeLimitSeconds,
    createdAt: quiz.createdAt.toISOString(),
    creator: toAdminUser(quiz.creator),
    reviewer: toAdminUser(quiz.reviewer),
    ...summarizeQuizQuestions(quiz.quizQuestions),
  };
}

export function toAdminQuizReviewDetail(quiz: AdminQuizShape) {
  return {
    ...toAdminQuizReviewSummary(quiz),
    questions: quiz.quizQuestions
      .filter((quizQuestion) => quizQuestion.question !== null)
      .map((quizQuestion) => ({
        order: quizQuestion.order,
        ...quizQuestion.question!,
      })),
  };
}

export function toModerationMutationResponse(content: ModerationMutationShape) {
  return {
    id: content.id,
    status: content.status,
    reviewedBy: content.reviewedBy,
    reviewedAt: content.reviewedAt?.toISOString() ?? null,
    rejectionReason: content.rejectionReason,
  };
}
