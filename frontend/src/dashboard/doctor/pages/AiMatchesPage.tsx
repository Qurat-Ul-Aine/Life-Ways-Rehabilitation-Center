import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useDoctorAiMatchDetail,
  useDoctorAiMatches,
} from "../hooks/useDoctorAiMatches";
import type { DoctorAiMatchDetail, DoctorAiMatchListItem } from "../types/doctor-ai-matches.types";
import { doctorPatientPath } from "../utils/routes";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatGender(value?: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function appointmentBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  const key = status.toLowerCase();
  if (key.includes("completed")) return "default";
  if (key.includes("confirmed")) return "default";
  if (key.includes("booked")) return "secondary";
  if (key.includes("cancelled")) return "destructive";
  if (key.includes("missed")) return "destructive";
  return "outline";
}

function severityBadgeVariant(
  severity?: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  const key = String(severity ?? "").toUpperCase();
  if (key === "HIGH") return "destructive";
  if (key === "MEDIUM") return "secondary";
  return "outline";
}

function truncateText(value: string, max = 72): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function AiMatchesHero({
  summary,
  loading,
  onRefresh,
}: {
  summary?: {
    totalRecommendations: number;
    averageMatchScore: number;
    acceptedRecommendations: number;
    upcomingAppointments: number;
  };
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />;
  }

  const total = summary?.totalRecommendations ?? 0;
  const avgScore = summary?.averageMatchScore ?? 0;
  const accepted = summary?.acceptedRecommendations ?? 0;
  const upcoming = summary?.upcomingAppointments ?? 0;

  return (
    <section
      aria-labelledby="ai-matches-hero-title"
      className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 md:p-8 text-primary-foreground shadow-md"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary-foreground/10" />
        <div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full bg-primary-foreground/10" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-100/90">
            Clinical decision support
          </p>

          <div>
            <h1
              id="ai-matches-hero-title"
              className="font-heading text-2xl font-bold tracking-tight md:text-3xl"
            >
              AI Matches
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100/90 md:text-base">
              Patients recommended to you after their assessment — review match scores,
              clinical context, and book follow-up care.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 min-w-[7.5rem]">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/80">
                Total matches
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{total}</p>
            </div>

            <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 min-w-[7.5rem]">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/80">
                Avg match score
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{avgScore}%</p>
            </div>

            <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 min-w-[7.5rem]">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/80">
                Accepted
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{accepted}</p>
            </div>

            <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 min-w-[7.5rem]">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/80">
                Upcoming visits
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">{upcoming}</p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-2 bg-primary-foreground/95 text-primary hover:bg-primary-foreground"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>
    </section>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function formatDetailValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map(String).join(", ") || "—";
  const text = String(value).trim();
  return text || "—";
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value?: unknown;
  className?: string;
}) {
  return (
    <div className={`space-y-1 rounded-lg border border-border/60 bg-card p-3 ${className ?? ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{formatDetailValue(value)}</p>
    </div>
  );
}

function RecoveryJourneySection({
  journey,
}: {
  journey: NonNullable<DoctorAiMatchDetail["assessment"]["recoveryJourney"]>;
}) {
  if (Array.isArray(journey)) {
    if (!journey.length) return null;
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Suggested recovery pathway</h3>
        <div className="space-y-2">
          {journey.map((milestone, index) => (
            <div
              key={`${milestone.title ?? "milestone"}-${index}`}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {milestone.title ?? `Milestone ${index + 1}`}
                {milestone.timeframe ? ` · ${milestone.timeframe}` : ""}
              </p>
              {milestone.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{milestone.description}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {journey.title ?? "Suggested recovery pathway"}
      </h3>
      {journey.summary ? (
        <p className="mb-3 text-sm text-muted-foreground">{journey.summary}</p>
      ) : null}
      {journey.phases?.length ? (
        <div className="space-y-2">
          {journey.phases.map((phase, index) => (
            <div
              key={`${phase.name ?? "phase"}-${index}`}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {phase.name ?? `Phase ${index + 1}`}
                {phase.duration ? ` · ${phase.duration}` : ""}
              </p>
              {phase.focus ? (
                <p className="mt-1 text-xs text-muted-foreground">{phase.focus}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MatchDetailDialog({
  recommendationId,
  open,
  onOpenChange,
}: {
  recommendationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { detail, loading, error, saving, saveNotes, reload } = useDoctorAiMatchDetail(
    open ? recommendationId : null,
  );

  const [assessmentNotes, setAssessmentNotes] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [progressNotes, setProgressNotes] = useState("");

  useEffect(() => {
    if (!detail) return;
    setAssessmentNotes(detail.notes.assessmentNotes);
    setTreatmentNotes(detail.notes.treatmentNotes);
    setProgressNotes(detail.notes.progressNotes);
  }, [detail]);

  const handleSave = async () => {
    try {
      await saveNotes({
        assessmentNotes,
        treatmentNotes,
        progressNotes,
      });
      toast.success("Doctor notes saved");
    } catch {
      toast.error("Could not save notes");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Patient assessment
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-left">
              <p className="font-medium text-foreground">
                {detail?.patientName ?? "Loading patient…"}
              </p>
              {detail ? (
                <p>
                  Submitted {formatDate(detail.recommendationDate)}
                  {detail.assessment.condition ? ` · ${detail.assessment.condition}` : ""}
                </p>
              ) : (
                <p>Review the patient&apos;s AI assessment details below.</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Match score {detail.matchScore}%</Badge>
              {detail.accepted ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Accepted
                </Badge>
              ) : (
                <Badge variant="outline">Awaiting booking</Badge>
              )}
              <Badge variant={appointmentBadgeVariant(detail.appointmentStatus)}>
                {detail.appointmentStatus}
              </Badge>
              {detail.assessment.severityLevel ? (
                <Badge variant={severityBadgeVariant(detail.assessment.severityLevel)}>
                  {detail.assessment.severityLevel} severity
                </Badge>
              ) : null}
              {detail.assessment.urgentFlag ? (
                <Badge variant="destructive">Urgent review</Badge>
              ) : null}
              {detail.age != null ? (
                <Badge variant="outline">Age {detail.age}</Badge>
              ) : null}
              {detail.gender ? (
                <Badge variant="outline">{formatGender(detail.gender)}</Badge>
              ) : null}
            </div>

            {detail.patientEmail ? (
              <p className="text-sm text-muted-foreground">{detail.patientEmail}</p>
            ) : null}

            {detail.appointmentDate ? (
              <p className="text-sm text-muted-foreground">
                Appointment on {formatDate(detail.appointmentDate)}
              </p>
            ) : null}

            {detail.reason ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Why this patient matched you
                </h3>
                <p className="text-sm leading-relaxed text-foreground">{detail.reason}</p>
              </div>
            ) : null}

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Stethoscope className="h-4 w-4 text-primary" />
                Assessment details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Condition" value={detail.assessment.condition} />
                <DetailField label="Consultation preference" value={detail.assessment.consultationPreference} />
                <DetailField label="Location" value={detail.assessment.location} />
                <DetailField label="Preferred language" value={detail.assessment.preferredLanguage} />
                <DetailField label="Preferred doctor gender" value={detail.assessment.preferredDoctorGender} />
                <DetailField
                  label="Analysis source"
                  value={detail.assessment.analysisSource?.toUpperCase() ?? "DSS"}
                />
                <DetailField label="Symptoms" value={detail.assessment.symptoms} className="sm:col-span-2" />
                <DetailField label="Medical history" value={detail.assessment.medicalHistory} />
                <DetailField label="Current medications" value={detail.assessment.currentMedications} />
                <DetailField label="Allergies" value={detail.assessment.allergies} className="sm:col-span-2" />
                {detail.assessment.estimatedDuration ? (
                  <DetailField label="Estimated duration" value={detail.assessment.estimatedDuration} />
                ) : null}
                {detail.assessment.symptomCount != null ? (
                  <DetailField label="Symptoms reported" value={detail.assessment.symptomCount} />
                ) : null}
              </div>
            </div>

            {detail.assessment.recoveryJourney ? (
              <RecoveryJourneySection journey={detail.assessment.recoveryJourney} />
            ) : null}

            <Separator />

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Doctor notes
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assessment-notes">Assessment notes</Label>
                  <Textarea
                    id="assessment-notes"
                    value={assessmentNotes}
                    onChange={(event) => setAssessmentNotes(event.target.value)}
                    placeholder="Initial clinical assessment observations…"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatment-notes">Treatment notes</Label>
                  <Textarea
                    id="treatment-notes"
                    value={treatmentNotes}
                    onChange={(event) => setTreatmentNotes(event.target.value)}
                    placeholder="Proposed treatment plan and interventions…"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progress-notes">Progress notes</Label>
                  <Textarea
                    id="progress-notes"
                    value={progressNotes}
                    onChange={(event) => setProgressNotes(event.target.value)}
                    placeholder="Follow-up progress and outcomes…"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {detail ? (
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(doctorPatientPath(detail.patientId))}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Full patient profile
              </Button>
              {detail.appointmentId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/doctor/appointments")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  View appointment
                </Button>
              ) : null}
            </div>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save notes"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AiMatchesPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useDoctorAiMatches();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const summary = data?.summary;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const openDetail = (item: DoctorAiMatchListItem) => {
    setSelectedId(item.recommendationId);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <AiMatchesHero
        summary={summary}
        loading={loading}
        onRefresh={() => void reload()}
      />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <Card className="border-border shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">Could not load AI matches</p>
              <p className="mt-1 text-sm text-destructive">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Recommended patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                  <p className="font-semibold text-foreground">No AI matches yet</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    When patients complete an AI assessment and you are ranked as a match, they
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Why matched</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recommended</TableHead>
                        <TableHead>Appointment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.recommendationId}>
                          <TableCell className="font-medium">{item.patientName}</TableCell>
                          <TableCell>{item.age ?? "—"}</TableCell>
                          <TableCell>{formatGender(item.gender)}</TableCell>
                          <TableCell className="max-w-[160px] truncate" title={item.condition}>
                            {item.condition}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="secondary">{item.matchScore}%</Badge>
                              {item.severityLevel ? (
                                <Badge variant={severityBadgeVariant(item.severityLevel)} className="text-[10px]">
                                  {item.severityLevel}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[220px]" title={item.reason}>
                            <span className="line-clamp-2 text-sm text-muted-foreground">
                              {item.reason ? truncateText(item.reason, 96) : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {item.accepted ? (
                                <Badge variant="default" className="w-fit gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Accepted
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="w-fit">
                                  Pending
                                </Badge>
                              )}
                              {item.urgentFlag ? (
                                <Badge variant="destructive" className="w-fit text-[10px]">
                                  Urgent
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(item.recommendationDate)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={appointmentBadgeVariant(item.appointmentStatus)}>
                                {item.appointmentStatus}
                              </Badge>
                              {item.appointmentDate ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(item.appointmentDate)}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetail(item)}
                              >
                                <UserRound className="mr-1 h-4 w-4" />
                                Details
                              </Button>
                              {item.appointmentId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate("/doctor/appointments")}
                                >
                                  <ExternalLink className="mr-1 h-4 w-4" />
                                  Appointment
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      <MatchDetailDialog
        recommendationId={selectedId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
