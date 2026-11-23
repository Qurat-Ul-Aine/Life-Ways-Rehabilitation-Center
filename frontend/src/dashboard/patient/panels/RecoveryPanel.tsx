import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  Activity,
  BarChart3,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TherapySessionRecord } from "@/features/therapy/therapy.types";
import type { TreatmentGoal } from "@/features/patient/patient.types";
import type { Appointment } from "@/features/appointment/appointment.types";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import { usePatientContext } from "../hooks/usePatientContext";
import { usePatientTherapyPlans } from "@/features/patient/hooks/usePatientTherapyPlans";
import { usePatientDashboard } from "@/features/patient/hooks/usePatientDashboard";
import { usePatientRecovery } from "@/features/patient/hooks/usePatientRecovery";
import RecoveryEmptyState from "../components/recovery/RecoveryEmptyState";
import RecoveryCareRecordsSection from "../components/recovery/RecoveryCareRecordsSection";

const BAR_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
];

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const pageShellClass = "w-full space-y-8 pb-4";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function LinearBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden" role="presentation">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const formatShortDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(`${String(raw).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
};

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isCompletedStatus = (status?: string) =>
  String(status ?? "").toLowerCase() === "completed";

const isScheduledStatus = (status?: string) => {
  const s = String(status ?? "").toLowerCase();
  return s === "scheduled" || s === "confirmed" || s === "cancelled";
};

type ActivityRecord = { date: string; status: string };

function buildWeeklyActivityRecords(
  sessions: TherapySessionRecord[],
  appointments: Appointment[],
): ActivityRecord[] {
  const fromTherapy = sessions
    .filter((s) => !(s.appointmentId ?? s.appointment_id))
    .map((s) => ({
      date: String(s.session_date ?? s.date ?? "").slice(0, 10),
      status: String(s.status ?? ""),
    }));

  const fromAppointments = appointments.map((a) => ({
    date: a.date,
    status: a.status,
  }));

  return [...fromTherapy, ...fromAppointments].filter((r) => r.date.length >= 10);
}

function weeklyActivity(records: ActivityRecord[]) {
  const now = new Date();
  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(now.getDate() - daysFromMon);
  weekStart.setHours(0, 0, 0, 0);

  return WEEK_LABELS.map((day, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const dayStr = localDateStr(dayDate);

    const dayRecords = records.filter((r) => r.date === dayStr);

    const done = dayRecords.filter((r) => isCompletedStatus(r.status)).length;

    const scheduled = dayRecords.filter((r) => isScheduledStatus(r.status)).length;

    return { day, done, scheduled: scheduled + done, isFuture: dayDate > now };
  });
}

function buildProgressBreakdown(recovery: {
  overall: number;
  sessionAdherence: number;
  mobility: number;
  therapyGoals: number;
  painManagement: number;
}) {
  const items: { label: string; pct: number; color: string }[] = [
    { label: "Overall recovery", pct: recovery.overall, color: BAR_COLORS[0] },
    { label: "Session attendance", pct: recovery.sessionAdherence, color: BAR_COLORS[1] },
  ];

  if (recovery.mobility > 0) {
    items.push({ label: "Mobility", pct: recovery.mobility, color: BAR_COLORS[2] });
  }
  if (recovery.therapyGoals > 0) {
    items.push({
      label: "Therapy goals assessment",
      pct: recovery.therapyGoals,
      color: BAR_COLORS[3],
    });
  }
  if (recovery.painManagement > 0) {
    items.push({
      label: "Pain management",
      pct: recovery.painManagement,
      color: BAR_COLORS[4],
    });
  }

  return items;
}

function goalDateLabel(goal: TreatmentGoal): string {
  if (goal.status === "Completed") {
    return goal.expectedCompletionDate
      ? `Completed · ${formatShortDate(goal.expectedCompletionDate)}`
      : "Completed";
  }

  const target = goal.expectedCompletionDate
    ? `Target · ${formatShortDate(goal.expectedCompletionDate)}`
    : null;

  return target ?? `${goal.currentProgressPct}% · ${goal.status}`;
}

