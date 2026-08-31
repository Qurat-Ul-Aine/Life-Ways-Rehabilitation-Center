import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Users,
  Stethoscope,
  CalendarDays,
  UserCog,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  FileText,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import AdminHero from "@/components/layout/AdminHero";
import { useAuth } from "@/context/AuthContext";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import {
  adminService,
  type AdminRecentAppointment,
  type AdminRecentPatient,
} from "@/features/admin/services/adminService";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildWeeklyChart(appointments: AdminRecentAppointment[]) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const buckets: { day: string; appointments: number; dateKey: string }[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    buckets.push({
      day: DAY_LABELS[date.getDay()],
      appointments: 0,
      dateKey,
    });
  }

  const bucketByDate = new Map(buckets.map((bucket) => [bucket.dateKey, bucket]));

  appointments.forEach((appointment) => {
    if (!appointment.date) return;
    const bucket = bucketByDate.get(appointment.date);
    if (bucket) bucket.appointments += 1;
  });

  return buckets.map(({ day, appointments }) => ({ day, appointments }));
}

const chartConfig = {
  appointments: {
    label: "Appointments",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "—"
  );
}

function appointmentStatusVariant(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s === "completed") return "default" as const;
  if (s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function formatStatusLabel(status?: string) {
  const s = String(status ?? "scheduled").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function patientStatusVariant(status?: string) {
  if (status === "discharged") return "secondary" as const;
  return "default" as const;
}

function getPatientName(patient: AdminRecentPatient) {
  return patient.fullName ?? patient.name ?? "—";
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hospital } = useHospitalSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalStaff: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    pendingDoctors: 0,
  });
  const [recentPatients, setRecentPatients] = useState<AdminRecentPatient[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<AdminRecentAppointment[]>([]);
  const [weeklyAppointments, setWeeklyAppointments] = useState<AdminRecentAppointment[]>([]);

  useEffect(() => {
    adminService
      .getDashboardSummary()
      .then((data) => {
        setStats(data.stats);
        setRecentPatients(data.recentPatients);
        setRecentAppointments(data.recentAppointments);
        setWeeklyAppointments(data.weeklyAppointments);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  const weeklyChartData = useMemo(
    () => buildWeeklyChart(weeklyAppointments),
    [weeklyAppointments],
  );

  const activityFeed = useMemo(() => {
    const patientEvents = recentPatients.slice(0, 3).map((patient) => ({
      id: `patient-${patient.id}`,
      title: `${getPatientName(patient)} registered`,
      subtitle: patient.condition ?? "New patient record",
      time: "Recently",
    }));

    const appointmentEvents = recentAppointments.slice(0, 3).map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: `Appointment ${formatStatusLabel(appointment.status)}`,
      subtitle: `${appointment.patientName || "Patient"} with ${appointment.doctorName || "Doctor"}`,
      time: appointment.date ?? "Recently",
    }));

    return [...appointmentEvents, ...patientEvents].slice(0, 5);
  }, [recentPatients, recentAppointments]);

  const statCards = [
    {
      label: "Total Patients",
      value: stats.totalPatients,
      icon: Users,
      trend: stats.totalPatients > 0 ? "Active caseload" : "No records",
      trendUp: stats.totalPatients > 0,
      path: "/admin/patients",
    },
    {
      label: "Active Doctors",
      value: stats.totalDoctors,
      icon: Stethoscope,
      trend: stats.pendingDoctors > 0 ? `${stats.pendingDoctors} pending` : "All approved",
      trendUp: stats.pendingDoctors === 0,
      path: "/admin/doctors",
    },
    {
      label: "Total Staff",
      value: stats.totalStaff,
      icon: UserCog,
      trend: "Clinical support",
      trendUp: true,
      path: "/admin/staff",
    },
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: CalendarDays,
      trend: stats.todayAppointments > 0 ? "In progress today" : "No visits today",
      trendUp: stats.todayAppointments > 0,
      path: "/admin/appointments",
    },
    {
      label: "Total Appointments",
      value: stats.totalAppointments,
      icon: Activity,
      trend: "All time volume",
      trendUp: true,
      path: "/admin/appointments",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingDoctors,
      icon: TrendingUp,
      trend: stats.pendingDoctors > 0 ? "Action required" : "Up to date",
      trendUp: stats.pendingDoctors === 0,
      path: "/admin/doctors",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminHero
        eyebrow="Clinical operations"
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={`Monitor patients, appointments, and care team activity across ${hospital.hospitalName}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="border-primary-foreground/20 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
              onClick={() => navigate("/admin/appointments")}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Appointments
            </Button>
            <Button
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate("/admin/patients/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New patient
            </Button>
          </div>
        }
        stats={[
          { label: "Patients", value: loading ? "—" : stats.totalPatients, icon: Users },
          { label: "Doctors", value: loading ? "—" : stats.totalDoctors, icon: Stethoscope },
          { label: "Staff", value: loading ? "—" : stats.totalStaff, icon: UserCog },
          { label: "Today", value: loading ? "—" : stats.todayAppointments, icon: CalendarDays },
          { label: "Appointments", value: loading ? "—" : stats.totalAppointments, icon: Activity },
          { label: "Pending", value: loading ? "—" : stats.pendingDoctors, icon: TrendingUp },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="cursor-pointer border-border/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => navigate(card.path)}
          >
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {loading ? "—" : card.value}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                  {card.trendUp ? (
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-accent" />
                  )}
                  <span className={card.trendUp ? "text-primary" : "text-accent"}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Weekly Appointments</CardTitle>
            <CardDescription>Appointment volume over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Loading chart...
              </div>
            ) : (
              <ChartContainer className="h-64 w-full" config={chartConfig}>
                <BarChart data={weeklyChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="appointments"
                    fill="var(--color-appointments)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest patient and appointment events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : activityFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              activityFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Patients</CardTitle>
              <CardDescription>Latest admissions and active cases</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/patients")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading patients...</p>
            ) : recentPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPatients.map((patient) => {
                    const displayName = getPatientName(patient);
                    return (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/patients/${patient.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {patient.condition ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={patientStatusVariant(patient.status)}>
                            {patient.status ?? "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Appointments</CardTitle>
              <CardDescription>Upcoming and recent visits</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/admin/appointments")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading appointments...</p>
            ) : recentAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      className="cursor-pointer"
                      onClick={() => navigate("/admin/appointments")}
                    >
                      <TableCell className="font-medium">
                        {appointment.doctorName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {appointment.patientName || "—"}
                      </TableCell>
                      <TableCell>{appointment.date ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={appointmentStatusVariant(appointment.status)}>
                          {formatStatusLabel(appointment.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          <CardDescription>Common administrative workflows</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/admin/patients/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/doctors/add")}>
            <Stethoscope className="mr-2 h-4 w-4" />
            Add Doctor
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/staff/new")}>
            <UserCog className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/appointments")}>
            <CalendarDays className="mr-2 h-4 w-4" />
            View Appointments
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/therapy")}>
            <HeartPulse className="mr-2 h-4 w-4" />
            Therapy Plans
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/reports")}>
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
