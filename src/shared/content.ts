import { t } from "elysia";

export const QUESTION_DIFFICULTIES = ["beginner", "easy", "medium", "hard", "expert"] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export interface QuestionDifficultyMeta {
  order: number;
  label: string;
  summary: string;
  baseXp: number;
  defaultEstimatedTimeSeconds: number;
}

export type DifficultyBreakdown = Record<QuestionDifficulty, number>;

export const questionDifficultySchema = t.Union([
  t.Literal("beginner"),
  t.Literal("easy"),
  t.Literal("medium"),
  t.Literal("hard"),
  t.Literal("expert"),
]);

export const QUESTION_DIFFICULTY_META: Record<QuestionDifficulty, QuestionDifficultyMeta> = {
  beginner: {
    order: 1,
    label: "Beginner",
    summary: "Reconhecimento de conceitos, leitura guiada e primeiros passos de sintaxe.",
    baseXp: 5,
    defaultEstimatedTimeSeconds: 45,
  },
  easy: {
    order: 2,
    label: "Easy",
    summary: "Aplicacao direta de fundamentos e cenarios simples do dia a dia.",
    baseXp: 10,
    defaultEstimatedTimeSeconds: 60,
  },
  medium: {
    order: 3,
    label: "Medium",
    summary: "Debugging, composicao de conceitos e interpretacao de comportamento real.",
    baseXp: 15,
    defaultEstimatedTimeSeconds: 90,
  },
  hard: {
    order: 4,
    label: "Hard",
    summary: "Trade-offs, performance, arquitetura e edge cases de implementacao.",
    baseXp: 25,
    defaultEstimatedTimeSeconds: 120,
  },
  expert: {
    order: 5,
    label: "Expert",
    summary: "Casos altamente especificos, internals, concorrencia e decisoes de alto risco.",
    baseXp: 40,
    defaultEstimatedTimeSeconds: 180,
  },
};

export function createDifficultyBreakdown(): DifficultyBreakdown {
  return {
    beginner: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };
}

export function buildDifficultyBreakdown(difficulties: QuestionDifficulty[]): DifficultyBreakdown {
  const breakdown = createDifficultyBreakdown();

  for (const difficulty of difficulties) {
    breakdown[difficulty] += 1;
  }

  return breakdown;
}

export function getQuestionXpReward(difficulty: QuestionDifficulty) {
  return QUESTION_DIFFICULTY_META[difficulty].baseXp;
}

export function getDefaultQuestionEstimatedTimeSeconds(difficulty: QuestionDifficulty) {
  return QUESTION_DIFFICULTY_META[difficulty].defaultEstimatedTimeSeconds;
}

export function deriveQuizTimeLimitSeconds(questionEstimatedTimes: number[]) {
  const baseDurationSeconds = questionEstimatedTimes.reduce((sum, value) => sum + value, 0);
  const bufferedDurationSeconds = Math.ceil((baseDurationSeconds * 1.2) / 30) * 30;

  return Math.max(30, bufferedDurationSeconds);
}
