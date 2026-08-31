import { Card, CardContent } from "@/components/ui/card";

type StatItem = {
  label: string;
  value: string | number;
};

type StatisticsCardsProps = {
  stats: StatItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
};

export default function StatisticsCards({
  stats,
  loading = false,
  columns = 4,
}: StatisticsCardsProps) {
  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{loading ? "—" : stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
