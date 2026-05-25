import { describe, expect, test } from "bun:test";
import {
  buildDifficultyBreakdown,
  deriveQuizTimeLimitSeconds,
  getDefaultQuestionEstimatedTimeSeconds,
  getQuestionXpReward,
} from "../../../src/shared/content";

describe("content balance helpers", () => {
  test("builds a stable difficulty breakdown for mixed quizzes", () => {
    expect(buildDifficultyBreakdown(["beginner", "easy", "easy", "hard", "expert"])).toEqual({
      beginner: 1,
      easy: 2,
      medium: 0,
      hard: 1,
      expert: 1,
    });
  });

  test("derives a buffered quiz time limit from question estimates", () => {
    expect(deriveQuizTimeLimitSeconds([45, 60, 90])).toBe(240);
  });

  test("difficulty metadata scales time and XP with the level", () => {
    expect(getQuestionXpReward("expert")).toBeGreaterThan(getQuestionXpReward("hard"));
    expect(getQuestionXpReward("hard")).toBeGreaterThan(getQuestionXpReward("medium"));
    expect(getDefaultQuestionEstimatedTimeSeconds("expert")).toBeGreaterThan(
      getDefaultQuestionEstimatedTimeSeconds("easy"),
    );
  });
});