function mapGoalsToMilestones(goals: TreatmentGoal[]) {
  return goals.map((goal) => ({
    label: goal.name,
    date: goalDateLabel(goal),
    done: goal.status === "Completed" || goal.currentProgressPct >= goal.targetPct,
    progressPct: goal.currentProgressPct,
  }));
}

const encouragement = (name: string, pct: number) => {
  const first = name.split(" ")[0] || "there";
  if (pct >= 80) return `Excellent progress, ${first}! You're almost there.`;
  if (pct >= 50) return `Great work, ${first}! More than halfway there.`;
  if (pct >= 20) return `Keep going, ${first}! Every session counts.`;
  return `Stay consistent with your care plan, ${first}.`;
};

function RecoveryHero({
  patientName,
  recoveryPct,
  completedSessions,
  totalSessions,
  milestonesDone,
  milestonesTotal,
  condition,
  doctorName,
}: {
  patientName: string;
  recoveryPct: number;
  completedSessions: number;
  totalSessions: number;
  milestonesDone: number;
  milestonesTotal: number;
  condition: string | null;
  doctorName: string | null | undefined;
}) {
  const firstName = patientName.split(" ")[0] || "there";

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 md:p-8 text-primary-foreground shadow-md"
      aria-label="Recovery overview"
    >
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary-foreground/10" />
        <div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full bg-primary-foreground/10" />
      </div>

      <div className="relative z-10">
        <p className="text-sm font-medium text-emerald-100/90 uppercase tracking-wide mb-4">
          Recovery progress
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary-foreground">
                {firstName}&apos;s recovery journey
              </h1>
              <p className="text-sm text-emerald-100/90 mt-1.5 leading-relaxed max-w-lg">
                {encouragement(patientName, recoveryPct)}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-emerald-50">
              <p>
                <span className="font-semibold text-primary-foreground tabular-nums">
                  {completedSessions}
                </span>
                {" of "}
                <span className="tabular-nums">{totalSessions}</span>
                {" sessions completed"}
              </p>
              <p>
                <span className="font-semibold text-primary-foreground tabular-nums">
                  {milestonesDone}
                </span>
                {" of "}
                <span className="tabular-nums">{milestonesTotal}</span>
                {" milestones reached"}
              </p>
            </div>

            <div
              className="h-2.5 max-w-xl bg-primary-foreground/20 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={recoveryPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall recovery progress"
            >
              <div
                className="h-full bg-primary-foreground rounded-full transition-all duration-700"
                style={{ width: `${recoveryPct}%` }}
              />
            </div>
          </div>

          <div className="flex justify-start lg:justify-end shrink-0">
            <div className="rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 px-6 py-5 min-w-[9rem] text-center">
              <p className="text-xs font-medium text-emerald-100/90 uppercase tracking-wide mb-1">
                Overall
              </p>
              <p className="text-4xl font-bold tabular-nums tracking-tight leading-none sm:text-5xl">
                {recoveryPct}%
              </p>
            </div>
          </div>
        </div>

        {(condition || doctorName) && (
          <div className="mt-5 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8">
            {condition ? (
              <div>
                <p className="text-xs text-emerald-200/80 uppercase tracking-wide mb-0.5">
                  Primary focus
                </p>
                <p className="text-sm text-primary-foreground font-medium">{condition}</p>
              </div>
            ) : null}

            {doctorName ? (
              <div>
                <p className="text-xs text-emerald-200/80 uppercase tracking-wide mb-0.5">
                  Care team
                </p>
                <p className="text-sm text-primary-foreground font-medium inline-flex items-center gap-2">
                  <User size={15} className="text-emerald-100 shrink-0" aria-hidden />
                  {doctorName}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function MilestonesTimeline({
  milestones,
}: {
  milestones: ReturnType<typeof mapGoalsToMilestones>;
}) {
  if (milestones.length === 0) {
    return (
      <RecoveryEmptyState
        message="No treatment goals from your care plan yet. Your doctor or therapist will add goals to your active therapy plan."
        align="left"
      />
    );
  }

  return (
    <ol className="relative space-y-0">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;

        return (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-3.5 top-8 bottom-0 w-px bg-border"
                aria-hidden
              />
            )}

            <div
              className={cn(
                "relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2",
                m.done
                  ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                  : "bg-background border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {m.done ? (
                <CheckCircle2 size={14} aria-hidden />
              ) : (
                <Circle size={8} className="fill-current" aria-hidden />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-sm leading-snug",
                  m.done ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {m.label}
              </p>

              <p className="text-sm text-muted-foreground mt-0.5">{m.date}</p>

              {!m.done && m.progressPct > 0 ? (
                <div className="mt-2 max-w-xs">
                  <LinearBar pct={m.progressPct} color="bg-emerald-500" />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function WeeklyActivityChart({
  weekBars,
  hasRecords,
}: {
  weekBars: ReturnType<typeof weeklyActivity>;
  hasRecords: boolean;
}) {
  return (
    <>
      <div className="flex items-end gap-2 h-32 mb-3">
        {weekBars.map((d, i) => {
          const maxScale = Math.max(2, ...weekBars.map((w) => w.scheduled));
          const doneH = maxScale > 0 ? (d.done / maxScale) * 100 : 0;
          const schedH = maxScale > 0 ? (d.scheduled / maxScale) * 100 : 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full relative h-[104px]">
                <div
                  className={cn(
                    "absolute bottom-0 w-full rounded-t-md",
                    d.isFuture ? "bg-muted" : "bg-emerald-200",
                  )}
                  style={{ height: `${Math.max(schedH, 6)}%` }}
                />

                {doneH > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-emerald-500"
                    style={{ height: `${doneH}%` }}
                  />
                )}
              </div>

              <span
                className={cn(
                  "text-sm",
                  d.isFuture ? "text-muted-foreground/50" : "text-muted-foreground",
                )}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" aria-hidden />
          Completed
        </span>

        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-200 inline-block" aria-hidden />
          Scheduled
        </span>
      </div>

      {hasRecords ? null : (
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/60">
          No sessions or appointments logged for this week yet.
        </p>
      )}
    </>
  );
}

function ProgressBreakdown({
  breakdown,
  hasSessionData,
}: {
  breakdown: { label: string; pct: number; color: string }[];
  hasSessionData: boolean;
}) {
  if (breakdown.length === 0) {
    return (
      <RecoveryEmptyState message="Recovery metrics will appear after your first clinical assessment and scheduled sessions." />
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {breakdown.map((g) => (
          <li key={g.label}>
            <div className="flex justify-between text-sm mb-2 gap-3">
              <span className="text-muted-foreground truncate" title={g.label}>
                {g.label}
              </span>

              <span className="font-semibold text-foreground tabular-nums shrink-0">
                {g.pct}%
              </span>
            </div>

            <LinearBar pct={g.pct} color={g.color} />
          </li>
        ))}
      </ul>

      {!hasSessionData && breakdown.every((b) => b.label !== "Session attendance") ? (
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/60">
          Session attendance will appear once you have scheduled visits on record.
        </p>
      ) : null}
    </>
  );
}

export default function RecoveryPanel() {
  const { patientId, profile, loading: profileLoading } = usePatientContext();
  const { plans, loading: loadingPlans } = usePatientTherapyPlans(patientId, profileLoading);
  const { data: dashboard, loading: dashboardLoading } = usePatientDashboard();
  const { data: recoverySummary, loading: recoveryLoading } = usePatientRecovery();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setAppointments([]);
      setAppointmentsLoading(false);
      return;
    }

    let cancelled = false;
    setAppointmentsLoading(true);

    appointmentService
      .list({ patientId })
      .then((items) => {
        if (!cancelled) setAppointments(items);
      })
      .catch(() => {
        if (!cancelled) setAppointments([]);
      })
      .finally(() => {
        if (!cancelled) setAppointmentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const therapySessions = useMemo(
    () => plans.flatMap((p) => p.therapy_sessions ?? []),
    [plans],
  );

  const loading =
    profileLoading || loadingPlans || dashboardLoading || recoveryLoading || appointmentsLoading;

  const recoveryPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        dashboard?.recovery?.overall ??
          profile?.recoveryProgress ??
          0,
      ),
    ),
  );

  const patientName = profile?.fullName ?? dashboard?.profile?.fullName ?? "Patient";
  const condition =
    profile?.condition?.trim() ||
    dashboard?.profile?.primaryDiagnosis?.trim() ||
    null;

  const doctorName =
    profile?.assignedDoctorName?.trim() ||
    dashboard?.careTeam?.doctor?.trim() ||
    dashboard?.profile?.assignedDoctorName?.trim() ||
    null;

  const sessionTotal = dashboard?.sessions?.total ?? 0;
  const sessionCompleted = dashboard?.sessions?.completed ?? 0;

  const activityRecords = useMemo(
    () => buildWeeklyActivityRecords(therapySessions, appointments),
    [therapySessions, appointments],
  );

  const weekBars = useMemo(() => weeklyActivity(activityRecords), [activityRecords]);

  const treatmentGoals = recoverySummary?.treatmentGoals ?? [];
  const milestones = useMemo(
    () => mapGoalsToMilestones(treatmentGoals),
    [treatmentGoals],
  );

  const breakdown = useMemo(() => {
    if (!dashboard?.recovery) {
      return recoveryPct > 0
        ? [{ label: "Overall recovery", pct: recoveryPct, color: BAR_COLORS[0] }]
        : [];
    }

    return buildProgressBreakdown({
      overall: recoveryPct,
      sessionAdherence: dashboard.recovery.sessionAdherence ?? 0,
      mobility: dashboard.recovery.mobility ?? 0,
      therapyGoals: dashboard.recovery.therapyGoals ?? 0,
      painManagement: dashboard.recovery.painManagement ?? 0,
    });
  }, [dashboard?.recovery, recoveryPct]);

  const milestonesDone = milestones.filter((m) => m.done).length;
  const hasWeeklyRecords = weekBars.some((d) => d.done > 0 || d.scheduled > 0);

  if (loading) {
    return (
      <div className={pageShellClass}>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className={pageShellClass}>
      <RecoveryHero
        patientName={patientName}
        recoveryPct={recoveryPct}
        completedSessions={sessionCompleted}
        totalSessions={sessionTotal}
        milestonesDone={milestonesDone}
        milestonesTotal={milestones.length}
        condition={condition}
        doctorName={doctorName}
      />

      <section aria-labelledby="progress-analytics-title">
        <SectionLabel>Progress analytics</SectionLabel>

        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 md:p-5">
          <h3 id="progress-analytics-title" className="sr-only">
            Weekly activity and progress breakdown
          </h3>

          <Tabs defaultValue="activity">
            <TabsList className="mb-4">
              <TabsTrigger value="activity" className="text-sm gap-1.5">
                <Activity size={14} aria-hidden />
                Weekly activity
              </TabsTrigger>

              <TabsTrigger value="breakdown" className="text-sm gap-1.5">
                <BarChart3 size={14} aria-hidden />
                Progress breakdown
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <WeeklyActivityChart weekBars={weekBars} hasRecords={hasWeeklyRecords} />
            </TabsContent>

            <TabsContent value="breakdown">
              <ProgressBreakdown
                breakdown={breakdown}
                hasSessionData={sessionTotal > 0}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <RecoveryCareRecordsSection
        profile={profile}
        patientId={patientId}
        plans={plans}
        loadingPlans={loadingPlans}
        profileLoading={profileLoading}
      />

      <section aria-labelledby="milestones-title">
        <details className="group rounded-xl border border-border/60 bg-card" open>
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 md:px-5 py-4 [&::-webkit-details-marker]:hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} aria-hidden />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <h2 id="milestones-title" className="text-sm font-semibold text-foreground">
                Recovery milestones
              </h2>

              <p className="text-sm text-muted-foreground mt-0.5">
                {milestones.length > 0
                  ? `${milestonesDone} of ${milestones.length} treatment goals completed`
                  : "Goals from your active therapy plan"}
              </p>
            </div>

            <ChevronDown
              size={18}
              className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>

          <div className="border-t border-border/60 px-4 md:px-5 py-5">
            <MilestonesTimeline milestones={milestones} />
          </div>
        </details>
      </section>
    </div>
  );
}
