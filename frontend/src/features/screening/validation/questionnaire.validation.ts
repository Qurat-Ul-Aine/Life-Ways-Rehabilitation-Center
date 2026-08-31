import type { ScreeningQuestion } from "@/features/screening/types/screening.types";
import { isQuestionSkipped } from "@/features/screening/utils/skipLogic";

export function isSectionComplete(
  questions: ScreeningQuestion[],
  answers: Record<string, string>
): boolean {
  return questions.every((q) => !q.isRequired || Boolean(answers[q.id]));
}

export function getMissingRequiredQuestions(
  requiredQuestions: ScreeningQuestion[],
  answers: Record<string, string>
): ScreeningQuestion[] {
  return requiredQuestions.filter((q) => !answers[q.id]);
}

export function buildSubmitAnswers(
  questions: ScreeningQuestion[],
  answers: Record<string, string>
): { questionId: string; value: string }[] {
  return Object.entries(answers)
    .filter(([questionId]) => {
      const q = questions.find((item) => item.id === questionId);
      return q && !isQuestionSkipped(q, answers);
    })
    .map(([questionId, value]) => ({ questionId, value }));
}
