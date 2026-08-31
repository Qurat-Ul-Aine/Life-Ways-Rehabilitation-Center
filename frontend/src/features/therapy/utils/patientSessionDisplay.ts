import type { TherapyExercise, TherapySessionRecord } from "../therapy.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LegacyParsed = {
  summary: string;
  chiefComplaint: string;
  observations: string;
  exercisesRaw: string;
  nextSteps: string;
};

function splitList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strip legacy bracketed sections merged into progress_notes when migration columns are missing. */
export function parseLegacyProgressNotes(raw: string): LegacyParsed {
  const blocks = raw.split(/\n\n+/);
  const summaryParts: string[] = [];
  let chiefComplaint = "";
  let observations = "";
  let exercisesRaw = "";
  let nextSteps = "";

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (/^\[Chief complaint\]/i.test(trimmed)) {
      chiefComplaint = trimmed.replace(/^\[Chief complaint\]\s*/i, "").trim();
      continue;
    }
    if (/^\[Observations\]/i.test(trimmed)) {
      observations = trimmed.replace(/^\[Observations\]\s*/i, "").trim();
      continue;
    }
    if (/^\[Exercises\]/i.test(trimmed)) {
      exercisesRaw = trimmed.replace(/^\[Exercises\]\s*/i, "").trim();
      continue;
    }
    if (/^\[Next steps\]/i.test(trimmed)) {
      nextSteps = trimmed.replace(/^\[Next steps\]\s*/i, "").trim();
      continue;
    }

    summaryParts.push(trimmed);
  }

  return {
    summary: summaryParts.join("\n\n").trim(),
    chiefComplaint,
    observations,
    exercisesRaw,
    nextSteps,
  };
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function resolveExerciseName(
  item: string,
  exercises: TherapyExercise[],
): string | null {
  const trimmed = item.trim();
  if (!trimmed) return null;

  if (isUuid(trimmed)) {
    const match = exercises.find((ex) => ex.id === trimmed);
    const name = match?.title ?? match?.name;
    return name?.trim() ? name.trim() : null;
  }

  const lower = trimmed.toLowerCase();
  const byTitle = exercises.find((ex) => {
    const title = (ex.title ?? ex.name ?? "").trim().toLowerCase();
    return title && (title === lower || lower.includes(title) || title.includes(lower));
  });
  if (byTitle) return (byTitle.title ?? byTitle.name ?? trimmed).trim();

  return trimmed;
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function observationsToBullets(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) return lines;

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  return sentences.length > 1 ? sentences : [trimmed];
}

export type PatientSessionView = {
  dateLabel: string;
  durationMinutes: number | null;
  sessionType: "telehealth" | "in_person" | null;
  summary: string;
  summaryPending: boolean;
  workedOn: string[];
  exercises: string[];
  nextSteps: string;
  therapistName: string;
  hasContent: boolean;
};

export function formatPatientSessionDate(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeSessionType(session: TherapySessionRecord): PatientSessionView["sessionType"] {
  const raw = String(session.sessionType ?? session.session_type ?? "").toUpperCase();
  if (raw === "TELEHEALTH") return "telehealth";
  if (raw === "IN_PERSON") return "in_person";
  return null;
}

export function buildPatientSessionView(
  session: TherapySessionRecord,
  planExercises: TherapyExercise[],
  therapistName: string,
): PatientSessionView {
  const rawNote = (session.progress_notes ?? session.notes ?? "").trim();
  const legacy = parseLegacyProgressNotes(rawNote);

  const apiObservations = (session.observations ?? "").trim();
  const apiNextSteps = (session.nextSteps ?? session.next_steps ?? "").trim();
  const apiChief = (session.chiefComplaint ?? session.chief_complaint ?? "").trim();

  const summary = legacy.summary || (legacy.chiefComplaint || legacy.observations || legacy.exercisesRaw || legacy.nextSteps ? "" : rawNote);
  const summaryPending = !summary.trim();

  const workedOnSource = [apiChief || legacy.chiefComplaint, apiObservations || legacy.observations]
    .filter(Boolean)
    .join("\n\n");
  const workedOn = observationsToBullets(workedOnSource);

  const discussed = [
    ...(session.exercisesDiscussed ?? session.exercises_discussed ?? []),
    ...splitList(legacy.exercisesRaw),
    ...(session.exercisesCompleted ?? []),
  ];

  const exercises = uniqueLabels(
    discussed
      .map((item) => resolveExerciseName(String(item), planExercises))
      .filter((name): name is string => Boolean(name?.trim())),
  );

  const nextSteps = apiNextSteps || legacy.nextSteps;

  const hasContent =
    !summaryPending || workedOn.length > 0 || exercises.length > 0 || Boolean(nextSteps.trim());

  const duration = session.durationMinutes ?? session.duration;

  return {
    dateLabel: formatPatientSessionDate(session.session_date ?? session.date),
    durationMinutes: duration && duration > 0 ? duration : null,
    sessionType: normalizeSessionType(session),
    summary: summary.trim(),
    summaryPending,
    workedOn,
    exercises,
    nextSteps: nextSteps.trim(),
    therapistName,
    hasContent,
  };
}
