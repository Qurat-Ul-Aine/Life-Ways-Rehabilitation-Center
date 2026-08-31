import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Video,
  FileText,
  Search,
  CalendarDays,
  MapPin,
  ChevronDown,
  Clock,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import api from "@/lib/api";
import type { Appointment } from "@/features/appointment/appointment.types";
import {
  appointmentTypeLabel,
  canJoinTelehealth,
  telehealthJoinMessage,
  canModify,
  filterAppointments,
  formatDateLabel,
  formatShortDate,
  formatTime12,
  isCancelled,
  isCompleted,
  isMissed,
  isHistory,
  isUpcoming,
  modeBadgeClass,
  modeLabel,
  statusBadgeClass,
  statusLabel,
} from "@/features/appointment/utils/appointmentDisplay";
import { refreshPatientDashboard, PATIENT_DASHBOARD_REFRESH } from "@/features/patient/utils/patientDashboardRefresh";
import { usePatientContext } from "../hooks/usePatientContext";
import EmptyState from "../components/home/EmptyState";
import BookAppointmentDialog from "../components/appointments/BookAppointmentDialog";
import AppointmentDetailsDialog from "../components/appointments/AppointmentDetailsDialog";
import RescheduleDialog from "../components/appointments/RescheduleDialog";

/* ── Layout helpers ──────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

function SectionDivider() {
  return <hr className="border-border/60" aria-hidden />;
}

const doctorInitials = (name?: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/* ── Next appointment hero ───────────────────────────────────────────────── */

