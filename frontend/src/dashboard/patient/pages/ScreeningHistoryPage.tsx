import { Skeleton } from "@/components/ui/skeleton";
import { useScreeningHistory } from "@/features/screening/hooks/useScreeningHistory";
import TakeScreeningPanel from "../panels/TakeScreeningPanel";
import RecentScreeningsPanel from "../panels/RecentScreeningsPanel";

/** Patient dashboard page — composes screening panels. */
export default function ScreeningHistoryPage() {
  const { history, loading } = useScreeningHistory();

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Screening & Assessment</h2>
        <p className="text-sm text-muted-foreground">
          Start a confidential screening, review your history, and view recommendations.
        </p>
      </div>

      <TakeScreeningPanel history={history} />
      <RecentScreeningsPanel history={history} />
    </div>
  );
}
