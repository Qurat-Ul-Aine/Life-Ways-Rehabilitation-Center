import { CalendarDays, Clock } from "lucide-react";
import type { Doctor } from "@/data/doctors";

const WEEKDAY_SLOTS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIME_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

type Props = {
  doctor?: Doctor;
  title?: string;
};

export default function DoctorAvailabilityPreview({
  doctor,
  title = "Check Availability",
}: Props) {
  return (
    <section id="availability" className="py-16 bg-section-alt scroll-mt-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Schedule</span>
          <h2 className="text-2xl md:text-3xl font-bold mt-2">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {doctor
              ? `Typical availability for ${doctor.name}. Sign in to book a confirmed slot.`
              : "Browse typical appointment windows. Sign in to book a confirmed slot."}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8 space-y-6">
          {doctor ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                  doctor.available
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {doctor.available ? "Available this week" : "Limited availability"}
              </span>
              <span className="text-muted-foreground">{doctor.location}</span>
            </div>
          ) : null}

          <div>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              Weekdays
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_SLOTS.map((day) => (
                <span
                  key={day}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Clock className="h-4 w-4 text-primary" />
              Common time slots
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => (
                <span
                  key={slot}
                  className="rounded-lg border border-border bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
