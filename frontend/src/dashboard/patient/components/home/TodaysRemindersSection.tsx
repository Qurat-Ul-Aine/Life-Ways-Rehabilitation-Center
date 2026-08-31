import { useNavigate } from "react-router-dom";
import { MapPin, Video, Clock, User, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/features/patient/patient.types";
import {
  formatDateLabel,
  formatShortDate,
  formatTime12,
  isActiveReminder,
  modeLabel,
  statusBadgeClass,
  statusLabel,
} from "@/features/appointment/utils/appointmentDisplay";
import { useTelehealthJoin } from "@/features/appointment/hooks/useTelehealthJoin";

type TodaysAppointment = DashboardSummary["todaysAppointments"][number];

type Props = {
  appointments: TodaysAppointment[];
  patientName?: string | null;
};

function appointmentTitle(appt: TodaysAppointment) {
  return appt.reason?.trim() || (appt.mode === "online" ? "Telehealth consultation" : "Clinic visit");
}

function ReminderCard({
  appt,
  patientName,
}: {
  appt: TodaysAppointment;
  patientName?: string | null;
}) {
  const navigate = useNavigate();
  const isTelehealth = appt.mode === "online";
  const { canJoin, message } = useTelehealthJoin({
    mode: appt.mode,
    date: appt.date,
    startTime: appt.startTime,
    status: appt.status,
  });

  const actionLabel = isTelehealth ? "Join Consultation" : "Clinic Visit";

  const handleAction = () => {
    if (isTelehealth) {
      if (!canJoin) return;
      navigate(`/patient/waiting-room/${appt.id}`);
      return;
    }
    navigate("/patient/dashboard/appointments");
  };

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        appt.startingSoon ? "border-amber-300 bg-amber-50/40" : "border-border/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{appointmentTitle(appt)}</p>
          {appt.startingSoon && (
            <Badge className="mt-1.5 bg-amber-500 text-white hover:bg-amber-500 text-[10px]">
              Starting Soon
            </Badge>
          )}
        </div>
        <Badge variant="outline" className={cn("text-xs capitalize", statusBadgeClass(appt.status as never))}>
          {statusLabel(appt.status as never)}
        </Badge>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User size={14} className="shrink-0" aria-hidden />
          <dt className="sr-only">Patient</dt>
          <dd className="text-foreground">{appt.patientName ?? patientName ?? "Patient"}</dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Stethoscope size={14} className="shrink-0" aria-hidden />
          <dt className="sr-only">Doctor</dt>
          <dd className="text-foreground">{appt.doctorName ?? "Not assigned"}</dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock size={14} className="shrink-0" aria-hidden />
          <dt className="sr-only">Date and time</dt>
          <dd className="text-foreground">
            {formatDateLabel(appt.date)} · {formatShortDate(appt.date)} · {formatTime12(appt.startTime)}
          </dd>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {isTelehealth ? <Video size={14} aria-hidden /> : <MapPin size={14} aria-hidden />}
          <dt className="sr-only">Appointment type</dt>
          <dd className="text-foreground">{modeLabel(appt.mode as "online" | "in-person")}</dd>
        </div>
      </dl>

      {isTelehealth && message && !canJoin && (
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      )}

      <Button
        size="sm"
        className="mt-4 rounded-xl h-9 w-full sm:w-auto"
        variant={isTelehealth ? "default" : "outline"}
        onClick={handleAction}
        disabled={isTelehealth && (!canJoin || !appt.meetingUrl)}
      >
        {isTelehealth ? <Video size={16} className="mr-2" aria-hidden /> : <MapPin size={16} className="mr-2" aria-hidden />}
        {isTelehealth && !canJoin ? "Join opens soon" : actionLabel}
      </Button>
    </li>
  );
}

export default function TodaysRemindersSection({ appointments, patientName }: Props) {
  const activeToday = appointments.filter((a) => isActiveReminder(a.status));

  if (activeToday.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No appointments scheduled for today.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {activeToday.map((appt) => (
        <ReminderCard key={appt.id} appt={appt} patientName={patientName} />
      ))}
    </ul>
  );
}
