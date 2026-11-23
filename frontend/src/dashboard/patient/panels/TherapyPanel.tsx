import { useMemo, useState } from "react";
import {
  FileText,
  Video,
  Activity,
  BookOpen,
  Download,
  ChevronDown,
  CheckCircle2,
  Circle,
  ListTodo,
  Headphones,
  MapPin,
  Calendar,
  User,
  Play,
  Eye,
  Stethoscope,
  Target,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { therapyService } from "@/features/therapy/services/therapyService";
import PatientSessionHistory from "@/features/therapy/components/PatientSessionHistory";
import { usePatientTherapyPlans } from "@/features/patient/hooks/usePatientTherapyPlans";
import type {
  TherapyExercise,
  TherapyFile,
  TherapyPlan,
  TherapySessionRecord,
} from "@/features/therapy/therapy.types";
import { usePatientContext } from "../hooks/usePatientContext";

/* ── Shared helpers ──────────────────────────────────────────────────────── */

const formatDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const weeksRemaining = (endDate?: string | null) => {
  if (!endDate) return null;
  const end = new Date(`${endDate.slice(0, 10)}T12:00:00`);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (7 * 86_400_000));
  return diff > 0 ? diff : 0;
};

const therapistName = (plan: TherapyPlan) =>
  plan.therapistName ?? plan.doctors?.users?.name ?? "—";

const planType = (plan: TherapyPlan) =>
  plan.therapy_type ?? plan.title ?? "Therapy plan";

const planStatusLabel = (status?: TherapyPlan["status"]) => {
  const s = String(status ?? "active").toLowerCase();
  if (s === "active") return "Active";
  if (s === "completed") return "Completed";
  if (s === "paused" || s === "on_hold") return "On Hold";
  if (s === "cancelled") return "Cancelled";
  return "Active";
};

const startDate = (plan: TherapyPlan) => plan.start_date ?? plan.startDate ?? null;
const endDate = (plan: TherapyPlan) => plan.end_date ?? plan.endDate ?? null;
const planGoals = (plan: TherapyPlan): string[] => plan.goals ?? [];
const planSessions = (plan: TherapyPlan): TherapySessionRecord[] => plan.therapy_sessions ?? [];
const planExercises = (plan: TherapyPlan): TherapyExercise[] =>
  plan.therapy_exercises ?? plan.exercises ?? [];
const planFiles = (plan: TherapyPlan): TherapyFile[] =>
  plan.files ?? plan.therapy_plan_files ?? [];

const isActivePlan = (plan: TherapyPlan) =>
  String(plan.status ?? "active").toLowerCase() === "active";

function planResourceTimestamp(plan: TherapyPlan): string {
  const fileDates = (plan.files ?? plan.therapy_plan_files ?? [])
    .map((f) => f.uploadedAt ?? "")
    .filter(Boolean);
  const exerciseDates = (plan.therapy_exercises ?? plan.exercises ?? [])
    .map((ex) => (ex as TherapyExercise & { created_at?: string }).created_at ?? "")
    .filter(Boolean);
  return [...fileDates, ...exerciseDates].sort().reverse()[0] ?? "";
}

function pickPrimaryPlan(plans: TherapyPlan[]): TherapyPlan | null {
  if (plans.length === 0) return null;
  const active = plans.filter(isActivePlan);
  const pool = active.length > 0 ? active : plans;

  return [...pool].sort((a, b) => {
    const aTs = planResourceTimestamp(a);
    const bTs = planResourceTimestamp(b);
    if (aTs !== bTs) return bTs.localeCompare(aTs);
    return String(b.id).localeCompare(String(a.id));
  })[0];
}

type ResourceType = "video" | "pdf" | "audio" | "guide" | "exercise";

const getResourceType = (ex: TherapyExercise): ResourceType => {
  const url = ex.media_url?.toLowerCase() ?? "";
  const title = (ex.title ?? ex.name ?? "").toLowerCase();
  if (url.includes("video") || url.endsWith(".mp4") || url.endsWith(".webm")) return "video";
  if (url.includes("audio") || url.endsWith(".mp3") || url.endsWith(".wav")) return "audio";
  if (url.endsWith(".pdf") || title.includes("worksheet") || title.includes("pdf")) return "pdf";
  if (title.includes("guide") || title.includes("workbook") || title.includes("handout")) return "guide";
  return "exercise";
};

