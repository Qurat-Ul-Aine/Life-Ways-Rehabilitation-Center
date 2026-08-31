import type { ScreeningQuestion } from "@/features/screening/types/screening.types";
import { getVisibleQuestions } from "@/features/screening/utils/skipLogic";

export function groupQuestionsBySection(questions: ScreeningQuestion[]) {
  const map = new Map<string, ScreeningQuestion[]>();
  for (const q of questions) {
    const key = q.sectionTitle ?? "Questions";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(q);
  }
  return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
}

export function computeQuestionnaireProgress(
  visibleQuestions: ScreeningQuestion[],
  answers: Record<string, string>
) {
  const requiredVisible = visibleQuestions.filter((q) => q.isRequired);
  const answeredRequired = requiredVisible.filter((q) => answers[q.id]).length;
  const progressPct =
    requiredVisible.length > 0
      ? Math.round((answeredRequired / requiredVisible.length) * 100)
      : 0;
  return { requiredVisible, answeredRequired, progressPct };
}

export function getVisibleSections(
  questions: ScreeningQuestion[],
  answers: Record<string, string>
) {
  return groupQuestionsBySection(getVisibleQuestions(questions, answers));
}
