import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FiltersBar from "@/features/reports-analytics/components/FiltersBar";
import ExportButtons from "@/features/reports-analytics/components/ExportButtons";
import ProgressChart from "@/features/reports-analytics/components/ProgressChart";
import ReportCards from "@/features/reports-analytics/components/ReportCards";
import SessionsTable from "@/features/reports-analytics/components/SessionsTable";
import ReportsErrorBanner from "@/features/reports-analytics/components/ReportsErrorBanner";
import { reportsService } from "@/features/reports-analytics/services/reports.service";
import { defaultDateRange, formatPercent } from "@/features/reports-analytics/utils/calculations";
import type { ReportFilters } from "@/features/reports-analytics/types/reports.types";

/** Doctor dashboard page — performance reports. */
export default function DoctorReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(defaultDateRange(30));
  const [applied, setApplied] = useState<ReportFilters>(defaultDateRange(30));

  const performanceQuery = useQuery({
    queryKey: ["reports", "doctor-self", applied],
    queryFn: () => reportsService.getDoctorPerformance(applied),
    staleTime: 0,
  });

  const therapyQuery = useQuery({
    queryKey: ["reports", "doctor-therapy", applied],
    queryFn: () => reportsService.getTherapyMonthly(applied),
    staleTime: 0,
  });

  const patientsQuery = useQuery({
    queryKey: ["reports", "doctor-patients", applied],
    queryFn: () => reportsService.getPatientPerformance(applied),
    staleTime: 0,
  });

  const me = performanceQuery.data?.doctors[0];
  const loading =
    performanceQuery.isLoading || therapyQuery.isLoading || patientsQuery.isLoading;
  const monthlyChartData = (therapyQuery.data?.monthly ?? []).map(({ month, completed }) => ({
    month,
    completed,
  }));

  const queryError =
    performanceQuery.error || therapyQuery.error || patientsQuery.error;

  if (queryError) {
    return (
      <div className="space-y-6">
        <ReportsErrorBanner message="Unable to load your performance reports. Ensure your doctor profile is linked to your account." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        onApply={() => setApplied({ ...filters })}
        loading={loading}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My Performance</h2>
          <p className="text-sm text-muted-foreground">
            Attendance, patient outcomes, and exportable summaries.
          </p>
        </div>
        <ExportButtons reportType="doctor" filters={applied} disabled={loading} />
      </div>

      <ReportCards
        loading={loading}
        items={[
          { label: "Assigned Sessions", value: me?.totalAssignedSessions ?? 0 },
          { label: "Completed", value: me?.completedSessions ?? 0 },
          { label: "Missed", value: me?.missedSessions ?? 0 },
          { label: "Attendance", value: me?.attendanceRate ?? 0, isPercent: true },
          { label: "Avg Rating", value: me?.averageFeedbackRating ?? 0 },
        ]}
        columns={5}
      />

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4 pt-4">
          <ProgressChart
            title="Monthly Therapy Sessions"
            data={monthlyChartData}
            dataKey="completed"
            xKey="month"
            variant="bar"
          />
          {me && (
            <Card className="rounded-xl">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Badge variant="secondary">Rank #{me.rank}</Badge>
                <span className="text-sm text-muted-foreground">
                  {me.feedbackCount} feedback review{me.feedbackCount !== 1 ? "s" : ""}
                </span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patients" className="pt-4">
          <SessionsTable
            title="Assigned Patients"
            rows={(patientsQuery.data?.patients ?? []).map((p) => ({
              id: p.patientId,
              label: p.patientName,
              total: p.totalSessions,
              completed: p.completedSessions,
              missed: p.missedSessions,
              attendanceRate: p.attendanceRate,
              progressPercent: p.progressPercent,
            }))}
          />
        </TabsContent>

        <TabsContent value="monthly" className="pt-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Monthly Therapy Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {(therapyQuery.data?.monthly ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No monthly data for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Missed</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {therapyQuery.data?.monthly.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right">{m.total}</TableCell>
                        <TableCell className="text-right">{m.completed}</TableCell>
                        <TableCell className="text-right">{m.missed}</TableCell>
                        <TableCell className="text-right">
                          {formatPercent(m.attendanceRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
