import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  Flag,
  Route,
  Sparkles,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecoveryJourneyMilestone } from "../recommendation.types";

type RecoveryJourneyCardProps = {
  milestones: RecoveryJourneyMilestone[];
  estimatedDuration?: string | null;
  className?: string;
};

const MILESTONE_ICONS: LucideIcon[] = [
  ClipboardCheck,
  Stethoscope,
  Activity,
  TrendingUp,
  Flag,
];

const DISCLAIMER =
  "This recovery journey is an AI-generated estimate and is not medical advice.";

export default function RecoveryJourneyCard({
  milestones,
  estimatedDuration,
  className,
}: RecoveryJourneyCardProps) {
  if (!milestones.length) return null;

  const durationLabel = estimatedDuration?.trim() || "Personalised timeline";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm",
        className,
      )}
      aria-labelledby="recovery-journey-title"
    >
      <div className="border-b border-primary/10 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Route className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">
                AI Recovery Journey Predictor
              </span>
              <Sparkles className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </div>
            <h3 id="recovery-journey-title" className="text-lg font-bold text-foreground sm:text-xl">
              Your expected recovery roadmap
            </h3>
            <p className="text-sm text-muted-foreground">
              Personalised milestones based on your condition, symptoms, and treatment path.
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 gap-1.5 border-primary/25 bg-primary/5 text-primary"
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {durationLabel}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Journey milestones</span>
            <span className="tabular-nums text-foreground">
              {milestones.length} steps
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.min(100, milestones.length * 18)}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="space-y-0 px-5 py-5 sm:px-6">
        {milestones.map((milestone, index) => {
          const isLast = index === milestones.length - 1;
          const Icon = MILESTONE_ICONS[index % MILESTONE_ICONS.length];

          return (
            <li key={`${milestone.timeframe}-${milestone.title}`} className="relative flex gap-4 pb-7 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[17px] top-9 h-[calc(100%-16px)] w-0.5 rounded-full bg-primary/25"
                  aria-hidden
                />
              )}

              <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary shadow-sm">
                <Icon className="h-4 w-4" aria-hidden />
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                    {milestone.timeframe}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground">{milestone.title}</p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {milestone.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-primary/10 bg-muted/30 px-5 py-3 sm:px-6">
        <p className="text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </section>
  );
}
