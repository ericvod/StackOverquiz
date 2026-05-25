import { type DifficultyBreakdown, QUESTION_DIFFICULTIES } from "../../shared/content";

export interface QuizBlueprintSeed {
  slug: string;
  label: string;
  questionCount: number;
  targetAudience: string;
  curationGoal: string;
  recommendedDistribution: DifficultyBreakdown;
}

export const QUIZ_BLUEPRINTS_SEED: QuizBlueprintSeed[] = [
  {
    slug: "starter-ramp",
    label: "Starter Ramp",
    questionCount: 8,
    targetAudience: "Pessoa em onboarding ou revisao de fundamentos",
    curationGoal: "Construir confianca, cobrir conceitos centrais e evitar punir cedo com edge cases.",
    recommendedDistribution: {
      beginner: 3,
      easy: 3,
      medium: 2,
      hard: 0,
      expert: 0,
    },
  },
  {
    slug: "balanced-core",
    label: "Balanced Core",
    questionCount: 10,
    targetAudience: "Feed publico principal e trilhas gerais de pratica",
    curationGoal: "Misturar fundamentos e aplicacao pratica sem deixar o quiz monotono ou punitivo.",
    recommendedDistribution: {
      beginner: 1,
      easy: 3,
      medium: 3,
      hard: 2,
      expert: 1,
    },
  },
  {
    slug: "deep-dive",
    label: "Deep Dive",
    questionCount: 12,
    targetAudience: "Pessoa que ja domina o basico e quer avaliacao mais tecnica",
    curationGoal: "Explorar debug, trade-offs e comportamento real de plataforma sem virar prova de trivia.",
    recommendedDistribution: {
      beginner: 0,
      easy: 2,
      medium: 4,
      hard: 4,
      expert: 2,
    },
  },
  {
    slug: "expert-sprint",
    label: "Expert Sprint",
    questionCount: 8,
    targetAudience: "Quizzes especializados, seletivos ou desafios de nicho",
    curationGoal: "Concentrar perguntas especificas sem perder um pequeno aquecimento antes dos casos extremos.",
    recommendedDistribution: {
      beginner: 0,
      easy: 1,
      medium: 2,
      hard: 3,
      expert: 2,
    },
  },
];

export function validateQuizBlueprintsSeed(seed: QuizBlueprintSeed[] = QUIZ_BLUEPRINTS_SEED) {
  const slugs = new Set<string>();
  const coverage = new Set<string>();

  for (const blueprint of seed) {
    if (slugs.has(blueprint.slug)) {
      throw new Error(`Duplicate quiz blueprint slug in seed: ${blueprint.slug}`);
    }

    slugs.add(blueprint.slug);

    const totalQuestions = Object.values(blueprint.recommendedDistribution).reduce((sum, count) => sum + count, 0);
    if (totalQuestions !== blueprint.questionCount) {
      throw new Error(
        `Quiz blueprint "${blueprint.slug}" distribution must sum to questionCount (${blueprint.questionCount})`,
      );
    }

    for (const difficulty of QUESTION_DIFFICULTIES) {
      if (!(difficulty in blueprint.recommendedDistribution)) {
        throw new Error(`Quiz blueprint "${blueprint.slug}" must include difficulty slot "${difficulty}"`);
      }

      if (blueprint.recommendedDistribution[difficulty] > 0) {
        coverage.add(difficulty);
      }
    }
  }

  for (const difficulty of QUESTION_DIFFICULTIES) {
    if (!coverage.has(difficulty)) {
      throw new Error(`Quiz blueprints seed must cover difficulty "${difficulty}" at least once`);
    }
  }
}
