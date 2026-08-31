import type { ScreeningQuestion } from "@/features/screening/types/screening.types";

type SkipLogic = {
  dependsOn?: string;
  depends_on?: string;
  question_id?: string;
  questionId?: string;
  showWhen?: string | string[];
  show_when?: string | string[];
  hideWhen?: string | string[];
  hide_when?: string | string[];
  requiredAnswer?: string | string[];
  required_answer?: string | string[];
};

function normalizeAnswerValue(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function matchesSkipValues(answer: string | undefined, expected: string | string[]): boolean {
  const normalized = normalizeAnswerValue(answer);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((item) => normalizeAnswerValue(item) === normalized);
}

/** Mirrors backend isQuestionSkipped — true when a question should not be shown or answered. */
export function isQuestionSkipped(
  question: ScreeningQuestion,
  answers: Record<string, string>
): boolean {
  const logic = question.skipLogic as SkipLogic | null | undefined;
  if (!logic || typeof logic !== "object") return false;

  const depId =
    logic.dependsOn ?? logic.depends_on ?? logic.question_id ?? logic.questionId;
  if (!depId) return false;

  const depAnswer = answers[String(depId)];
  if (depAnswer == null || depAnswer === "") return true;

  if (logic.showWhen != null || logic.show_when != null) {
    return !matchesSkipValues(depAnswer, logic.showWhen ?? logic.show_when!);
  }
  if (logic.hideWhen != null || logic.hide_when != null) {
    return matchesSkipValues(depAnswer, logic.hideWhen ?? logic.hide_when!);
  }
  if (logic.requiredAnswer != null || logic.required_answer != null) {
    return !matchesSkipValues(depAnswer, logic.requiredAnswer ?? logic.required_answer!);
  }

  return false;
}

export function getVisibleQuestions(
  questions: ScreeningQuestion[],
  answers: Record<string, string>
): ScreeningQuestion[] {
  return questions.filter((q) => !isQuestionSkipped(q, answers));
}

export function pruneSkippedAnswers(
  questions: ScreeningQuestion[],
  answers: Record<string, string>
): Record<string, string> {
  const next = { ...answers };
  for (const q of questions) {
    if (isQuestionSkipped(q, next)) {
      delete next[q.id];
    }
  }
  return next;
}
