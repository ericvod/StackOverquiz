import type { QuestionDifficulty } from "../../src/shared/content";

export function makeQuestionInput(
  overrides: Partial<{
    title: string;
    body: string;
    difficulty: QuestionDifficulty;
    estimatedTimeSeconds: number;
    correctOptionIndex: number;
    categoryIds: string[];
  }> = {},
) {
  return {
    title: overrides.title ?? "What does HTTP stand for?",
    body: overrides.body ?? "Choose the correct meaning of the acronym HTTP.",
    difficulty: overrides.difficulty ?? "easy",
    estimatedTimeSeconds: overrides.estimatedTimeSeconds ?? 60,
    options: [
      { text: "HyperText Transfer Protocol" },
      { text: "High Transfer Text Process" },
      { text: "Hyperlink Trace Transport Process" },
      { text: "Host Transfer Token Protocol" },
      { text: "Hyper Tool Transfer Package" },
    ],
    correctOptionIndex: overrides.correctOptionIndex ?? 0,
    categoryIds: overrides.categoryIds ?? [],
  };
}
