import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import PageHeader from "@/components/common/PageHeader";
import { screeningService } from "@/features/screening/services/screeningService";
import { ADMIN_SCREENING_ROUTES } from "@/dashboard/admin/utils/screeningRoutes";
import type { AdminScreeningAnalytics, AdminScreeningStats } from "@/features/screening/types/screening.types";

const trendConfig = {
  count: { label: "Screenings", color: "hsl(var(--primary))" },
  highRisk: { label: "High Risk", color: "hsl(var(--destructive))" },
} satisfies ChartConfig;

const chartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
  averageScore: { label: "Avg Score", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

/** Admin dashboard page — screening analytics. */
export default function ScreeningAnalyticsPage() {
  const [stats, setStats] = useState<AdminScreeningStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminScreeningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([screeningService.getAdminStats(), screeningService.getAdminAnalytics()])
      .then(([s, a]) => {
        setStats(s);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Analytics"
        subtitle="Live trends and distributions from screening records."
        action={
          <Button asChild variant="outline">
            <Link to={ADMIN_SCREENING_ROUTES.list}>View Records</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Screening Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[280px] w-full">
              <LineChart data={analytics?.trends ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />
                <Line type="monotone" dataKey="highRisk" stroke="var(--color-highRisk)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condition Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats?.conditionDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Score by Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={analytics?.averageScoreByCondition ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" tick={{ fontSize: 11 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats?.riskDistribution ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="riskLevel" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
