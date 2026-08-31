import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { therapyService } from "../services/therapyService";
import type { SessionOutcome, TherapyPlan, TherapySessionRecord } from "../therapy.types";

type Props = { plan: TherapyPlan; canRecord: boolean };

const OUTCOME_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  improved: "default",
  "no-change": "secondary",
  regressed: "outline",
  "n/a": "outline",
};

export default function SessionTracker({ plan, canRecord }: Props) {
  const [items, setItems] = useState<TherapySessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    setLoading(true);
    therapyService.listSessions(plan.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refetch(); }, [plan.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} session(s) recorded</p>
        {canRecord && <RecordDialog planId={plan.id} onSaved={refetch} />}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading sessions...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
      ) : (
        items.map((s) => {
          const date = s.session_date?.slice(0, 10) ?? s.date ?? "—";
          const duration = s.duration ?? s.durationMinutes ?? 0;
          const notes = s.progress_notes ?? s.notes ?? "";
          const outcome = s.outcome ?? "n/a";
          const pain = s.painLevel ?? s.pain_level;
          const attendance = s.attendance ?? (s.status === "CANCELLED" ? "absent" : "present");
          return (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{date}</p>
                <Badge variant={OUTCOME_VARIANT[outcome] ?? "outline"}>{outcome}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {duration} min
                {` · ${attendance}`}
                {typeof pain === "number" ? ` · pain ${pain}/10` : ""}
              </p>
              {notes && <p className="text-sm mt-2">{notes}</p>}
            </div>
          );
        })
      )}
    </div>
  );
}

function RecordDialog({ planId, onSaved }: { planId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(45);
  const [outcome, setOutcome] = useState<SessionOutcome>("improved");
  const [painLevel, setPainLevel] = useState(3);
  const [notes, setNotes] = useState("");
  const [attendance, setAttendance] = useState("present");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await therapyService.recordSession({
        planId,
        session_date: date,
        duration,
        progress_notes: notes.trim(),
        status: attendance === "absent" ? "CANCELLED" : "COMPLETED",
        attendance,
        outcome,
        painLevel,
      });
      toast.success("Session recorded.");
      setOpen(false);
      setNotes("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" /> Record Session</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Record Therapy Session</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Session Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Duration (min)</Label><Input type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Attendance</Label>
              <Select value={attendance} onValueChange={setAttendance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as SessionOutcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="improved">Improved</SelectItem>
                  <SelectItem value="no-change">No Change</SelectItem>
                  <SelectItem value="regressed">Regressed</SelectItem>
                  <SelectItem value="n/a">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pain Level (0–10): {painLevel}</Label>
            <Input type="range" min={0} max={10} value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} />
          </div>
          <div><Label>Therapist Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Session observations, patient progress..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving..." : "Save Session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}