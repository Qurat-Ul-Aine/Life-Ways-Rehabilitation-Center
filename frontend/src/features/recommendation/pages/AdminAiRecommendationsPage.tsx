import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  Percent,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import { useAdminRecommendationManagement } from "../hooks/useAdminRecommendationManagement";
import type { AdminRecommendationLogStatus } from "../recommendation.types";

const PAGE_SIZE = 10;

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function logStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  const key = status.toLowerCase();
  if (key.includes("appointment booked") || key.includes("appointment completed")) return "default";
  if (key.includes("doctor selected")) return "secondary";
  if (key.includes("appointment missed")) return "destructive";
  return "outline";
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: typeof Brain;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAiRecommendationsPage() {
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("all");
  const [status, setStatus] = useState<AdminRecommendationLogStatus>("all");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search,
      condition,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, condition, status, page],
  );

  const { data, loading, error, reload } = useAdminRecommendationManagement(query);
  const logs = data?.logs;
  const totalPages = logs?.totalPages ?? 1;

  return (
    <>
      <PageHeader
        eyebrow="AI & clinical intelligence"
        title="AI Recommendation Management"
        subtitle="Monitor AI assessments, doctor matches, and recommendation outcomes across the platform."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="py-6 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* Section 1 — AI Overview */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                title="Total recommendations"
                value={data?.overview.totalRecommendations ?? 0}
                icon={Sparkles}
              />
              <StatCard
                title="Recommendations this month"
                value={data?.overview.recommendationsThisMonth ?? 0}
                icon={CalendarDays}
              />
              <StatCard
                title="Active patients"
                value={data?.overview.activePatients ?? 0}
                hint="Patients with AI assessments"
                icon={Users}
              />
              <StatCard
                title="AI usage rate"
                value={`${data?.overview.aiUsageRate ?? 0}%`}
                hint="Patients using AI vs total patients"
                icon={Activity}
              />
            </>
          )}
        </div>
      </section>

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        {/* Section 2 — Top Recommended Doctors */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top recommended doctors
          </h2>
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="h-4 w-4 text-primary" />
                Highest match volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.topDoctors.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Avg score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topDoctors.map((doctor) => (
                        <TableRow key={doctor.doctorId}>
                          <TableCell className="font-medium">
                            <Link
                              to={`/admin/doctors/${doctor.doctorId}`}
                              className="hover:text-primary hover:underline"
                            >
                              {doctor.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doctor.specialization}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {doctor.recommendationCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {doctor.averageMatchScore}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No recommendation data yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3 — Most Common Conditions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Most common conditions
          </h2>
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Assessment trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : data?.commonConditions.length ? (
                <div className="space-y-3">
                  {data.commonConditions.map((row) => (
                    <div
                      key={row.condition}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{row.condition}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.assessmentCount} assessment{row.assessmentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="tabular-nums">
                        {row.recommendationCount} recommendations
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No condition data yet.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Section 4 — Recommendation Logs */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recommendation logs
        </h2>
        <Card className="border-border p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 pb-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by patient name"
                className="pl-9"
              />
            </div>
            <Select
              value={condition}
              onValueChange={(value) => {
                setPage(1);
                setCondition(value);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {(data?.filters.conditions ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setPage(1);
                setStatus(value as AdminRecommendationLogStatus);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="doctor_selected">Doctor selected</SelectItem>
                <SelectItem value="appointment_booked">Appointment booked</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-center">Doctors</TableHead>
                  <TableHead>Selected doctor</TableHead>
                  <TableHead className="text-right">Match score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 7 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : logs?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/admin/patients/${row.patientId}`}
                            className="hover:text-primary hover:underline"
                          >
                            {row.patientName}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={row.condition}>
                          {row.condition}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {row.recommendedDoctorsCount}
                        </TableCell>
                        <TableCell>{row.selectedDoctor ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.matchScore != null ? `${row.matchScore}%` : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={logStatusBadgeVariant(row.status)}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {!loading && !logs?.items.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No recommendation logs found.
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {logs?.items.length ?? 0} of {logs?.total ?? 0}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="self-center text-sm tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 5 — Recommendation Analytics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recommendation analytics
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recommendation success rate</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {loading ? "—" : `${data?.analytics.recommendationSuccessRate ?? 0}%`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assessments where a doctor was selected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Appointment conversion rate</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {loading ? "—" : `${data?.analytics.appointmentConversionRate ?? 0}%`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assessments leading to a booked appointment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Most successful categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              ) : data?.analytics.successfulCategories.length ? (
                <div className="space-y-2">
                  {data.analytics.successfulCategories.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{item.category}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No category data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
