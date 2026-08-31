import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TimeSlotPicker from "@/features/appointment/components/TimeSlotPicker";
import type { Appointment } from "@/features/appointment/appointment.types";
import { todayStr, validateNotPastTime } from "@/features/appointment/utils/appointmentDisplay";

type Props = {
  appointment: Appointment | null;
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: string, time: string) => void;
};

export default function RescheduleDialog({
  appointment,
  open,
  loading,
  onOpenChange,
  onConfirm,
}: Props) {
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (!appointment || !open) return;
    setDate(appointment.date);
    setStartTime("");
    setEndTime("");
  }, [appointment, open]);

  if (!appointment) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            With {appointment.doctorName} — select a new available date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="reschedule-date">New date *</Label>
            <Input
              id="reschedule-date"
              type="date"
              min={todayStr()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setStartTime("");
                setEndTime("");
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>New time *</Label>
            <TimeSlotPicker
              doctorId={appointment.doctorId}
              date={date}
              value={startTime ? { startTime, endTime: endTime || startTime } : undefined}
              onChange={(s) => {
                setStartTime(s.startTime);
                setEndTime(s.endTime);
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            disabled={!date || !startTime || loading}
            onClick={() => {
              const pastTimeError = validateNotPastTime(date, startTime);
              if (pastTimeError) {
                toast.error(pastTimeError);
                return;
              }
              onConfirm(date, startTime);
            }}
          >
            {loading ? "Saving..." : "Confirm reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
