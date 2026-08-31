import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExportButtons from "@/features/reports-analytics/components/ExportButtons";
import ProgressChart from "@/features/reports-analytics/components/ProgressChart";
import ReportCards from "@/features/reports-analytics/components/ReportCards";
import SessionsTable from "@/features/reports-analytics/components/SessionsTable";
import { reportsService } from "@/features/reports-analytics/services/reports.service";
import type { ReportFilters } from "@/features/reports-analytics/types/reports.types";

export default function TherapyReportsSection({
  filters = {},
  showExports = true,
}: {
  filters?: ReportFilters;
  showExports?: boolean;
}) {
  const dailyQuery = useQuery({
    queryKey: ["reports", "therapy-daily", filters],
    queryFn: () => reportsService.getTherapyDaily(filters),
    staleTime: 0,
  });

  const monthlyQuery = useQuery({
    queryKey: ["reports", "therapy-monthly", filters],
    queryFn: () => reportsService.getTherapyMonthly(filters),
    staleTime: 0,
  });

  const loading = dailyQuery.isLoading || monthlyQuery.isLoading;
  const error = dailyQuery.error || monthlyQuery.error;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load therapy reports. Please adjust filters and try again.
      </div>
    );
  }

  const daily = dailyQuery.data;
  const monthly = monthlyQuery.data;

  return (
    <div className="space-y-6">
      {showExports && (
        <div className="flex flex-wrap justify-end gap-2">
          <ExportButtons reportType="therapy-daily" filters={filters} disabled={loading} label="Daily" />
          <ExportButtons reportType="therapy-monthly" filters={filters} disabled={loading} label="Monthly" />
        </div>
      )}

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="patients">By Patient</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4 pt-4">
          <ReportCards
            loading={loading}
            items={[
              { label: "Total Sessions", value: daily?.summary.total ?? 0 },
              { label: "Completed", value: daily?.summary.completed ?? 0 },
              { label: "Missed", value: daily?.summary.missed ?? 0 },
              { label: "Cancelled", value: daily?.summary.cancelled ?? 0 },
              { label: "Attendance Rate", value: daily?.summary.attendanceRate ?? 0, isPercent: true },
              { label: "Progress", value: daily?.summary.progressPercent ?? 0, isPercent: true },
            ]}
            columns={3}
          />
        </TabsContent>

        <TabsContent value="daily" className="space-y-4 pt-4">
          <ProgressChart
            title="Daily Session Volume"
            data={daily?.daily ?? []}
            dataKey="completed"
            xKey="date"
            variant="bar"
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 pt-4">
          <ProgressChart
            title="Monthly Attendance Rate"
            data={monthly?.monthly ?? []}
            dataKey="attendanceRate"
            xKey="month"
          />
        </TabsContent>

        <TabsContent value="patients" className="pt-4">
          <SessionsTable
            title="Patient-wise Breakdown"
            rows={(daily?.patientBreakdown ?? []).map((p) => ({
              id: p.patientId,
              label: p.patientName,
              extra: p.doctorName ?? undefined,
              total: p.total,
              completed: p.completed,
              missed: p.missed,
              cancelled: p.cancelled,
              attendanceRate: p.attendanceRate,
              progressPercent: p.progressPercent,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
