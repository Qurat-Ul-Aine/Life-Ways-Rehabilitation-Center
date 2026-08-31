import { useMemo } from "react";
import { Calendar, CheckCircle2, ChevronDown, Clock, MapPin, StickyNote, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TherapyExercise, TherapySessionRecord } from "../therapy.types";
import {
  buildPatientSessionView,
  type PatientSessionView,
} from "../utils/patientSessionDisplay";

type Props = {
  sessions: TherapySessionRecord[];
  exercises?: TherapyExercise[];
  therapist?: string;
  /** Hide detailed clinical observations (recovery / patient-safe view). */
  simplified?: boolean;
};

function SessionTypeBadge({ type }: { type: PatientSessionView["sessionType"] }) {
  if (!type) return null;

  if (type === "telehealth") {
    return (
      <Badge variant="secondary" className="h-6 gap-1 text-xs font-normal">
        <Video size={12} aria-hidden />
        Telehealth
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="h-6 gap-1 text-xs font-normal">
      <MapPin size={12} aria-hidden />
      In-person
    </Badge>
  );
}

function SessionAccordionBody({ view, simplified }: { view: PatientSessionView; simplified?: boolean }) {
  return (
    <div className="space-y-4 border-t border-border/50 px-4 py-4 sm:px-5">
      <section>
        <p className="mb-1.5 text-sm font-medium text-muted-foreground">Summary</p>
        {view.summaryPending ? (
          <p className="text-sm italic leading-relaxed text-muted-foreground">
            Detailed notes pending from your doctor
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-[15px]">
            {view.summary}
          </p>
        )}
      </section>

      {!simplified && view.workedOn.length > 0 && (
        <section>
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">What we worked on</p>
          <ul className="space-y-1.5">
            {view.workedOn.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.exercises.length > 0 && (
        <section>
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">Exercises assigned</p>
          <ul className="space-y-1.5">
            {view.exercises.map((name) => (
              <li key={name} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.nextSteps ? (
        <section>
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">Next steps</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-[15px]">
            {view.nextSteps}
          </p>
        </section>
      ) : null}

      {view.therapistName?.trim() ? (
        <footer className="border-t border-border/50 pt-3">
          <p className="text-sm text-muted-foreground">{view.therapistName}</p>
        </footer>
      ) : null}
    </div>
  );
}

export default function PatientSessionHistory({
  sessions,
  exercises = [],
  therapist = "",
  simplified = false,
}: Props) {
  const sortedViews = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const da = a.session_date ?? a.date ?? "";
      const db = b.session_date ?? b.date ?? "";
      return db.localeCompare(da);
    });

    return sorted.map((session, index) => ({
      id: session.id,
      sessionNumber: index + 1,
      view: buildPatientSessionView(session, exercises, therapist),
    }));
  }, [sessions, exercises, therapist]);

  if (sortedViews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-5 py-10 text-center">
        <StickyNote size={24} className="mx-auto mb-2 text-muted-foreground/40" aria-hidden />
        <p className="text-sm font-medium text-foreground">No sessions recorded yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          After your appointments, your therapist&apos;s notes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Session history">
      {sortedViews.map(({ id, sessionNumber, view }, index) => (
        <details
          key={id}
          className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
          open={index === 0}
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:px-5 [&::-webkit-details-marker]:hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar size={16} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground sm:text-base">
                  Session {sessionNumber} — {view.dateLabel}
                </h4>
                <SessionTypeBadge type={view.sessionType} />
              </div>
              {view.durationMinutes ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock size={13} aria-hidden />
                  {view.durationMinutes} minutes
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                "group-open:rotate-180",
              )}
              aria-hidden
            />
          </summary>
          <SessionAccordionBody view={view} simplified={simplified} />
        </details>
      ))}
    </div>
  );
}
