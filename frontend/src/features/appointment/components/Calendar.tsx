import { useMemo } from "react";
import type { Appointment } from "../appointment.types";

type Props = {
  month: Date;
  appointments: Appointment[];
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AppointmentCalendar({ month, appointments, onSelectDate, selectedDate }: Props) {
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const out: { date: Date; iso: string; inMonth: boolean; count: number }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      out.push({
        date: d,
        iso,
        inMonth: d.getMonth() === month.getMonth(),
        count: appointments.filter((a) => a.date === iso && a.status !== "cancelled").length,
      });
    }
    return out;
  }, [month, appointments]);

  return (
    <div className="rounded-lg border bg-background">
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const isSelected = selectedDate === c.iso;
          const isToday = c.iso === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onSelectDate?.(c.iso)}
              className={[
                "h-20 border-b border-r p-1.5 text-left text-xs transition-colors",
                c.inMonth ? "" : "bg-muted/30 text-muted-foreground",
                isSelected ? "ring-2 ring-primary ring-inset" : "hover:bg-muted/50",
              ].join(" ")}
            >
              <div className={[
                "inline-flex h-6 w-6 items-center justify-center rounded-full",
                isToday ? "bg-primary text-primary-foreground" : "",
              ].join(" ")}>
                {c.date.getDate()}
              </div>
              {c.count > 0 ? (
                <div className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {c.count} appt
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}