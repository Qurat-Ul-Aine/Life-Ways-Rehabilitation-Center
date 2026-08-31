import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DaySchedule } from "../settings.types";
import { parseAvailabilitySchedule, serializeAvailabilitySchedule, WEEK_DAYS } from "../settings.types";

type Props = {
  initialSchedule: unknown;
  initialStatus: string;
  onSave: (payload: {
    availability: ReturnType<typeof serializeAvailabilitySchedule>;
    availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
  }) => Promise<void>;
};

export default function AvailabilityScheduleSection({
  initialSchedule,
  initialStatus,
  onSave,
}: Props) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(WEEK_DAYS.map((d) => ({ ...d })));
  const [status, setStatus] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSchedule(parseAvailabilitySchedule(initialSchedule));
    setStatus(
      String(initialStatus ?? "AVAILABLE").toUpperCase() === "UNAVAILABLE"
        ? "UNAVAILABLE"
        : "AVAILABLE",
    );
  }, [initialSchedule, initialStatus]);

  const updateDay = (index: number, patch: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );
  };

  const handleSave = async () => {
    const enabledDays = schedule.filter((d) => d.enabled);
    for (const day of enabledDays) {
      if (day.startTime >= day.endTime) {
        toast.error(`${day.day}: end time must be after start time.`);
        return;
      }
      if (day.breakStart && day.breakEnd && day.breakStart >= day.breakEnd) {
        toast.error(`${day.day}: break end must be after break start.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        availability: serializeAvailabilitySchedule(schedule),
        availabilityStatus: status,
      });
      toast.success("Availability schedule saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Availability Schedule</CardTitle>
            <CardDescription>
              Patients can only book appointments during your available hours
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="availability-status">Availability Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "AVAILABLE" | "UNAVAILABLE")}
          >
            <SelectTrigger id="availability-status" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVAILABLE">Available for bookings</SelectItem>
              <SelectItem value="UNAVAILABLE">Unavailable (no new bookings)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Working Days & Hours</p>
          {schedule.map((day, index) => (
            <div
              key={day.day}
              className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id={`day-${day.dayOfWeek}`}
                    checked={day.enabled}
                    onCheckedChange={(checked) => updateDay(index, { enabled: checked })}
                  />
                  <Label htmlFor={`day-${day.dayOfWeek}`} className="font-medium">
                    {day.day}
                  </Label>
                </div>
              </div>

              {day.enabled ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(index, { startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(index, { endTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Break Start</Label>
                    <Input
                      type="time"
                      value={day.breakStart}
                      onChange={(e) => updateDay(index, { breakStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Break End</Label>
                    <Input
                      type="time"
                      value={day.breakEnd}
                      onChange={(e) => updateDay(index, { breakEnd: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
