import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  score: number;
  className?: string;
};

export default function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const tone =
    pct >= 80 ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
    : pct >= 65 ? "bg-primary/10 text-primary border-primary/20"
    : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";

  return (
    <Badge variant="outline" className={cn("text-xs font-semibold", tone, className)}>
      {pct}% confidence
    </Badge>
  );
}
