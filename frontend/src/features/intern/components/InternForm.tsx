import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLocalTodayDate,
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  validateDateOfBirth,
  validateEmail,
  validatePersonName,
  validatePhone,
} from "@/lib/validation";
import type { Intern, InternCreatePayload } from "../intern.types";
import { INTERN_DEPARTMENTS } from "../intern.types";

type Props = {
  initial?: Partial<Intern>;
  submitLabel: string;
  loading?: boolean;
  apiError?: string;
  isEdit?: boolean;
  requireCnic?: boolean;
  onSubmit: (payload: InternCreatePayload) => void;
};

const today = getLocalTodayDate;

const emptyForm = (): InternCreatePayload => ({
  name: "",
  email: "",
  phone: "",
  education: "",
  university: "",
  department: INTERN_DEPARTMENTS[0],
  password: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  cnic: "",
  semester: "",
  emergencyContact: "",
  skills: "",
  notes: "",
  requiredHours: 480,
  internshipStart: today(),
  internshipEnd: "",
});

const fromInitial = (initial?: Partial<Intern>): InternCreatePayload => ({
  name: initial?.name ?? "",
  email: initial?.email ?? "",
  phone: initial?.phone ?? "",
  education: initial?.education ?? "",
  university: initial?.university ?? "",
  department: initial?.department ?? INTERN_DEPARTMENTS[0],
  password: "",
  gender: initial?.gender ?? "",
  dateOfBirth: initial?.dateOfBirth?.slice(0, 10) ?? "",
  address: initial?.address ?? "",
  cnic: initial?.cnic ?? "",
  semester: initial?.semester ?? "",
  emergencyContact: initial?.emergencyContact ?? "",
  skills: initial?.skills ?? "",
  notes: initial?.notes ?? "",
  requiredHours: initial?.requiredHours ?? 480,
  internshipStart: initial?.internshipStart?.slice(0, 10) ?? today(),
  internshipEnd: initial?.internshipEnd?.slice(0, 10) ?? "",
});

function Field({
  id,
  label,
  error,
  children,
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

export default function InternForm({
  initial,
  submitLabel,
  loading,
  apiError,
  isEdit,
  requireCnic = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<InternCreatePayload>(
    initial ? fromInitial(initial) : emptyForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) setForm(fromInitial(initial));
  }, [initial]);

  const update = <K extends keyof InternCreatePayload>(
    key: K,
    value: InternCreatePayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    const nameError = validatePersonName(form.name);
    const emailError = validateEmail(form.email);
    const phoneError = validatePhone(form.phone);
    const dateOfBirthError = validateDateOfBirth(form.dateOfBirth);
    if (nameError) next.name = nameError;
    if (emailError) next.email = emailError;
    if (phoneError) next.phone = phoneError;
    if (dateOfBirthError) next.dateOfBirth = dateOfBirthError;
    if (!String(form.education).trim()) next.education = "Education is required.";
    if (!String(form.department).trim()) next.department = "Department is required.";
    if (requireCnic && !String(form.cnic).trim()) next.cnic = "CNIC is required.";
    if (!isEdit && form.password && form.password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      name: normalizePersonName(form.name),
      email: normalizeEmail(form.email),
      phone: normalizePhone(form.phone),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {apiError && (
        <div className="md:col-span-2 flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-destructive" aria-hidden>
            ⚠
          </span>
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      <Field id="name" label="Full Name *" error={errors.name}>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Ayesha Khan"
        />
      </Field>

      <Field id="email" label="Email *" error={errors.email}>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="intern@lifeways.com"
        />
      </Field>

      <Field id="phone" label="Phone *" error={errors.phone}>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+92 300 1234567"
        />
      </Field>

      <Field id="education" label="Degree / Education *" error={errors.education}>
        <Input
          id="education"
          value={form.education}
          onChange={(e) => update("education", e.target.value)}
          placeholder="e.g. BS Psychology"
        />
      </Field>

      <Field id="university" label="University">
        <Input
          id="university"
          value={form.university ?? ""}
          onChange={(e) => update("university", e.target.value)}
          placeholder="e.g. University of Health Sciences"
        />
      </Field>

      <Field id="semester" label="Semester">
        <Input
          id="semester"
          value={form.semester ?? ""}
          onChange={(e) => update("semester", e.target.value)}
          placeholder="e.g. 7th"
        />
      </Field>

      <Field id="department" label="Department *" error={errors.department}>
        <Select value={form.department} onValueChange={(v) => update("department", v)}>
          <SelectTrigger id="department">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {INTERN_DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="gender" label="Gender">
        <Select value={form.gender ?? ""} onValueChange={(v) => update("gender", v)}>
          <SelectTrigger id="gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field id="dateOfBirth" label="Date of Birth">
        <Input
          id="dateOfBirth"
          type="date"
          max={getLocalTodayDate()}
          value={form.dateOfBirth ?? ""}
          onChange={(e) => update("dateOfBirth", e.target.value)}
        />
      </Field>

      <Field id="cnic" label="CNIC (optional)">
        <Input
          id="cnic"
          value={form.cnic ?? ""}
          onChange={(e) => update("cnic", e.target.value)}
          placeholder="xxxxx-xxxxxxx-x"
        />
      </Field>

      <Field id="address" label="Address">
        <Input
          id="address"
          value={form.address ?? ""}
          onChange={(e) => update("address", e.target.value)}
        />
      </Field>

      <Field id="emergencyContact" label="Emergency Contact">
        <Input
          id="emergencyContact"
          value={form.emergencyContact ?? ""}
          onChange={(e) => update("emergencyContact", e.target.value)}
        />
      </Field>

      <Field id="skills" label="Skills">
        <Input
          id="skills"
          value={form.skills ?? ""}
          onChange={(e) => update("skills", e.target.value)}
          placeholder="Comma-separated skills"
        />
      </Field>

      <Field
        id="password"
        label={isEdit ? "New Password (optional)" : "Password (optional — auto-generated if blank)"}
        error={errors.password}
      >
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder={isEdit ? "Leave blank to keep current" : "Leave blank to auto-generate"}
        />
      </Field>

      <Field id="internshipStart" label="Internship Start">
        <Input
          id="internshipStart"
          type="date"
          value={form.internshipStart ?? ""}
          onChange={(e) => update("internshipStart", e.target.value)}
        />
      </Field>

      <Field id="internshipEnd" label="Internship End">
        <Input
          id="internshipEnd"
          type="date"
          value={form.internshipEnd ?? ""}
          onChange={(e) => update("internshipEnd", e.target.value)}
        />
      </Field>

      <Field id="notes" label="Notes">
        <Input
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Admin notes"
        />
      </Field>

      <div className="md:col-span-2 flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
