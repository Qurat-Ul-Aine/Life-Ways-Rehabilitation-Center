import { useEffect, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import EvaluationCard from "@/features/intern/components/EvaluationCard";
import { useEvaluations } from "@/features/intern/hooks/useEvaluations";
import { internService } from "@/features/intern/services/internService";
import { DashboardState } from "./DashboardState";

export default function EvaluationsSection() {
  const [internId, setInternId] = useState<string | undefined>();

  useEffect(() => {
    internService
      .getMe()
      .then((intern) => setInternId(intern.id))
      .catch(() => setInternId(undefined));
  }, []);

  const { items, loading, error } = useEvaluations(internId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Evaluations"
        subtitle="Mentor feedback and performance ratings from your internship."
      />
      <DashboardState>
        {() => (
          <>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading evaluations...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No evaluations yet. Your mentor will submit feedback as you progress.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((evaluation) => (
                  <EvaluationCard key={evaluation.id} evaluation={evaluation} />
                ))}
              </div>
            )}
          </>
        )}
      </DashboardState>
    </div>
  );
}
