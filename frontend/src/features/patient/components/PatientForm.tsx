import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Patient, PatientCreatePayload } from "../patient.types";

type Props = {
  initial?: Partial<Patient>;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (payload: PatientCreatePayload) => void;
};

const empty: PatientCreatePayload = {
  fullName: "",
  email: "",
  phone: "",
  gender: "male",
  dateOfBirth: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  status: "active",
  admissionDate: new Date().toISOString().slice(0, 10),
  primaryDiagnosis: "",
  assignedDoctorId: undefined,
  assignedDoctorName: undefined,
};

const safeForm = (initial?: Partial<Patient>): PatientCreatePayload => ({
  ...empty,
  ...(initial as PatientCreatePayload),
  fullName: initial?.fullName ?? "",
  email: initial?.email ?? "",
  phone: initial?.phone ?? "",
  gender: initial?.gender ?? "male",
  dateOfBirth: initial?.dateOfBirth ?? "",
  address: initial?.address ?? "",
  emergencyContactName: initial?.emergencyContactName ?? "",
  emergencyContactPhone: initial?.emergencyContactPhone ?? "",
  status: initial?.status ?? "active",
  admissionDate: initial?.admissionDate ?? new Date().toISOString().slice(0, 10),
  primaryDiagnosis: initial?.primaryDiagnosis ?? "",
});

// ✅ FIX: Field component ko PatientForm se BAHAR nikala
// Pehle andar tha — har render pe naya component banta tha
// React unmount/remount karta tha — focus toot jaati thi har letter ke baad
function Field({
  id, label, error, children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export default function PatientForm({ initial, submitLabel, loading, onSubmit }: Props) {
  const [form, setForm] = useState<PatientCreatePayload>(safeForm(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) setForm(safeForm(initial));
  }, [initial]);

  const update = <K extends keyof PatientCreatePayload>(key: K, value: PatientCreatePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!String(form.fullName ?? "").trim()) next.fullName = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email ?? ""))) next.email = "Valid email is required.";
    if (String(form.phone ?? "").trim().length < 7) next.phone = "Phone number is too short.";
    if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required.";
    if (!form.admissionDate) next.admissionDate = "Admission date is required.";
    if (!String(form.address ?? "").trim()) next.address = "Address is required.";
    if (!String(form.emergencyContactName ?? "").trim()) next.emergencyContactName = "Required.";
    if (String(form.emergencyContactPhone ?? "").trim().length < 7) next.emergencyContactPhone = "Required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field id="fullName" label="Full name" error={errors.fullName}>
        <Input
          id="fullName"
          value={form.fullName ?? ""}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </Field>

      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          type="email"
          value={form.email ?? ""}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>

      <Field id="phone" label="Phone" error={errors.phone}>
        <Input
          id="phone"
          value={form.phone ?? ""}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>

      <Field id="gender" label="Gender">
        <Select
          value={form.gender ?? "male"}
          onValueChange={(v) => update("gender", v as Patient["gender"])}
        >
          <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
        <Input
          id="dateOfBirth"
          type="date"
          value={form.dateOfBirth?.slice(0, 10) ?? ""}
          onChange={(e) => update("dateOfBirth", e.target.value)}
        />
      </Field>

      <Field id="admissionDate" label="Admission date" error={errors.admissionDate}>
        <Input
          id="admissionDate"
          type="date"
          value={form.admissionDate?.slice(0, 10) ?? ""}
          onChange={(e) => update("admissionDate", e.target.value)}
        />
      </Field>

      <div className="md:col-span-2">
        <Field id="address" label="Address" error={errors.address}>
          <Textarea
            id="address"
            rows={2}
            value={form.address ?? ""}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>
      </div>

      <Field id="emergencyContactName" label="Emergency contact name" error={errors.emergencyContactName}>
        <Input
          id="emergencyContactName"
          value={form.emergencyContactName ?? ""}
          onChange={(e) => update("emergencyContactName", e.target.value)}
        />
      </Field>

      <Field id="emergencyContactPhone" label="Emergency contact phone" error={errors.emergencyContactPhone}>
        <Input
          id="emergencyContactPhone"
          value={form.emergencyContactPhone ?? ""}
          onChange={(e) => update("emergencyContactPhone", e.target.value)}
        />
      </Field>

      <Field id="primaryDiagnosis" label="Primary diagnosis">
        <Input
          id="primaryDiagnosis"
          value={form.primaryDiagnosis ?? ""}
          onChange={(e) => update("primaryDiagnosis", e.target.value)}
        />
      </Field>

      <Field id="status" label="Status">
        <Select
          value={form.status ?? "active"}
          onValueChange={(v) => update("status", v as Patient["status"])}
        >
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On hold</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}