import { Badge } from "@/components/ui/badge";
import { riskBadgeVariant, riskLabel } from "@/features/screening/utils/risk";
import type { RiskLevel } from "@/features/screening/types/screening.types";

type Props = {
  risk: RiskLevel | string | null;
  className?: string;
};

export default function RiskBadge({ risk, className }: Props) {
  return (
    <Badge variant={riskBadgeVariant(risk)} className={className}>
      {riskLabel(risk)}
    </Badge>
  );
}
