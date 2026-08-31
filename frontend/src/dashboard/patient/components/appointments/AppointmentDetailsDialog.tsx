import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/features/appointment/appointment.types";
import {
  formatFullDate,
  formatTime12,
  modeBadgeClass,
  modeLabel,
  statusBadgeClass,
  statusLabel,
} from "@/features/appointment/utils/appointmentDisplay";

type Props = {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2.5 border-b border-border/50 last:border-none">
    <dt className="text-xs font-medium text-muted-foreground shrink-0">{label}</dt>
    <dd className="text-sm text-foreground text-left sm:text-right">{children}</dd>
  </div>
);

export default function AppointmentDetailsDialog({ appointment, open, onOpenChange }: Props) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment details</DialogTitle>
        </DialogHeader>

        <dl className="mt-2">
          <DetailRow label="Doctor">
            <span className="font-semibold">{appointment.doctorName || "—"}</span>
          </DetailRow>
          <DetailRow label="Specialization">
            {appointment.doctorSpecialization?.trim() || "—"}
          </DetailRow>
          <DetailRow label="Date">{formatFullDate(appointment.date)}</DetailRow>
          <DetailRow label="Time">{formatTime12(appointment.startTime)}</DetailRow>
          <DetailRow label="Mode">
            <Badge variant="outline" className={modeBadgeClass(appointment.mode)}>
              {modeLabel(appointment.mode)}
            </Badge>
          </DetailRow>
          <DetailRow label="Status">
            <Badge variant="outline" className={statusBadgeClass(appointment.status)}>
              {statusLabel(appointment.status)}
            </Badge>
          </DetailRow>
          <DetailRow label="Reason">
            <span className="text-muted-foreground">{appointment.reason?.trim() || "—"}</span>
          </DetailRow>
          {(appointment.notes?.trim() || appointment.cancelledReason?.trim()) && (
            <DetailRow label="Notes">
              <span className="text-muted-foreground whitespace-pre-wrap">
                {appointment.notes?.trim() || appointment.cancelledReason?.trim()}
              </span>
            </DetailRow>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
