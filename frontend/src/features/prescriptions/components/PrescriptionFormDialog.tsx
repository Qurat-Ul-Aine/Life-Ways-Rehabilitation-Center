import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { DosePeriod, Prescription } from "../prescription.types";
import { prescriptionService } from "../services/prescriptionService";

type PatientOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientOption[];
  editing?: Prescription | null;
  onSaved: () => void;
};

const SCHEDULE_OPTIONS: { id: DosePeriod; label: string }[] = [
  { id: "MORNING", label: "Morning" },
  { id: "AFTERNOON", label: "Afternoon" },
  { id: "NIGHT", label: "Night" },
];

export default function PrescriptionFormDialog({
  open,
  onOpenChange,
  patients,
  editing,
  onSaved,
}: Props) {
  const [patientId, setPatientId] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [schedule, setSchedule] = useState<DosePeriod[]>([]);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setPatientId(editing.patientId);
      setMedicationName(editing.medicationName);
      setDosage(editing.dosage);
      setFrequency(editing.frequency);
      setDurationDays(editing.durationDays ? String(editing.durationDays) : "");
      setSchedule(editing.schedule ?? []);
      setInstructions(editing.instructions ?? "");
      setNotes(editing.notes ?? "");
      setStartDate(editing.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    } else {
      setPatientId(patients[0]?.id ?? "");
      setMedicationName("");
      setDosage("");
      setFrequency("");
      setDurationDays("");
      setSchedule([]);
      setInstructions("");
      setNotes("");
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, editing, patients]);

  const toggleSchedule = (period: DosePeriod) => {
    setSchedule((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period],
    );
  };

  const handleSubmit = async () => {
    if (!patientId || !medicationName.trim() || !dosage.trim() || !frequency.trim()) {
      setError("Patient, medication name, dosage, and frequency are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        patientId,
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        durationDays: durationDays ? Number(durationDays) : undefined,
        schedule,
        instructions: instructions.trim() || undefined,
        notes: notes.trim() || undefined,
        startDate,
      };

      if (editing) {
        await prescriptionService.update(editing.id, payload);
      } else {
        await prescriptionService.create(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Update prescription" : "Prescribe medication"}</DialogTitle>
          <DialogDescription>
            This will appear on the patient&apos;s Medications page automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={Boolean(editing)}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Medication name</Label>
              <Input value={medicationName} onChange={(e) => setMedicationName(e.target.value)} placeholder="Paracetamol 500mg" />
            </div>
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 tablet" />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Twice daily" />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Daily schedule</Label>
            <div className="flex flex-wrap gap-4">
              {SCHEDULE_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={schedule.includes(opt.id)}
                    onCheckedChange={() => toggleSchedule(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Take after meals" />
          </div>

          <div className="space-y-2">
            <Label>Doctor notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes for patient record" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Update" : "Prescribe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
