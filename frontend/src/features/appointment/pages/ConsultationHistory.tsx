import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { appointmentService } from "../services/appointmentService";
import type { Appointment, Consultation } from "../appointment.types";

export default function ConsultationHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "patient";

  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      setItems(await appointmentService.listConsultationsByPatient(patientId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const canRecord = role === "admin" || role === "doctor";

  return (
    <DashboardLayout>
      <PageHeader
        title="Consultation history"
        subtitle={patientId ? `Patient ${patientId}` : "Immutable consultation records"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {canRecord && patientId ? (
              <RecordConsultationDialog patientId={patientId} onRecorded={refetch} />
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Records ({items.length})</CardTitle>
          <CardDescription>Once recorded, consultations cannot be edited or deleted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consultation records yet.</p>
          ) : (
            items.map((c) => <ConsultationRow key={c.id} c={c} />)
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function ConsultationRow({ c }: { c: Consultation }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{c.doctorName}</span>
          <span className="text-xs text-muted-foreground">· {c.date}</span>
        </div>
        <span className="text-xs text-muted-foreground">{c.id}</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="Diagnosis" value={c.diagnosis} />
        <Field label="Prescription" value={c.prescription} />
        <Field label="Notes" value={c.notes} />
      </div>
      {c.followUpDate ? (
        <p className="mt-2 text-xs text-muted-foreground">Follow-up: {c.followUpDate}</p>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm">{value || "—"}</p>
    </div>
  );
}

function RecordConsultationDialog({
  patientId, onRecorded,
}: { patientId: string; onRecorded: () => void }) {
  const [open, setOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentId, setAppointmentId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  useEffect(() => {
    if (!open) return;
    void appointmentService.list({ patientId, status: "all" }).then((all) =>
      setAppointments(all.filter((a) => a.status !== "cancelled")),
    );
  }, [open, patientId]);

  const submit = async () => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return toast.error("Select an appointment.");
    if (!diagnosis.trim()) return toast.error("Diagnosis required.");
    try {
      await appointmentService.createConsultation({
        appointmentId: apt.id,
        patientId: apt.patientId,
        patientName: apt.patientName,
        doctorId: apt.doctorId,
        doctorName: apt.doctorName,
        date: apt.date,
        diagnosis: diagnosis.trim(),
        prescription: prescription.trim(),
        notes: notes.trim(),
        followUpDate: followUpDate || undefined,
      });
      toast.success("Consultation recorded.");
      setOpen(false);
      setAppointmentId(""); setDiagnosis(""); setPrescription(""); setNotes(""); setFollowUpDate("");
      onRecorded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Record consultation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Record consultation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Linked appointment *</Label>
            <Select value={appointmentId} onValueChange={setAppointmentId}>
              <SelectTrigger><SelectValue placeholder="Select appointment" /></SelectTrigger>
              <SelectContent>
                {appointments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.date} {a.startTime} — {a.doctorName} ({a.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Diagnosis *</Label><Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></div>
          <div><Label>Prescription</Label><Textarea rows={2} value={prescription} onChange={(e) => setPrescription(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div><Label>Follow-up date</Label><Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}