import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FiltersBar from "@/features/reports-analytics/components/FiltersBar";
import ExportButtons from "@/features/reports-analytics/components/ExportButtons";
import ProgressChart from "@/features/reports-analytics/components/ProgressChart";
import ReportCards from "@/features/reports-analytics/components/ReportCards";
import { reportsService } from "@/features/reports-analytics/services/reports.service";
import { defaultDateRange } from "@/features/reports-analytics/utils/calculations";
import type { ReportFilters } from "@/features/reports-analytics/types/reports.types";

/** Patient dashboard page — therapy reports. */
export default function PatientReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>(defaultDateRange(90));
  const [applied, setApplied] = useState<ReportFilters>(defaultDateRange(90));

  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "patient-self", applied],
    queryFn: () => reportsService.getPatientPerformance(applied),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const therapyQuery = useQuery({
    queryKey: ["reports", "patient-therapy", applied],
    queryFn: () => reportsService.getTherapyMonthly(applied),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const me = data?.patients[0];

  if (error) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-6 text-sm text-destructive">
          Unable to load your reports. Please try again later.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        onApply={() => setApplied({ ...filters })}
        loading={isLoading}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">My Therapy Reports</h2>
          <p className="text-[11px] text-muted-foreground">Progress, milestones, and session history.</p>
        </div>
        <ExportButtons reportType="patient" filters={applied} disabled={isLoading} />
      </div>

      <ReportCards
        loading={isLoading}
        columns={4}
        items={[
          { label: "Progress", value: me?.progressPercent ?? 0, isPercent: true },
          { label: "Attendance", value: me?.attendanceRate ?? 0, isPercent: true },
          { label: "Completed Sessions", value: me?.completedSessions ?? 0 },
          {
            label: "Milestones",
            value: `${me?.milestones.achieved ?? 0}/${me?.milestones.total ?? 0}`,
          },
        ]}
      />

      {me?.assignedDoctor && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Assigned Doctor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{me.assignedDoctor.name}</p>
            <p className="text-muted-foreground">{me.assignedDoctor.specialization}</p>
            <p className="text-xs text-muted-foreground">{me.assignedDoctor.email}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="results">Therapy Results</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="pt-4">
          <ProgressChart
            title="Monthly Progress"
            data={(therapyQuery.data?.monthly ?? []).map((m) => ({
              month: m.month,
              progressPercent: m.progressPercent,
            }))}
            dataKey="progressPercent"
            xKey="month"
          />
        </TabsContent>

        <TabsContent value="milestones" className="pt-4">
          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-4">
              {(me?.milestones.items ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No milestones recorded yet.
                </p>
              ) : (
                me?.milestones.items.map((item, i) => (
                  <div
                    key={`${item}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Achieved
                    </Badge>
                    <span className="text-sm">{item}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="pt-4">
          <Card className="rounded-2xl">
            <CardContent className="overflow-x-auto p-0">
              {(me?.therapyResultsSummary ?? []).length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No therapy outcomes recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Pain Level</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {me?.therapyResultsSummary.map((r, i) => (
                      <TableRow key={`${r.date}-${i}`}>
                        <TableCell>
                          {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>{r.outcome ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.painLevel ?? "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card className="rounded-2xl">
            <CardContent className="overflow-x-auto p-0">
              {(me?.sessionHistory ?? []).length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No sessions in this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Pain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {me?.sessionHistory.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.date ? new Date(s.date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>{s.status ?? "—"}</TableCell>
                        <TableCell>{s.attendance ?? "—"}</TableCell>
                        <TableCell>{s.outcome ?? "—"}</TableCell>
                        <TableCell className="text-right">{s.painLevel ?? "—"}</TableCell>
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
