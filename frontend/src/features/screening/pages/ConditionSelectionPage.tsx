import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ConditionCard from "@/features/screening/components/ConditionCard";
import ScreeningLayout, { ScreeningNav } from "@/features/screening/components/ScreeningLayout";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { getConditions } from "@/features/screening/services/screeningService";
import { getScreeningSession, setScreeningSession } from "@/features/screening/utils/screeningSession";
import type { ScreeningCondition } from "@/features/screening/types/screening.types";

export default function ConditionSelectionPage() {
  const navigate = useNavigate();
  const session = getScreeningSession();
  const [conditions, setConditions] = useState<ScreeningCondition[]>([]);
  const [selected, setSelected] = useState(session.conditionId ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.assessmentType) {
      navigate(SCREENING_ROUTES.assessmentType, { replace: true });
      return;
    }
    if (!session.age || !session.gender) {
      navigate(SCREENING_ROUTES.basicInfo, { replace: true });
      return;
    }
    getConditions()
      .then(setConditions)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [navigate, session.assessmentType, session.age, session.gender]);

  const handleContinue = () => {
    const condition = conditions.find((c) => c.id === selected);
    if (!condition) {
      toast.error("Please select one condition.");
      return;
    }
    setScreeningSession({
      conditionId: condition.id,
      conditionSlug: condition.slug,
    });
    navigate(SCREENING_ROUTES.questions);
  };

  return (
    <ScreeningLayout
      step={SCREENING_FLOW_STEPS.conditionSelection}
      totalSteps={SCREENING_FLOW_STEPS.total}
      title="Select a Condition"
    >
      <p className="text-slate-400">
        Choose one area to assess. You can go back and change your selection before answering
        questions.
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 bg-slate-800" />
          <Skeleton className="h-24 bg-slate-800" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {conditions.map((c) => (
            <ConditionCard
              key={c.id}
              condition={c}
              selected={selected === c.id}
              onSelect={() => setSelected(c.id)}
            />
          ))}
        </div>
      )}

      <ScreeningNav
        onBack={() => navigate(SCREENING_ROUTES.basicInfo)}
        onNext={handleContinue}
        nextDisabled={!selected || loading}
      />
    </ScreeningLayout>
  );
}