const RESOURCE_META: Record<
  ResourceType,
  { label: string; icon: React.ReactNode; tileBg: string; iconBg: string }
> = {
  video: {
    label: "Video",
    icon: <Video size={18} aria-hidden />,
    tileBg: "bg-violet-50/80 border-violet-100",
    iconBg: "bg-violet-100 text-violet-700",
  },
  pdf: {
    label: "PDF / Worksheet",
    icon: <FileText size={18} aria-hidden />,
    tileBg: "bg-rose-50/80 border-rose-100",
    iconBg: "bg-rose-100 text-rose-700",
  },
  audio: {
    label: "Audio",
    icon: <Headphones size={18} aria-hidden />,
    tileBg: "bg-amber-50/80 border-amber-100",
    iconBg: "bg-amber-100 text-amber-700",
  },
  guide: {
    label: "Guide",
    icon: <BookOpen size={18} aria-hidden />,
    tileBg: "bg-teal-50/80 border-teal-100",
    iconBg: "bg-teal-100 text-teal-700",
  },
  exercise: {
    label: "Exercise",
    icon: <Activity size={18} aria-hidden />,
    tileBg: "bg-primary/5 border-primary/10",
    iconBg: "bg-primary/10 text-primary",
  },
};

function computePlanMetrics(plan: TherapyPlan) {
  const goals = planGoals(plan);
  const sessions = planSessions(plan);
  const completed = sessions.filter(
    (s) => s.status === "COMPLETED" || s.status === "completed",
  ).length;
  const total = sessions.length;
  const progressPct =
    goals.length > 0
      ? Math.min(100, Math.round((completed / goals.length) * 100))
      : total > 0
        ? Math.round((completed / total) * 100)
        : 0;
  const currentPhase =
    completed === 0
      ? "Getting started"
      : progressPct >= 80
        ? "Maintenance"
        : progressPct >= 40
          ? "Active treatment"
          : "Early phase";

  return { goals, sessions, completed, total, progressPct, currentPhase };
}

function isExerciseCompleted(ex: TherapyExercise, sessions: TherapySessionRecord[]): boolean {
  const name = (ex.title ?? ex.name ?? "").trim().toLowerCase();
  const id = ex.id;
  return sessions.some((s) => {
    const done = s.exercisesCompleted ?? [];
    return done.some((c) => c === id || c.toLowerCase() === name);
  });
}

const THERAPY_PHASES = [
  { key: "start", label: "Getting started", hint: "Orientation & intake" },
  { key: "early", label: "Early phase", hint: "Building foundations" },
  { key: "active", label: "Active treatment", hint: "Core therapeutic work" },
  { key: "maintenance", label: "Maintenance", hint: "Sustaining progress" },
] as const;

function phaseState(
  phaseKey: (typeof THERAPY_PHASES)[number]["key"],
  progressPct: number,
  completedSessions: number,
): "done" | "active" | "upcoming" {
  if (completedSessions === 0) {
    return phaseKey === "start" ? "active" : "upcoming";
  }
  if (progressPct >= 80) {
    if (phaseKey === "maintenance") return "active";
    return "done";
  }
  if (progressPct >= 40) {
    if (phaseKey === "maintenance") return "upcoming";
    if (phaseKey === "active") return "active";
    return "done";
  }
  if (phaseKey === "early") return "active";
  if (phaseKey === "start") return "done";
  return "upcoming";
}

/* ── Layout primitives ───────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function DetailBlock({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="px-5 py-6 md:px-7 md:py-7">
      <h3 id={id} className="text-base font-semibold text-foreground mb-4">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ── Hero (single, top of page) ──────────────────────────────────────────── */

