import type { QuestionDifficulty } from "../../shared/content";

export interface SeedCategory {
  name: string;
  slug: string;
  type: "language" | "area" | "framework";
  icon: string;
  description: string;
}

export interface SeedCategoryGroup {
  type: SeedCategory["type"];
  label: string;
  curationGoal: string;
  difficultyCoverage: Record<QuestionDifficulty, string>;
  categories: SeedCategory[];
}

const LANGUAGE_CATEGORIES: SeedCategory[] = [
  {
    name: "JavaScript",
    slug: "javascript",
    type: "language",
    icon: "🟨",
    description: "Perguntas sobre JavaScript, ES6+, runtime, e ecossistema",
  },
  {
    name: "TypeScript",
    slug: "typescript",
    type: "language",
    icon: "🔷",
    description: "Perguntas sobre TypeScript, tipos, generics, e type system",
  },
  {
    name: "Python",
    slug: "python",
    type: "language",
    icon: "🐍",
    description: "Perguntas sobre Python, stdlib, e boas práticas",
  },
  {
    name: "Java",
    slug: "java",
    type: "language",
    icon: "☕",
    description: "Perguntas sobre Java, JVM, e OOP",
  },
  {
    name: "Rust",
    slug: "rust",
    type: "language",
    icon: "🦀",
    description: "Perguntas sobre Rust, ownership, e memory safety",
  },
  {
    name: "Go",
    slug: "go",
    type: "language",
    icon: "🐹",
    description: "Perguntas sobre Go, goroutines, e concorrência",
  },
  {
    name: "C#",
    slug: "csharp",
    type: "language",
    icon: "🟣",
    description: "Perguntas sobre C#, .NET, e ecossistema Microsoft",
  },
];

const AREA_CATEGORIES: SeedCategory[] = [
  {
    name: "Algoritmos",
    slug: "algorithms",
    type: "area",
    icon: "🧮",
    description: "Algoritmos, complexidade, sorting, searching",
  },
  {
    name: "Estruturas de Dados",
    slug: "data-structures",
    type: "area",
    icon: "🏗️",
    description: "Arrays, listas, árvores, grafos, hash tables",
  },
  {
    name: "Design Patterns",
    slug: "design-patterns",
    type: "area",
    icon: "🎨",
    description: "Padrões de projeto: Singleton, Factory, Observer, etc.",
  },
  {
    name: "Banco de Dados",
    slug: "databases",
    type: "area",
    icon: "🗄️",
    description: "SQL, NoSQL, modelagem, queries, e otimização",
  },
  {
    name: "DevOps",
    slug: "devops",
    type: "area",
    icon: "⚙️",
    description: "CI/CD, Docker, Kubernetes, cloud, e infraestrutura",
  },
  {
    name: "Redes",
    slug: "networking",
    type: "area",
    icon: "🌐",
    description: "HTTP, TCP/IP, DNS, WebSockets, e protocolos",
  },
  {
    name: "Segurança",
    slug: "security",
    type: "area",
    icon: "🔒",
    description: "Criptografia, autenticação, XSS, CSRF, OWASP",
  },
];

const FRAMEWORK_CATEGORIES: SeedCategory[] = [
  {
    name: "React",
    slug: "react",
    type: "framework",
    icon: "⚛️",
    description: "React, hooks, state management, e ecossistema",
  },
  {
    name: "Next.js",
    slug: "nextjs",
    type: "framework",
    icon: "▲",
    description: "Next.js, SSR, SSG, API routes, e App Router",
  },
  {
    name: "Node.js",
    slug: "nodejs",
    type: "framework",
    icon: "💚",
    description: "Node.js, runtime, modules, streams, e event loop",
  },
  {
    name: "Django",
    slug: "django",
    type: "framework",
    icon: "🎸",
    description: "Django, ORM, views, e templates",
  },
  {
    name: "Spring Boot",
    slug: "spring-boot",
    type: "framework",
    icon: "🍃",
    description: "Spring Boot, dependency injection, e JPA",
  },
];

export const CATEGORY_SEED_GROUPS: SeedCategoryGroup[] = [
  {
    type: "language",
    label: "Languages",
    curationGoal: "Construir base sintática e semântica antes de cobrar arquitetura ou edge cases.",
    difficultyCoverage: {
      beginner: "vocabulário, leitura assistida, identificacao de estruturas e conceitos de entrada",
      easy: "sintaxe, tipos básicos, leitura de código e definições fundamentais",
      medium: "aplicação prática, debugging, semântica e APIs comuns",
      hard: "trade-offs, performance, concorrência e edge cases de runtime",
      expert: "internals, tuning fino, semântica avançada e casos raros de comportamento",
    },
    categories: LANGUAGE_CATEGORIES,
  },
  {
    type: "area",
    label: "Areas",
    curationGoal: "Cobrir fundamentos transversais que sustentam quizzes coerentes entre stacks diferentes.",
    difficultyCoverage: {
      beginner: "conceitos-base, terminologia, classificacoes e reconhecimento de fluxos simples",
      easy: "conceitos-base, terminologia e fluxos simples",
      medium: "comparações, aplicação de regras e interpretação de cenários",
      hard: "design, otimização, segurança e tomada de decisão sob restrições",
      expert: "arquitetura sob restricoes duras, tuning, incidentes e compromissos especializados",
    },
    categories: AREA_CATEGORIES,
  },
  {
    type: "framework",
    label: "Frameworks",
    curationGoal: "Contextualizar ecossistemas reais sem perder progressão de dificuldade.",
    difficultyCoverage: {
      beginner: "conceitos de entrada, naming, arquivos-chave e fluxo basico do framework",
      easy: "conceitos de entrada, ciclo de vida e estrutura básica",
      medium: "boas práticas, integração entre partes e debugging comum",
      hard: "renderização, arquitetura, performance e edge cases de framework",
      expert: "internals, pipeline de build/render, tuning e edge cases de produção",
    },
    categories: FRAMEWORK_CATEGORIES,
  },
];

export const CATEGORIES_SEED = CATEGORY_SEED_GROUPS.flatMap((group) => group.categories);

export function validateCategoriesSeed(seed: SeedCategory[] = CATEGORIES_SEED) {
  const names = new Set<string>();
  const slugs = new Set<string>();
  const countsByType = {
    language: 0,
    area: 0,
    framework: 0,
  } satisfies Record<SeedCategory["type"], number>;

  for (const category of seed) {
    if (names.has(category.name)) {
      throw new Error(`Duplicate category name in seed: ${category.name}`);
    }

    if (slugs.has(category.slug)) {
      throw new Error(`Duplicate category slug in seed: ${category.slug}`);
    }

    names.add(category.name);
    slugs.add(category.slug);
    countsByType[category.type] += 1;
  }

  for (const [type, count] of Object.entries(countsByType)) {
    if (count === 0) {
      throw new Error(`Seed must include at least one category of type: ${type}`);
    }
  }
}
