import { describe, expect, test } from "bun:test";
import { CATEGORIES_SEED, CATEGORY_SEED_GROUPS, validateCategoriesSeed } from "../../../src/db/seeds/categories.seed";

describe("categories seed catalog", () => {
  test("keeps names and slugs unique and includes every category type", () => {
    expect(() => validateCategoriesSeed()).not.toThrow();

    const names = new Set(CATEGORIES_SEED.map((category) => category.name));
    const slugs = new Set(CATEGORIES_SEED.map((category) => category.slug));
    const types = new Set(CATEGORIES_SEED.map((category) => category.type));

    expect(names.size).toBe(CATEGORIES_SEED.length);
    expect(slugs.size).toBe(CATEGORIES_SEED.length);
    expect(types).toEqual(new Set(["language", "area", "framework"]));
  });

  test("documents difficulty coverage guidance for every seed group", () => {
    for (const group of CATEGORY_SEED_GROUPS) {
      expect(group.curationGoal.length).toBeGreaterThan(10);
      expect(group.difficultyCoverage.beginner.length).toBeGreaterThan(10);
      expect(group.difficultyCoverage.easy.length).toBeGreaterThan(10);
      expect(group.difficultyCoverage.medium.length).toBeGreaterThan(10);
      expect(group.difficultyCoverage.hard.length).toBeGreaterThan(10);
      expect(group.difficultyCoverage.expert.length).toBeGreaterThan(10);
      expect(group.categories.length).toBeGreaterThan(0);
    }
  });
});
