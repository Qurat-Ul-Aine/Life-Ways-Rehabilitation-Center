import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  UserRound,
  UserCheck,
  Video,
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDoctorDashboardContext } from "../hooks/DoctorDashboardContext";
import { doctorNotesPath, doctorPatientPath } from "../utils/routes";
import type {
  AppointmentApiRow,
  AppointmentFilterTab,
  AppointmentStatus,
  AppointmentTypeLabel,
  AppointmentsListResponse,
  DoctorAppointment,
  TherapyPlanApiRow,
  ActivePlanInfo,
} from "../types/doctor-appointments.types";

// ─── Status / type helpers ────────────────────────────────────────────────────

export const normalizeStatus = (raw: string): AppointmentStatus => {
  const value = raw.trim().toLowerCase().replace(/_/g, " ");

  if (value === "pending") return "pending";
  if (value === "confirmed") return "confirmed";
  if (value === "now" || value === "in progress") return "in_progress";
  if (value === "completed" || value === "done") return "completed";
  if (value === "cancelled") return "cancelled";
  if (value === "rescheduled") return "rescheduled";
  if (value === "missed" || value === "no show" || value === "no-show") return "missed";
  if (value === "scheduled" || value === "booked") return "pending";

  return "pending";
};

export const normalizeType = (
  mode: string | null,
  type: string | null,
): AppointmentTypeLabel => {
  const raw = (mode ?? type ?? "").trim().toLowerCase();
  if (raw === "telehealth" || raw === "online" || raw === "ONLINE".toLowerCase()) {
    return "Telehealth";
  }
  return "In Person";
};

export const statusLabel = (status: AppointmentStatus): string => {
  const labels: Record<AppointmentStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    rescheduled: "Rescheduled",
    missed: "Missed",
  };
  return labels[status];
};

