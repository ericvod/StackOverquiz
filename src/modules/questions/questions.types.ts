import type { QuestionOption } from "../../db/schema";
import type { QuestionDifficulty } from "../../shared/content";

export interface PublicQuestionAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface PublicQuestionCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: "language" | "area" | "framework";
}

export interface PublicQuestionSummary {
  id: string;
  title: string;
  bodyPreview: string;
  imageUrl: string | null;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds: number;
  avgRating: number;
  ratingCount: number;
  aiGenerated: boolean;
  createdAt: string;
  author: PublicQuestionAuthor;
  categories: PublicQuestionCategory[];
}

export interface PublicQuestionDetail extends PublicQuestionSummary {
  body: string;
  options: QuestionOption[];
}