function NextAppointmentHero({
  appointment,
  onView,
  onReschedule,
  onBook,
  canBook,
}: {
  appointment: Appointment | null;
  onView: () => void;
  onReschedule: () => void;
  onBook: () => void;
  canBook: boolean;
}) {
  const navigate = useNavigate();

  if (!appointment) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-700 p-6 md:p-8 text-primary-foreground shadow-md"
        aria-label="Next appointment"
      >
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden>
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground" />
        </div>
        <div className="relative z-10 text-center py-4">
          <CalendarDays className="mx-auto h-10 w-10 text-primary-foreground/70 mb-4" aria-hidden />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">No upcoming visits</h1>
          <p className="text-sm text-primary-foreground/90 max-w-md mx-auto mb-6">
            Book your next appointment to stay on track with your care plan.
          </p>
          <Button
            size="sm"
            className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={onBook}
            disabled={!canBook}
          >
            <Plus size={16} className="mr-2" aria-hidden />
            Book appointment
          </Button>
        </div>
      </section>
    );
  }

  const showJoin = canJoinTelehealth(appointment);
  const joinMessage = appointment.mode === "online" ? telehealthJoinMessage(appointment) : null;
  const isOnline = appointment.mode === "online";
  const modifiable = canModify(appointment);

  const handleJoin = () => {
    if (!showJoin) return;
    navigate(`/patient/waiting-room/${appointment.id}`);
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-emerald-700 p-6 md:p-8 text-primary-foreground shadow-md"
      aria-label="Your next appointment"
    >
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-primary-foreground" />
      </div>

      <div className="relative z-10">
        <p className="text-sm font-medium text-primary-foreground/85 uppercase tracking-wide mb-4">
          Your next visit · {formatDateLabel(appointment.date)}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div className="flex gap-4 min-w-0">
            <Avatar className="h-14 w-14 border-2 border-primary-foreground/25 shrink-0">
              <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground text-lg font-semibold">
                {doctorInitials(appointment.doctorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {appointment.doctorName || "Your doctor"}
              </h1>
              {appointment.doctorSpecialization && (
                <p className="text-sm text-primary-foreground/90 mt-1">
                  {appointment.doctorSpecialization}
                </p>
              )}
              <p className="text-sm text-primary-foreground/85 mt-2">
                {appointmentTypeLabel(appointment)}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-primary-foreground/90">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} aria-hidden />
                  {formatShortDate(appointment.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} aria-hidden />
                  {formatTime12(appointment.startTime)}
                </span>
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/25 text-xs font-normal">
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1">
                      <Video size={12} aria-hidden /> Telehealth
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} aria-hidden /> In-person
                    </span>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
            {isOnline && (
              <Button
                size="sm"
                className="rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-10"
                onClick={handleJoin}
                disabled={!showJoin || !appointment.meetingUrl}
              >
                <Video size={16} className="mr-2" aria-hidden />
                {showJoin ? "Join Waiting Room" : "Join opens soon"}
              </Button>
            )}
            {isOnline && joinMessage && !showJoin && (
              <p className="text-xs text-primary-foreground/80 px-1">{joinMessage}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl h-10 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={onView}
            >
              View details
            </Button>
            {modifiable && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-10 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={onReschedule}
              >
                Reschedule
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Upcoming visit card ─────────────────────────────────────────────────── */

function UpcomingVisitCard({
  appointment: a,
  actionLoading,
  onView,
  onReschedule,
  onCancel,
}: {
  appointment: Appointment;
  actionLoading: string | null;
  onView: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const modifiable = canModify(a);
  const showJoin = canJoinTelehealth(a);
  const joinMessage = a.mode === "online" ? telehealthJoinMessage(a) : null;
  const busy = actionLoading === a.id;

  const handleJoin = () => {
    if (!showJoin) return;
    navigate(`/patient/waiting-room/${a.id}`);
  };

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors">
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {doctorInitials(a.doctorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{a.doctorName || "—"}</h3>
            {a.doctorSpecialization && (
              <p className="text-sm text-muted-foreground">{a.doctorSpecialization}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs shrink-0", statusBadgeClass(a.status))}>
            {statusLabel(a.status)}
          </Badge>
        </div>
        <p className="text-sm text-foreground mt-1.5">{appointmentTypeLabel(a)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} aria-hidden />
            {formatDateLabel(a.date)} · {formatTime12(a.startTime)}
          </span>
          <span className="inline-flex items-center gap-1">
            {a.mode === "online" ? <Video size={14} aria-hidden /> : <MapPin size={14} aria-hidden />}
            {a.mode === "online" ? "Telehealth" : "Clinic visit"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {a.mode === "online" && (
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs"
              onClick={handleJoin}
              disabled={!showJoin || !a.meetingUrl}
            >
              <Video size={12} className="mr-1" aria-hidden />
              {showJoin ? "Join Waiting Room" : "Join opens soon"}
            </Button>
          )}
          {a.mode === "online" && joinMessage && !showJoin && (
            <p className="text-xs text-muted-foreground w-full">{joinMessage}</p>
          )}
          <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs" onClick={onView}>
            Details
          </Button>
          {modifiable && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs"
                disabled={busy}
                onClick={onReschedule}
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs text-destructive hover:text-destructive"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Visit history timeline ──────────────────────────────────────────────── */

function VisitHistoryTimeline({
  visits,
  onView,
  emptyMessage,
}: {
  visits: Appointment[];
  onView: (a: Appointment) => void;
  emptyMessage?: string;
}) {
  const navigate = useNavigate();
  const [telehealthNotes, setTelehealthNotes] = useState<Record<string, string>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, { rating: number | null; comment: string | null }>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<Record<string, boolean>>({});

  const fetchTelehealthNotes = useCallback(async (appointmentId: string) => {
    setLoadingNotes(prev => ({ ...prev, [appointmentId]: true }));
    try {
      const res = await api.get<{ notes?: string }>(`/appointments/${appointmentId}/telehealth/notes`);
      setTelehealthNotes(prev => ({ ...prev, [appointmentId]: res.data.notes || "" }));
    } catch {
      setTelehealthNotes(prev => ({ ...prev, [appointmentId]: "" }));
    } finally {
      setLoadingNotes(prev => ({ ...prev, [appointmentId]: false }));
    }
  }, []);

  const fetchFeedback = useCallback(async (appointmentId: string) => {
    setLoadingFeedback(prev => ({ ...prev, [appointmentId]: true }));
    try {
      const res = await api.get(`/appointments/${appointmentId}/feedback`);
      setFeedback(prev => ({ ...prev, [appointmentId]: { rating: res.data.rating, comment: res.data.comment } }));
    } catch {
      setFeedback(prev => ({ ...prev, [appointmentId]: { rating: null, comment: null } }));
    } finally {
      setLoadingFeedback(prev => ({ ...prev, [appointmentId]: false }));
    }
  }, []);

  useEffect(() => {
    const telehealthVisits = visits.filter(v => v.mode === "online");
    telehealthVisits.forEach(v => {
      fetchTelehealthNotes(v.id);
      fetchFeedback(v.id);
    });
  }, [visits, fetchTelehealthNotes, fetchFeedback]);

  if (visits.length === 0) {
    return (
      <div className="py-4">
        <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" aria-hidden />
        <EmptyState
          message={
            emptyMessage
            ?? "No past visits yet. Your session summaries will appear here after completed appointments."
          }
          className="py-2 text-left"
        />
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-border ml-3 pl-6 space-y-0">
      {visits.map((a) => {
        const cancelled = isCancelled(a);
        const completed = isCompleted(a);
        const missed = isMissed(a);
        const notes = a.notes?.trim() || a.reason?.trim();
        const outcome = a.outcome
          ?? (completed ? "Visit completed" : cancelled ? "Cancelled" : missed ? "Missed appointment" : statusLabel(a.status));
        const isTelehealth = a.mode === "online";
        const telehealthNote = telehealthNotes[a.id] || "";
        const appointmentFeedback = feedback[a.id] || { rating: null, comment: null };

        return (
          <li key={a.id} className="relative pb-5 last:pb-0">
            <span
              className={cn(
                "absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full border-2 bg-card",
                cancelled
                  ? "border-red-400 bg-red-100"
                  : missed
                    ? "border-amber-500 bg-amber-100"
                    : completed
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-muted-foreground/40",
              )}
              aria-hidden
            />
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {formatShortDate(a.date)} · {formatTime12(a.startTime)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        cancelled
                          ? "bg-red-50 text-red-700 border-red-200"
                          : missed
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200",
                      )}
                    >
                      {outcome}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {a.doctorName}
                    {a.doctorSpecialization ? ` · ${a.doctorSpecialization}` : ""}
                  </p>
                  {notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{notes}</p>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className="shrink-0 text-muted-foreground mt-1 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mt-3 space-y-2 pl-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Session summary
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {notes || "No summary notes recorded for this visit."}
                </p>
                {isTelehealth && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Telehealth session notes
                    </p>
                    {loadingNotes[a.id] ? (
                      <Skeleton className="h-16 w-full rounded-lg" />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        {telehealthNote || "No telehealth notes for this session"}
                      </div>
                    )}
                  </div>
                )}
                {isTelehealth && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Your feedback
                    </p>
                    {loadingFeedback[a.id] ? (
                      <Skeleton className="h-16 w-full rounded-lg" />
                    ) : appointmentFeedback.rating ? (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={cn(
                                star <= appointmentFeedback.rating ? "text-yellow-400" : "text-gray-300"
                              )}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        {appointmentFeedback.comment && (
                          <p className="text-muted-foreground mt-1">{appointmentFeedback.comment}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No feedback submitted</p>
                    )}
                  </div>
                )}
                {isTelehealth && completed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs"
                    onClick={() =>
                      navigate(`/session/${a.id}`, {
                        state: { meetingUrl: a.meetingUrl ?? null },
                      })
                    }
                  >
                    <Video size={12} className="mr-1" aria-hidden />
                    Rejoin Session
                  </Button>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className={cn("text-xs", modeBadgeClass(a.mode))}>
                    {modeLabel(a.mode)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => onView(a)}
                  >
                    View full details
                  </Button>
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Appointment preparation ─────────────────────────────────────────────── */

function AppointmentPreparation({ appointment }: { appointment: Appointment }) {
  const isOnline = appointment.mode === "online";
  const reasonLower = (appointment.reason ?? "").toLowerCase();
  const mentionsAssessment =
    reasonLower.includes("assessment") || reasonLower.includes("screening");

  const items = [
    {
      id: "id",
      label: "Bring photo ID and insurance card",
      done: false,
      show: !isOnline,
    },
    {
      id: "early",
      label: isOnline ? "Join 5 minutes before your scheduled time" : "Arrive 10 minutes early",
      done: false,
      show: true,
    },
    {
      id: "symptoms",
      label: "Write down symptoms or questions for your care team",
      done: false,
      show: true,
    },
    {
      id: "space",
      label: "Find a quiet, private space with stable internet",
      done: false,
      show: isOnline,
    },
    {
      id: "assessment",
      label: "Complete any pre-visit questionnaires from your care team",
      done: false,
      show: mentionsAssessment,
    },
    {
      id: "docs",
      label: "Have recent lab results or referral letters ready if applicable",
      done: false,
      show: !isOnline,
    },
  ].filter((i) => i.show);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-3 rounded-lg bg-muted/25 border border-border/50 px-4 py-3"
        >
          <ListChecks size={18} className="text-primary shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-foreground leading-relaxed">{item.label}</p>
        </li>
      ))}
    </ul>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */

const AppointmentsPanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId, profile, loading: profileLoading } = usePatientContext();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [initialDoctorId, setInitialDoctorId] = useState<string | undefined>();
  const [initialAnalysisId, setInitialAnalysisId] = useState<string | undefined>();
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (searchParams.get("book") === "1") {
      const doctorId = searchParams.get("doctorId") ?? undefined;
      const analysisId = searchParams.get("analysisId") ?? undefined;
      setInitialDoctorId(doctorId);
      setInitialAnalysisId(analysisId);
      setBookOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("book");
      next.delete("doctorId");
      next.delete("analysisId");
      setSearchParams(next, { replace: true });
    }
  }, [profileLoading, searchParams, setSearchParams]);

  const refetch = useCallback(async () => {
    if (!patientId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await appointmentService.list({ patientId });
      setAppointments(
        items.filter((a) => String(a.patientId) === String(patientId)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (profileLoading) return;
    void refetch();
  }, [profileLoading, refetch]);

  useEffect(() => {
    const onRefresh = () => {
      void refetch();
    };
    window.addEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
    return () => window.removeEventListener(PATIENT_DASHBOARD_REFRESH, onRefresh);
  }, [refetch]);

  useEffect(() => {
    const state = location.state as { refreshAppointments?: boolean } | null;
    if (!state?.refreshAppointments) return;
    void refetch();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate, refetch]);

  const allUpcoming = useMemo(
    () =>
      [...appointments]
        .filter(isUpcoming)
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [appointments],
  );

  const nextAppt = allUpcoming[0] ?? null;

  const filteredUpcoming = useMemo(
    () => filterAppointments(allUpcoming, "all", search),
    [allUpcoming, search],
  );

  const moreUpcoming = useMemo(() => {
    if (!search.trim()) return allUpcoming;
    return filteredUpcoming;
  }, [allUpcoming, filteredUpcoming, search]);

  const historyList = useMemo(
    () =>
      [...appointments]
        .filter((a) => isHistory(a))
        .filter((a) => filterAppointments([a], "all", search).length > 0)
        .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)),
    [appointments, search],
  );

  const hasSearch = search.trim().length > 0;

  const handleCancel = async () => {
    if (!cancelAppt) return;
    setActionLoading(cancelAppt.id);
    try {
      await appointmentService.cancel(cancelAppt.id, cancelReason.trim() || undefined);
      toast.success("Appointment cancelled. It remains in your history.");
      setCancelAppt(null);
      setCancelReason("");
      void refetch();
      refreshPatientDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel appointment.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (date: string, time: string) => {
    if (!rescheduleAppt) return;
    setActionLoading(rescheduleAppt.id);
    try {
      await appointmentService.reschedule(rescheduleAppt.id, date, time);
      toast.success("Appointment rescheduled successfully.");
      setRescheduleAppt(null);
      void refetch();
      refreshPatientDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule appointment.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading appointments">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 1. Next appointment hero */}
      <NextAppointmentHero
        appointment={nextAppt}
        onView={() => nextAppt && setDetailsAppt(nextAppt)}
        onReschedule={() => nextAppt && setRescheduleAppt(nextAppt)}
        onBook={() => setBookOpen(true)}
        canBook={Boolean(patientId)}
      />

      {/* 2. Upcoming visits */}
      <section aria-labelledby="upcoming-visits-title">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upcoming visits
          </h2>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctor, visit type, date, or reason…"
                className="pl-9 h-9 rounded-xl text-sm"
                aria-label="Search appointments"
              />
            </div>
            <Button
              size="sm"
              className="h-9 rounded-xl shrink-0"
              onClick={() => setBookOpen(true)}
              disabled={!patientId}
            >
              <Plus size={14} className="mr-1.5" aria-hidden />
              Book
            </Button>
          </div>
        </div>
        <h3 id="upcoming-visits-title" className="sr-only">
          Upcoming appointment list
        </h3>

        {moreUpcoming.length === 0 ? (
          hasSearch ? (
            <p className="text-sm text-muted-foreground">
              No upcoming visits match &ldquo;{search.trim()}&rdquo;.
            </p>
          ) : nextAppt ? (
            <p className="text-sm text-muted-foreground">
              Your next visit is highlighted above. All scheduled visits are listed below.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Schedule a visit to see it listed here.
            </p>
          )
        ) : (
          <div className="space-y-3">
            {moreUpcoming.map((a) => (
              <UpcomingVisitCard
                key={a.id}
                appointment={a}
                actionLoading={actionLoading}
                onView={() => setDetailsAppt(a)}
                onReschedule={() => setRescheduleAppt(a)}
                onCancel={() => setCancelAppt(a)}
              />
            ))}
          </div>
        )}
      </section>

      <SectionDivider />

      {/* 3. Visit history */}
      <section aria-labelledby="visit-history-title">
        <SectionLabel>Visit history</SectionLabel>
        <h3 id="visit-history-title" className="sr-only">
          Past appointments timeline
        </h3>
        <VisitHistoryTimeline
          visits={historyList}
          onView={setDetailsAppt}
          emptyMessage={
            hasSearch
              ? `No visit history matches "${search.trim()}".`
              : undefined
          }
        />
      </section>

      {nextAppt && (
        <>
          <SectionDivider />

          {/* 4. Appointment preparation */}
          <section aria-labelledby="prep-title">
            <SectionLabel>Appointment preparation</SectionLabel>
            <h3 id="prep-title" className="sr-only">
              Pre-visit checklist for your next appointment
            </h3>
            <AppointmentPreparation appointment={nextAppt} />
          </section>
        </>
      )}

      {/* Dialogs — unchanged */}
      {patientId && profile && (
        <BookAppointmentDialog
          open={bookOpen}
          onOpenChange={(open) => {
            setBookOpen(open);
            if (!open) {
              setInitialDoctorId(undefined);
              setInitialAnalysisId(undefined);
            }
          }}
          patientId={patientId}
          patientName={profile.fullName}
          initialDoctorId={initialDoctorId}
          initialAnalysisId={initialAnalysisId}
          onSuccess={() => {
            void refetch();
            refreshPatientDashboard();
          }}
        />
      )}

      <AppointmentDetailsDialog
        appointment={detailsAppt}
        open={!!detailsAppt}
        onOpenChange={(o) => !o && setDetailsAppt(null)}
      />

      <RescheduleDialog
        key={rescheduleAppt?.id ?? "reschedule"}
        appointment={rescheduleAppt}
        open={!!rescheduleAppt}
        loading={actionLoading === rescheduleAppt?.id}
        onOpenChange={(o) => !o && setRescheduleAppt(null)}
        onConfirm={handleReschedule}
      />

      <Dialog open={!!cancelAppt} onOpenChange={(o) => !o && setCancelAppt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment?</DialogTitle>
            <DialogDescription>
              {cancelAppt
                ? `This will cancel your ${modeLabel(cancelAppt.mode).toLowerCase()} visit with ${cancelAppt.doctorName} on ${formatDateLabel(cancelAppt.date)} at ${formatTime12(cancelAppt.startTime)}. The appointment will remain in your history.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelAppt(null)}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={actionLoading === cancelAppt?.id}
            >
              {actionLoading === cancelAppt?.id ? "Cancelling…" : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsPanel;
