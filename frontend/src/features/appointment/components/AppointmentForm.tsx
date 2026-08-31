import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { patientService } from "@/features/patient/services/patientService";
import type { Patient } from "@/features/patient/patient.types";
import TimeSlotPicker from "./TimeSlotPicker";
import AppointmentReasonField from "./AppointmentReasonField";
import { appointmentService } from "../services/appointmentService";
import type { Appointment, AppointmentMode } from "../appointment.types";
import {
  formatAppointmentReason,
  parseAppointmentReason,
  validateAppointmentReason,
  type AppointmentReasonOption,
} from "../utils/appointmentReason";

// ─── Doctor type (minimal — only what the form needs) ────────────────────────
interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
}

type Props = {
  initial?: Partial<Appointment>;
  onSubmit: (values: AppointmentFormValues) => Promise<void> | void;
  submitLabel?: string;
};

export type AppointmentFormValues = {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: AppointmentMode;
  meetingUrl?: string;
  reason: string;
};

export default function AppointmentForm({
  initial,
  onSubmit,
  submitLabel = "Save",
}: Props) {
  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [doctors,    setDoctors]    = useState<DoctorOption[]>([]);
  const [loadingDoc, setLoadingDoc] = useState(true);

  const [patientId,  setPatientId]  = useState(initial?.patientId  ?? "");
  const [doctorId,   setDoctorId]   = useState(initial?.doctorId   ?? "");
  const [date,       setDate]       = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [startTime,  setStartTime]  = useState(initial?.startTime  ?? "");
  const [endTime,    setEndTime]    = useState(initial?.endTime     ?? "");
  const [mode,       setMode]       = useState<AppointmentMode>(
    initial?.mode ?? "in-person",
  );
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const initialReason = parseAppointmentReason(initial?.reason);
  const [visitReason, setVisitReason] = useState<AppointmentReasonOption | "">(
    initialReason.option,
  );
  const [visitReasonOther, setVisitReasonOther] = useState(initialReason.otherText);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch real patients ───────────────────────────────────────────────────
  useEffect(() => {
    void patientService
      .list({ pageSize: 200 })
      .then((res) => setPatients(res.items))
      .catch(() => toast.error("Failed to load patients."));
  }, []);

  // ── FIX: Fetch real doctors from API — not mock data ─────────────────────
  // Backend: GET /api/doctors → returns { items: Doctor[] } or Doctor[]
  useEffect(() => {
    setLoadingDoc(true);
    import("@/lib/api")
      .then(({ default: api }) =>
        api.get<{ items: DoctorOption[] } | DoctorOption[]>("/doctors", {
          params: { bookable: "true", limit: 100 },
        }),
      )
      .then(({ data }) => {
        // handle both { items: [] } and plain []
        const list = Array.isArray(data) ? data : (data.items ?? []);
        setDoctors(
          list.map((d: any) => ({
            id:        d.id,
            // backend may return fullName or name
            name:      d.fullName ?? d.name ?? "Unknown",
            specialty: d.specialty ?? d.department ?? "",
          })),
        );
      })
      .catch(() => toast.error("Failed to load doctors."))
      .finally(() => setLoadingDoc(false));
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const reasonError = validateAppointmentReason(visitReason, visitReasonOther);
    if (reasonError) {
      toast.error(reasonError);
      return;
    }

    // FIX: endTime is optional when slots not available — manual time entry fallback
    if (!patientId || !doctorId || !date || !startTime) {
      toast.error("Please complete all required fields.");
      return;
    }

    const patient = patients.find((p) => p.id === patientId);
    const doctor  = doctors.find((d) => d.id === doctorId);

    if (!patient || !doctor) {
      toast.error("Invalid patient or doctor selection.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        patientId,
        patientName: patient.fullName,
        doctorId,
        doctorName:  doctor.name,
        date,
        startTime,
        // FIX: if no endTime (slots not working yet), default to +30 min
        endTime: endTime || addMinutes(startTime, 30),
        mode,
        meetingUrl:
          mode === "online" ? meetingUrl || undefined : undefined,
        reason: formatAppointmentReason(visitReason, visitReasonOther),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Patient + Doctor ─────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Patient *</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.fullName} — {p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Doctor *</Label>
          <Select
            value={doctorId}
            disabled={loadingDoc}
            onValueChange={(v) => {
              setDoctorId(v);
              setStartTime("");
              setEndTime("");
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingDoc ? "Loading doctors..." : "Select doctor"}
              />
            </SelectTrigger>
            <SelectContent>
              {doctors.length === 0 && !loadingDoc ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No doctors found.
                </div>
              ) : (
                doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {d.specialty ? ` — ${d.specialty}` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Date + Mode ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="appt-date">Date *</Label>
          <Input
            id="appt-date"
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setDate(e.target.value);
              setStartTime("");
              setEndTime("");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Mode *</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as AppointmentMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in-person">In-person</SelectItem>
              <SelectItem value="online">Online (telehealth)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Meeting URL (online only) ─────────────────────────────────────── */}
      {mode === "online" && (
        <div className="space-y-1.5">
          <Label htmlFor="meetingUrl">
            Meeting URL{" "}
            <span className="text-muted-foreground font-normal">
              (optional — auto-generated if blank)
            </span>
          </Label>
          <Input
            id="meetingUrl"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.example.com/..."
          />
        </div>
      )}

      {/* ── Time slots ───────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Available time slots *</Label>
        <div className="mt-2">
          {doctorId && date ? (
            <TimeSlotPicker
              doctorId={doctorId}
              date={date}
              value={startTime ? { startTime, endTime } : undefined}
              onChange={(s) => {
                setStartTime(s.startTime);
                setEndTime(s.endTime);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a doctor and date first.
            </p>
          )}
        </div>

        {/* FIX: manual time fallback when availability backend is not set up yet */}
        {doctorId && date && (
          <div className="mt-3 border rounded-md p-3 bg-muted/30 space-y-2">
            <p className="text-xs text-muted-foreground">
              Or enter time manually (if no slots are shown above):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime" className="text-xs">Start time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-xs">End time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Reason ───────────────────────────────────────────────────────── */}
      <AppointmentReasonField
        id="admin-book-reason"
        value={visitReason}
        otherValue={visitReasonOther}
        onValueChange={setVisitReason}
        onOtherValueChange={setVisitReasonOther}
      />

      {/* ── Submit ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Helper: "09:00" + 30 → "09:30" ─────────────────────────────────────────
function addMinutes(time: string, minutes: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}