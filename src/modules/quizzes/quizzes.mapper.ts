import type { QuestionOption } from "../../db/schema";
import { buildDifficultyBreakdown, type QuestionDifficulty } from "../../shared/content";
import { toPublicQuestionDetail } from "../questions/questions.mapper";
import type { PublicQuizCreator, PublicQuizDetail, PublicQuizSummary } from "./quizzes.types";

export interface ViewerQuizSummary {
  attempted: boolean;
  bestScore: number | null;
  lastAttemptAt: Date | string | null;
}

export interface ViewerQuizDetailSummary extends ViewerQuizSummary {
  attemptCount: number;
  lastScore: number | null;
}

interface QuizCreatorRelation {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface QuizSummaryShape {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  timeLimitSeconds: number | null;
  createdAt: Date;
  creator: QuizCreatorRelation | null;
  quizQuestions: Array<{
    question: {
      status: "pending" | "approved" | "rejected";
      difficulty: QuestionDifficulty;
      estimatedTimeSeconds: number;
    } | null;
  }>;
}

interface QuizDetailShape {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  timeLimitSeconds: number | null;
  createdAt: Date;
  creator: QuizCreatorRelation | null;
  quizQuestions: Array<{
    order: number;
    question: {
      id: string;
      title: string;
      body: string;
      imageUrl: string | null;
      difficulty: QuestionDifficulty;
      estimatedTimeSeconds: number;
      options: QuestionOption[];
      avgRating: number;
      ratingCount: number;
      aiGenerated: boolean;
      createdAt: Date;
      status: "pending" | "approved" | "rejected";
      author: {
        id: string;
        username: string;
        avatarUrl: string | null;
      } | null;
      questionCategories: Array<{
        category: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          type: "language" | "area" | "framework";
        };
      }>;
    };
  }>;
}

function toIsoDate(value: Date | string | null) {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

interface QuizMutationShape {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  status: "pending" | "approved" | "rejected";
  aiGenerated: boolean;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  timeLimitSeconds: number | null;
  createdAt: Date;
}

function toPublicQuizCreator(creator: QuizCreatorRelation | null): PublicQuizCreator {
  if (!creator) {
    throw new Error("Quiz creator relation is required for public serialization");
  }

  return {
    id: creator.id,
    username: creator.username,
    avatarUrl: creator.avatarUrl,
  };
}

function applyViewerSummary<T extends PublicQuizSummary>(quiz: T, viewerSummary?: ViewerQuizSummary): T {
  if (!viewerSummary) {
    return quiz;
  }

  return {
    ...quiz,
    attemptedByViewer: viewerSummary.attempted,
    viewerBestScore: viewerSummary.bestScore,
    viewerLastAttemptAt: toIsoDate(viewerSummary.lastAttemptAt),
  };
}

export function toPublicQuizSummary(quiz: QuizSummaryShape, viewerSummary?: ViewerQuizSummary): PublicQuizSummary {
  const approvedQuestions = quiz.quizQuestions
    .map((quizQuestion) => quizQuestion.question)
    .filter((question): question is NonNullable<(typeof quiz.quizQuestions)[number]["question"]> => question !== null)
    .filter((question) => question.status === "approved");
  const questionCount = approvedQuestions.length;

  return applyViewerSummary(
    {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      timeLimitSeconds: quiz.timeLimitSeconds,
      estimatedDurationSeconds: approvedQuestions.reduce((sum, question) => sum + question.estimatedTimeSeconds, 0),
      difficultyBreakdown: buildDifficultyBreakdown(approvedQuestions.map((question) => question.difficulty)),
      createdAt: quiz.createdAt.toISOString(),
      creator: toPublicQuizCreator(quiz.creator),
      questionCount,
    },
    viewerSummary,
  );
}

export function toPublicQuizDetail(quiz: QuizDetailShape, viewerSummary?: ViewerQuizDetailSummary): PublicQuizDetail {
  const approvedQuestions = quiz.quizQuestions.filter((quizQuestion) => quizQuestion.question.status === "approved");

  const publicDetail = applyViewerSummary(
    {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      isPublic: quiz.isPublic,
      timeLimitSeconds: quiz.timeLimitSeconds,
      estimatedDurationSeconds: approvedQuestions.reduce(
        (sum, quizQuestion) => sum + quizQuestion.question.estimatedTimeSeconds,
        0,
      ),
      difficultyBreakdown: buildDifficultyBreakdown(
        approvedQuestions.map((quizQuestion) => quizQuestion.question.difficulty),
      ),
      createdAt: quiz.createdAt.toISOString(),
      creator: toPublicQuizCreator(quiz.creator),
      questionCount: approvedQuestions.length,
      questions: approvedQuestions.map((quizQuestion) =>
        toPublicQuestionDetail({
          ...quizQuestion.question,
          questionCategories: quizQuestion.question.questionCategories,
        }),
      ),
    },
    viewerSummary,
  );

  if (!viewerSummary) {
    return publicDetail;
  }

  return {
    ...publicDetail,
    viewerAttemptSummary: {
      attempted: viewerSummary.attempted,
      attemptCount: viewerSummary.attemptCount,
      bestScore: viewerSummary.bestScore,
      lastScore: viewerSummary.lastScore,
      lastAttemptAt: toIsoDate(viewerSummary.lastAttemptAt),
    },
  };
}

export function toQuizMutationResponse(quiz: QuizMutationShape) {
  return {
    id: quiz.id,
    creatorId: quiz.creatorId,
    title: quiz.title,
    description: quiz.description,
    isPublic: quiz.isPublic,
    status: quiz.status,
    aiGenerated: quiz.aiGenerated,
    reviewedBy: quiz.reviewedBy,
    reviewedAt: quiz.reviewedAt?.toISOString() ?? null,
    rejectionReason: quiz.rejectionReason,
    timeLimitSeconds: quiz.timeLimitSeconds,
    createdAt: quiz.createdAt.toISOString(),
  };
}
