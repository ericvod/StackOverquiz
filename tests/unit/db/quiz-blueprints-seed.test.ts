import { describe, expect, test } from "bun:test";
import { QUIZ_BLUEPRINTS_SEED, validateQuizBlueprintsSeed } from "../../../src/db/seeds/quiz-blueprints.seed";

describe("quiz blueprints seed catalog", () => {
  test("keeps blueprint slugs unique and distributions consistent", () => {
    expect(() => validateQuizBlueprintsSeed()).not.toThrow();

    const slugs = new Set(QUIZ_BLUEPRINTS_SEED.map((blueprint) => blueprint.slug));
    expect(slugs.size).toBe(QUIZ_BLUEPRINTS_SEED.length);

    for (const blueprint of QUIZ_BLUEPRINTS_SEED) {
      const totalQuestions = Object.values(blueprint.recommendedDistribution).reduce((sum, count) => sum + count, 0);
      expect(totalQuestions).toBe(blueprint.questionCount);
      expect(blueprint.targetAudience.length).toBeGreaterThan(10);
      expect(blueprint.curationGoal.length).toBeGreaterThan(10);
    }
  });
});
