import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Loader2,
  Lock,
  Pencil,
  StickyNote,
  Trash2,
  Video,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TherapySessionRecord } from "../therapy.types";
import SessionNotesForm, {
  buildSessionNotesInitialValues,
  type SessionNotesFormValues,
} from "./SessionNotesForm";
import { therapyService } from "../services/therapyService";
import { toast } from "sonner";

type Props = {
  planId: string;
  sessions: TherapySessionRecord[];
  therapist?: string;
  showConfidential?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  compact?: boolean;
  onUpdated?: () => void;
};

function formatDate(raw?: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sessionTypeLabel(type?: string | null) {
  const raw = String(type ?? "").toUpperCase();
  if (raw === "TELEHEALTH") return { label: "Telehealth", Icon: Video };
  if (raw === "IN_PERSON") return { label: "In-person", Icon: MapPin };
  return null;
}

function outcomeLabel(outcome?: string | null) {
  const map: Record<string, { label: string; className: string }> = {
    improved: { label: "Improved", className: "border-emerald-200 text-emerald-700 bg-emerald-50/50" },
    "no-change": { label: "Stable", className: "border-amber-200 text-amber-700 bg-amber-50/50" },
    regressed: { label: "Regressed", className: "border-red-200 text-red-700 bg-red-50/50" },
  };
  return outcome ? map[outcome] ?? null : null;
}

function exercisesList(session: TherapySessionRecord): string[] {
  const discussed = session.exercisesDiscussed ?? session.exercises_discussed ?? [];
  if (discussed.length > 0) return discussed;
  return session.exercisesCompleted ?? [];
}

function sessionToFormValues(session: TherapySessionRecord): SessionNotesFormValues {
  const discussed = exercisesList(session);
  return buildSessionNotesInitialValues({
    session_date: session.session_date ?? session.date ?? undefined,
    duration: session.durationMinutes ?? session.duration ?? 45,
    session_type: session.sessionType ?? session.session_type ?? "IN_PERSON",
    chief_complaint: session.chiefComplaint ?? session.chief_complaint ?? "",
    observations: session.observations ?? "",
    progress_notes: session.progress_notes ?? session.notes ?? "",
    exercises_discussed: discussed.join("\n"),
    next_steps: session.nextSteps ?? session.next_steps ?? "",
    confidential_notes: session.confidentialNotes ?? session.confidential_notes ?? "",
    status: session.status ?? "COMPLETED",
    mood: session.mood ?? "",
    outcome: session.outcome ?? "no-change",
    pain_level:
      session.painLevel != null || session.pain_level != null
        ? String(session.painLevel ?? session.pain_level)
        : "",
  });
}

export default function SessionNotesHistory({
  planId,
  sessions,
  therapist = "Therapist",
  showConfidential = false,
  canEdit = false,
  canDelete = false,
  compact = false,
  onUpdated,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => {
    const da = a.session_date ?? a.date ?? "";
    const db = b.session_date ?? b.date ?? "";
    return db.localeCompare(da);
  });

  const handleSave = async (sessionId: string, values: SessionNotesFormValues) => {
    setSavingId(sessionId);
    try {
      await therapyService.updateSession(planId, sessionId, {
        session_date: values.session_date,
        duration: values.duration,
        session_type: values.session_type,
        chief_complaint: values.chief_complaint,
        observations: values.observations,
        progress_notes: values.progress_notes,
        exercises_discussed: values.exercises_discussed,
        next_steps: values.next_steps,
        confidential_notes: values.confidential_notes,
        status: values.status,
        mood: values.mood || undefined,
        outcome: values.outcome as "improved" | "no-change" | "regressed" | "n/a",
        pain_level: values.pain_level ? Number(values.pain_level) : undefined,
      });
      toast.success("Session notes updated.");
      setEditingId(null);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notes.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (sessionId: string, dateLabel: string) => {
    if (!window.confirm(`Delete session notes from ${dateLabel}? This cannot be undone.`)) return;
    setDeletingId(sessionId);
    try {
      await therapyService.deleteSession(planId, sessionId);
      toast.success("Session notes removed.");
      if (expandedId === sessionId) setExpandedId(null);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete notes.");
    } finally {
      setDeletingId(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
        <StickyNote size={22} className="mx-auto mb-2 text-muted-foreground/40" />
        <p className={cn("font-medium text-foreground", compact ? "text-[12px]" : "text-sm")}>
          No session notes yet
        </p>
        <p className={cn("mt-1 text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
          Saved notes will appear here for quick review and editing.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", compact && "max-h-[28rem] overflow-y-auto pr-0.5")}>
      {sorted.map((session) => {
        const note = (session.progress_notes ?? session.notes ?? "").trim();
        const date = session.session_date ?? session.date;
        const dateLabel = formatDate(date);
        const outcome = outcomeLabel(session.outcome);
        const duration = session.durationMinutes ?? session.duration;
        const typeMeta = sessionTypeLabel(session.sessionType ?? session.session_type);
        const nextSteps = (session.nextSteps ?? session.next_steps ?? "").trim();
        const discussed = exercisesList(session);
        const confidential = (session.confidentialNotes ?? session.confidential_notes ?? "").trim();
        const isEditing = editingId === session.id;
        const isExpanded = expandedId === session.id;
        const busy = savingId === session.id || deletingId === session.id;

        return (
          <li
            key={session.id}
            className={cn(
              "rounded-xl border bg-card shadow-sm transition-all",
              isExpanded || isEditing
                ? "border-primary/25 ring-1 ring-primary/10"
                : "border-border/70 hover:border-primary/20",
            )}
          >
            {isEditing ? (
              <div className="p-3">
                <SessionNotesForm
                  compact
                  showConfidential={showConfidential}
                  initialValues={sessionToFormValues(session)}
                  saving={savingId === session.id}
                  onSave={(values) => void handleSave(session.id, values)}
                  onReset={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <StickyNote size={16} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={cn("font-semibold text-foreground", compact ? "text-[12px]" : "text-sm")}>
                        {dateLabel}
                      </p>
                      {typeMeta && (
                        <Badge variant="secondary" className="h-5 text-[9px] font-normal gap-0.5">
                          <typeMeta.Icon size={10} />
                          {typeMeta.label}
                        </Badge>
                      )}
                      {outcome && (
                        <Badge variant="outline" className={cn("h-5 text-[9px]", outcome.className)}>
                          {outcome.label}
                        </Badge>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 text-muted-foreground line-clamp-2",
                        compact ? "text-[10px]" : "text-xs",
                      )}
                    >
                      {note || nextSteps || "Session recorded"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-muted-foreground">
                      {duration ? (
                        <span className={cn("inline-flex items-center gap-1", compact ? "text-[10px]" : "text-xs")}>
                          <Clock size={11} />
                          {duration} min
                        </span>
                      ) : null}
                      {discussed.length > 0 && (
                        <span className={compact ? "text-[10px]" : "text-xs"}>
                          {discussed.length} exercise{discussed.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        disabled={busy}
                        onClick={() => {
                          setExpandedId(null);
                          setEditingId(session.id);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete"
                        disabled={busy}
                        onClick={() => void handleDelete(session.id, dateLabel)}
                      >
                        {deletingId === session.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/60 px-3 pb-3 pt-2 space-y-2.5">
                    {note && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Progress notes
                        </p>
                        <p className={cn("text-muted-foreground whitespace-pre-wrap leading-relaxed", compact ? "text-[11px]" : "text-sm")}>
                          {note}
                        </p>
                      </div>
                    )}
                    {discussed.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Prescribed exercises
                        </p>
                        <ul className="space-y-0.5">
                          {discussed.map((ex, i) => (
                            <li key={i} className={cn("text-foreground", compact ? "text-[11px]" : "text-sm")}>
                              • {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {nextSteps && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Next steps
                        </p>
                        <p className={cn("text-muted-foreground whitespace-pre-wrap", compact ? "text-[11px]" : "text-sm")}>
                          {nextSteps}
                        </p>
                      </div>
                    )}
                    {showConfidential && confidential && (
                      <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-2">
                        <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1 mb-1">
                          <Lock size={11} />
                          Confidential
                        </p>
                        <p className={cn("text-muted-foreground whitespace-pre-wrap", compact ? "text-[11px]" : "text-sm")}>
                          {confidential}
                        </p>
                      </div>
                    )}
                    <p className={cn("text-muted-foreground flex items-center gap-1", compact ? "text-[10px]" : "text-xs")}>
                      <Calendar size={11} />
                      {therapist}
                    </p>
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
