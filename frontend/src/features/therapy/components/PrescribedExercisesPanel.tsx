import { useState } from "react";
import { Dumbbell, Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { therapyService } from "../services/therapyService";
import type { TherapyExercise } from "../therapy.types";

type Props = {
  planId: string;
  exercises: TherapyExercise[];
  canManage?: boolean;
  compact?: boolean;
  onChanged?: () => void;
};

type Draft = { title: string; description: string };

const emptyDraft = (): Draft => ({ title: "", description: "" });

export default function PrescribedExercisesPanel({
  planId,
  exercises,
  canManage = true,
  compact = false,
  onChanged,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const textExercises = exercises.filter((ex) => !ex.media_url);

  const handleAdd = async () => {
    if (!addDraft.title.trim()) return toast.error("Enter an exercise title.");
    setAdding(true);
    try {
      await therapyService.createExercise(planId, {
        title: addDraft.title.trim(),
        description: addDraft.description.trim() || undefined,
      });
      toast.success("Exercise added to patient plan.");
      setAddDraft(emptyDraft());
      setShowAdd(false);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add exercise.");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (ex: TherapyExercise) => {
    setEditingId(ex.id);
    setEditDraft({
      title: ex.title ?? ex.name ?? "",
      description: ex.description ?? "",
    });
  };

  const handleSaveEdit = async (exerciseId: string) => {
    if (!editDraft.title.trim()) return toast.error("Title cannot be empty.");
    setBusyId(exerciseId);
    try {
      await therapyService.updateExercise(planId, exerciseId, {
        title: editDraft.title.trim(),
        description: editDraft.description.trim() || undefined,
      });
      toast.success("Exercise updated.");
      setEditingId(null);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (exerciseId: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from the patient's prescribed exercises?`)) return;
    setBusyId(exerciseId);
    try {
      await therapyService.deleteExercise(planId, exerciseId);
      toast.success("Exercise removed.");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const labelClass = compact ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground";
  const fieldClass = compact ? "text-[11px]" : "text-sm";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className={cn("font-semibold text-foreground", compact ? "text-[12px]" : "text-sm")}>
          Prescribed exercises
          <span className="ml-2 font-normal text-muted-foreground">({textExercises.length})</span>
        </p>
        {canManage && (
          <Button
            type="button"
            variant={showAdd ? "secondary" : "outline"}
            size="sm"
            className={cn("gap-1", compact && "h-7 text-[10px]")}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? <X size={12} /> : <Plus size={12} />}
            {showAdd ? "Cancel" : "Add"}
          </Button>
        )}
      </div>

      {canManage && showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
          <div>
            <Label className={labelClass}>Exercise title *</Label>
            <Input
              value={addDraft.title}
              onChange={(e) => setAddDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. Shoulder pendulum swings"
              className={cn(compact && "h-8 text-[11px]")}
            />
          </div>
          <div>
            <Label className={labelClass}>Instructions for patient</Label>
            <Textarea
              value={addDraft.description}
              onChange={(e) => setAddDraft((d) => ({ ...d, description: e.target.value }))}
              rows={compact ? 2 : 3}
              placeholder="Reps, duration, cues…"
              className={fieldClass}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className={cn("w-full", compact && "h-8 text-[11px]")}
            disabled={adding || !addDraft.title.trim()}
            onClick={() => void handleAdd()}
          >
            {adding ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
            {adding ? "Adding…" : "Add to therapy plan"}
          </Button>
        </div>
      )}

      {textExercises.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
          <Dumbbell size={22} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className={cn("font-medium text-foreground", compact ? "text-[12px]" : "text-sm")}>
            No prescribed exercises yet
          </p>
          <p className={cn("mt-1 text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            Add text instructions the patient will see on their Therapy Plan.
          </p>
        </div>
      ) : (
        <ul className={cn("space-y-2", compact && "max-h-80 overflow-y-auto pr-0.5")}>
          {textExercises.map((ex) => {
            const title = ex.title ?? ex.name ?? "Exercise";
            const isEditing = editingId === ex.id;
            const busy = busyId === ex.id;

            return (
              <li
                key={ex.id}
                className="rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-colors hover:border-primary/20"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      className={cn(compact && "h-8 text-[11px]")}
                    />
                    <Textarea
                      value={editDraft.description}
                      onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                      rows={2}
                      className={fieldClass}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className={cn("flex-1", compact && "h-7 text-[10px]")}
                        disabled={busy}
                        onClick={() => void handleSaveEdit(ex.id)}
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="mr-1" />}
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={compact ? "h-7 text-[10px]" : ""}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Dumbbell size={16} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-semibold text-foreground", compact ? "text-[12px]" : "text-sm")}>
                        {title}
                      </p>
                      {ex.description?.trim() ? (
                        <p
                          className={cn(
                            "mt-1 text-muted-foreground whitespace-pre-wrap leading-relaxed",
                            compact ? "text-[10px]" : "text-xs",
                          )}
                        >
                          {ex.description}
                        </p>
                      ) : (
                        <p className={cn("mt-1 text-muted-foreground/70 italic", compact ? "text-[10px]" : "text-xs")}>
                          No instructions added
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit exercise"
                          onClick={() => startEdit(ex)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete exercise"
                          disabled={busy}
                          onClick={() => void handleDelete(ex.id, title)}
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
