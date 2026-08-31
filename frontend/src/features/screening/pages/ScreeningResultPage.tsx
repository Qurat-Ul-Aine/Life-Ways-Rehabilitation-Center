import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Calendar, ClipboardList, Phone, RefreshCw, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfidentialityCard from "@/features/screening/components/ConfidentialityCard";
import ErrorState from "@/features/screening/components/ErrorState";
import LoadingScreen from "@/features/screening/components/LoadingScreen";
import RecommendationCard from "@/features/screening/components/RecommendationCard";
import ResultSummary from "@/features/screening/components/ResultSummary";
import ScreeningLayout from "@/features/screening/components/ScreeningLayout";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { useRiskScore } from "@/features/screening/hooks/useRiskScore";
import { useBookAppointmentNavigation } from "@/hooks/useBookAppointmentNavigation";
import { useAuth } from "@/context/AuthContext";
import { buildLoginPath } from "@/lib/authRedirect";

export default function ScreeningResultPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { bookAppointment } = useBookAppointmentNavigation();
  const { result, loading, error, advice, isHighRisk, isLowRisk } = useRiskScore();

  if (loading) {
    return (
      <LoadingScreen
        step={SCREENING_FLOW_STEPS.result}
        totalSteps={SCREENING_FLOW_STEPS.total}
        title="Your Results"
      />
    );
  }

  if (error || !result) {
    return (
      <ErrorState
        message={error ?? "Result not found."}
        step={SCREENING_FLOW_STEPS.result}
        totalSteps={SCREENING_FLOW_STEPS.total}
        title="Results unavailable"
        action={{ label: "Start New Screening", onClick: () => navigate(SCREENING_ROUTES.intro) }}
      />
    );
  }

  return (
    <ScreeningLayout
      step={SCREENING_FLOW_STEPS.result}
      totalSteps={SCREENING_FLOW_STEPS.total}
      title="Confidential Screening Result"
    >
      <ConfidentialityCard />
      <ResultSummary score={result.score} riskLevel={result.riskLevel} />

      {!isAuthenticated ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-medium text-white">Save your screening history</p>
              <p className="text-slate-400">
                Create a free account to store results and view them anytime from your patient
                dashboard.
              </p>
            </div>
            <Button asChild variant="default" size="sm" className="shrink-0">
              <Link to={buildLoginPath("/register", SCREENING_ROUTES.intro)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create an account
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">{result.title ?? "Assessment Summary"}</CardTitle>
          {advice ? <CardDescription className="text-slate-300">{advice}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {result.explanation ? (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-white">Explanation</h3>
              <p className="text-sm text-slate-400">{result.explanation}</p>
            </div>
          ) : null}
          <RecommendationCard recommendations={result.recommendations} />
        </CardContent>
      </Card>

      {isHighRisk ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-white">Emergency & urgent support</p>
              <p className="text-slate-300">
                If you or someone else is in immediate danger, contact emergency services or a
                crisis line right away.
              </p>
              <Button asChild variant="destructive" size="sm" className="mt-2">
                <Link to={{ pathname: "/", hash: "contact" }}>
                  <Phone className="mr-2 h-4 w-4" /> Emergency Contact
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLowRisk ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex gap-3 p-4 text-sm text-slate-300">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Continue monitoring your symptoms over the coming weeks. Repeat this assessment if
              your situation changes or symptoms worsen.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        This screening is not a medical diagnosis. Please consult a healthcare professional.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button type="button" variant="default" onClick={bookAppointment}>
          <Calendar className="mr-2 h-4 w-4" /> Book Appointment
        </Button>
        <Button asChild variant="outline" className="border-slate-700">
          <Link to="/doctors">
            <Stethoscope className="mr-2 h-4 w-4" /> Talk to Doctor
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-slate-700">
          <Link to={{ pathname: "/", hash: "contact" }}>
            <Phone className="mr-2 h-4 w-4" /> Get Support
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="border border-slate-800 text-slate-300 sm:col-span-2 lg:col-span-3"
          onClick={() => navigate(SCREENING_ROUTES.intro)}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Follow-up Assessment
        </Button>
      </div>
    </ScreeningLayout>
  );
}
