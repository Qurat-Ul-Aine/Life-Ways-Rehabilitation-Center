import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScreeningCondition } from "@/features/screening/types/screening.types";
import { cn } from "@/lib/utils";

type Props = {
  condition: ScreeningCondition;
  selected: boolean;
  onSelect: () => void;
};

export default function ConditionCard({ condition, selected, onSelect }: Props) {
  return (
    <button type="button" onClick={onSelect} className="text-left">
      <Card
        className={cn(
          "h-full border-slate-800 bg-slate-900 transition hover:border-primary/50",
          selected && "border-primary ring-1 ring-primary"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">{condition.name}</CardTitle>
          {condition.description ? (
            <CardDescription className="text-slate-400">{condition.description}</CardDescription>
          ) : null}
        </CardHeader>
      </Card>
    </button>
  );
}
