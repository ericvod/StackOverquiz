export function makeQuizInput(
  overrides: Partial<{
    title: string;
    description: string;
    isPublic: boolean;
    timeLimitSeconds: number;
    questionIds: string[];
  }> = {},
) {
  return {
    title: overrides.title ?? "Backend Basics",
    description: overrides.description ?? "A short quiz about backend fundamentals.",
    isPublic: overrides.isPublic ?? true,
    timeLimitSeconds: overrides.timeLimitSeconds ?? 120,
    questionIds: overrides.questionIds ?? [],
  };
}
