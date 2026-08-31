import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { getAssessmentTypeGuidance } from "@/features/screening/data/assessmentTypes";
import { getQuestionnaire, submitAssessment } from "@/features/screening/services/screeningService";
import { getScreeningSession } from "@/features/screening/utils/screeningSession";
import { pruneSkippedAnswers } from "@/features/screening/utils/skipLogic";
import {
  computeQuestionnaireProgress,
  getVisibleSections,
} from "@/features/screening/utils/questionnaire";
import {
  buildSubmitAnswers,
  getMissingRequiredQuestions,
  isSectionComplete,
} from "@/features/screening/validation/questionnaire.validation";
import type { ScreeningQuestion } from "@/features/screening/types/screening.types";

export function useQuestionnaire() {
  const navigate = useNavigate();
  const session = getScreeningSession();
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [conditionName, setConditionName] = useState("");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session.conditionId || !session.assessmentType) {
      navigate(SCREENING_ROUTES.intro, { replace: true });
      return;
    }
    getQuestionnaire(session.conditionId)
      .then(({ condition, questions: qs }) => {
        setConditionName(condition.name);
        setQuestions(qs);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [navigate, session.conditionId, session.assessmentType]);

  const sections = useMemo(
    () => getVisibleSections(questions, answers),
    [questions, answers]
  );

  const visibleQuestions = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections]
  );

  const { requiredVisible, answeredRequired, progressPct } = useMemo(
    () => computeQuestionnaireProgress(visibleQuestions, answers),
    [visibleQuestions, answers]
  );

  const currentSection = sections[sectionIndex] ?? sections[0];
  const sectionComplete = currentSection ? isSectionComplete(currentSection.items, answers) : false;
  const guidance = getAssessmentTypeGuidance(session.assessmentType ?? "");

  const selectAnswer = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => pruneSkippedAnswers(questions, { ...prev, [questionId]: value }));
    },
    [questions]
  );

  const goBack = useCallback(() => {
    if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
    } else {
      navigate(SCREENING_ROUTES.conditions);
    }
  }, [navigate, sectionIndex]);

  const goNext = useCallback(async () => {
    if (!currentSection) return;

    if (!sectionComplete) {
      toast.error("Please answer all required questions in this section before continuing.");
      return;
    }

    if (sectionIndex < sections.length - 1) {
      setSectionIndex((i) => i + 1);
      return;
    }

    const missing = getMissingRequiredQuestions(requiredVisible, answers);
    if (missing.length > 0) {
      toast.error("Please answer all required questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitAssessment({
        conditionId: session.conditionId!,
        assessmentType: session.assessmentType!,
        age: session.age ? Number(session.age) : undefined,
        gender: session.gender,
        answers: buildSubmitAnswers(questions, answers),
      });
      navigate(SCREENING_ROUTES.result(result.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }, [
    answers,
    currentSection,
    navigate,
    questions,
    requiredVisible,
    sectionComplete,
    sectionIndex,
    sections.length,
    session.age,
    session.assessmentType,
    session.conditionId,
    session.gender,
  ]);

  return {
    step: SCREENING_FLOW_STEPS.questionnaire,
    totalSteps: SCREENING_FLOW_STEPS.total,
    conditionName,
    guidance,
    questions,
    sections,
    sectionIndex,
    currentSection,
    answers,
    loading,
    submitting,
    progressPct,
    answeredRequired,
    requiredCount: requiredVisible.length,
    sectionComplete,
    selectAnswer,
    goBack,
    goNext,
  };
}