function TherapyPlanHero({ plan }: { plan: TherapyPlan }) {
  const statusLabel = planStatusLabel(plan.status);
  const type = planType(plan);
  const therapist = therapistName(plan);
  const started = startDate(plan);
  const ends = endDate(plan);
  const weeks = weeksRemaining(ends);
  const freq = plan.frequencyPerWeek ?? plan.frequency_per_week;
  const diagnosis = plan.diagnosis?.trim();
  const { completed, total, progressPct, currentPhase } = computePlanMetrics(plan);

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-700 p-6 md:p-8 text-primary-foreground shadow-md"
      aria-label="Therapy plan overview"
    >
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-primary-foreground" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <p className="text-sm font-medium text-primary-foreground/85 uppercase tracking-wide">
            Your therapy plan
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/25 text-xs font-normal gap-1">
              <Eye size={12} aria-hidden />
              View only
            </Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/25 text-sm font-normal">
              {statusLabel}
            </Badge>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{type}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-primary-foreground/90 mb-4">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-primary-foreground/80" aria-hidden />
            Phase: <span className="font-semibold">{currentPhase}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User size={14} className="shrink-0 text-primary-foreground/80" aria-hidden />
            {therapist}
          </span>
        </div>

        {diagnosis && (
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={14} className="shrink-0 text-primary-foreground/80" aria-hidden />
            <p className="text-sm text-primary-foreground/90">{diagnosis}</p>
          </div>
        )}

        {plan.description?.trim() && (
          <p className="text-sm text-primary-foreground/90 leading-relaxed max-w-2xl mb-5">
            {plan.description}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Start date", value: formatDate(started) },
            { label: "End date", value: formatDate(ends) },
            { label: "Sessions done", value: `${completed}${total > 0 ? ` / ${total}` : ""}` },
            { label: "Weeks left", value: weeks !== null ? String(weeks) : "—" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2.5"
            >
              <p className="text-xs text-primary-foreground/80 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-semibold mt-0.5 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-primary-foreground/90">Plan completion</span>
            <span className="font-semibold tabular-nums">{progressPct}%</span>
          </div>
          <div
            className="h-2.5 bg-primary-foreground/20 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Therapy plan completion"
          >
            <div
              className="h-full bg-primary-foreground rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {freq ? (
            <p className="text-sm text-primary-foreground/80 mt-2">{freq} sessions per week</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── Unified details section (below hero) ────────────────────────────────── */

function PlanInfoStrip({ plan }: { plan: TherapyPlan }) {
  const diagnosis = plan.diagnosis?.trim();
  const freq = plan.frequencyPerWeek ?? plan.frequency_per_week;
  const goals = planGoals(plan);

  const items = [
    {
      icon: <Stethoscope size={16} aria-hidden />,
      label: "Diagnosis",
      value: diagnosis || "Not specified",
      muted: !diagnosis,
    },
    {
      icon: <Clock size={16} aria-hidden />,
      label: "Frequency",
      value: freq ? `${freq} sessions / week` : "As scheduled",
      muted: !freq,
    },
    {
      icon: <Target size={16} aria-hidden />,
      label: "Goals",
      value: goals.length ? `${goals.length} treatment goal${goals.length === 1 ? "" : "s"}` : "None set yet",
      muted: goals.length === 0,
    },
    {
      icon: <User size={16} aria-hidden />,
      label: "Therapist",
      value: therapistName(plan),
      muted: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-5 pt-6 md:px-7">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1">
            {item.icon}
            {item.label}
          </p>
          <p className={cn("text-sm font-medium leading-snug", item.muted && "text-muted-foreground")}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function AssignedActivities({
  planId,
  exercises,
  files,
  sessions,
}: {
  planId: string;
  exercises: TherapyExercise[];
  files: TherapyFile[];
  sessions: TherapySessionRecord[];
}) {
  const actions = useMemo(() => {
    return exercises.map((ex) => ({
      key: `ex-${ex.id}`,
      title: ex.title ?? ex.name ?? "Assigned activity",
      description: ex.description?.trim() ?? "",
      type: getResourceType(ex),
      completed: isExerciseCompleted(ex, sessions),
      mediaUrl: ex.media_url,
      onOpen: ex.media_url
        ? () => window.open(ex.media_url!, "_blank", "noopener,noreferrer")
        : undefined,
    }));
  }, [exercises, sessions]);

  const fileActions = useMemo(() => {
    return files.map((f) => {
      const type: ResourceType =
        f.fileType === "video" ? "video" : f.fileType === "image" ? "guide" : "pdf";
      return {
        key: `file-${f.id}`,
        title: f.title ?? f.fileName,
        description: `${f.fileType} · ${f.uploadedBy}`,
        type,
        completed: false,
        onOpen: () => {
          void therapyService.openFile(planId, f).catch((err) => {
            toast.error(err instanceof Error ? err.message : "Could not open file.");
          });
        },
      };
    });
  }, [files, planId]);

  const display = [...actions, ...fileActions];

  if (display.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No assigned activities yet. Your therapist will add exercises, worksheets, and resources here.
      </p>
    );
  }

  const pending = display.filter((a) => !a.completed);
  const done = display.filter((a) => a.completed);
  const ordered = [...pending, ...done];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ordered.map(({ key, title, description, type, completed, onOpen }) => {
        const meta = RESOURCE_META[type];

        return (
          <article
            key={key}
            className={cn(
              "rounded-xl border p-4 flex flex-col gap-3 transition-colors",
              completed
                ? "bg-muted/20 border-border/60 opacity-80"
                : cn("shadow-sm", meta.tileBg),
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  meta.iconBg,
                )}
              >
                {type === "pdf" && key.startsWith("file-") ? (
                  <FileText size={18} aria-hidden />
                ) : type === "video" ? (
                  <Video size={18} aria-hidden />
                ) : (
                  meta.icon
                )}
              </div>
              {completed ? (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 size={12} className="mr-1" aria-hidden />
                  Done
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  To do
                </Badge>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  completed ? "text-muted-foreground line-through decoration-border" : "text-foreground",
                )}
              >
                {title}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{meta.label}</p>
              {description ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap break-words">
                  {description}
                </p>
              ) : null}
            </div>
            {onOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 mt-auto justify-start px-0 h-auto"
                onClick={onOpen}
              >
                {type === "video" ? (
                  <>
                    <Play size={14} aria-hidden />
                    Watch now
                  </>
                ) : type === "pdf" || type === "guide" ? (
                  <>
                    <Download size={14} aria-hidden />
                    Open resource
                  </>
                ) : (
                  <>
                    <ListTodo size={14} aria-hidden />
                    Open activity
                  </>
                )}
              </Button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function TherapyRoadmap({
  progressPct,
  completedSessions,
  currentPhase,
}: {
  progressPct: number;
  completedSessions: number;
  currentPhase: string;
}) {
  return (
    <div className="relative rounded-xl bg-muted/25 border border-border/50 px-4 py-5 md:px-6 md:py-6 overflow-x-auto">
      <p className="text-sm text-muted-foreground mb-5">
        You are in <span className="font-semibold text-foreground">{currentPhase}</span>
      </p>
      <ol className="flex min-w-[32rem] gap-0" aria-label="Therapy phase roadmap">
        {THERAPY_PHASES.map((phase, i) => {
          const state = phaseState(phase.key, progressPct, completedSessions);
          const isLast = i === THERAPY_PHASES.length - 1;

          return (
            <li key={phase.key} className="flex flex-1 items-start min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 z-10",
                    state === "done"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : state === "active"
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {state === "done" ? (
                    <CheckCircle2 size={16} aria-hidden />
                  ) : (
                    <Circle size={10} className={state === "active" ? "fill-current" : ""} aria-hidden />
                  )}
                </div>
                <div className="mt-3 text-center px-1 min-w-0 w-full">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
                      state === "active" ? "text-primary" : state === "done" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {phase.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{phase.hint}</p>
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mt-4 min-w-[1rem] -mx-1",
                    state === "done" ? "bg-emerald-400" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TherapyGoalsChecklist({
  goals,
  completedSessions,
}: {
  goals: string[];
  completedSessions: number;
}) {
  if (goals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No therapy goals defined for this plan yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {goals.map((goal, i) => {
        const completed = i < completedSessions;
        const progressPct = completed ? 100 : i === completedSessions ? 50 : 0;

        return (
          <li key={i} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                completed ? "text-emerald-600" : "text-muted-foreground",
              )}
              aria-hidden
            >
              {completed ? <CheckCircle2 size={18} /> : <Circle size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  completed
                    ? "text-muted-foreground line-through decoration-border"
                    : "text-foreground font-medium",
                )}
              >
                {goal}
              </p>
              {!completed && progressPct > 0 && (
                <div
                  className="mt-2 h-1.5 max-w-xs bg-muted rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal} progress`}
                >
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
              )}
              {completed && (
                <p className="text-xs text-emerald-700 font-medium mt-1">Goal reached</p>
              )}
              {!completed && i === completedSessions && (
                <p className="text-xs text-primary font-medium mt-1">Current focus</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TherapyPlanDetailsContent({
  plan,
  idPrefix = "therapy",
}: {
  plan: TherapyPlan;
  idPrefix?: string;
}) {
  const goals = planGoals(plan);
  const sessions = planSessions(plan);
  const exercises = planExercises(plan);
  const files = planFiles(plan);
  const therapist = therapistName(plan);
  const { completed, progressPct, currentPhase } = computePlanMetrics(plan);

  return (
    <>
      <PlanInfoStrip plan={plan} />
      <div className="divide-y divide-border/60">
        <DetailBlock title="Therapy roadmap" id={`${idPrefix}-roadmap`}>
          <TherapyRoadmap
            progressPct={progressPct}
            completedSessions={completed}
            currentPhase={currentPhase}
          />
        </DetailBlock>

        <DetailBlock title="Treatment goals" id={`${idPrefix}-goals`}>
          <div className="rounded-xl bg-muted/20 px-4 py-1 md:px-5">
            <TherapyGoalsChecklist goals={goals} completedSessions={completed} />
          </div>
        </DetailBlock>

        <DetailBlock title="Assigned activities & resources" id={`${idPrefix}-activities`}>
          <AssignedActivities
            planId={plan.id}
            exercises={exercises}
            files={files}
            sessions={sessions}
          />
        </DetailBlock>

        <DetailBlock title="Session history" id={`${idPrefix}-sessions`}>
          <PatientSessionHistory
            sessions={sessions}
            exercises={exercises}
            therapist={therapist}
          />
        </DetailBlock>
      </div>
    </>
  );
}

function TherapyPlanDetailsSection({ plan }: { plan: TherapyPlan }) {
  return (
    <section
      className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden"
      aria-label="Therapy plan details"
    >
      <div className="border-b border-border/60 bg-muted/15 px-5 py-4 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Plan details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Everything your care team has set up for you — read only
            </p>
          </div>
          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
            <Eye size={12} aria-hidden />
            No edits
          </Badge>
        </div>
      </div>

      <TherapyPlanDetailsContent plan={plan} />
    </section>
  );
}

function OtherPlanCard({ plan }: { plan: TherapyPlan }) {
  const [open, setOpen] = useState(false);
  const type = planType(plan);
  const status = planStatusLabel(plan.status);
  const therapist = therapistName(plan);
  const { completed, total } = computePlanMetrics(plan);

  return (
    <article className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{type}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {therapist} · {formatDate(startDate(plan))} – {formatDate(endDate(plan))}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {completed}{total > 0 ? `/${total}` : ""} sessions
          </span>
          <ChevronDown
            size={16}
            className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-border/60 bg-muted/10 overflow-hidden">
          <TherapyPlanDetailsContent plan={plan} idPrefix={`other-${plan.id}`} />
        </div>
      )}
    </article>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */

const TherapyPanel = () => {
  const { patientId, loading: profileLoading } = usePatientContext();
  const { plans, loading, error } = usePatientTherapyPlans(patientId, profileLoading);

  const primaryPlan = useMemo(() => pickPrimaryPlan(plans), [plans]);
  const otherPlans = useMemo(
    () => (primaryPlan ? plans.filter((p) => p.id !== primaryPlan.id) : []),
    [plans, primaryPlan],
  );

  if (profileLoading || loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading therapy plan">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!primaryPlan) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No therapy plans assigned yet. Your care team will set one up for you.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-4">
      <TherapyPlanHero plan={primaryPlan} />
      <TherapyPlanDetailsSection plan={primaryPlan} />

      {otherPlans.length > 0 && (
        <section aria-labelledby="other-plans-title">
          <SectionLabel>Other therapy plans</SectionLabel>
          <h2 id="other-plans-title" className="sr-only">
            Other therapy plans
          </h2>
          <div className="space-y-3">
            {otherPlans.map((plan) => (
              <OtherPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TherapyPanel;
