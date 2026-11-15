import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ScreeningLayout, { ScreeningNav } from "@/features/screening/components/ScreeningLayout";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import {
  ASSESSMENT_TYPE_OPTIONS,
  getAssessmentTypeGuidance,
} from "@/features/screening/data/assessmentTypes";
import { getScreeningSession, setScreeningSession } from "@/features/screening/utils/screeningSession";
import type { AssessmentType } from "@/features/screening/types/screening.types";
import { cn } from "@/lib/utils";

const ICONS = { self: User, other: Users } as const;

export default function AssessmentTypePage() {
  const navigate = useNavigate();
  const session = getScreeningSession();
  const [selected, setSelected] = useState<AssessmentType | "">(session.assessmentType ?? "");
  const guidance = getAssessmentTypeGuidance(selected);

  const handleContinue = () => {
    if (!selected) return;
    setScreeningSession({ assessmentType: selected });
    navigate(SCREENING_ROUTES.basicInfo);
  };

  return (
    <ScreeningLayout
      step={SCREENING_FLOW_STEPS.assessmentType}
      totalSteps={SCREENING_FLOW_STEPS.total}
      title="Who is this assessment for?"
    >
      <p className="text-muted-foreground">
        Choose whether you are taking this screening for yourself or on behalf of someone else.
        Instructions and guidance will adapt to your selection.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {ASSESSMENT_TYPE_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.value];
          return (
            <button key={opt.value} type="button" onClick={() => setSelected(opt.value)} className="text-left">
              <Card
                className={cn(
                  "h-full border-border bg-card shadow-sm transition hover:border-primary/50",
                  selected === opt.value && "border-primary ring-1 ring-primary"
                )}
              >
                <CardHeader>
                  <Icon className="mb-2 h-6 w-6 text-primary" />
                  <CardTitle className="text-base text-foreground">{opt.label}</CardTitle>
                  <CardDescription className="text-muted-foreground">{opt.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </button>
          );
        })}
      </div>

      {selected ? (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Instructions for this assessment</CardTitle>
            <CardDescription className="text-muted-foreground">{guidance.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {guidance.instructions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <ScreeningNav
        onBack={() => navigate(SCREENING_ROUTES.intro)}
        onNext={handleContinue}
        nextDisabled={!selected}
      />
    </ScreeningLayout>
  );
}
