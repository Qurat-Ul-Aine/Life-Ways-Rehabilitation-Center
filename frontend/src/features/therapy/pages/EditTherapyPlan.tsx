import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { doctorService } from "@/features/doctor/services/doctorService";
import { therapyService } from "../services/therapyService";
import type { TherapyPlan } from "../therapy.types";

const THERAPY_TYPES = [
  "Cognitive Behavioral Therapy (CBT)",
  "Dialectical Behavior Therapy (DBT)",
  "Addiction Recovery Therapy",
  "Psychosocial Rehabilitation",
  "Occupational Therapy",
  "Physiotherapy",
  "Speech Therapy",
  "Group Therapy",
  "Family Therapy",
  "Trauma-Focused Therapy",
];

const normalizeStatus = (status?: string) => {
  const s = String(status ?? "active").toLowerCase();
  if (s === "active") return "active";
  if (s === "completed") return "completed";
  if (s === "paused" || s === "on_hold") return "paused";
  if (s === "cancelled") return "cancelled";
  return "active";
};

export default function EditTherapyPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  const [plan, setPlan] = useState<TherapyPlan | null>(null);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [doctorId, setDoctorId] = useState("");
  const [therapyType, setTherapyType] = useState("");
  const [description, setDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(2);
  const [status, setStatus] = useState("active");
  const [goalsText, setGoalsText] = useState("");

  useEffect(() => {
    if (!id) return;
    therapyService.getPlan(id).then((p) => {
      setPlan(p);
      setDoctorId(p.doctor_id ?? p.doctorId ?? p.therapistId ?? "");
      setTherapyType(p.therapy_type ?? p.title ?? THERAPY_TYPES[0]);
      setDescription(p.description ?? "");
      setDiagnosis(p.diagnosis ?? "");
      setStartDate(p.start_date?.slice(0, 10) ?? p.startDate?.slice(0, 10) ?? "");
      setEndDate(p.end_date?.slice(0, 10) ?? p.endDate?.slice(0, 10) ?? "");
      setFrequencyPerWeek(p.frequencyPerWeek ?? p.frequency_per_week ?? 2);
      setStatus(normalizeStatus(p.status as string));
      setGoalsText((p.goals ?? []).join("\n"));
    }).catch((e) => toast.error(e.message));

    doctorService.getAll({ approved: true, limit: 100 }).then((res) =>
      setDoctors(res.items.map((d) => ({ id: d.id, name: d.name })))
    ).catch(() => {});
  }, [id]);

  const submit = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      await therapyService.updatePlan(plan.id, {
        doctor_id: doctorId || undefined,
        therapy_type: therapyType,
        description: description.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status,
        goals: goalsText.split("\n").map((g) => g.trim()).filter(Boolean),
        frequencyPerWeek,
      });
      toast.success("Plan updated.");
      navigate(`${basePath}/therapy/${plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan) {
    return (
      <>
        <p className="text-sm text-muted-foreground p-6">Loading...</p>
      </>
    );
  }

  const patientName = plan.patientName ?? plan.patients?.users?.name ?? "Patient";

  return (
    <>
      <PageHeader
        title="Edit Therapy Plan"
        subtitle={plan.therapy_type ?? plan.title ?? ""}
        action={
          <Button variant="outline" onClick={() => navigate(`${basePath}/therapy/${plan.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <Card>
        <CardHeader><CardTitle className="text-lg">Plan Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Input value={patientName} disabled />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assigned Therapist</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select therapist" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Therapy Type *</Label>
              <Select value={therapyType} onValueChange={setTherapyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THERAPY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sessions / Week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={frequencyPerWeek}
                onChange={(e) => setFrequencyPerWeek(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Goals (one per line)</Label>
            <Textarea rows={4} value={goalsText} onChange={(e) => setGoalsText(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
