import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { riskBadgeVariant } from "@/features/screening/utils/risk";
import type { PatientScreeningHistoryItem } from "@/features/screening/types/screening.types";

type RecentScreeningsPanelProps = {
  history: PatientScreeningHistoryItem[];
};

/** Patient dashboard panel — screening history list. */
export default function RecentScreeningsPanel({ history }: RecentScreeningsPanelProps) {
  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="px-4 pb-0 pt-4">
        <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <ClipboardList size={14} />
          Screening history
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-3">
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No history yet.</p>
        ) : (
          history.map((r) => (
            <div
              key={r.id}
              className="grid items-center border-b border-border/50 py-2.5 text-[11px] last:border-none"
              style={{ gridTemplateColumns: "0.8fr 1fr 0.7fr 0.6fr 0.8fr" }}
            >
              <span className="text-muted-foreground">
                {r.testDate ? String(r.testDate).slice(5, 10) : "—"}
              </span>
              <span className="font-medium text-foreground">{r.condition}</span>
              <span className="font-semibold text-foreground">{r.score ?? "—"}</span>
              <Badge variant={riskBadgeVariant(String(r.riskLevel))} className="w-fit text-[10px] capitalize">
                {r.riskLevel ?? "—"}
              </Badge>
              <Button asChild variant="link" className="h-auto p-0 text-[11px]">
                <Link to={SCREENING_ROUTES.result(r.id)}>View result</Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
