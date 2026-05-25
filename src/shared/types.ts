import type { categories, questions, quizzes, users } from "../db/schema";

// ─── Inferred DB row types ───────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// ─── Auth types ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user id
  role: "user" | "admin";
  sid: string; // session id
  type: "access" | "refresh";
  jti?: string;
  exp?: number;
  iat?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Gamification constants ──────────────────────────────────────────────────

export const XP_REWARDS = {
  QUESTION_APPROVED: 50,
  HIGH_RATING_BONUS: 25, // question reaches avg >= 4.0
  PERFECT_QUIZ: 100,
} as const;

export const LEVEL_THRESHOLDS = [
  0, // Lv 1
  100, // Lv 2
  300, // Lv 3
  600, // Lv 4
  1000, // Lv 5
  1500, // Lv 6
  2500, // Lv 7
  4000, // Lv 8
  6000, // Lv 9
  10000, // Lv 10
] as const;

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]!) {
      return i + 1;
    }
  }
  return 1;
}
