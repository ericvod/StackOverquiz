export interface QuestionRatingStats {
  avgRating: number;
  ratingCount: number;
}

/**
 * Normalizes SQL aggregate output into numeric rating stats.
 */
export function buildQuestionRatingStats(
  avg: number | string | null | undefined,
  count: number | string | null | undefined,
) {
  return {
    avgRating: Number(avg ?? 0),
    ratingCount: Number(count ?? 0),
  } satisfies QuestionRatingStats;
}

/**
 * Determines whether a pending question should be auto-approved or auto-rejected.
 */
export function getAutoModerationStatus(
  currentStatus: "pending" | "approved" | "rejected",
  stats: QuestionRatingStats,
): "approved" | "rejected" | null {
  if (currentStatus !== "pending") {
    return null;
  }

  if (stats.ratingCount >= 10 && stats.avgRating < 2.0) {
    return "rejected";
  }

  if (stats.ratingCount >= 5 && stats.avgRating >= 3.5) {
    return "approved";
  }

  return null;
}

/**
 * Decides whether the author should receive the one-time high-rating XP bonus.
 */
export function shouldAwardHighRatingBonus(stats: QuestionRatingStats, alreadyAwarded: boolean) {
  return !alreadyAwarded && stats.avgRating >= 4.0 && stats.ratingCount >= 5;
}
