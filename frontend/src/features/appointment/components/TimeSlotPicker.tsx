import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { appointmentService } from "../services/appointmentService";
import type { BookableSlot } from "../appointment.types";
import { formatTime12, isPastSlot, todayStr } from "../utils/appointmentDisplay";

type SlotValue = { startTime: string; endTime: string };

type Props = {
  doctorId: string;
  date: string;
  value?: SlotValue;
  onChange: (slot: SlotValue) => void;
  excludeAppointmentId?: string;
};

export default function TimeSlotPicker({
  doctorId,
  date,
  value,
  onChange,
}: Props) {
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    appointmentService
      .getBookableSlots(doctorId, date)
      .then((items) => {
        if (!cancelled) setSlots(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load time slots.");
          setSlots([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const displaySlots =
    date === todayStr()
      ? slots.filter((slot) => !isPastSlot(date, slot.startTime))
      : slots;

  if (displaySlots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-3 py-4 text-center">
        No available slots for this date. Please choose another date.
      </p>
    );
  }

  const availableCount = displaySlots.filter((s) => s.available).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {availableCount > 0
          ? `${availableCount} slot${availableCount === 1 ? "" : "s"} available`
          : "All slots are booked for this date"}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="listbox" aria-label="Available time slots">
        {displaySlots.map((slot) => {
          const selected = value?.startTime === slot.startTime;
          return (
            <button
              key={`${slot.startTime}-${slot.endTime}`}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={!slot.available}
              onClick={() => onChange({ startTime: slot.startTime, endTime: slot.endTime })}
              className={cn(
                "h-9 rounded-lg border text-xs font-medium transition-colors",
                slot.available
                  ? selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                  : "border-border/50 bg-muted/40 text-muted-foreground cursor-not-allowed line-through",
              )}
            >
              {formatTime12(slot.startTime)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
