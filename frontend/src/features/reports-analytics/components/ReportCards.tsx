import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { attendanceColor, formatCurrency, formatPercent } from "../utils/calculations";

export interface ReportCardItem {
  label: string;
  value: string | number;
  hint?: string;
  isPercent?: boolean;
  isCurrency?: boolean;
}

interface ReportCardsProps {
  items: ReportCardItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 5;
}

export default function ReportCards({ items, loading, columns = 4 }: ReportCardsProps) {
  const gridClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : columns === 5
          ? "sm:grid-cols-2 lg:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-4";

  if (loading) {
    return (
      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {items.map((item) => {
        let display = String(item.value);
        if (item.isCurrency && typeof item.value === "number") {
          display = formatCurrency(item.value);
        } else if (item.isPercent && typeof item.value === "number") {
          display = formatPercent(item.value);
        }

        const valueClass =
          item.isPercent && typeof item.value === "number"
            ? attendanceColor(item.value)
            : "text-foreground";

        return (
          <Card key={item.label} className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${valueClass}`}>{display}</p>
              {item.hint && (
                <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
