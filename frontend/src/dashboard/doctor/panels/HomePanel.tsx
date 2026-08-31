import { useMemo, type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  Stethoscope,
  UserRound,
  Users,
  Video,
  XCircle,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { doctorNotesPath, doctorPatientPath } from "../utils/routes";
import { getSocket } from "@/lib/socket";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  PatientAlert,
  RecentActivityItem,
  TodayScheduleItem,
} from "../types/doctor-dashboard.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isTelehealth = (type: string): boolean => {
  const t = type.toLowerCase();
  return t === "telehealth" || t === "online";
};

const scheduleStatusLabel = (status: string): string => {
  switch (status) {
    case "Now":
      return "In Progress";
    case "Pending":
      return "Scheduled";
    case "Confirmed":
      return "Confirmed";
    case "Missed":
      return "Missed";
    case "NeedsReview":
      return "Time missing";
    case "Done":
      return "Completed";
    default:
      return status;
  }
};

const scheduleStatusVariant = (
  status: string,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "Done":
      return "secondary";
    case "Now":
      return "default";
    case "Confirmed":
      return "secondary";
    case "Missed":
      return "destructive";
    case "NeedsReview":
      return "outline";
    case "Pending":
      return "outline";
    default:
      return "outline";
  }
};

const scheduleStatusClass = (status: string): string => {
  if (status === "Missed") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "NeedsReview") return "border-amber-300 bg-amber-50 text-amber-800";
  return "";
};

const PROGRAM_LABELS = {
  psychotic: "Psychotic Program",
  drug: "Drug Rehabilitation",
  littleSoul: "Little Soul Project",
} as const;

type AttentionCategory = "missed" | "pending_note" | "low_progress" | "high_risk" | "critical" | "needs_review";

type AttentionItem = {
  id: string;
  patientId: string;
  name: string;
  message: string;
  category: AttentionCategory;
};

const attentionMeta: Record<
  AttentionCategory,
  { label: string; icon: ReactNode; className: string }
