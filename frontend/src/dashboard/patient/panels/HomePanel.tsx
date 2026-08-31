import { useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Video,
  Phone,
  TrendingUp,
  Pill,
  BookOpen,
  Users,
  FileText,
  Stethoscope,
  UserCircle,
  Circle,
  ChevronDown,
  Bell,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { usePatientDashboard } from "@/features/patient/hooks/usePatientDashboard";
import { usePatientContext } from "../hooks/usePatientContext";
import { todayStr } from "@/features/appointment/utils/appointmentDisplay";
import { useTelehealthJoin } from "@/features/appointment/hooks/useTelehealthJoin";
import ProgressRing from "../components/home/ProgressRing";
import EmptyState from "../components/home/EmptyState";
import CareTeamContactSection from "../components/home/CareTeamContactSection";
import { scrollPatientDashboardTo } from "../utils/scrollPatientDashboard";
import TodaysRemindersSection from "../components/home/TodaysRemindersSection";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const formatTime12 = (time?: string | null) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
};

const formatDateLabel = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T12:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
};

const formatShortDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const appointmentLabel = (a: { reason: string | null; mode: string }) =>
  a.reason?.trim() || (a.mode === "online" ? "Telehealth visit" : "In-person visit");

const upcomingTimeLabel = (a: { date: string; startTime: string | null }) => {
  const datePart = formatDateLabel(a.date);
  return a.startTime ? `${datePart} · ${formatTime12(a.startTime)}` : datePart;
};

const recoveryMessage = (pct: number) => {
  if (pct >= 80) return "Excellent progress — keep up your consistent effort.";
  if (pct >= 60) return "Your recovery is improving — stay consistent with sessions.";
  if (pct > 0) return "You're making progress — every session counts.";
  return "Your recovery journey starts with your next scheduled session.";
};

const journeyLabel = (pct: number, hasPlan: boolean) => {
  if (!hasPlan && pct === 0) return "Getting started";
  if (pct >= 80) return "Nearing your goals";
  if (pct >= 50) return "Steady progress";
  if (pct > 0) return "Building momentum";
  return "Ready to begin";
};

