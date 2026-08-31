import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { patientService } from "@/features/patient/services/patientService";
import type { Patient } from "@/features/patient/patient.types";
import { doctorService } from "@/features/doctor/services/doctorService";
import { therapyService } from "../services/therapyService";

type SelectOption = { id: string; name: string };

const toSelectOption = (
  id: string | number | null | undefined,
  name: string | null | undefined,
  fallback: string,
): SelectOption | null => {
  const normalizedId = String(id ?? "").trim();
  if (!normalizedId) return null;
  const label = String(name ?? "").trim();
  return { id: normalizedId, name: label || fallback };
};

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

export default function AddTherapyPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  const [patients, setPatients] = useState<SelectOption[]>([]);
  const [doctors, setDoctors] = useState<SelectOption[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [doctorId, setDoctorId] = useState<string | undefined>(undefined);
  const [therapyType, setTherapyType] = useState(THERAPY_TYPES[0]);
  const [description, setDescription] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(2);
  const [status, setStatus] = useState("active");
  const [goalsText, setGoalsText] = useState("");

  useEffect(() => {
    setLoadingPatients(true);
    patientService
      .list({ pageSize: 200 })
      .then((res) => {
        const options = (res.items ?? [])
          .map((p: Patient) =>
            toSelectOption(p.id, p.fullName ?? (p as { name?: string }).name, "Patient"),
          )
          .filter((p): p is SelectOption => p !== null);
        setPatients(options);
      })
      .catch((err) => {
        setPatients([]);
        toast.error(err instanceof Error ? err.message : "Failed to load patients.");
      })
      .finally(() => setLoadingPatients(false));

    setLoadingDoctors(true);
    doctorService
      .getAll({ approved: true, limit: 100 })
      .then((res) => {
        const options = (res.items ?? [])
          .map((d) => toSelectOption(d.id, d.name, "Therapist"))
          .filter((d): d is SelectOption => d !== null);
        setDoctors(options);
      })
      .catch((err) => {
        setDoctors([]);
        toast.error(err instanceof Error ? err.message : "Failed to load therapists.");
      })
      .finally(() => setLoadingDoctors(false));
  }, []);

  const submit = async () => {
    if (!patientId || !doctorId) return toast.error("Select patient and therapist.");
    if (!therapyType.trim()) return toast.error("Therapy type is required.");
    setSubmitting(true);
    try {
      const plan = await therapyService.createPlan({
        patient_id: patientId,
        doctor_id: doctorId,
        therapy_type: therapyType,
        description: description.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        start_date: startDate,
        end_date: endDate || undefined,
        status,
        goals: goalsText.split("\n").map((g) => g.trim()).filter(Boolean),
        frequencyPerWeek,
      });
      toast.success("Therapy plan created.");
      navigate(`${basePath}/therapy/${plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New Therapy Plan"
        subtitle="Create and assign a therapy plan to a patient."
        action={
          <Button variant="outline" onClick={() => navigate(`${basePath}/therapy`)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <Card>
        <CardHeader><CardTitle className="text-lg">Plan Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select
                value={patientId}
                onValueChange={setPatientId}
                disabled={loadingPatients}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingPatients ? "Loading patients..." : "Select patient"}
                  />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {patients.length === 0 ? (
                    <SelectItem value="__no_patients" disabled>
                      {loadingPatients ? "Loading..." : "No patients available"}
                    </SelectItem>
                  ) : (
                    patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Therapist *</Label>
              <Select
                value={doctorId}
                onValueChange={setDoctorId}
                disabled={loadingDoctors}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={loadingDoctors ? "Loading therapists..." : "Select therapist"}
                  />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {doctors.length === 0 ? (
                    <SelectItem value="__no_doctors" disabled>
                      {loadingDoctors ? "Loading..." : "No therapists available"}
                    </SelectItem>
                  ) : (
                    doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Therapy Type *</Label>
              <Select value={therapyType} onValueChange={setTherapyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THERAPY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
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
          </div>

          <div className="space-y-1.5">
            <Label>Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Major Depressive Disorder, Substance Use Disorder..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Treatment plan overview..."
            />
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
            <Textarea
              rows={4}
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              placeholder={"Reduce anxiety symptoms\nImprove daily functioning\nBuild coping skills..."}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
