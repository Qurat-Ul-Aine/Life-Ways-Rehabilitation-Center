import { Link } from "react-router-dom";
import { AlertCircle, Calendar, FlaskConical, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/features/screening/components/EmptyState";
import RiskBadge from "@/features/screening/components/RiskBadge";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import {
  getContinueScreeningRoute,
  getPendingScreeningLabel,
  hasPendingScreeningSession,
} from "@/features/screening/utils/pendingAssessment";
import { useBookAppointmentNavigation } from "@/hooks/useBookAppointmentNavigation";
import type { PatientScreeningHistoryItem } from "@/features/screening/types/screening.types";

type TakeScreeningPanelProps = {
  history: PatientScreeningHistoryItem[];
};

/** Patient dashboard panel — start screening, latest result, follow-ups. */
export default function TakeScreeningPanel({ history }: TakeScreeningPanelProps) {
  const { bookAppointment } = useBookAppointmentNavigation();
  const latest = history[0];
  const flaggedItems = history.filter((r) => r.flagged || r.followUpDate);
  const pending = hasPendingScreeningSession();
  const showBookAppointment =
    latest?.riskLevel === "high" || latest?.riskLevel === "moderate";

  return (
    <>
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Button asChild>
            <Link to={SCREENING_ROUTES.intro}>
              <FlaskConical className="mr-2 h-4 w-4" />
              Take Screening Test
            </Link>
          </Button>
          {pending ? (
            <Button asChild variant="secondary">
              <Link to={getContinueScreeningRoute()}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {getPendingScreeningLabel()}
              </Link>
            </Button>
          ) : null}
          {showBookAppointment ? (
            <Button type="button" variant="outline" onClick={bookAppointment}>
              <Calendar className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="text-[12px] font-semibold text-amber-800">Confidential screening results</p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Results are shared only with your assigned doctor and authorised staff.
          </p>
        </div>
      </div>

      {flaggedItems.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-xs font-semibold text-amber-900">Follow-up from your care team</p>
          {flaggedItems.slice(0, 3).map((item) => (
            <div key={item.id} className="text-xs text-amber-800">
              <span className="font-medium">{item.condition}</span>
              {item.flagged ? " — flagged for review" : ""}
              {item.followUpDate ? ` — follow-up by ${String(item.followUpDate).slice(0, 10)}` : ""}
            </div>
          ))}
        </div>
      )}

      {latest ? (
        <Card className="rounded-2xl border-border bg-card">
          <CardContent className="p-4">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Latest result
                </p>
                <h3 className="mt-0.5 text-[15px] font-bold text-foreground">{latest.condition}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {latest.testDate ? String(latest.testDate).slice(0, 10) : "—"} ·{" "}
                  {latest.assessmentType ?? "self"}
                </p>
              </div>
              <RiskBadge risk={String(latest.riskLevel)} className="text-[10px] capitalize" />
            </div>
            <p className="text-3xl font-bold text-primary">{latest.score ?? 0}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="default">
                <Link to={SCREENING_ROUTES.result(latest.id)}>View result & recommendations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState message="No screenings completed yet. Take your first screening test above." />
      )}
    </>
  );
}