> = {
  missed: {
    label: "Missed Sessions",
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  needs_review: {
    label: "Needs Review",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  pending_note: {
    label: "Pending Notes",
    icon: <FileText className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-accent/10 text-accent border-accent/20",
  },
  low_progress: {
    label: "Low Progress",
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-secondary text-secondary-foreground border-border",
  },
  critical: {
    label: "High Risk",
    icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  high_risk: {
    label: "High Risk",
    icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const formatActivityTime = (timestamp: string): string => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) {
    return d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
};

const activityIcon = (type: string): ReactNode => {
  switch (type) {
    case "session_completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />;
    case "note_added":
      return <FileText className="h-3.5 w-3.5 text-accent" aria-hidden />;
    case "assessment_completed":
      return <ClipboardList className="h-3.5 w-3.5 text-secondary-foreground" aria-hidden />;
    default:
      return <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />;
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <CardTitle className="font-heading text-base font-semibold tracking-tight text-foreground truncate">
          {title}
        </CardTitle>
      </div>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-2xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

const HomePanel = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDoctorDashboard();
  const [waitingPatients, setWaitingPatients] = useState<Set<string>>(new Set());
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<TodayScheduleItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const profile = data?.profile;
  const stats = data?.stats;
  const schedule = data?.todaySchedule ?? [];
  const alerts = data?.patientAlerts ?? [];
  const programDistribution = data?.programDistribution;
  const pendingDocumentation = data?.pendingDocumentation;
  const recentActivity = data?.recentActivity ?? [];

  const doctorLastName = profile?.name?.split(" ").pop() ?? "Doctor";

  // Socket.io connection for waiting room
  useEffect(() => {
    const socket = getSocket();
    const userId = profile?.id;

    // Join waiting rooms for all today's appointments
    if (userId && schedule.length > 0) {
      schedule.forEach((appointment) => {
        socket.emit("join-waiting-room", {
          appointmentId: appointment.id,
          userId,
          role: "doctor",
        });
      });
    }

    socket.on("patient-waiting", ({ appointmentId, userId }) => {
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
  }, [profile?.id, schedule]);

  const handleAdmitPatient = (appointmentId: string, patientId: string) => {
    const socket = getSocket();
    console.log("Doctor emitting admit-patient for:", appointmentId);
    socket.emit("admit-patient", { appointmentId, userId: patientId });

    setWaitingPatients((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });

    toast.success("Patient admitted. Joining session...");

    // Find the appointment and redirect to session
    const appointment = schedule.find((s) => s.id === appointmentId);
    if (appointment?.meetingUrl) {
      setTimeout(() => {
        navigate(`/session/${appointmentId}`, { state: { meetingUrl: appointment.meetingUrl } });
      }, 1000);
    }
  };

  const todaySummary = useMemo(() => {
    const total = schedule.length;
    const inProgress = schedule.filter((s) => s.status === "Now").length;
    const completed = schedule.filter((s) => s.status === "Done").length;
    const upcoming = schedule.filter(
      (s) => s.status === "Pending" || s.status === "Confirmed",
    ).length;
    const missed = schedule.filter((s) => s.status === "Missed").length;
    const needsReview = schedule.filter(
      (s) => s.status === "NeedsReview" || s.needsReview,
    ).length;
    return { total, inProgress, completed, upcoming, missed, needsReview };
  }, [schedule]);

  const handleMarkCompleted = async (item: TodayScheduleItem) => {
    setActionId(item.id);
    try {
      await api.patch(`/appointments/${item.id}`, { status: "completed" });
      toast.success(
        item.status === "Missed"
          ? "Appointment marked as completed (late)."
          : "Session marked as completed.",
      );
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark appointment completed.");
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
      await api.post(`/appointments/${rescheduleTarget.id}/reschedule`, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
        reason: rescheduleReason.trim(),
      });
      toast.success("Appointment rescheduled.");
      setRescheduleTarget(null);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reschedule appointment.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const caseloadMetrics = useMemo(
    () => ({
      totalPatients: stats?.totalPatients ?? 0,
      activePatients: stats?.activePatients ?? 0,
      newThisMonth: stats?.newThisMonth ?? 0,
      discharged: stats?.discharged ?? 0,
    }),
    [stats],
  );

  const attentionItems = useMemo((): AttentionItem[] => {
    return alerts.slice(0, 8).map((alert: PatientAlert, index: number) => {
      const category: AttentionCategory =
        alert.type === "missed"
          ? "missed"
          : alert.type === "needs_review"
            ? "needs_review"
            : alert.type === "pending_note"
              ? "pending_note"
              : alert.type === "critical"
                ? "critical"
                : alert.type === "low_progress"
                  ? "low_progress"
                  : "low_progress";

      return {
        id: `alert-${index}-${alert.patientId ?? alert.name}`,
        patientId: alert.patientId ?? "",
        name: alert.name,
        message: alert.message,
        category,
      };
    });
  }, [alerts]);

  const attentionCount = attentionItems.length;

  const programCounts = useMemo(
    () => ({
      psychotic: programDistribution?.psychotic ?? 0,
      drug: programDistribution?.drug ?? 0,
      littleSoul: programDistribution?.littleSoul ?? 0,
    }),
    [programDistribution],
  );

  const programTracked =
    programCounts.psychotic + programCounts.drug + programCounts.littleSoul;

  const pendingDocs = useMemo(() => {
    const sessionNotes = pendingDocumentation?.sessionNotes ?? stats?.pendingNotes ?? 0;
    const therapyReview = pendingDocumentation?.therapyReviews ?? 0;
    const assessmentPending = pendingDocumentation?.assessments ?? 0;
    return {
      sessionNotes,
      therapyReview,
      assessmentPending,
      total: sessionNotes + therapyReview + assessmentPending,
    };
  }, [pendingDocumentation, stats?.pendingNotes]);

  const maxProgramCount = Math.max(
    programCounts.psychotic,
    programCounts.drug,
    programCounts.littleSoul,
    1,
  );

  const caseloadCards = [
    {
      label: "Total Patients",
      value: caseloadMetrics.totalPatients,
      hint: "Assigned to you",
      className: "border-border bg-primary/5",
      valueClassName: "text-primary",
    },
    {
      label: "Active Patients",
      value: caseloadMetrics.activePatients,
      hint: "Currently in care",
      className: "border-border bg-secondary/80",
      valueClassName: "text-foreground",
    },
    {
      label: "New This Month",
      value: caseloadMetrics.newThisMonth,
      hint: "Recent assignments",
      className: "border-border bg-accent/10",
      valueClassName: "text-accent",
    },
    {
      label: "Discharged",
      value: caseloadMetrics.discharged,
      hint: "Completed programs",
      className: "border-border bg-muted",
      valueClassName: "text-muted-foreground",
    },
  ] as const;

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="font-heading text-base font-semibold tracking-tight text-foreground">
              Failed to load dashboard
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderScheduleRow = (item: TodayScheduleItem) => {
    const telehealth = isTelehealth(item.type);
    const canJoin = telehealth && Boolean(item.meetingUrl) && item.status !== "Done" && item.status !== "Missed";
    const canStart =
      item.status === "Now"
      || item.status === "Pending"
      || item.status === "Confirmed";
    const isMissed = item.status === "Missed";
    const isBusy = actionId === item.id;
    const isWaiting = waitingPatients.has(item.id);

    return (
      <div
        key={item.id}
        className={cn(
          "grid gap-3 rounded-xl border p-3 motion-safe:transition-colors sm:grid-cols-[auto_1fr_auto] sm:items-center",
          isWaiting ? "border-primary bg-primary/5" : "border-border bg-background motion-safe:hover:bg-muted/40",
          isMissed && "border-destructive/25 bg-destructive/[0.03]",
          item.status === "NeedsReview" && "border-amber-200 bg-amber-50/30",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Time
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">{item.time}</span>
          </div>

          <Avatar className="h-9 w-9 shrink-0 border border-border">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
              {getInitials(item.patientName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{item.patientName}</p>
            <p className="truncate text-xs text-muted-foreground">{item.condition}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-center">
          {isWaiting && (
            <Badge variant="default" className="text-[10px] bg-primary">
              <UserCheck className="h-2.5 w-2.5 mr-1" />
              Waiting
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {telehealth ? "Telehealth" : "On-site"}
          </Badge>
          <Badge
            variant={scheduleStatusVariant(item.status)}
            className={cn("text-[10px]", scheduleStatusClass(item.status))}
          >
            {scheduleStatusLabel(item.status)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {item.patientId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigate(doctorPatientPath(item.patientId))}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              View Patient
            </Button>
          ) : null}

          {isWaiting && item.patientId ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleAdmitPatient(item.id, item.patientId)}
            >
              <UserCheck className="h-3.5 w-3.5" aria-hidden />
              Admit Patient
            </Button>
          ) : null}

          {canJoin ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                const socket = getSocket();
                console.log("Doctor joining session directly, also emitting admit-patient for:", item.id);
                socket.emit("admit-patient", { appointmentId: item.id, userId: item.patientId });
                navigate(`/session/${item.id}`, { state: { meetingUrl: item.meetingUrl } });
              }}
            >
              <Video className="h-3.5 w-3.5" aria-hidden />
              Join Session
            </Button>
          ) : null}

          {canStart && item.status !== "Done" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                navigate(
                  item.patientId ? doctorNotesPath(item.patientId) : "/doctor/notes",
                )
              }
            >
              <Stethoscope className="h-3.5 w-3.5" aria-hidden />
              Start Session
            </Button>
          ) : null}

          {isMissed ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={isBusy}
                onClick={() => void handleMarkCompleted(item)}
              >
                Mark Completed (late)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={isBusy}
                onClick={() => {
                  setRescheduleTarget(item);
                  setRescheduleDate("");
                  setRescheduleTime("");
                  setRescheduleReason("");
                }}
              >
                Reschedule
              </Button>
            </>
          ) : null}

          {item.status === "NeedsReview" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] border-amber-300 text-amber-800"
              onClick={() => navigate("/doctor/appointments")}
            >
              Review in Appointments
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-2">
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="doctor-hero-title"
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-primary/90 p-5 text-primary-foreground shadow-sm md:p-6"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          aria-hidden
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground" />
          <div className="absolute bottom-0 right-1/3 h-24 w-24 rounded-full bg-primary-foreground" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 min-w-0">
            <p className="text-sm font-medium text-primary-foreground/80">{greeting()}</p>
            <h1
              id="doctor-hero-title"
              className="font-heading text-2xl font-semibold tracking-tight md:text-3xl"
            >
              Dr. {doctorLastName}
            </h1>
            <p className="text-sm text-primary-foreground/85">
              {profile?.specialization ?? "Clinical Specialist"}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground font-normal">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {todaySummary.total} appointment{todaySummary.total === 1 ? "" : "s"} today
              </Badge>
              <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground font-normal">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {attentionCount} patient{attentionCount === 1 ? "" : "s"} need attention
              </Badge>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => navigate("/doctor/appointments")}
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            View Today&apos;s Schedule
          </Button>
        </div>
      </section>

      {/* ── 2. Schedule + Caseload bento ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Today's Schedule — primary */}
        <Card className="rounded-2xl border-border bg-card shadow-sm lg:col-span-8">
          <CardHeader className="space-y-1 px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<Clock className="h-4 w-4" aria-hidden />}
              title="Today's Schedule"
              action={
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => navigate("/doctor/appointments")}
                >
                  View all
                  <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground pl-9">
              {todaySummary.completed} completed · {todaySummary.inProgress} in progress ·{" "}
              {todaySummary.upcoming} upcoming
              {todaySummary.missed > 0 ? ` · ${todaySummary.missed} missed` : ""}
              {todaySummary.needsReview > 0 ? ` · ${todaySummary.needsReview} need review` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-3 md:px-5">
            {schedule.length === 0 ? (
              <EmptyBlock
                icon={<CalendarDays className="h-5 w-5" aria-hidden />}
                title="No appointments today"
                description="Your schedule is clear. Check upcoming appointments or review your caseload."
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/doctor/appointments")}
                  >
                    Open Appointments
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">{schedule.map(renderScheduleRow)}</div>
            )}
          </CardContent>
        </Card>

        {/* ── 3. My Caseload ─────────────────────────────────────────── */}
        <Card className="rounded-2xl border-border bg-card shadow-sm lg:col-span-4">
          <CardHeader className="px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<Users className="h-4 w-4" aria-hidden />}
              title="My Caseload"
            />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3 md:px-5">
            {caseloadCards.map((metric) => (
              <button
                key={metric.label}
                type="button"
                onClick={() => navigate("/doctor/patients")}
                className={cn(
                  "rounded-xl border p-3 text-left motion-safe:transition-colors motion-safe:hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  metric.className,
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <p
                  className={cn(
                    "mt-1 font-heading text-xl font-semibold tracking-tight",
                    metric.valueClassName,
                  )}
                >
                  {metric.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{metric.hint}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── 4 & 5. Attention + Documentation ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
              title="Patients Requiring Attention"
            />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-3 md:px-5">
            {attentionItems.length === 0 ? (
              <EmptyBlock
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
                title="All patients stable"
                description="No missed sessions, pending notes, or low-progress alerts at this time."
              />
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item) => {
                  const meta = attentionMeta[item.category];
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                            meta.className,
                          )}
                        >
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.patientId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => navigate(doctorPatientPath(item.patientId))}
                              >
                                View Patient
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() =>
                                navigate(
                                  item.patientId
                                    ? doctorNotesPath(item.patientId)
                                    : "/doctor/notes",
                                )
                              }
                            >
                              Add Note
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => navigate("/doctor/therapy")}
                            >
                              Review Plan
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<ClipboardList className="h-4 w-4" aria-hidden />}
              title="Pending Documentation"
            />
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4 pt-3 md:px-5">
            {pendingDocs.total === 0 ? (
              <EmptyBlock
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
                title="Documentation up to date"
                description="No session notes, therapy reviews, or assessments are waiting."
              />
            ) : (
              <>
                {[
                  {
                    label: "Session note pending",
                    count: pendingDocs.sessionNotes,
                    complete: () => navigate("/doctor/notes"),
                  },
                  {
                    label: "Therapy review pending",
                    count: pendingDocs.therapyReview,
                    complete: () => navigate("/doctor/therapy"),
                  },
                  {
                    label: "Assessment pending",
                    count: pendingDocs.assessmentPending,
                    complete: () => navigate("/doctor/therapy"),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.count > 0 ? `${row.count} item${row.count === 1 ? "" : "s"}` : "None"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={row.count === 0}
                        onClick={row.complete}
                      >
                        Complete Note
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        disabled={row.count === 0}
                        onClick={() => navigate("/doctor/therapy")}
                      >
                        Open Plan
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6 & 7. Program distribution + Activity ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<BookOpen className="h-4 w-4" aria-hidden />}
              title="Program Distribution"
            />
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 pt-3 md:px-5">
            {programTracked === 0 ? (
              <EmptyBlock
                icon={<Users className="h-5 w-5" aria-hidden />}
                title="No program data yet"
                description="Patient program assignments will appear here as caseload data becomes available."
              />
            ) : (
              (
                [
                  { key: "psychotic" as const, count: programCounts.psychotic },
                  { key: "drug" as const, count: programCounts.drug },
                  { key: "littleSoul" as const, count: programCounts.littleSoul },
                ] as const
              ).map(({ key, count }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{PROGRAM_LABELS[key]}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <Progress
                    value={Math.round((count / maxProgramCount) * 100)}
                    className="h-1.5 bg-muted"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="px-4 pb-0 pt-4 md:px-5">
            <SectionLabel
              icon={<Clock className="h-4 w-4" aria-hidden />}
              title="Recent Activity"
            />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-3 md:px-5">
            {recentActivity.length === 0 ? (
              <EmptyBlock
                icon={<Clock className="h-5 w-5" aria-hidden />}
                title="No recent activity"
                description="Completed sessions, notes, and assessments will appear here."
              />
            ) : (
              <ol className="space-y-0">
                {recentActivity.map((activity: RecentActivityItem, index: number) => (
                  <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < recentActivity.length - 1 ? (
                      <span
                        className="absolute left-[13px] top-7 h-[calc(100%-12px)] w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                      {activityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatActivityTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{activity.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
            <DialogDescription>
              {rescheduleTarget
                ? `Choose a new date and time for ${rescheduleTarget.patientName}.`
                : "Choose a new date and time."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="home-reschedule-date">New date</Label>
              <Input
                id="home-reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="home-reschedule-time">New time</Label>
              <Input
                id="home-reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="home-reschedule-reason">Reason</Label>
              <Textarea
                id="home-reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Why is this appointment being rescheduled?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={isRescheduling} onClick={() => void handleRescheduleSubmit()}>
              {isRescheduling ? "Saving…" : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePanel;
