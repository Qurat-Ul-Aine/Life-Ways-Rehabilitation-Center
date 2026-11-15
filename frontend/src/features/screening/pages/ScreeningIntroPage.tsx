import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorState from "@/features/screening/components/ErrorState";
import LoadingScreen from "@/features/screening/components/LoadingScreen";
import ScreeningLayout from "@/features/screening/components/ScreeningLayout";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { useScreening } from "@/features/screening/hooks/useScreening";

export default function ScreeningIntroPage() {
  const navigate = useNavigate();
  const { config, loading, error } = useScreening();

  if (loading) {
    return <LoadingScreen step={SCREENING_FLOW_STEPS.intro} totalSteps={SCREENING_FLOW_STEPS.total} />;
  }

  if (error || !config) {
    return (
      <ErrorState
        message={error ?? "Unable to load screening information."}
        step={SCREENING_FLOW_STEPS.intro}
        totalSteps={SCREENING_FLOW_STEPS.total}
      />
    );
  }

  return (
    <ScreeningLayout step={SCREENING_FLOW_STEPS.intro} totalSteps={SCREENING_FLOW_STEPS.total} title={config.title}>
      <p className="text-muted-foreground">{config.subtitle}</p>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Purpose of Screening
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{config.purpose}</CardContent>
      </Card>

      <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
        {config.bulletPoints.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Confidentiality
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{config.confidentialityNote}</CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {config.instructions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {config.stats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-warning/50 bg-warning/10">
        <CardContent className="flex gap-3 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="space-y-1 text-sm text-foreground">
            <p className="font-medium">Disclaimer</p>
            <p className="text-muted-foreground">{config.disclaimer}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" /> Estimated duration: {config.estimatedMinutes}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => navigate(SCREENING_ROUTES.assessmentType)}>
        Start Assessment
      </Button>
    </ScreeningLayout>
  );
}
