import type { PublicUserProfile, PublicUserProfileStats, UserHistoryItem } from "./users.types";

interface PublicUserProfileShape {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  xp: number;
  level: number;
  createdAt: Date;
}

interface UserHistoryShape {
  id: string;
  quiz: {
    id: string;
    title: string;
  } | null;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number | null;
  completedAt: Date;
}

export function toPublicUserProfile(user: PublicUserProfileShape, stats: PublicUserProfileStats): PublicUserProfile {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    xp: user.xp,
    level: user.level,
    createdAt: user.createdAt.toISOString(),
    stats,
  };
}

export function toUserHistoryItem(attempt: UserHistoryShape): UserHistoryItem {
  return {
    id: attempt.id,
    quiz: attempt.quiz,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
    timeSpentSeconds: attempt.timeSpentSeconds,
    completedAt: attempt.completedAt.toISOString(),
  };
}
