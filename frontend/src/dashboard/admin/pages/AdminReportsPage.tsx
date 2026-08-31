import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import FiltersBar from "@/features/reports-analytics/components/FiltersBar";
import ExportButtons from "@/features/reports-analytics/components/ExportButtons";
import ReportCards from "@/features/reports-analytics/components/ReportCards";
import SessionsTable from "@/features/reports-analytics/components/SessionsTable";
import { reportsService } from "@/features/reports-analytics/services/reports.service";
import { defaultDateRange, formatPercent } from "@/features/reports-analytics/utils/calculations";
import type { ReportFilters } from "@/features/reports-analytics/types/reports.types";
import ReportsErrorBanner from "@/features/reports-analytics/components/ReportsErrorBanner";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import { adminService, type ReportsSummary } from "@/features/admin/services/adminService";
import TherapyReportsSection from "../components/TherapyReportsSection";
import FinancialReportsSection from "../components/FinancialReportsSection";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminReportsAnalytics() {
  const [filters, setFilters] = useState<ReportFilters>(defaultDateRange(30));
  const [applied, setApplied] = useState<ReportFilters>(defaultDateRange(30));

  const doctorQuery = useQuery({
    queryKey: ["reports", "doctors", applied],
    queryFn: () => reportsService.getDoctorPerformance(applied),
    staleTime: 0,
  });

  const patientQuery = useQuery({
    queryKey: ["reports", "patients", applied],
    queryFn: () => reportsService.getPatientPerformance(applied),
    staleTime: 0,
  });

  const therapyMonthlyQuery = useQuery({
    queryKey: ["reports", "therapy-monthly-overview", applied],
    queryFn: () => reportsService.getTherapyMonthly(applied),
    staleTime: 0,
  });

  const queryError =
    doctorQuery.error || patientQuery.error || therapyMonthlyQuery.error;

  return (
    <div className="space-y-6">
      {queryError && (
        <div className="mb-4">
          <ReportsErrorBanner
            message={
              queryError instanceof Error
                ? queryError.message
                : "Failed to load report data. Please check your connection and try again."
            }
          />
        </div>
      )}

      <div className="mb-6 space-y-4">
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onApply={() => setApplied({ ...filters })}
          showDoctor
          showPatient
        />

        <ReportCards
          loading={
            therapyMonthlyQuery.isLoading ||
            doctorQuery.isLoading
          }
          columns={3}
          items={[
            {
              label: "Therapy Sessions",
              value: therapyMonthlyQuery.data?.summary.total ?? 0,
            },
            {
              label: "Attendance Rate",
              value: therapyMonthlyQuery.data?.summary.attendanceRate ?? 0,
              isPercent: true,
            },
            {
              label: "Active Doctors",
              value: doctorQuery.data?.doctors.length ?? 0,
            },
          ]}
        />
      </div>

      <Tabs defaultValue="therapy">
        <TabsList className="flex-wrap">
          <TabsTrigger value="therapy">Therapy</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="therapy" className="pt-6">
          <TherapyReportsSection filters={applied} />
        </TabsContent>

        <TabsContent value="doctors" className="space-y-4 pt-6">
          <div className="flex justify-end">
            <ExportButtons reportType="doctor" filters={applied} />
          </div>
          <ReportCards
            loading={doctorQuery.isLoading}
            items={[
              {
                label: "Assigned Sessions",
                value: doctorQuery.data?.summary.totalAssignedSessions ?? 0,
              },
              {
                label: "Completed",
                value: doctorQuery.data?.summary.completedSessions ?? 0,
              },
              {
                label: "Missed",
                value: doctorQuery.data?.summary.missedSessions ?? 0,
              },
              {
                label: "Avg Rating",
                value: doctorQuery.data?.summary.averageFeedbackRating ?? 0,
              },
            ]}
          />
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Doctor Performance Ranking</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {(doctorQuery.data?.doctors ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No doctor performance data for this period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorQuery.data?.doctors.map((d) => (
                      <TableRow key={d.doctorId}>
                        <TableCell>#{d.rank}</TableCell>
                        <TableCell className="font-medium">{d.doctorName}</TableCell>
                        <TableCell>{d.specialization ?? "—"}</TableCell>
                        <TableCell className="text-right">{d.totalAssignedSessions}</TableCell>
                        <TableCell className="text-right">{d.completedSessions}</TableCell>
                        <TableCell className="text-right">
                          {formatPercent(d.attendanceRate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.averageFeedbackRating.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4 pt-6">
          <div className="flex justify-end">
            <ExportButtons reportType="patient" filters={applied} />
          </div>
          <ReportCards
            loading={patientQuery.isLoading}
            items={[
              { label: "Patients", value: patientQuery.data?.summary.patientCount ?? 0 },
              {
                label: "Avg Progress",
                value: patientQuery.data?.summary.progressPercent ?? 0,
                isPercent: true,
              },
              {
                label: "Attendance",
                value: patientQuery.data?.summary.attendanceRate ?? 0,
                isPercent: true,
              },
              { label: "Sessions", value: patientQuery.data?.summary.totalSessions ?? 0 },
            ]}
          />
          <SessionsTable
            title="Patient Performance"
            rows={(patientQuery.data?.patients ?? []).map((p) => ({
              id: p.patientId,
              label: p.patientName,
              extra: p.assignedDoctor?.name ?? undefined,
              total: p.totalSessions,
              completed: p.completedSessions,
              missed: p.missedSessions,
              attendanceRate: p.attendanceRate,
              progressPercent: p.progressPercent,
            }))}
          />
        </TabsContent>

        <TabsContent value="financial" className="pt-6">
          <FinancialReportsSection filters={applied} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminReportsOverview() {
  const { hospital } = useHospitalSettings();
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getReportsSummary()
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load reports."))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      [`${hospital.hospitalName} — Admin Report`],
      ["Generated", data.generatedAt],
      [],
      ["Patients by status"],
      ["Status", "Count"],
      ...data.patientsByStatus.map((r) => [r.status, String(r.count)]),
      [],
      ["Appointments by status"],
      ["Status", "Count"],
      ...data.appointmentsByStatus.map((r) => [r.status, String(r.count)]),
      [],
      ["Doctors by specialization"],
      ["Specialization", "Count"],
      ...data.doctorsBySpecialization.map((r) => [r.specialization, String(r.count)]),
      [],
      ["Screenings by risk"],
      ["Risk level", "Count"],
      ...data.screeningsByRisk.map((r) => [r.riskLevel, String(r.count)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeways-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Operational analytics across patients, appointments, and care programs"
        action={
          <Button onClick={exportCsv} disabled={!data}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      ) : !data ? (
        <p className="text-sm text-destructive">Could not load report data.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock label="Therapy plans" value={data.therapyPlans} />
            <StatBlock label="Active prescriptions" value={data.activePrescriptions} />
            <StatBlock
              label="Total patients"
              value={data.patientsByStatus.reduce((s, r) => s + r.count, 0)}
            />
            <StatBlock
              label="Total appointments"
              value={data.appointmentsByStatus.reduce((s, r) => s + r.count, 0)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patients by status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.patientsByStatus.map((row) => (
                  <div key={row.status} className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{row.status}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appointments by status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.appointmentsByStatus.map((row) => (
                  <div key={row.status} className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{row.status}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Doctors by specialization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.doctorsBySpecialization.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No specialization data.</p>
                ) : (
                  data.doctorsBySpecialization.map((row) => (
                    <div key={row.specialization} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.specialization}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Screenings by risk level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.screeningsByRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No screening data.</p>
                ) : (
                  data.screeningsByRisk.map((row) => (
                    <div key={row.riskLevel} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{row.riskLevel}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Report metadata</CardTitle>
                  <CardDescription>
                    Generated {new Date(data.generatedAt).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
}

/** Admin dashboard page — operational summary and analytics exports. */
export default function AdminReportsPage() {
  return (
    <Tabs defaultValue="analytics" className="space-y-6">
      <TabsList>
        <TabsTrigger value="analytics">Analytics & Exports</TabsTrigger>
        <TabsTrigger value="overview">Operational Overview</TabsTrigger>
      </TabsList>
      <TabsContent value="analytics">
        <AdminReportsAnalytics />
      </TabsContent>
      <TabsContent value="overview">
        <AdminReportsOverview />
      </TabsContent>
    </Tabs>
  );
}
