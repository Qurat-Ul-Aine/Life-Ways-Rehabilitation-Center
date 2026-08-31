import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StaffCreatePayload, StaffMember, StaffRole, StaffStatus } from "../staff.types";
import { STAFF_DEPARTMENTS, STAFF_ROLES, ROLE_LABELS, normalizeStaffRole } from "../staff.types";
import {
  SHIFT_PRESETS,
  formatShiftTiming,
  parseShiftTiming,
} from "../utils/shiftTiming";

type Props = {
  initial?: Partial<StaffMember>;
  submitLabel: string;
  loading?: boolean;
  apiError?: string;          // ← error message coming from the parent (AddStaff / EditStaff)
  onSubmit: (payload: StaffCreatePayload) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): StaffCreatePayload => ({
  fullName: "",
  email: "",
  phone: "",
  role: "receptionist",
  specialty: STAFF_DEPARTMENTS[0],
  qualifications: "",
  status: "active",
  joinedOn: today(),
  baseSalary: 0,
  currency: "PKR",
  shiftType: "",
  shiftTiming: "",
});

const fromInitial = (initial?: Partial<StaffMember>): StaffCreatePayload => ({
  fullName: initial?.fullName ?? initial?.name ?? "",
  email: initial?.email ?? "",
  phone: initial?.phone ?? "",
  role: normalizeStaffRole(initial?.role),
  specialty: initial?.department ?? initial?.specialty ?? STAFF_DEPARTMENTS[0],
  qualifications: initial?.position ?? initial?.qualifications ?? "",
  status: (initial?.status ?? "active") as StaffStatus,
  joinedOn: (initial?.joinedAt ?? initial?.joinedOn ?? today()).slice(0, 10),
  baseSalary: initial?.baseSalary ?? 0,
  currency: initial?.currency ?? "PKR",
  shiftType: initial?.shiftType ?? "",
  shiftTiming: initial?.shiftTiming ?? "",
});

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

