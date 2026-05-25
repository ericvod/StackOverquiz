import type { DifficultyBreakdown } from "../../shared/content";
import type { PublicQuestionDetail } from "../questions/questions.types";

export interface PublicQuizCreator {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface PublicQuizSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  timeLimitSeconds: number | null;
  estimatedDurationSeconds: number;
  difficultyBreakdown: DifficultyBreakdown;
  createdAt: string;
  creator: PublicQuizCreator;
  questionCount: number;
  attemptedByViewer?: boolean;
  viewerBestScore?: number | null;
  viewerLastAttemptAt?: string | null;
}

export interface PublicQuizDetail extends PublicQuizSummary {
  questions: PublicQuestionDetail[];
  viewerAttemptSummary?: {
    attempted: boolean;
    attemptCount: number;
    bestScore: number | null;
    lastScore: number | null;
    lastAttemptAt: string | null;
  };
}
