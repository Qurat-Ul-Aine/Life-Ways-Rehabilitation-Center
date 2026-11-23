import { useEffect } from "react";
import { X, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfidenceBadge from "../components/ConfidenceBadge";
import RecoveryJourneyCard from "../components/RecoveryJourneyCard";
import RecommendationListItem from "../components/RecommendationListItem";
import type { GenerateRecommendationsResult } from "../recommendation.types";

type RecommendationDashboardProps = {
  open: boolean;
  onClose: () => void;
  result: GenerateRecommendationsResult | null;
  loading?: boolean;
};

export default function RecommendationDashboard({
  open,
  onClose,
  result,
  loading = false,
}: RecommendationDashboardProps) {
  useEffect(() => {
    if (!open) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const analysis = result?.analysis;
  const analysisId = analysis?.persisted?.id ?? null;
  const confidence =
    analysis?.confidenceScore
    ?? analysis?.persisted?.confidenceScore
    ?? null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommendation-results-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        aria-label="Close recommendations"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:w-full">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">
                AI Match Results
              </span>
            </div>
            <h2 id="recommendation-results-title" className="mt-1 text-xl font-bold sm:text-2xl">
              Your recommended doctors
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on your assessment and clinical profile alignment.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {analysis && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" aria-hidden />
                    <p className="text-sm font-semibold text-foreground">AI Analysis — Detected condition</p>
                    {confidence != null && <ConfidenceBadge score={confidence} />}
                  </div>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {analysis.conditionType}
                  </p>
                  {analysis.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">{analysis.summary}</p>
                  )}
                </div>
              )}

              {result?.recoveryJourney && result.recoveryJourney.length > 0 && (
                <RecoveryJourneyCard
                  milestones={result.recoveryJourney}
                  estimatedDuration={result.estimatedDuration}
                />
              )}

              {!result?.recommendations?.length ? (
                <div className="rounded-2xl border border-dashed border-border py-14 text-center">
                  <p className="font-medium text-foreground">No matching doctors found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your assessment details and submit again.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    Ranked list — best match first
                  </p>
                  <div className="space-y-4">
                    {result.recommendations.map((item, index) => (
                      <RecommendationListItem
                        key={item.id ?? `${item.doctorId}-${index}`}
                        recommendation={item}
                        clinicalAnalysis={analysis}
                        analysisId={analysisId}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
