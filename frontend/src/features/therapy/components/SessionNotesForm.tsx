import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SessionType, TherapyExercise } from "../therapy.types";

export type SessionNotesFormValues = {
  session_date: string;
  duration: number;
  session_type: SessionType;
  chief_complaint: string;
  observations: string;
  progress_notes: string;
  exercises_discussed: string;
  next_steps: string;
  confidential_notes: string;
  status: string;
  mood: string;
  outcome: string;
  pain_level: string;
};

type Props = {
  defaultSessionType?: SessionType;
  exercises?: TherapyExercise[];
  showConfidential?: boolean;
  compact?: boolean;
  stickyFooter?: boolean;
  initialValues?: Partial<SessionNotesFormValues>;
  saving?: boolean;
  onSave: (values: SessionNotesFormValues) => void | Promise<void>;
  onReset?: () => void;
};

const OUTCOME_OPTIONS = [
  { label: "Improved", value: "improved" },
  { label: "Stable", value: "no-change" },
  { label: "Regressed", value: "regressed" },
];

const STATUS_OPTIONS = [
  { label: "Completed", value: "COMPLETED" },
  { label: "Missed", value: "CANCELLED" },
  { label: "Rescheduled", value: "SCHEDULED" },
];

const MOOD_OPTIONS = ["Positive", "Neutral", "Difficult"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSessionType(type?: SessionType): SessionType {
  const raw = String(type ?? "IN_PERSON").toUpperCase();
  return raw === "TELEHEALTH" ? "TELEHEALTH" : "IN_PERSON";
}

export function buildSessionNotesInitialValues(
  partial?: Partial<SessionNotesFormValues>,
  defaultSessionType: SessionType = "IN_PERSON",
): SessionNotesFormValues {
  return {
    session_date: partial?.session_date ?? todayStr(),
    duration: partial?.duration ?? 45,
    session_type: normalizeSessionType(partial?.session_type ?? defaultSessionType),
    chief_complaint: partial?.chief_complaint ?? "",
    observations: partial?.observations ?? "",
    progress_notes: partial?.progress_notes ?? "",
    exercises_discussed: partial?.exercises_discussed ?? "",
    next_steps: partial?.next_steps ?? "",
    confidential_notes: partial?.confidential_notes ?? "",
    status: partial?.status ?? "COMPLETED",
    mood: partial?.mood ?? "",
    outcome: partial?.outcome ?? "no-change",
    pain_level: partial?.pain_level ?? "",
  };
}

export default function SessionNotesForm({
  defaultSessionType = "IN_PERSON",
  exercises = [],
  showConfidential = true,
  compact = false,
  stickyFooter = false,
  initialValues,
  saving = false,
  onSave,
  onReset,
}: Props) {
  const [values, setValues] = useState<SessionNotesFormValues>(() =>
    buildSessionNotesInitialValues(initialValues, defaultSessionType),
  );

  const exerciseHints = useMemo(
    () =>
      exercises
        .map((ex) => ex.title ?? ex.name)
        .filter((name): name is string => Boolean(name?.trim())),
    [exercises],
  );

  const update = <K extends keyof SessionNotesFormValues>(key: K, value: SessionNotesFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setValues(buildSessionNotesInitialValues(undefined, defaultSessionType));
    onReset?.();
  };

  const handleSubmit = () => {
    if (!values.progress_notes.trim()) return;
    void onSave(values);
  };

  const fieldClass = compact ? "text-[11px]" : "text-sm";
  const labelClass = compact
    ? "text-[10px] text-muted-foreground"
    : "text-xs text-muted-foreground";

  const fields = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className={labelClass}>Session date</Label>
          <Input
            type="date"
            value={values.session_date}
            onChange={(e) => update("session_date", e.target.value)}
            className={compact ? "h-8 text-[11px]" : "h-9"}
          />
        </div>
        <div>
          <Label className={labelClass}>Duration (min)</Label>
          <Input
            type="number"
            min={1}
            value={values.duration}
            onChange={(e) => update("duration", Number(e.target.value) || 0)}
            className={compact ? "h-8 text-[11px]" : "h-9"}
          />
        </div>
      </div>

      <div>
        <Label className={labelClass}>Session type</Label>
        <Select
          value={normalizeSessionType(values.session_type)}
          onValueChange={(v) => update("session_type", v as SessionType)}
        >
          <SelectTrigger className={compact ? "h-8 text-[11px]" : "h-9"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IN_PERSON">In-person</SelectItem>
            <SelectItem value="TELEHEALTH">Telehealth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update("status", opt.value)}
            className={`rounded-lg border py-1.5 ${fieldClass} transition-colors ${
              values.status === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <Label className={labelClass}>Chief complaint / reason</Label>
        <Textarea
          value={values.chief_complaint}
          onChange={(e) => update("chief_complaint", e.target.value)}
          rows={2}
          placeholder="Why was today's session scheduled?"
          className={fieldClass}
        />
      </div>

      <div>
        <Label className={labelClass}>Observations (pain, mobility, mood)</Label>
        <Textarea
          value={values.observations}
          onChange={(e) => update("observations", e.target.value)}
          rows={2}
          placeholder="Clinical observations from the session"
          className={fieldClass}
        />
      </div>

      <div>
        <Label className={labelClass}>Progress notes *</Label>
        <Textarea
          value={values.progress_notes}
          onChange={(e) => update("progress_notes", e.target.value)}
          rows={compact ? 3 : 4}
          placeholder="What improved, what did not — patient-visible summary"
          className={fieldClass}
        />
      </div>

      <div>
        <Label className={labelClass}>Prescribed exercises</Label>
        <Textarea
          value={values.exercises_discussed}
          onChange={(e) => update("exercises_discussed", e.target.value)}
          rows={2}
          placeholder={
            exerciseHints.length
              ? `e.g. ${exerciseHints.slice(0, 3).join(", ")}`
              : "Exercises prescribed or discussed today (comma or new line separated)"
          }
          className={fieldClass}
        />
      </div>

      <div>
        <Label className={labelClass}>Next steps / follow-up plan</Label>
        <Textarea
          value={values.next_steps}
          onChange={(e) => update("next_steps", e.target.value)}
          rows={2}
          placeholder="Focus for next session, homework, follow-up date"
          className={fieldClass}
        />
      </div>

      {showConfidential && (
        <div>
          <Label className={labelClass}>Confidential internal notes (not shown to patient)</Label>
          <Textarea
            value={values.confidential_notes}
            onChange={(e) => update("confidential_notes", e.target.value)}
            rows={2}
            placeholder="Sensitive clinical observations — doctor/admin only"
            className={fieldClass}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className={labelClass}>Patient mood</Label>
          <div className="flex gap-1">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update("mood", m)}
                className={`flex-1 rounded-lg border py-1.5 ${fieldClass} ${
                  values.mood === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className={labelClass}>Pain level (0–10)</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={values.pain_level}
            onChange={(e) => update("pain_level", e.target.value)}
            className={compact ? "h-8 text-[11px]" : "h-9"}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label className={labelClass}>Progress observed</Label>
        <div className="flex gap-1.5">
          {OUTCOME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("outcome", opt.value)}
              className={`flex-1 rounded-lg border py-1.5 ${fieldClass} ${
                values.outcome === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const actions = (
    <div className="flex gap-2">
      <Button
        type="button"
        className={compact ? "h-8 flex-1 text-[11px]" : "flex-1"}
        disabled={saving || !values.progress_notes.trim()}
        onClick={handleSubmit}
      >
        {saving ? "Saving…" : "Save session notes"}
      </Button>
      {onReset && (
        <Button
          type="button"
          variant="outline"
          className={compact ? "h-8 text-[11px]" : ""}
          onClick={handleReset}
          disabled={saving}
        >
          Reset
        </Button>
      )}
    </div>
  );

  if (stickyFooter) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-2 pr-1">
          {fields}
        </div>
        <div className="shrink-0 border-t border-border bg-background pt-3">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields}
      {actions}
    </div>
  );
}
