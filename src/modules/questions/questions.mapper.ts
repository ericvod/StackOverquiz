import type { QuestionOption } from "../../db/schema";
import type { QuestionDifficulty } from "../../shared/content";
import type {
  PublicQuestionAuthor,
  PublicQuestionCategory,
  PublicQuestionDetail,
  PublicQuestionSummary,
} from "./questions.types";

interface QuestionCategoryRelation {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    type: "language" | "area" | "framework";
  };
}

interface QuestionAuthorRelation {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface QuestionWithPublicRelations {
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
  author: QuestionAuthorRelation | null;
  questionCategories: QuestionCategoryRelation[];
}

interface QuestionMutationShape {
  id: string;
  authorId: string;
  title: string;
  body: string;
  imageUrl: string | null;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds: number;
  options: QuestionOption[];
  correctOptionIndex: number;
  explanation: string | null;
  status: "pending" | "approved" | "rejected";
  avgRating: number;
  ratingCount: number;
  highRatingBonusAwarded: boolean;
  aiGenerated: boolean;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}

function toPublicQuestionAuthor(author: QuestionAuthorRelation | null): PublicQuestionAuthor {
  if (!author) {
    throw new Error("Question author relation is required for public serialization");
  }

  return {
    id: author.id,
    username: author.username,
    avatarUrl: author.avatarUrl,
  };
}

function toPublicQuestionCategory({ category }: QuestionCategoryRelation): PublicQuestionCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    type: category.type,
  };
}

function toBodyPreview(body: string, maxLength = 180) {
  const normalizedBody = body.replace(/\s+/g, " ").trim();
  if (normalizedBody.length <= maxLength) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, maxLength - 3).trimEnd()}...`;
}

export function toPublicQuestionSummary(question: QuestionWithPublicRelations): PublicQuestionSummary {
  return {
    id: question.id,
    title: question.title,
    bodyPreview: toBodyPreview(question.body),
    imageUrl: question.imageUrl,
    difficulty: question.difficulty,
    estimatedTimeSeconds: question.estimatedTimeSeconds,
    avgRating: question.avgRating,
    ratingCount: question.ratingCount,
    aiGenerated: question.aiGenerated,
    createdAt: question.createdAt.toISOString(),
    author: toPublicQuestionAuthor(question.author),
    categories: question.questionCategories.map(toPublicQuestionCategory),
  };
}

export function toPublicQuestionDetail(question: QuestionWithPublicRelations): PublicQuestionDetail {
  return {
    ...toPublicQuestionSummary(question),
    body: question.body,
    options: question.options,
  };
}

export function toQuestionMutationResponse(question: QuestionMutationShape) {
  return {
    id: question.id,
    authorId: question.authorId,
    title: question.title,
    body: question.body,
    imageUrl: question.imageUrl,
    difficulty: question.difficulty,
    estimatedTimeSeconds: question.estimatedTimeSeconds,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
    status: question.status,
    avgRating: question.avgRating,
    ratingCount: question.ratingCount,
    highRatingBonusAwarded: question.highRatingBonusAwarded,
    aiGenerated: question.aiGenerated,
    reviewedBy: question.reviewedBy,
    reviewedAt: question.reviewedAt?.toISOString() ?? null,
    rejectionReason: question.rejectionReason,
    createdAt: question.createdAt.toISOString(),
  };
}