const memberInitials = (name?: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isUpcomingAppt = (status: string) =>
  status === "scheduled" || status === "confirmed";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function formatProfileDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-PK");
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function DetailAccordion({
  title,
  hint,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-2xl border border-border bg-card shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="w-9 h-9 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0">
          {icon}
              </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {hint && <p className="text-sm text-muted-foreground mt-0.5">{hint}</p>}
            </div>
        <ChevronDown
          size={18}
          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/50 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

const HomePanel = () => {
  const navigate = useNavigate();
  const { patientId, profile: contextProfile, loading: contextLoading, error: contextError } =
    usePatientContext();
  const { data, loading: dashboardLoading, error: dashboardError } = usePatientDashboard();

  const loading = contextLoading || dashboardLoading;
  const error =
    contextError ??
    dashboardError ??
    (!contextLoading && !patientId ? "Patient profile not found for this account." : null);

  const profile = data?.profile ?? (contextProfile
    ? {
        id: contextProfile.id,
        fullName: contextProfile.fullName,
        primaryDiagnosis: contextProfile.condition,
        status: contextProfile.status,
        recoveryProgress: contextProfile.recoveryProgress,
        assignedDoctorName: contextProfile.assignedDoctorName,
      }
    : null);

  const upcomingAppointments = data?.upcomingAppointments ?? [];
  const sessions = data?.sessions;
  const recovery = data?.recovery;
  const medications = data?.medications ?? [];
  const notifications = data?.notifications ?? [];
  const therapyPlan = data?.therapyPlan;
  const careTeam = data?.careTeam;
  const treatmentGoals = data?.treatmentGoals ?? [];
  const latestDoctorNote = data?.latestDoctorNote;
  const latestAssessment = data?.latestAssessment;
  const recentAssessments = data?.recentAssessments ?? (latestAssessment ? [latestAssessment] : []);
  const screeningAlerts = data?.screeningAlerts ?? [];
  const recentReports = data?.recentReports ?? [];
  const todaysAppointments = data?.todaysAppointments ?? [];

  const dashboardProfile = data?.profile;

  const activeUpcoming = useMemo(() => {
    const today = todayStr();
    return upcomingAppointments
      .filter((a) => isUpcomingAppt(a.status) && a.date && a.date >= today)
      .sort((a, b) => {
        const byDate = (a.date ?? "").localeCompare(b.date ?? "");
        if (byDate !== 0) return byDate;
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
  }, [upcomingAppointments]);

  const todayVisit = useMemo(
    () => activeUpcoming.find((a) => a.date === todayStr()) ?? null,
    [activeUpcoming],
  );

  const nextAppt = activeUpcoming[0] ?? null;
  const moreUpcoming = activeUpcoming.slice(1, 4);

  const recoveryPct =
    recovery?.overall ?? profile?.recoveryProgress ?? contextProfile?.recoveryProgress ?? 0;
  const displayName = profile?.fullName ?? contextProfile?.fullName ?? "Patient";
  const therapyType = therapyPlan?.therapyType ?? "No active therapy plan";
  const doctor =
    profile?.assignedDoctorName?.trim() ||
    contextProfile?.assignedDoctorName?.trim() ||
    careTeam?.doctor?.trim() ||
    "Not assigned";

  const goalsCompleted = treatmentGoals.filter((g) => g.completed).length;
  const goalsTotal = treatmentGoals.length;
  const sessionAdherence = recovery?.sessionAdherence ?? 0;
  const goalsProgressPct =
    goalsTotal > 0
      ? Math.round((goalsCompleted / goalsTotal) * 100)
      : recovery?.treatmentGoals ?? recovery?.therapyGoals ?? 0;

  const telehealthJoin = useTelehealthJoin(
    todayVisit
      ? {
          mode: todayVisit.mode,
          date: todayVisit.date,
          startTime: todayVisit.startTime,
          status: todayVisit.status,
        }
      : null,
  );

  const showTelehealthJoin =
    todayVisit &&
    todayVisit.mode === "online" &&
    isUpcomingAppt(todayVisit.status);

  const handleJoinTelehealth = () => {
    if (!telehealthJoin.canJoin) return;
    if (todayVisit?.id) {
      navigate(`/patient/waiting-room/${todayVisit.id}`);
      return;
    }
    navigate("/patient/dashboard/appointments");
  };

  const scrollToCareTeamContact = useCallback(() => {
    scrollPatientDashboardTo("care-team-contact", 24);
  }, []);

  const careMembers = useMemo(
    () => [
      { role: "Your doctor", name: careTeam?.doctor ?? doctor, icon: Stethoscope },
      { role: "Your therapist", name: careTeam?.therapist ?? therapyPlan?.therapistName, icon: UserCircle },
      { role: "Case manager", name: careTeam?.caseManager, icon: Users },
    ],
    [careTeam, doctor, therapyPlan?.therapistName],
  );

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-destructive mb-2">We couldn&apos;t load your dashboard</p>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      {/* ── SECTION 1: Recovery Hero ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 md:p-8 text-primary-foreground shadow-md"
        aria-labelledby="recovery-hero-title"
      >
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-primary-foreground" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-4 min-w-0">
            <p className="text-sm font-medium text-primary-foreground/85">{greeting()}</p>
            <div>
              <h1 id="recovery-hero-title" className="text-2xl md:text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              <p className="text-sm text-primary-foreground/90 mt-1.5 flex items-center gap-2">
                <BookOpen size={16} aria-hidden />
                {therapyType}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/25 text-sm font-normal">
                {journeyLabel(recoveryPct, Boolean(therapyPlan))}
              </Badge>
              {nextAppt && isUpcomingAppt(nextAppt.status) && (
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/25 text-sm font-normal">
                  <CalendarDays size={14} className="mr-1.5" aria-hidden />
                  Next: {upcomingTimeLabel(nextAppt)}
                </Badge>
              )}
            </div>

            <p className="text-sm text-primary-foreground/90 leading-relaxed max-w-xl">
              {recoveryMessage(recoveryPct)}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-9"
              >
                <Link to="/patient/dashboard/recovery">View recovery progress</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="rounded-2xl bg-primary-foreground/10 backdrop-blur-sm px-6 py-5 border border-primary-foreground/20">
              <p className="text-sm text-center text-primary-foreground/85 mb-3">Your recovery</p>
              <ProgressRing
                pct={recoveryPct}
                color="hsl(var(--primary-foreground))"
                size={112}
                label=""
              />
              <p className="text-center text-sm font-medium text-primary-foreground mt-2">
                {recoveryPct > 0 ? `${recoveryPct}% overall` : "Not yet recorded"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Today's Focus ───────────────────────────────────── */}
      <section aria-labelledby="todays-focus-title">
        <SectionLabel>Today&apos;s focus</SectionLabel>
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.04] p-5 md:p-6 shadow-sm">
          <h3 id="todays-focus-title" className="sr-only">
            What you need to do today
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Your next visit</p>
                {!todayVisit || !isUpcomingAppt(todayVisit.status) ? (
                  <EmptyState message="No visits scheduled for today. Book an appointment when you're ready." className="text-left py-2" />
                ) : (
                  <div className="rounded-xl bg-card border border-border p-4">
                    <p className="text-base font-semibold text-foreground">
                      {appointmentLabel(todayVisit)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {upcomingTimeLabel(todayVisit)}
                      {todayVisit.doctorName ? ` · ${todayVisit.doctorName}` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {todayVisit.mode === "online" ? (
                          <span className="inline-flex items-center gap-1">
                            <Video size={12} /> Telehealth
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> In-person
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                )}
    </div>

              <div className="flex flex-wrap gap-2">
                {showTelehealthJoin && (
                  <Button
                    size="sm"
                    className="rounded-xl text-sm h-9"
                    onClick={handleJoinTelehealth}
                    disabled={!telehealthJoin.canJoin || !todayVisit?.meetingUrl}
                  >
                    <Video size={16} className="mr-2" aria-hidden />
                    {telehealthJoin.canJoin && todayVisit?.meetingUrl
                      ? "Join telehealth"
                      : "Join opens soon"}
                  </Button>
                )}
                {showTelehealthJoin && telehealthJoin.message && !telehealthJoin.canJoin && (
                  <p className="text-xs text-muted-foreground w-full">{telehealthJoin.message}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-sm h-9 bg-card"
                  type="button"
                  onClick={scrollToCareTeamContact}
                >
                  <Phone size={16} className="mr-2" aria-hidden />
                  Contact care team
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Today&apos;s reminders</p>
              <TodaysRemindersSection
                appointments={todaysAppointments}
                patientName={displayName}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Recovery Snapshot ─────────────────────────────────── */}
      <section aria-labelledby="recovery-snapshot-title">
        <SectionLabel>Recovery snapshot</SectionLabel>
        <div className="rounded-2xl bg-muted/30 border border-border/60 p-5 md:p-6">
          <h3 id="recovery-snapshot-title" className="sr-only">
            Key recovery metrics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-4">
              <ProgressRing pct={recoveryPct} color="hsl(var(--primary))" size={88} />
              <div className="mt-3 sm:mt-0 text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground">Overall recovery</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {recoveryPct > 0 ? "Your combined progress score" : "Recorded after your first assessment"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-4">
              <ProgressRing pct={sessionAdherence} color="#8b5cf6" size={88} />
              <div className="mt-3 sm:mt-0 text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground">Session attendance</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sessions && sessions.total > 0
                    ? sessions.label ?? `${sessions.completed} of ${sessions.total} sessions completed`
                    : "No sessions logged yet"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-4">
              <ProgressRing pct={goalsProgressPct} color="#10b981" size={88} />
              <div className="mt-3 sm:mt-0 text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground">Treatment goals</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {goalsTotal > 0
                    ? `${goalsCompleted} of ${goalsTotal} goals completed`
                    : "Goals will appear from your care plan"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border/50 flex items-start gap-2">
            <TrendingUp size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-emerald-700 font-medium leading-relaxed">
              {recoveryMessage(recoveryPct)}
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Active Therapy Journey ────────────────────────────── */}
      <section aria-labelledby="therapy-journey-title">
        <SectionLabel>Your therapy journey</SectionLabel>
        {!therapyPlan ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No active therapy plan yet. Your care team will set one up for you.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h3 id="therapy-journey-title" className="text-lg font-semibold text-foreground">
                  {therapyPlan.therapyType}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Current phase:{" "}
                  <span className="font-medium text-foreground">{therapyPlan.currentPhase}</span>
                </p>
              </div>
              <Badge variant="outline" className="text-sm w-fit capitalize">
                {therapyPlan.status.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Plan progress</span>
                <span className="font-semibold tabular-nums">{therapyPlan.progressPct}%</span>
              </div>
              <div
                className="h-2.5 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={therapyPlan.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${therapyPlan.progressPct}%` }}
                />
              </div>
            </div>

            <ol className="relative space-y-0 border-l-2 border-border ml-3 pl-6 pb-1">
              {[
                {
                  label: "Program started",
                  detail: formatShortDate(therapyPlan.startDate),
                  done: true,
                },
                {
                  label: therapyPlan.currentPhase,
                  detail: `${therapyPlan.sessionsCompleted} session${therapyPlan.sessionsCompleted === 1 ? "" : "s"} completed`,
                  done: therapyPlan.progressPct > 0,
                  active: true,
                },
                {
                  label: "Goals progress",
                  detail:
                    goalsTotal > 0
                      ? `${goalsCompleted} of ${goalsTotal} goals completed`
                      : `${therapyPlan.goalsCount} goals in your plan`,
                  done: goalsTotal > 0 && goalsCompleted === goalsTotal,
                },
                {
                  label: "Expected completion",
                  detail: formatShortDate(therapyPlan.endDate),
                  done: false,
                },
              ].map((step, i) => (
                <li key={i} className="relative pb-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-[1.65rem] top-0.5 w-3 h-3 rounded-full border-2 bg-card",
                      step.done
                        ? "border-emerald-500 bg-emerald-500"
                        : step.active
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* ── SECTION 5 & 6 & 7: Goals, Session summary, Care team ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="goals-title">
          <SectionLabel>Treatment goals</SectionLabel>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm h-full">
            <h3 id="goals-title" className="sr-only">
              Treatment goals checklist
            </h3>
            {treatmentGoals.length === 0 ? (
              <EmptyState message="Your care team hasn't added goals yet." className="py-6" />
            ) : (
              <ul className="space-y-2">
                {treatmentGoals.map((goal) => (
                  <li
                    key={goal.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl px-4 py-3 border",
                      goal.completed
                        ? "bg-emerald-50/60 border-emerald-200/60"
                        : "bg-muted/20 border-border/60",
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        goal.completed ? "bg-emerald-500 text-white" : "bg-muted border border-border",
                      )}
                      aria-hidden
                    >
                      {goal.completed ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Circle size={10} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-relaxed",
                          goal.completed
                            ? "text-foreground font-medium line-through decoration-emerald-600/40"
                            : "text-foreground",
                        )}
                      >
                        {goal.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {goal.completed ? "Completed" : "In progress"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {goalsTotal > 0 && (
              <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border/50">
                {goalsCompleted} of {goalsTotal} goals complete
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="session-summary-title">
            <SectionLabel>Last session summary</SectionLabel>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 id="session-summary-title" className="sr-only">
                Last session summary from your care team
              </h3>
              {!latestDoctorNote?.summary ? (
                <EmptyState
                  message="Notes from your last session will appear here after your care team shares them."
                  className="py-4"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      From {latestDoctorNote.author}
                    </p>
                    <time className="text-sm text-muted-foreground">
                      {formatShortDate(latestDoctorNote.date)}
                    </time>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {latestDoctorNote.summary}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="care-team-title">
            <SectionLabel>Your care team</SectionLabel>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 id="care-team-title" className="sr-only">
                Assigned care team
              </h3>
              <ul className="space-y-4">
                {careMembers.map((member) => {
                  const name = member.name?.trim() || "Not assigned";
                  const Icon = member.icon;
                  return (
                    <li key={member.role} className="flex items-center gap-4">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {memberInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {member.role}
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0" aria-hidden>
                        <Icon size={18} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* ── SECTION 8: Additional details (accordions) ───────────────────── */}
      <section aria-labelledby="more-details-title">
        <SectionLabel>More details</SectionLabel>
        <h3 id="more-details-title" className="sr-only">
          Additional health information
        </h3>
        <div className="space-y-3">
          <DetailAccordion
            title="Medication summary"
            hint={
              medications.length > 0
                ? `${medications.length} medication${medications.length === 1 ? "" : "s"} on record`
                : "No medications on record"
            }
            icon={<Pill size={18} />}
          >
            {medications.length === 0 ? (
              <div className="space-y-3">
                <EmptyState message="No medications on record." className="py-2" />
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to="/patient/dashboard/medications">View medications page</Link>
                </Button>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {medications.map((med, i) => (
                    <li key={med.id ?? i} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-none">
                      <div>
                        <p className="text-sm font-medium text-foreground">{med.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {med.dosage} · {med.frequency}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                        {med.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs">
                  <Link to="/patient/dashboard/medications">Manage medications</Link>
                </Button>
              </>
            )}
          </DetailAccordion>

          <DetailAccordion
            title="Assessment results"
            hint={
              latestAssessment
                ? `${latestAssessment.testType} · ${formatShortDate(latestAssessment.testDate)}`
                : "No assessments on record"
            }
            icon={<FlaskConical size={18} />}
          >
            {screeningAlerts.length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 space-y-1">
                <p className="text-xs font-semibold text-amber-900">Screening follow-up</p>
                {screeningAlerts.slice(0, 2).map((alert) => (
                  <p key={alert.id} className="text-xs text-amber-800">
                    {alert.condition}
                    {alert.flagged ? " — flagged for review" : ""}
                    {alert.followUpDate ? ` — follow-up by ${formatShortDate(alert.followUpDate)}` : ""}
                  </p>
                ))}
              </div>
            )}
            {recentAssessments.length === 0 ? (
              <div className="space-y-3">
                <EmptyState message="No assessment results on record." className="py-2" />
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to="/patient/dashboard/screening">Go to screening</Link>
                </Button>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {recentAssessments.slice(0, 5).map((assessment) => (
                    <li
                      key={assessment.id}
                      className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{assessment.testType}</p>
                        <Badge variant="secondary" className="text-xs">
                          Score: {assessment.score}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Completed {formatShortDate(assessment.testDate)}</span>
                        {assessment.riskLevel ? (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {assessment.riskLevel} risk
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs">
                  <Link to="/patient/dashboard/recovery">View recovery details</Link>
                </Button>
              </>
            )}
          </DetailAccordion>

          {activeUpcoming.length > 1 && (
            <DetailAccordion
              title="More upcoming visits"
              hint={`${moreUpcoming.length} additional appointment${moreUpcoming.length === 1 ? "" : "s"}`}
              icon={<CalendarDays size={18} />}
            >
              <ul className="space-y-3">
                {moreUpcoming.map((a) => (
                  <li key={a.id} className="py-2 border-b border-border/50 last:border-none">
                    <p className="text-sm font-medium text-foreground">{appointmentLabel(a)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {upcomingTimeLabel(a)}
                      {a.doctorName ? ` · ${a.doctorName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs">
                <Link to="/patient/dashboard/appointments">View all appointments</Link>
              </Button>
            </DetailAccordion>
          )}

          <DetailAccordion
            title="Recent reports"
            hint={
              recentReports.length > 0
                ? `${recentReports.length} report${recentReports.length === 1 ? "" : "s"} available`
                : "No reports available"
            }
            icon={<FileText size={18} />}
          >
            {recentReports.length === 0 ? (
              <div className="space-y-3">
                <EmptyState message="No reports available for download." className="py-2" />
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to="/patient/dashboard/reports">Open reports page</Link>
                </Button>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {recentReports.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-none">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden>
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{r.reportType}</p>
                        <p className="text-sm text-muted-foreground">
                          {r.fileType ? `${r.fileType} · ` : ""}
                          Generated {formatShortDate(r.generatedDate?.slice(0, 10))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs">
                  <Link to="/patient/dashboard/reports">View all reports</Link>
                </Button>
              </>
            )}
          </DetailAccordion>

          <DetailAccordion
            title="My profile"
            hint="Registration and contact details"
            icon={<UserCircle size={18} />}
          >
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <ProfileField
                label="Email"
                value={dashboardProfile?.email ?? contextProfile?.email}
              />
              <ProfileField
                label="Phone"
                value={dashboardProfile?.phone ?? contextProfile?.phone}
              />
              <ProfileField
                label="Gender"
                value={dashboardProfile?.gender ?? contextProfile?.gender}
              />
              <ProfileField
                label="Date of birth"
                value={formatProfileDate(
                  dashboardProfile?.dateOfBirth ?? contextProfile?.dateOfBirth,
                )}
              />
              <ProfileField
                label="Address"
                value={dashboardProfile?.address ?? contextProfile?.address}
                className="sm:col-span-2"
              />
              <ProfileField
                label="Emergency contact"
                value={
                  (dashboardProfile?.emergencyContactName ?? contextProfile?.emergencyContactName)
                    ? `${dashboardProfile?.emergencyContactName ?? contextProfile?.emergencyContactName ?? "—"} · ${dashboardProfile?.emergencyContactPhone ?? contextProfile?.emergencyContactPhone ?? "—"}`
                    : null
                }
                className="sm:col-span-2"
              />
              <ProfileField
                label="Primary diagnosis"
                value={dashboardProfile?.primaryDiagnosis ?? contextProfile?.condition}
              />
              <ProfileField
                label="Status"
                value={dashboardProfile?.status ?? contextProfile?.status}
              />
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 h-8 text-xs">
              <Link to="/patient/dashboard/profile">View & edit full profile</Link>
            </Button>
          </DetailAccordion>

          <DetailAccordion
            title="Notifications"
            hint={
              notifications.length > 0
                ? `${notifications.length} recent notification${notifications.length === 1 ? "" : "s"}`
                : "Nothing pending"
            }
            icon={<Bell size={18} />}
          >
            <div>
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Bell size={16} aria-hidden />
                Recent notifications
              </p>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n, i) => (
                    <li key={n.id ?? i} className="text-sm text-muted-foreground py-2 border-b border-border/50 last:border-none">
                      <p className="text-foreground font-medium">{n.message}</p>
                      {n.sent_date && (
                        <p className="text-xs mt-0.5">
                          {new Date(n.sent_date).toLocaleDateString("en-PK", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" size="sm" className="mt-2 h-8 text-xs">
                <Link to="/patient/dashboard/notifications">View all notifications</Link>
              </Button>
            </div>
          </DetailAccordion>
        </div>
      </section>

      {/* ── SECTION 9: Contact ───────────────────────────────────────────── */}
      <CareTeamContactSection />
    </div>
);
};

export default HomePanel;
