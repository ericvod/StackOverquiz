import { GoogleGenerativeAI, type ResponseSchema, SchemaType } from "@google/generative-ai";
import { env } from "../../config/env";
import type { QuestionOption } from "../../db/schema";
import {
  type DifficultyBreakdown,
  QUESTION_DIFFICULTIES,
  QUESTION_DIFFICULTY_META,
  type QuestionDifficulty,
} from "../../shared/content";
import { BadGatewayError, BadRequestError, ValidationError } from "../../shared/errors";
import { createQuestion } from "../questions/questions.service";
import { createQuiz } from "../quizzes/quizzes.service";

const questionSchema: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: "Short, clear question title" },
      body: { type: SchemaType.STRING, description: "Question body, can include code snippets in markdown" },
      options: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: "Option text" },
            code: { type: SchemaType.STRING, description: "Optional code snippet for this option", nullable: true },
          },
          required: ["text"],
        },
      },
      correctOptionIndex: { type: SchemaType.NUMBER, description: "Index of the correct option (0-based)" },
      explanation: { type: SchemaType.STRING, description: "Detailed explanation of why the answer is correct" },
    },
    required: ["title", "body", "options", "correctOptionIndex", "explanation"],
  },
};

interface GenerateOptions {
  category: string;
  difficulty: QuestionDifficulty;
  count: number;
  language?: string; // "pt-BR" | "en"
  geminiApiKey?: string;
}

interface GenerateQuizOptions {
  authorId: string;
  title: string;
  description?: string;
  category: string;
  categoryIds: string[];
  difficultyMix: Partial<DifficultyBreakdown>;
  language?: string;
  geminiApiKey?: string;
}

interface GeneratedQuestion {
  title: string;
  body: string;
  options: QuestionOption[];
  correctOptionIndex: number;
  explanation: string;
}

function resolveGeminiApiKey(apiKey?: string) {
  const resolvedKey = apiKey?.trim() || env.GEMINI_API_KEY;
  if (!resolvedKey) {
    throw new BadRequestError("GEMINI_API_KEY is required in the environment or request body");
  }

  return resolvedKey;
}

function parseGeneratedQuestions(text: string): GeneratedQuestion[] {
  try {
    return JSON.parse(text) as GeneratedQuestion[];
  } catch (error) {
    throw new BadGatewayError("AI provider returned invalid JSON", undefined, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

function validateGeneratedQuestions(questions: GeneratedQuestion[], expectedCount: number) {
  if (!Array.isArray(questions)) {
    throw new BadGatewayError("AI provider returned an invalid question payload");
  }

  if (questions.length !== expectedCount) {
    throw new BadGatewayError("AI provider returned an unexpected number of questions", undefined, {
      expected: expectedCount,
      received: questions.length,
    });
  }

  for (const [index, question] of questions.entries()) {
    if (!Array.isArray(question.options) || question.options.length !== 5) {
      throw new BadGatewayError("AI provider must return exactly 5 options per question", undefined, {
        index,
        received: question.options?.length,
      });
    }

    if (
      !Number.isInteger(question.correctOptionIndex) ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= 5
    ) {
      throw new BadGatewayError("AI provider returned an invalid correctOptionIndex", undefined, {
        index,
        correctOptionIndex: question.correctOptionIndex,
      });
    }

    if (question.options.some((option) => typeof option.text !== "string" || option.text.trim().length === 0)) {
      throw new BadGatewayError("AI provider returned an option without text", undefined, { index });
    }
  }
}

function validateDifficultyMix(difficultyMix: Partial<DifficultyBreakdown>) {
  const total = QUESTION_DIFFICULTIES.reduce((sum, difficulty) => sum + (difficultyMix[difficulty] ?? 0), 0);

  if (total <= 0) {
    throw new ValidationError("difficultyMix must request at least one question");
  }

  if (total > 50) {
    throw new ValidationError("difficultyMix cannot request more than 50 questions");
  }

  return total;
}

/**
 * Asks Gemini to generate multiple-choice programming questions that match the requested theme.
 *
 * @remarks Side effects: none. This function only calls the external AI provider and parses the response.
 */
export async function generateQuestions(opts: GenerateOptions) {
  const genAI = new GoogleGenerativeAI(resolveGeminiApiKey(opts.geminiApiKey));
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: questionSchema,
      temperature: 0.8,
    },
  });

  const prompt = `Generate exactly ${opts.count} unique multiple-choice programming questions about "${opts.category}" with difficulty level "${opts.difficulty}".

Difficulty guide for "${opts.difficulty}": ${QUESTION_DIFFICULTY_META[opts.difficulty].summary}

Requirements:
- Each question must have exactly 5 options
- The correctOptionIndex must be a valid index (0-4)
- Questions should be practical and test real programming knowledge
- Include code snippets where appropriate (use markdown code blocks in the body)
- Options can include code snippets in the "code" field
- Explanations should be detailed and educational
- Questions should be in ${opts.language === "pt-BR" ? "Brazilian Portuguese" : "English"}
- Avoid trivially obvious questions
- Each question should test a distinct concept

Make sure the questions are accurate and the correct answers are truly correct.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const questions = parseGeneratedQuestions(text);
  validateGeneratedQuestions(questions, opts.count);

  return questions;
}

// ─── Generate and save to DB ─────────────────────────────────────────────────

/**
 * Generates questions through Gemini and persists them as pending AI-authored content.
 *
 * @remarks Side effects: external network call plus writes to `questions` and `question_categories`.
 */
export async function generateAndSaveQuestions(
  opts: GenerateOptions & {
    authorId: string;
    categoryIds: string[];
  },
) {
  const questions = await generateQuestions(opts);

  const saved = [];
  for (const q of questions) {
    const question = await createQuestion({
      authorId: opts.authorId,
      title: q.title,
      body: q.body,
      difficulty: opts.difficulty,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      categoryIds: opts.categoryIds,
      aiGenerated: true,
      status: "pending",
    });
    saved.push(question);
  }

  return saved;
}

/**
 * Generates a complete quiz draft through Gemini and persists questions plus quiz as pending content.
 *
 * @remarks Side effects: external network calls plus writes to `questions`, `question_categories`, `quizzes`
 * and `quiz_questions`.
 */
export async function generateAndSaveQuiz(opts: GenerateQuizOptions) {
  validateDifficultyMix(opts.difficultyMix);

  const savedQuestions = [];

  for (const difficulty of QUESTION_DIFFICULTIES) {
    const count = opts.difficultyMix[difficulty] ?? 0;
    if (count <= 0) {
      continue;
    }

    const generatedQuestions = await generateQuestions({
      category: `${opts.category}. Quiz: ${opts.title}`,
      difficulty,
      count,
      language: opts.language,
      geminiApiKey: opts.geminiApiKey,
    });

    for (const q of generatedQuestions) {
      const question = await createQuestion({
        authorId: opts.authorId,
        title: q.title,
        body: q.body,
        difficulty,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        categoryIds: opts.categoryIds,
        aiGenerated: true,
        status: "pending",
      });

      savedQuestions.push(question);
    }
  }

  const quiz = await createQuiz({
    creatorId: opts.authorId,
    title: opts.title,
    description: opts.description,
    isPublic: true,
    status: "pending",
    aiGenerated: true,
    questionIds: savedQuestions.map((question) => question.id),
  });

  return {
    quiz,
    questions: savedQuestions,
    generated: savedQuestions.length,
  };
}
