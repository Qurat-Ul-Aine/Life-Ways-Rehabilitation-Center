import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ClipboardList, Search, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { doctorPatientPath } from "../utils/routes";
import DoctorPatientScreeningResults from "@/dashboard/doctor/components/DoctorPatientScreeningResults";
import PortalAccountTypeBadge from "@/components/common/PortalAccountTypeBadge";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const recoveryBarColor = (pct: number) => {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
};

const statusLabel = (pct: number) => {
  if (pct >= 70) return "Good progress";
  if (pct >= 40) return "Active";
  return "Critical";
};

const statusVariant = (
  pct: number,
): "default" | "secondary" | "outline" | "destructive" => {
  if (pct >= 70) return "default";
  if (pct >= 40) return "secondary";
  return "destructive";
};

const formatLastSession = (date: string | null | undefined) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const PatientsPanel = () => {
  const { data, loading } = useDoctorDashboard();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const patients = Array.isArray(data?.patientRecovery) ? data.patientRecovery : [];

  const filtered = useMemo(
    () =>
      patients.filter((p) => {
        const q = search.toLowerCase();
        const name = String(p.name ?? "").toLowerCase();
        const condition = String(p.condition ?? "").toLowerCase();
        return name.includes(q) || condition.includes(q);
      }),
    [patients, search],
  );

  const criticalCount = patients.filter((p) => p.recoveryScore < 40).length;
  const activeCount = patients.filter(
    (p) => p.recoveryScore >= 40 && p.recoveryScore < 70,
  ).length;
  const goodCount = patients.filter((p) => p.recoveryScore >= 70).length;

  const enrichedPatients = useMemo(() => {
    const byId = new Map((data?.patients ?? []).map((p) => [p.id, p]));
    return filtered.map((p) => {
      const full = byId.get(p.id);
      return {
        ...p,
        program: full?.program ?? p.condition,
        lastSessionDate: full?.lastSessionDate ?? null,
        status: full?.status ?? statusLabel(p.recoveryScore),
      };
    });
  }, [filtered, data?.patients]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="mt-1 text-2xl font-bold text-destructive">
              {loading ? "—" : criticalCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Recovery below 40%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {loading ? "—" : activeCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Recovery 40–69%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Good Progress</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {loading ? "—" : goodCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Recovery 70% or above</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical alert */}
      {!loading && criticalCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">
              {criticalCount} patient{criticalCount !== 1 ? "s" : ""} need immediate attention
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Table */}
        <Card className="min-w-0 flex-1">
          <CardHeader className="px-4 pb-0 pt-4">
            <CardTitle className="text-sm font-semibold">My patient list</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : enrichedPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserX className="mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="text-sm text-muted-foreground">No patients found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Last session</TableHead>
                    <TableHead>Recovery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedPatients.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {p.initials || getInitials(p.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {p.name}
                              </p>
                              <PortalAccountTypeBadge type="patient" className="shrink-0" />
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.condition}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="font-normal">
                          {p.program || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {formatLastSession(p.lastSessionDate)}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="min-w-[7rem] space-y-1">
                          <p className="text-xs font-semibold text-foreground">
                            {p.recoveryScore}%
                          </p>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${recoveryBarColor(p.recoveryScore)}`}
                              style={{ width: `${Math.min(100, Math.max(0, p.recoveryScore))}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant={statusVariant(p.recoveryScore)} className="font-normal">
                          {statusLabel(p.recoveryScore)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${p.name}`}
                            onClick={() => navigate(doctorPatientPath(p.id))}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Notes for ${p.name}`}
                            onClick={() => navigate("/doctor/notes")}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Today&apos;s sessions</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-3xl font-bold text-foreground">
                {loading ? "—" : (data?.stats?.sessionsToday ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold">Quick search</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder="Search patients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Filter by name or condition
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <DoctorPatientScreeningResults />
    </div>
  );
};

export default PatientsPanel;
