import QuestionCard from "@/features/screening/components/QuestionCard";
import QuestionnaireStepper from "@/features/screening/components/QuestionnaireStepper";
import LoadingScreen from "@/features/screening/components/LoadingScreen";
import ScreeningLayout, { ScreeningNav } from "@/features/screening/components/ScreeningLayout";
import { useQuestionnaire } from "@/features/screening/hooks/useQuestionnaire";

export default function QuestionnairePage() {
  const {
    step,
    totalSteps,
    conditionName,
    guidance,
    sections,
    sectionIndex,
    currentSection,
    answers,
    loading,
    submitting,
    progressPct,
    answeredRequired,
    requiredCount,
    sectionComplete,
    selectAnswer,
    goBack,
    goNext,
  } = useQuestionnaire();

  if (loading) {
    return <LoadingScreen step={step} totalSteps={totalSteps} />;
  }

  return (
    <ScreeningLayout
      step={step}
      totalSteps={totalSteps}
      title={conditionName ? `${conditionName} Assessment` : "Questionnaire"}
    >
      <p className="text-sm text-slate-400">{guidance.questionnairePreamble}</p>

      {currentSection ? (
        <>
          <QuestionnaireStepper
            sectionIndex={sectionIndex}
            sectionCount={sections.length}
            sectionTitle={currentSection.title}
            answered={answeredRequired}
            total={requiredCount}
            percent={progressPct}
          />
          <div className="space-y-4">
            {currentSection.items.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                selectedValue={answers[q.id]}
                onSelect={(value) => selectAnswer(q.id, value)}
              />
            ))}
          </div>
        </>
      ) : null}

      <ScreeningNav
        onBack={goBack}
        onNext={goNext}
        nextLabel={sectionIndex < sections.length - 1 ? "Next Section" : "Submit & View Results"}
        nextDisabled={!sectionComplete}
        loading={submitting}
      />
    </ScreeningLayout>
  );
}
