import {
  Activity,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecommendationTimelineStep } from "../recommendation.types";

type ConditionProgressTimelineProps = {
  steps: RecommendationTimelineStep[];
  variant?: "default" | "premium";
};

const STEP_ICONS: Record<string, LucideIcon> = {
  assessment: ClipboardCheck,
  doctor_selected: Stethoscope,
  appointment_booked: CalendarCheck,
  treatment_started: Activity,
  progress_updated: TrendingUp,
};

export default function ConditionProgressTimeline({
  steps,
  variant = "default",
}: ConditionProgressTimelineProps) {
  const completedCount = steps.filter((step) => step.completed).length;
  const progressPct = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {variant === "premium" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Journey progress</span>
            <span className="tabular-nums text-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <ol className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const Icon = STEP_ICONS[step.key] ?? ClipboardCheck;

          return (
            <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    "absolute left-[17px] top-9 h-[calc(100%-20px)] w-0.5 rounded-full",
                    step.completed ? "bg-primary/60" : "bg-border",
                  )}
                  aria-hidden
                />
              )}

              <span
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 shadow-sm",
                  step.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {step.completed ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    step.completed ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.step}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.completed ? "Completed" : "Pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
