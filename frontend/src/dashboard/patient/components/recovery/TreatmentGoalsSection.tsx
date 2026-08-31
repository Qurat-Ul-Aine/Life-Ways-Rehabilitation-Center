import { CheckCircle2, Circle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TreatmentGoal, TreatmentGoalStatus } from "@/features/patient/patient.types";
import RecoveryEmptyState from "./RecoveryEmptyState";

const formatDate = (raw?: string | null) => {
  if (!raw) return null;
  const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
};

const statusHint = (status: TreatmentGoalStatus) => {
  if (status === "Completed") return "Completed";
  if (status === "At Risk") return "Needs attention";
  return null;
};

type Props = {
  goals: TreatmentGoal[];
  loading: boolean;
};

export default function TreatmentGoalsSection({ goals, loading }: Props) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-12 w-full rounded-lg" />
          </li>
        ))}
      </ul>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="py-4">
        <Target className="h-7 w-7 text-muted-foreground/40 mb-2" aria-hidden />
        <RecoveryEmptyState
          message="No treatment goals defined yet. Your care team will add goals to your active therapy plan."
          align="left"
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {goals.map((goal) => {
        const completed = goal.status === "Completed";
        const atRisk = goal.status === "At Risk";
        const hint = statusHint(goal.status);
        const targetDate = formatDate(goal.expectedCompletionDate);

        return (
          <li key={goal.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                completed
                  ? "text-emerald-600"
                  : atRisk
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
              aria-hidden
            >
              {completed ? <CheckCircle2 size={18} /> : <Circle size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    completed
                      ? "text-muted-foreground line-through decoration-border"
                      : "text-foreground font-medium",
                  )}
                >
                  {goal.name}
                </p>
                {hint && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      atRisk ? "text-amber-700" : "text-emerald-700",
                    )}
                  >
                    {hint}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {goal.currentProgressPct}% of {goal.targetPct}%
                </span>
                {targetDate && !completed && (
                  <span className="text-sm text-muted-foreground">Target {targetDate}</span>
                )}
              </div>
              {!completed && (
                <div
                  className="mt-2 h-1.5 max-w-xs bg-muted rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={goal.currentProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={goal.targetPct}
                  aria-label={`${goal.name} progress`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      atRisk ? "bg-amber-500" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, goal.currentProgressPct)}%` }}
                  />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