function ShiftScheduleFields({
  shiftType,
  shiftTiming,
  onShiftTypeChange,
  onShiftTimingChange,
}: {
  shiftType?: string;
  shiftTiming?: string;
  onShiftTypeChange: (value: string) => void;
  onShiftTimingChange: (value: string) => void;
}) {
  const { start, end } = parseShiftTiming(shiftTiming);
  const preview = formatShiftTiming(start, end) || shiftTiming?.trim() || "";

  const applyPreset = (preset: (typeof SHIFT_PRESETS)[keyof typeof SHIFT_PRESETS]) => {
    onShiftTimingChange(formatShiftTiming(preset.start, preset.end));
  };

  const handleShiftTypeChange = (value: string) => {
    const nextType = value === "none" ? "" : value;
    onShiftTypeChange(nextType);
    if (nextType === "morning" || nextType === "evening") {
      applyPreset(SHIFT_PRESETS[nextType]);
    } else if (!nextType) {
      onShiftTimingChange("");
    }
  };

  const updateStart = (value: string) => {
    onShiftTimingChange(formatShiftTiming(value, end || value));
  };

  const updateEnd = (value: string) => {
    onShiftTimingChange(formatShiftTiming(start || value, value));
  };

  return (
    <div className="md:col-span-2 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Shift schedule (optional)</p>
        <p className="text-xs text-muted-foreground">
          Pick shift type for quick defaults, then adjust start and end times if needed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="shiftType" label="Shift type">
          <Select value={shiftType || "none"} onValueChange={handleShiftTypeChange}>
            <SelectTrigger id="shiftType"><SelectValue placeholder="Select shift" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="shiftHours" label="Shift hours">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="shiftStart"
              type="time"
              value={start}
              onChange={(e) => updateStart(e.target.value)}
              className="w-[8.5rem]"
              aria-label="Shift start time"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              id="shiftEnd"
              type="time"
              value={end}
              onChange={(e) => updateEnd(e.target.value)}
              className="w-[8.5rem]"
              aria-label="Shift end time"
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            applyPreset(SHIFT_PRESETS.morning);
            onShiftTypeChange("morning");
          }}
        >
          {SHIFT_PRESETS.morning.label}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            applyPreset(SHIFT_PRESETS.evening);
            onShiftTypeChange("evening");
          }}
        >
          {SHIFT_PRESETS.evening.label}
        </Button>
        {(start || end || shiftType) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onShiftTypeChange("");
              onShiftTimingChange("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {preview ? (
        <p className="text-xs text-muted-foreground">
          Saved as: <span className="font-medium text-foreground">{preview}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function StaffForm({ initial, submitLabel, loading, apiError, onSubmit }: Props) {
  const [form, setForm] = useState<StaffCreatePayload>(initial ? fromInitial(initial) : emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initial) setForm(fromInitial(initial));
  }, [initial]);

  const update = <K extends keyof StaffCreatePayload>(key: K, value: StaffCreatePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!String(form.fullName ?? "").trim()) next.fullName = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email ?? ""))) next.email = "Valid email is required.";
    if (String(form.phone ?? "").trim().length < 7) next.phone = "Phone number is too short.";
    if (!form.joinedOn) next.joinedOn = "Join date is required.";
    if (form.baseSalary < 0) next.baseSalary = "Salary cannot be negative.";
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

      {/* ── API error banner — shown when backend returns an error e.g. duplicate email ── */}
      {apiError && (
        <div className="md:col-span-2 flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-destructive" aria-hidden>⚠</span>
          <p className="text-sm text-destructive">{apiError}</p>
          </div>
      )}

      <Field id="fullName" label="Full name" error={errors.fullName}>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </Field>

      <Field id="email" label="Email" error={errors.email}>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>

      <Field id="phone" label="Phone" error={errors.phone}>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </Field>

      <Field id="role" label="Role">
        <Select
          value={form.role}
          onValueChange={(v) => update("role", v as StaffRole)}
        >
          <SelectTrigger id="role"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAFF_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="specialty" label="Department">
        <Select
          value={form.specialty ?? STAFF_DEPARTMENTS[0]}
          onValueChange={(v) => update("specialty", v)}
        >
          <SelectTrigger id="specialty"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAFF_DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="qualifications" label="Position / Qualifications">
        <Input
          id="qualifications"
          placeholder="e.g. Senior attendant, certified pharmacist"
          value={form.qualifications ?? ""}
          onChange={(e) => update("qualifications", e.target.value)}
        />
      </Field>

      <ShiftScheduleFields
        shiftType={form.shiftType}
        shiftTiming={form.shiftTiming}
        onShiftTypeChange={(v) => update("shiftType", v)}
        onShiftTimingChange={(v) => update("shiftTiming", v)}
      />

      <Field id="joinedOn" label="Joined on" error={errors.joinedOn}>
        <Input
          id="joinedOn"
          type="date"
          value={form.joinedOn?.slice(0, 10) ?? ""}
          onChange={(e) => update("joinedOn", e.target.value)}
        />
      </Field>

      <Field id="status" label="Status">
        <Select
          value={form.status}
          onValueChange={(v) => update("status", v as StaffStatus)}
        >
          <SelectTrigger id="status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-leave">On leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/*
        ── Base salary fix ──
        Problem was: value={form.baseSalary} renders "0" in the input.
        When you type e.g. "2", browser appends to "0" → becomes "02".
        Fix: show empty string when value is 0 so the field is visually blank.
        On change: if user clears the field (empty string) store 0, else store the number.
      */}
      <Field id="baseSalary" label="Base salary" error={errors.baseSalary}>
        <Input
          id="baseSalary"
          type="number"
          min={0}
          placeholder="0"
          value={form.baseSalary === 0 ? "" : form.baseSalary}
          onChange={(e) => {
            const raw = e.target.value;
            update("baseSalary", raw === "" ? 0 : Number(raw));
          }}
        />
      </Field>

      <Field id="currency" label="Currency">
        <Select
          value={form.currency}
          onValueChange={(v) => update("currency", v)}
        >
          <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PKR">PKR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
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