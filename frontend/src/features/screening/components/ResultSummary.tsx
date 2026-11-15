import { Card, CardContent } from "@/components/ui/card";
import RiskBadge from "@/features/screening/components/RiskBadge";
import type { RiskLevel } from "@/features/screening/types/screening.types";

type Props = {
  score: number | null;
  riskLevel: RiskLevel | string | null;
};

export default function ResultSummary({ score, riskLevel }: Props) {
  return (
    <Card className="border-border bg-card shadow-sm text-center">
      <CardContent className="space-y-4 p-8">
        <p className="text-sm text-muted-foreground">Total Score</p>
        <p className="text-5xl font-bold text-primary">{score ?? 0}</p>
        <RiskBadge risk={riskLevel} className="text-sm" />
      </CardContent>
    </Card>
  );
}
