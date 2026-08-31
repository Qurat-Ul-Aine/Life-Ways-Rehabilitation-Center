import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  History,
  Plus,
  RefreshCw,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ConditionProgressTimeline from "@/features/recommendation/components/ConditionProgressTimeline";
import RecoveryJourneyCard from "@/features/recommendation/components/RecoveryJourneyCard";
import RecommendationListItem from "@/features/recommendation/components/RecommendationListItem";
import { usePatientRecommendationsDashboard } from "@/features/recommendation/hooks/usePatientRecommendationsDashboard";
import type {
  RecommendationHistoryRow,
  RecommendedDoctor,
} from "@/features/recommendation/recommendation.types";
import {
  formatMedicalHistoryDisplay,
  formatSymptomsDisplay,
} from "@/features/recommendation/utils/formatAssessmentDisplay";
import SectionCard from "../components/home/SectionCard";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function formatAssessmentDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeClass(status: string): string {
  const key = status.toLowerCase();
  if (key.includes("progress")) return "bg-primary/10 text-primary border-primary/20";
  if (key.includes("completed")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (key.includes("missed")) {
    return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (key.includes("treatment") || key.includes("appointment")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (key.includes("doctor")) return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300";
  return "bg-muted text-muted-foreground border-border";
}

function NewAssessmentButton({ className }: { className?: string }) {
  return (
    <Button asChild className={className} size="sm">
      <Link to="/find-my-doctor">
        <Plus className="mr-2 h-4 w-4" />
        New Assessment
      </Link>
    </Button>
  );
}

function PageHeader({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-sm text-muted-foreground">
        Your AI recommendation history and care journey — start a new assessment anytime via
        Find My Doctor.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <NewAssessmentButton />
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <PageHeader onRefresh={onRefresh} />

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="max-w-md space-y-2">
            <p className="text-lg font-semibold text-foreground">No assessments yet</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Complete the Find My Doctor assessment to receive personalised specialist matches.
              Your results and progress will appear here.
            </p>
          </div>
          <NewAssessmentButton className="rounded-xl px-6" />
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryAssessmentCard({
  number,
  row,
}: {
  number: number;
  row: RecommendationHistoryRow;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/35">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Assessment #{number}
          </p>
          <p className="font-semibold text-foreground">{row.condition}</p>
          <p className="text-xs text-muted-foreground">{formatAssessmentDate(row.date)}</p>
        </div>
        <Badge variant="outline" className={statusBadgeClass(row.status)}>
          {row.status}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <HistoryMetric label="Recommended doctors" value={String(row.recommendedDoctorsCount)} />
        <HistoryMetric
          label="Selected doctor"
          value={row.selectedDoctor?.name ?? "Not selected"}
        />
        <HistoryMetric label="Appointment" value={row.appointmentStatus} />
      </div>
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function AIRecommendationsPanel() {
  const { data, loading, error, reload } = usePatientRecommendationsDashboard();
  const current = data?.current ?? null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader onRefresh={() => void reload()} />
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) {
    return <EmptyState onRefresh={() => void reload()} />;
  }

  const { analysis, recommendations, journey, timeline, recoveryJourney, estimatedDuration } = current;
  const previousAssessments = (data?.history ?? []).slice(1);
  const symptomsDisplay = formatSymptomsDisplay(
    analysis.symptomsDisplay ?? analysis.symptoms,
  );
  const historyDisplay = formatMedicalHistoryDisplay(
    analysis.medicalHistoryDisplay ?? analysis.medicalHistorySummary,
    analysis.symptoms,
  );

  return (
    <div className="space-y-8">
      <PageHeader onRefresh={() => void reload()} refreshing={loading} />

      {/* Section 1 — Latest Recommendation */}
      <section>
        <SectionLabel>Latest recommendation</SectionLabel>
        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <div className="border-b border-border/60 bg-gradient-to-r from-primary/5 via-card to-card px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Health summary
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-foreground">
                  {analysis.detectedIssue}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Assessment date: {formatAssessmentDate(analysis.createdAt)}
                </p>
              </div>
              <Badge variant="outline" className={statusBadgeClass(journey.status)}>
                {journey.status}
              </Badge>
            </div>
          </div>

          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <ClinicalField label="Condition" value={analysis.detectedIssue} />
              <ClinicalField label="Symptoms" value={symptomsDisplay} />
              <ClinicalField
                label="Medical history summary"
                value={historyDisplay}
                className="md:col-span-2"
              />
            </div>

            {recoveryJourney && recoveryJourney.length > 0 && (
              <RecoveryJourneyCard
                milestones={recoveryJourney}
                estimatedDuration={estimatedDuration}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <HighlightTile
                icon={<Stethoscope className="h-5 w-5 text-primary" />}
                label="Selected doctor"
                value={journey.selectedDoctor?.name ?? "Not selected yet"}
                sub={
                  journey.selectedDoctor?.specialization
                    ? journey.selectedDoctor.specialization
                    : undefined
                }
              />
              <HighlightTile
                icon={<CalendarDays className="h-5 w-5 text-primary" />}
                label="Appointment status"
                value={journey.appointmentStatus}
                sub={
                  journey.appointmentDate
                    ? formatAssessmentDate(journey.appointmentDate)
                    : undefined
                }
              />
            </div>

            {journey.selectedDoctor && (
              <SelectedDoctorStrip
                doctor={journey.selectedDoctor}
                analysisId={analysis.id}
              />
            )}

            {recommendations.length > 0 && (
              <div className="space-y-3 border-t border-border/60 pt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Recommended doctors ({recommendations.length})
                  </p>
                </div>
                <div className="space-y-3">
                  {recommendations.map((item, index) => (
                    <RecommendationListItem
                      key={item.id ?? `${item.doctorId}-${index}`}
                      recommendation={item}
                      analysisId={analysis.id}
                      rank={index + 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 2 — Recommendation History */}
      <section>
        <SectionLabel>Recommendation history</SectionLabel>
        <SectionCard
          title="Previous assessments"
          action={
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              {previousAssessments.length} record{previousAssessments.length === 1 ? "" : "s"}
            </span>
          }
        >
          {previousAssessments.length > 0 ? (
            <div className="space-y-3">
              {[...previousAssessments].reverse().map((row, index) => (
                <HistoryAssessmentCard
                  key={row.id}
                  number={index + 1}
                  row={row}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No previous assessments — your latest result is shown above.
            </p>
          )}
        </SectionCard>
      </section>

      {/* Section 3 — Condition Progress */}
      <section>
        <SectionLabel>Condition progress</SectionLabel>
        <SectionCard title="Your care journey">
          <ConditionProgressTimeline steps={timeline} variant="premium" />
        </SectionCard>
      </section>

      {/* Section 4 — New Assessment CTA (bottom) */}
      <Card className="rounded-2xl border-dashed border-primary/30 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Need an updated specialist match?</p>
            <p className="text-sm text-muted-foreground">
              Start a new assessment on Find My Doctor — your history is saved here.
            </p>
          </div>
          <NewAssessmentButton className="shrink-0 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

function ClinicalField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/60 bg-muted/25 p-4 ${className ?? ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function HighlightTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 font-semibold text-foreground">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SelectedDoctorStrip({
  doctor,
  analysisId,
}: {
  doctor: RecommendedDoctor;
  analysisId?: string;
}) {
  if (!doctor) return null;

  const image =
    doctor.imageUrl && doctor.imageUrl.trim() !== ""
      ? doctor.imageUrl
      : undefined;

  const initials = doctor.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-xl border border-border">
          <AvatarImage src={image} alt={doctor.name} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            {initials || <UserRound className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Your selected specialist</p>
          <p className="font-semibold text-foreground">{doctor.name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" asChild>
          <Link
            to={`/patient/dashboard/appointments?book=1&doctorId=${encodeURIComponent(doctor.id)}${
              analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : ""
            }`}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Book appointment
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={`/doctors/${doctor.id}`}>View profile</Link>
        </Button>
      </div>
    </div>
  );
}
