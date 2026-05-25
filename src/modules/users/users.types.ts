export interface PublicUserProfileStats {
  questionsCreated: number;
  quizzesAttempted: number;
  totalCorrectAnswers: number;
  totalQuestionsAnswered: number;
  accuracy: number;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  xp: number;
  level: number;
  createdAt: string;
  stats: PublicUserProfileStats;
}

export interface UserHistoryItem {
  id: string;
  quiz: {
    id: string;
    title: string;
  } | null;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number | null;
  completedAt: string;
}
