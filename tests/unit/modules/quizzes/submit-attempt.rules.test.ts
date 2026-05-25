import { describe, expect, test } from "bun:test";
import { calculateQuizAttemptXp, evaluateQuizAttempt } from "../../../../src/modules/quizzes/quizzes.rules";
import { getQuestionXpReward } from "../../../../src/shared/content";
import { ValidationError } from "../../../../src/shared/errors";
import { ERROR_CODES } from "../../../../src/shared/http/error-codes";
import { XP_REWARDS } from "../../../../src/shared/types";

describe("evaluateQuizAttempt", () => {
  test("calculates score and correctness from the official quiz questions", () => {
    const result = evaluateQuizAttempt(
      [
        { questionId: "q-1", correctOptionIndex: 1, optionCount: 4, difficulty: "easy" },
        { questionId: "q-2", correctOptionIndex: 0, optionCount: 4, difficulty: "hard" },
      ],
      [
        { questionId: "q-1", selectedOptionIndex: 1 },
        { questionId: "q-2", selectedOptionIndex: 2 },
      ],
    );

    expect(result.score).toBe(1);
    expect(result.totalQuestions).toBe(2);
    expect(result.isPerfect).toBe(false);
    expect(result.processedAnswers).toEqual([
      {
        questionId: "q-1",
        selectedOptionIndex: 1,
        isCorrect: true,
        difficulty: "easy",
        xpReward: getQuestionXpReward("easy"),
      },
      {
        questionId: "q-2",
        selectedOptionIndex: 2,
        isCorrect: false,
        difficulty: "hard",
        xpReward: getQuestionXpReward("hard"),
      },
    ]);
  });

  test("rejects duplicate answers with a stable error code", () => {
    expect(() =>
      evaluateQuizAttempt(
        [{ questionId: "q-1", correctOptionIndex: 1, optionCount: 4, difficulty: "medium" }],
        [
          { questionId: "q-1", selectedOptionIndex: 1 },
          { questionId: "q-1", selectedOptionIndex: 2 },
        ],
      ),
    ).toThrow(
      new ValidationError("Quiz answers contain duplicate questionId values", ERROR_CODES.QUIZ_DUPLICATE_ANSWERS),
    );
  });
});

describe("calculateQuizAttemptXp", () => {
  test("grants full XP only when the quiz is answered perfectly on first exposure", () => {
    const result = calculateQuizAttemptXp({
      processedAnswers: [
        { questionId: "q-1", selectedOptionIndex: 1, isCorrect: true, difficulty: "easy", xpReward: 10 },
        { questionId: "q-2", selectedOptionIndex: 0, isCorrect: true, difficulty: "hard", xpReward: 25 },
      ],
      totalQuestions: 2,
      isPerfect: true,
      newlyAnsweredQuestionIds: ["q-1", "q-2"],
    });

    expect(result.xpGained).toBe(35 + XP_REWARDS.PERFECT_QUIZ);
    expect(result.perfectBonusGranted).toBe(true);
  });

  test("does not grant repeat XP or perfect bonus when some questions were answered before", () => {
    const result = calculateQuizAttemptXp({
      processedAnswers: [
        { questionId: "q-1", selectedOptionIndex: 1, isCorrect: true, difficulty: "easy", xpReward: 10 },
        { questionId: "q-2", selectedOptionIndex: 0, isCorrect: true, difficulty: "hard", xpReward: 25 },
      ],
      totalQuestions: 2,
      isPerfect: true,
      newlyAnsweredQuestionIds: ["q-2"],
    });

    expect(result.xpGained).toBe(25);
    expect(result.perfectBonusGranted).toBe(false);
  });
});
