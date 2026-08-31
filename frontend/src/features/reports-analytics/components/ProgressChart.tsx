import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ProgressChartProps<T extends object = object> {
  title: string;
  data: T[];
  dataKey: string;
  xKey: string;
  variant?: "line" | "bar";
  emptyMessage?: string;
}

const chartConfig = {
  value: { label: "Value", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export default function ProgressChart<T extends object = object>({
  title,
  data,
  dataKey,
  xKey,
  variant = "line",
  emptyMessage = "No data for the selected period.",
}: ProgressChartProps<T>) {
  const chartData = data.map((row) => {
    const record = row as Record<string, string | number | undefined>;
    return {
      ...record,
      value: Number(record[dataKey] ?? 0),
    };
  });

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            {variant === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