export const statusBadgeVariant = (
  status: AppointmentStatus,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "completed":
    case "in_progress":
      return "default";
    case "confirmed":
      return "secondary";
    case "missed":
      return "destructive";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const formatDisplayTime = (time: string | null): string => {
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${period}`;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const isWithinSessionWindow = (date: string | null, startTime: string | null): boolean => {
  if (!date || !startTime || date !== todayIso()) return false;

  const match = startTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;

  const now = new Date();
  const appt = new Date();
  appt.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);

  const diffMs = Math.abs(now.getTime() - appt.getTime());
  return diffMs <= 30 * 60 * 1000;
};

export const resolveDisplayStatus = (appointment: DoctorAppointment): AppointmentStatus => {
  if (appointment.status === "pending" || appointment.status === "confirmed") {
    if (isWithinSessionWindow(appointment.date, appointment.startTime)) {
      return "in_progress";
    }
  }
  return appointment.status;
};

const mapApiAppointment = (row: AppointmentApiRow): DoctorAppointment => ({
  id: String(row.id),
  patientId: String(row.patientId),
  patientName: row.patientName || "Patient",
  program: row.serviceName ?? "—",
  date: row.date,
  startTime: row.startTime ?? row.time,
  type: normalizeType(row.mode, row.type),
  reason: row.reason ?? row.notes,
  status: normalizeStatus(row.status),
  meetingUrl: row.meetingUrl,
});

const buildActivePlanByPatient = (plans: TherapyPlanApiRow[]): Map<string, ActivePlanInfo> => {
  const map = new Map<string, ActivePlanInfo>();
  for (const plan of plans) {
    const patientId = String(plan.patient_id ?? plan.patientId ?? "");
    const status = String(plan.status ?? "ACTIVE").toUpperCase();
    if (!patientId || status !== "ACTIVE") continue;
    const name = plan.therapy_type ?? plan.title ?? "Therapy plan";
    map.set(patientId, { id: String(plan.id), name });
  }
  return map;
};

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load appointments.";
};

// ─── Filtering ────────────────────────────────────────────────────────────────

export const filterAppointments = (
  items: DoctorAppointment[],
  tab: AppointmentFilterTab,
): DoctorAppointment[] => {
  const today = todayIso();

  return items.filter((appointment) => {
    const status = resolveDisplayStatus(appointment);

    switch (tab) {
      case "today":
        return appointment.date === today;
      case "upcoming":
        return (
          appointment.date !== null &&
          appointment.date >= today &&
          status !== "completed" &&
          status !== "cancelled" &&
          status !== "missed"
        );
      case "completed":
        return status === "completed";
      case "cancelled":
        return status === "cancelled";
      default:
        return true;
    }
  });
};

export const computeAppointmentStats = (items: DoctorAppointment[]) => {
  const today = todayIso();

  return {
    total: items.length,
    today: items.filter((a) => a.date === today).length,
    upcoming: items.filter((a) => {
      const status = resolveDisplayStatus(a);
      return (
        a.date !== null &&
        a.date >= today &&
        status !== "completed" &&
        status !== "cancelled" &&
        status !== "missed"
      );
    }).length,
    completed: items.filter((a) => resolveDisplayStatus(a) === "completed").length,
  };
};

// ─── UI states ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function AppointmentsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Could not load appointments</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyAppointments() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground" />
      <p className="font-semibold text-foreground">No appointments found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        You have no appointments in this view. Check another filter or check back later.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { data: dashboardData, loading: contextLoading } = useDoctorDashboardContext();

  const doctorId = dashboardData?.profile?.id ?? null;

  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [planByPatient, setPlanByPatient] = useState<Map<string, ActivePlanInfo>>(new Map());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AppointmentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppointmentFilterTab>("all");

  const [rescheduleTarget, setRescheduleTarget] = useState<DoctorAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<DoctorAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [actionId, setActionId] = useState<string | null>(null);
  const [waitingPatients, setWaitingPatients] = useState<Set<string>>(new Set());

  const mergedAppointments = useMemo(
    () =>
      appointments.map((appointment) => ({
        ...appointment,
        status: statusOverrides[appointment.id] ?? appointment.status,
      })),
    [appointments, statusOverrides],
  );

  const stats = useMemo(
    () => computeAppointmentStats(mergedAppointments),
    [mergedAppointments],
  );

  const filteredAppointments = useMemo(
    () => filterAppointments(mergedAppointments, activeTab),
    [mergedAppointments, activeTab],
  );

  const fetchAppointments = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    setError(null);

    try {
      const [appointmentsRes, plansRes] = await Promise.all([
        api.get<AppointmentsListResponse>("/appointments", {
          params: { doctorId },
        }),
        api.get<{ items?: TherapyPlanApiRow[] }>("/therapy-plans", {
          params: { doctorId },
        }),
      ]);

      const rows = appointmentsRes.data?.items ?? [];
      setAppointments(rows.map(mapApiAppointment));
      setPlanByPatient(buildActivePlanByPatient(plansRes.data?.items ?? []));
      setStatusOverrides({});
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId) {
      void fetchAppointments();
    } else if (!contextLoading) {
      setLoading(false);
    }
  }, [doctorId, contextLoading, fetchAppointments]);

  // Socket.io connection for waiting room
  useEffect(() => {
    const socket = getSocket();

    // Join waiting rooms for all appointments
    if (doctorId && appointments.length > 0) {
      appointments.forEach((appointment) => {
        socket.emit("join-waiting-room", {
          appointmentId: appointment.id,
          userId: doctorId,
          role: "doctor",
        });
      });
    }

    socket.on("patient-waiting", ({ appointmentId }) => {
      setWaitingPatients((prev) => new Set(prev).add(appointmentId));
    });

    socket.on("patient-admitted", ({ appointmentId }) => {
      setWaitingPatients((prev) => {
        const next = new Set(prev);
        next.delete(appointmentId);
        return next;
      });
    });

    return () => {
      socket.off("patient-waiting");
      socket.off("patient-admitted");
    };
  }, [doctorId, appointments]);

  const handleAdmitPatient = (appointmentId: string, patientId: string) => {
    const socket = getSocket();
    socket.emit("admit-patient", { appointmentId, userId: patientId });

    setWaitingPatients((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });

    toast.success("Patient admitted. Joining session...");

    // Find the appointment and redirect to session
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (appointment?.meetingUrl) {
      setTimeout(() => {
        navigate(`/session/${appointmentId}`, { state: { meetingUrl: appointment.meetingUrl } });
      }, 1000);
    }
  };

  const patchLocalStatus = (id: string, status: AppointmentStatus) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  };

  const handleConfirm = async (appointment: DoctorAppointment) => {
    setActionId(appointment.id);
    try {
      const { data } = await api.post<AppointmentApiRow>(`/appointments/${appointment.id}/confirm`);
      const mapped = mapApiAppointment(data);
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointment.id ? mapped : item)),
      );
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[appointment.id];
        return next;
      });
      toast.success("Appointment confirmed.");
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (appointment: DoctorAppointment) => {
    setActionId(appointment.id);
    try {
      await api.patch(`/appointments/${appointment.id}`, { status: "completed" });
      patchLocalStatus(appointment.id, "completed");
      toast.success("Session marked as completed.");
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget) return;

    if (!rescheduleDate.trim() || !rescheduleTime.trim()) {
      toast.error("Date and time are required.");
      return;
    }
    if (!rescheduleReason.trim()) {
      toast.error("Please provide a reason for rescheduling.");
      return;
    }

    setIsRescheduling(true);
    try {
      // POST /appointments/:id/reschedule — date/time supported; reason is UI-only until backend stores it.
      await api.post(`/appointments/${rescheduleTarget.id}/reschedule`, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
        reason: rescheduleReason.trim(),
      });
      patchLocalStatus(rescheduleTarget.id, "rescheduled");
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === rescheduleTarget.id
            ? {
                ...appointment,
                date: rescheduleDate,
                startTime: rescheduleTime,
                status: "rescheduled",
              }
            : appointment,
        ),
      );
      toast.success("Appointment rescheduled.");
      setRescheduleTarget(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;

    if (!cancelReason.trim()) {
      toast.error("Cancellation reason is required.");
      return;
    }

    setIsCancelling(true);
    try {
      await api.post(`/appointments/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      patchLocalStatus(cancelTarget.id, "cancelled");
      toast.success("Appointment cancelled.");
      setCancelTarget(null);
      setCancelReason("");
    } catch (err) {
      toast.error(toErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const openReschedule = (appointment: DoctorAppointment) => {
    setRescheduleTarget(appointment);
    setRescheduleDate(appointment.date ?? "");
    setRescheduleTime(appointment.startTime ?? "");
    setRescheduleReason("");
  };

  if (contextLoading || (loading && !error)) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-7 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <TableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!doctorId) {
    return (
      <AppointmentsError
        message="Doctor profile not found. Please contact your administrator."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (error) {
    return <AppointmentsError message={error} onRetry={() => void fetchAppointments()} />;
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Appointments", value: stats.total },
          { label: "Today's Appointments", value: stats.today },
          { label: "Upcoming Appointments", value: stats.upcoming },
          { label: "Completed Appointments", value: stats.completed },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schedule table */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-3 px-4 pb-0 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Appointment Schedule
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => void fetchAppointments()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as AppointmentFilterTab)}
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="today" className="text-xs">
                Today
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">
                Completed
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-3">
          {filteredAppointments.length === 0 ? (
            <EmptyAppointments />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Program / Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => {
                    const displayStatus = resolveDisplayStatus(appointment);
                    const planInfo = planByPatient.get(appointment.patientId);
                    const planId = planInfo?.id;
                    const isTelehealth = appointment.type === "Telehealth";
                    const isBusy = actionId === appointment.id;
                    const isWaiting = waitingPatients.has(appointment.id);

                    // TODO: meetingUrl is null from GET /appointments until telehealth links are stored server-side.
                    const showJoin =
                      isTelehealth &&
                      displayStatus !== "completed" &&
                      displayStatus !== "cancelled" &&
                      Boolean(appointment.meetingUrl);

                    const showRejoin =
                      isTelehealth &&
                      displayStatus === "completed" &&
                      Boolean(appointment.meetingUrl);

                    const showConfirm = displayStatus === "pending";
                    const showReschedule =
                      displayStatus === "pending"
                      || displayStatus === "confirmed"
                      || displayStatus === "missed";
                    const showCancel =
                      displayStatus === "pending" || displayStatus === "confirmed";
                    const showComplete =
                      displayStatus === "confirmed"
                      || displayStatus === "in_progress"
                      || displayStatus === "missed";
                    const completeLabel = displayStatus === "missed"
                      ? "Mark Completed (late)"
                      : "Mark Completed";
                    const showNotes = displayStatus === "completed";

                    return (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {appointment.patientName}
                            {isWaiting && (
                              <Badge variant="default" className="text-[10px] bg-primary">
                                <UserCheck className="h-2.5 w-2.5 mr-1" />
                                Waiting
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appointment.program}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appointment.date ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDisplayTime(appointment.startTime)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge variant="outline">{appointment.type}</Badge>
                            {isTelehealth && (
                              planInfo ? (
                                <Badge
                                  variant="secondary"
                                  className="w-fit text-[10px] font-normal"
                                >
                                  Linked plan: {planInfo.name}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="w-fit text-[10px] font-normal border-amber-200 text-amber-700 bg-amber-50/50"
                                >
                                  No active plan
                                </Badge>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground">
                          {appointment.reason ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(displayStatus)}>
                            {statusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-[11px]"
                              onClick={() => navigate(doctorPatientPath(appointment.patientId))}
                            >
                              <UserRound className="h-3.5 w-3.5" />
                              View Patient
                            </Button>

                            {planId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-[11px]"
                                onClick={() => navigate(`/doctor/therapy/${planId}`)}
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                Treatment Plan
                              </Button>
                            ) : null}

                            {isWaiting && appointment.patientId ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 gap-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleAdmitPatient(appointment.id, appointment.patientId)}
                              >
                                <UserCheck className="h-3.5 w-3.5" aria-hidden />
                                Admit Patient
                              </Button>
                            ) : null}

                            {showJoin ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-[11px]"
                                onClick={() => {
                                  const socket = getSocket();
                                  console.log("Doctor joining session directly, also emitting admit-patient for:", appointment.id);
                                  socket.emit("admit-patient", { appointmentId: appointment.id, userId: appointment.patientId });
                                  navigate(`/session/${appointment.id}`, { state: { meetingUrl: appointment.meetingUrl } });
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Join Session
                              </Button>
                            ) : null}

                            {showRejoin ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-[11px]"
                                onClick={() => navigate(`/session/${appointment.id}`, { state: { meetingUrl: appointment.meetingUrl } })}
                              >
                                <Video className="h-3.5 w-3.5" />
                                Rejoin Session
                              </Button>
                            ) : null}

                            {showConfirm ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={isBusy}
                                onClick={() => void handleConfirm(appointment)}
                              >
                                Confirm
                              </Button>
                            ) : null}

                            {showReschedule ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => openReschedule(appointment)}
                              >
                                Reschedule
                              </Button>
                            ) : null}

                            {showCancel ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => {
                                  setCancelTarget(appointment);
                                  setCancelReason("");
                                }}
                              >
                                Cancel
                              </Button>
                            ) : null}

                            {showComplete ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={isBusy}
                                onClick={() => void handleComplete(appointment)}
                              >
                                {completeLabel}
                              </Button>
                            ) : null}

                            {showNotes ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() =>
                                  navigate(doctorNotesPath(appointment.patientId))
                                }
                              >
                                Add Notes
                              </Button>
                            ) : null}

                            {showRejoin && appointment.patientId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                onClick={() => navigate(`/patient/profile/${appointment.patientId}`)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View Profile
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule dialog */}
      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
      >
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose a new date and time for {rescheduleTarget?.patientName ?? "this patient"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time">Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-reason">Reason</Label>
              <Textarea
                id="reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Reason for rescheduling…"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRescheduleTarget(null)}
              disabled={isRescheduling}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleRescheduleSubmit()}
              disabled={isRescheduling}
            >
              {isRescheduling ? "Saving…" : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel Appointment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This action cannot be undone. Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation…"
              rows={3}
            />
          </div>

          <Separator />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={isCancelling}
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              onClick={() => void handleCancelSubmit()}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
