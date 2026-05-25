import type { AttemptAnswer } from "../../db/schema";
import { getQuestionXpReward, type QuestionDifficulty } from "../../shared/content";
import { ValidationError } from "../../shared/errors";
import { ERROR_CODES } from "../../shared/http/error-codes";
import { XP_REWARDS } from "../../shared/types";

interface QuizAttemptInputAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

interface QuizAttemptQuestion {
  questionId: string;
  correctOptionIndex: number;
  optionCount: number;
  difficulty: QuestionDifficulty;
}

interface QuizAttemptEvaluation {
  processedAnswers: AttemptAnswer[];
  score: number;
  totalQuestions: number;
  isPerfect: boolean;
}

interface QuizAttemptXpInput {
  processedAnswers: AttemptAnswer[];
  totalQuestions: number;
  isPerfect: boolean;
  newlyAnsweredQuestionIds: string[];
}

interface QuizAttemptXpSummary {
  xpGained: number;
  perfectBonusGranted: boolean;
}

/**
 * Rejects duplicate question ids before a quiz is persisted.
 */
export function ensureUniqueQuizQuestionIds(questionIds: string[]) {
  if (new Set(questionIds).size !== questionIds.length) {
    throw new ValidationError("Quiz questionIds must be unique", ERROR_CODES.QUIZ_DUPLICATE_QUESTION_IDS);
  }
}

/**
 * Evaluates a quiz attempt exclusively against the official quiz definition stored by the backend.
 *
 * @remarks The function enforces complete coverage, rejects duplicates and unknown question ids,
 * validates option indexes and computes score and correctness flags deterministically.
 */
export function evaluateQuizAttempt(
  quizQuestions: QuizAttemptQuestion[],
  answers: QuizAttemptInputAnswer[],
): QuizAttemptEvaluation {
  if (quizQuestions.length === 0) {
    throw new ValidationError("Quiz has no available questions", ERROR_CODES.QUIZ_NO_AVAILABLE_QUESTIONS);
  }

  const answersByQuestionId = new Map<string, QuizAttemptInputAnswer>();

  for (const answer of answers) {
    if (answersByQuestionId.has(answer.questionId)) {
      throw new ValidationError("Quiz answers contain duplicate questionId values", ERROR_CODES.QUIZ_DUPLICATE_ANSWERS);
    }

    answersByQuestionId.set(answer.questionId, answer);
  }

  const expectedQuestionIds = new Set(quizQuestions.map((question) => question.questionId));
  const containsUnknownQuestion = [...answersByQuestionId.keys()].some(
    (questionId) => !expectedQuestionIds.has(questionId),
  );

  if (containsUnknownQuestion) {
    throw new ValidationError(
      "Quiz answers contain a question that does not belong to this quiz",
      ERROR_CODES.QUIZ_ANSWER_OUT_OF_SCOPE,
    );
  }

  if (answersByQuestionId.size !== quizQuestions.length) {
    throw new ValidationError(
      "Quiz answers must include every question exactly once",
      ERROR_CODES.QUIZ_INCOMPLETE_ANSWERS,
    );
  }

  let score = 0;
  const processedAnswers: AttemptAnswer[] = quizQuestions.map((question) => {
    const answer = answersByQuestionId.get(question.questionId);

    if (!answer) {
      throw new ValidationError(
        "Quiz answers must include every question exactly once",
        ERROR_CODES.QUIZ_INCOMPLETE_ANSWERS,
      );
    }

    if (answer.selectedOptionIndex >= question.optionCount) {
      throw new ValidationError(
        "Quiz answers contain an invalid selectedOptionIndex",
        ERROR_CODES.QUIZ_INVALID_OPTION_INDEX,
      );
    }

    const isCorrect = answer.selectedOptionIndex === question.correctOptionIndex;
    if (isCorrect) {
      score += 1;
    }

    return {
      questionId: question.questionId,
      selectedOptionIndex: answer.selectedOptionIndex,
      isCorrect,
      difficulty: question.difficulty,
      xpReward: getQuestionXpReward(question.difficulty),
    };
  });

  const totalQuestions = quizQuestions.length;
  const isPerfect = score === totalQuestions;

  return {
    processedAnswers,
    score,
    totalQuestions,
    isPerfect,
  };
}

/**
 * Calculates quiz XP after considering which questions are truly first-time answers for the user.
 *
 * @remarks
 * - A question grants XP only on the first time the user answers it.
 * - Perfect-quiz bonus is granted only when the whole quiz is answered perfectly on first exposure.
 */
export function calculateQuizAttemptXp(input: QuizAttemptXpInput): QuizAttemptXpSummary {
  if (input.processedAnswers.length === 0 || input.newlyAnsweredQuestionIds.length === 0) {
    return {
      xpGained: 0,
      perfectBonusGranted: false,
    };
  }

  const newlyAnsweredQuestionIds = new Set(input.newlyAnsweredQuestionIds);
  const newlyCorrectAnswers = input.processedAnswers.filter(
    (answer) => newlyAnsweredQuestionIds.has(answer.questionId) && answer.isCorrect,
  );

  const perfectBonusGranted = input.isPerfect && newlyAnsweredQuestionIds.size === input.totalQuestions;

  return {
    xpGained:
      newlyCorrectAnswers.reduce((sum, answer) => sum + answer.xpReward, 0) +
      (perfectBonusGranted ? XP_REWARDS.PERFECT_QUIZ : 0),
    perfectBonusGranted,
  };
}
