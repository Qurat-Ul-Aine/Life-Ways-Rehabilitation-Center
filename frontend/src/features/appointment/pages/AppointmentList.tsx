import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Video, MapPin, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { appointmentService } from "../services/appointmentService";
import type { Appointment, AppointmentStatus } from "../appointment.types";

// ─── Status badge styling ─────────────────────────────────────────────────────
const STATUS_VARIANT: Record<AppointmentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  scheduled:   "secondary",
  confirmed:   "default",
  completed:   "outline",
  cancelled:   "destructive",
  rescheduled: "secondary",
  "no-show":   "destructive",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:   "Scheduled",
  confirmed:   "Confirmed",
  completed:   "Completed",
  cancelled:   "Cancelled",
  rescheduled: "Rescheduled",
  "no-show":   "No Show",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentList() {
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }  = useAuth();

  const [items,        setItems]        = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [status,       setStatus]       = useState<AppointmentStatus | "all">("all");
  const [search,       setSearch]       = useState(searchParams.get("search") ?? "");
  const [reschedule,   setReschedule]   = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // tracks which id is loading

  const role       = user?.role ?? "patient";
  const canManage  = role === "admin" || role === "doctor";
  const basePath   = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const refetch = async () => {
    setLoading(true);
    try {
      const data = await appointmentService.list({ status });
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refetch(); }, [status]); // eslint-disable-line

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => {
      const haystack = [
        a.patientName,
        a.doctorName,
        a.date,
        a.startTime,
        a.status,
        a.mode,
        a.reason,
        a.notes,
        a.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  // ── Group into upcoming / past ────────────────────────────────────────────
  const grouped = useMemo(() => {
    const today    = new Date().toISOString().slice(0, 10);
    const upcoming: Appointment[] = [];
    const past:     Appointment[] = [];
    filteredItems.forEach((a) => {
      const isDone = a.status === "completed" || a.status === "cancelled";
      if (!isDone && a.date >= today) upcoming.push(a);
      else past.push(a);
    });
    return { upcoming, past };
  }, [filteredItems]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const doConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      await appointmentService.confirm(id);
      toast.success("Appointment confirmed.");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm.");
    } finally {
      setActionLoading(null);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
    try {
      await appointmentService.cancel(cancelTarget.id, cancelReason || undefined);
      toast.success("Appointment cancelled.");
      setCancelTarget(null);
      setCancelReason("");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel.");
    } finally {
      setActionLoading(null);
    }
  };

  // FIX: now uses dedicated reschedule endpoint (POST /:id/reschedule)
  const doReschedule = async (newDate: string, newTime: string) => {
    if (!reschedule) return;
    setActionLoading(reschedule.id);
    try {
      await appointmentService.reschedule(reschedule.id, newDate, newTime);
      toast.success("Appointment rescheduled.");
      setReschedule(null);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Manage upcoming and past appointments."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`${basePath}/appointments/calendar`)}
            >
              <CalendarIcon className="h-4 w-4 mr-1" /> Calendar
            </Button>
            <Button asChild>
              <Link to={`${basePath}/appointments/new`}>
                <Plus className="h-4 w-4 mr-1" /> Book appointment
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Input
            className="max-w-sm"
            placeholder="Search patient, doctor, date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as AppointmentStatus | "all")}
          >
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>

          {/* Live count chips */}
          <div className="ml-auto flex gap-2 flex-wrap">
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              Upcoming: <b>{grouped.upcoming.length}</b>
            </span>
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              Past: <b>{grouped.past.length}</b>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Upcoming ─────────────────────────────────────────────────────── */}
      <Section title={`Upcoming (${grouped.upcoming.length})`}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : grouped.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming appointments.
          </p>
        ) : (
          grouped.upcoming.map((a) => (
            <Row
              key={a.id}
              appointment={a}
              canManage={canManage}
              isLoading={actionLoading === a.id}
              onConfirm={() => doConfirm(a.id)}
              onReschedule={() => setReschedule(a)}
              onCancel={() => setCancelTarget(a)}
            />
          ))
        )}
      </Section>

      {/* ── Past ─────────────────────────────────────────────────────────── */}
      <Section title={`Past (${grouped.past.length})`}>
        {grouped.past.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No past appointments.
          </p>
        ) : (
          grouped.past.map((a) => (
            <Row
              key={a.id}
              appointment={a}
              canManage={false}
              isLoading={false}
              onConfirm={() => {}}
              onReschedule={() => {}}
              onCancel={() => {}}
            />
          ))
        )}
      </Section>

      {/* ── Reschedule dialog ─────────────────────────────────────────────── */}
      {reschedule && (
        <RescheduleDialog
          appointment={reschedule}
          open
          loading={actionLoading === reschedule.id}
          onOpenChange={(o) => !o && setReschedule(null)}
          onConfirm={doReschedule}
        />
      )}

      {/* ── Cancel dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${cancelTarget.patientName} with ${cancelTarget.doctorName} on ${cancelTarget.date}`
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
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={doCancel}
              disabled={actionLoading === cancelTarget?.id}
            >
              {actionLoading === cancelTarget?.id ? "Cancelling..." : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

// ─── Single appointment row ───────────────────────────────────────────────────
function Row({
  appointment: a,
  canManage,
  isLoading,
  onConfirm,
  onReschedule,
  onCancel,
}: {
  appointment:  Appointment;
  canManage:    boolean;
  isLoading:    boolean;
  onConfirm:    () => void;
  onReschedule: () => void;
  onCancel:     () => void;
}) {
  const isPending   = a.status === "scheduled";
  const isCancelled = a.status === "cancelled";
  const isCompleted = a.status === "completed";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="space-y-1 min-w-0">

        {/* Patient → Doctor + status badge */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{a.patientName}</p>
          <span className="text-xs text-muted-foreground">→ {a.doctorName}</span>
          <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
        </div>

        {/* Date + time */}
        <p className="text-xs text-muted-foreground">
          {a.date}
          {a.startTime ? ` · ${a.startTime}` : ""}
          {a.endTime   ? `–${a.endTime}`      : ""}
        </p>

        {/* Mode + reason */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {a.mode === "online" ? (
            <><Video className="h-3.5 w-3.5" /> Online</>
          ) : (
            <><MapPin className="h-3.5 w-3.5" /> In-person</>
          )}
          {a.reason && <span>· {a.reason}</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {/* Join button for online appointments */}
        {a.mode === "online" && a.meetingUrl && !isCancelled && !isCompleted && (
          <Button size="sm" variant="outline" asChild>
            <a href={a.meetingUrl} target="_blank" rel="noreferrer">
              <Video className="h-3.5 w-3.5 mr-1" /> Join
            </a>
          </Button>
        )}

        {/* Admin/Doctor management buttons */}
        {canManage && !isCancelled && !isCompleted && (
          <>
            {/* Confirm — only for scheduled (not yet confirmed) */}
            {isPending && (
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                disabled={isLoading}
                onClick={onConfirm}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                {isLoading ? "..." : "Confirm"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={onReschedule}
            >
              Reschedule
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Reschedule dialog ────────────────────────────────────────────────────────
function RescheduleDialog({
  appointment,
  open,
  loading,
  onOpenChange,
  onConfirm,
}: {
  appointment:  Appointment;
  open:         boolean;
  loading:      boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm:    (date: string, time: string) => void;
}) {
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.startTime ?? "09:00");
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            {appointment.patientName} with {appointment.doctorName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New date</label>
            <Input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New time</label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            disabled={!date || !time || loading}
            onClick={() => onConfirm(date, time)}
          >
            {loading ? "Saving..." : "Confirm reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}