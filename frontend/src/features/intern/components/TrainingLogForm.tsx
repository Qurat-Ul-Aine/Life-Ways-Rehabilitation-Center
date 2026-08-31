import { useEffect, useState } from "react";
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
import type { TrainingLogPayload } from "../intern.types";
import { TRAINING_LOG_TYPES } from "../constants";

type Props = {
  loading?: boolean;
  initialValues?: TrainingLogPayload;
  mode?: "create" | "edit";
  submitLabel?: string;
  onSubmit: (payload: TrainingLogPayload) => void | Promise<void>;
  onCancel?: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): TrainingLogPayload => ({
  hoursWorked: 0,
  tasksCompleted: "",
  learningNotes: "",
  skillsLearned: "",
  challenges: "",
  logDate: today(),
  logType: "daily",
});

export default function TrainingLogForm({
  loading,
  initialValues,
  mode = "create",
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<TrainingLogPayload>(initialValues ?? emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initialValues ?? emptyForm());
    setErrors({});
  }, [initialValues, mode]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.hoursWorked < 0 || form.hoursWorked > 24) {
      next.hoursWorked = "Hours must be between 0 and 24.";
    }
    if (!form.logDate) next.logDate = "Log date is required.";
    else if (Number.isNaN(Date.parse(form.logDate))) next.logDate = "Invalid date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
    if (mode === "create") {
      setForm(emptyForm());
    }
  };

  const defaultSubmitLabel =
    mode === "edit" ? "Save Changes" : loading ? "Saving..." : "Add Log Entry";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logDate">Log Date *</Label>
          <Input
            id="logDate"
            type="date"
            value={form.logDate}
            onChange={(e) => setForm((f) => ({ ...f, logDate: e.target.value }))}
          />
          {errors.logDate ? <p className="text-xs text-destructive">{errors.logDate}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="logType">Log Type *</Label>
          <Select
            value={form.logType ?? "daily"}
            onValueChange={(value: "daily" | "weekly") =>
              setForm((f) => ({ ...f, logType: value }))
            }
          >
            <SelectTrigger id="logType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_LOG_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hoursWorked">Hours Worked *</Label>
          <Input
            id="hoursWorked"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={form.hoursWorked}
            onChange={(e) =>
              setForm((f) => ({ ...f, hoursWorked: Number(e.target.value) }))
            }
          />
          {errors.hoursWorked ? (
            <p className="text-xs text-destructive">{errors.hoursWorked}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tasksCompleted">Tasks Completed</Label>
        <Textarea
          id="tasksCompleted"
          rows={3}
          value={form.tasksCompleted}
          onChange={(e) => setForm((f) => ({ ...f, tasksCompleted: e.target.value }))}
          placeholder="Describe tasks and clinical activities completed today..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="learningNotes">Learning Notes / Lessons</Label>
        <Textarea
          id="learningNotes"
          rows={3}
          value={form.learningNotes}
          onChange={(e) => setForm((f) => ({ ...f, learningNotes: e.target.value }))}
          placeholder="Key learnings, observations, and reflections..."
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel ?? defaultSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
