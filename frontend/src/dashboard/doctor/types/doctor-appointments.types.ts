/** Canonical appointment status used across the doctor appointments UI */
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "missed";

export type AppointmentTypeLabel = "Telehealth" | "In Person";

export type AppointmentFilterTab =
  | "all"
  | "today"
  | "upcoming"
  | "completed"
  | "cancelled";

/** Normalized appointment row for the doctor schedule table */
export interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  program: string;
  date: string | null;
  startTime: string | null;
  type: AppointmentTypeLabel;
  reason: string | null;
  status: AppointmentStatus;
  meetingUrl: string | null;
}

/** Raw shape returned by GET /appointments */
export interface AppointmentApiRow {
  id: string | number;
  patientId: string | number;
  patientName: string;
  doctorId: string | number;
  date: string | null;
  startTime: string | null;
  time: string | null;
  mode: string | null;
  type: string | null;
  status: string;
  reason: string | null;
  notes: string | null;
  serviceName: string | null;
  serviceSlug: string | null;
  meetingUrl: string | null;
}

export interface AppointmentsListResponse {
  items: AppointmentApiRow[];
  total: number;
}

export interface TherapyPlanApiRow {
  id: string | number;
  patient_id?: string | number;
  patientId?: string | number;
  status?: string;
  therapy_type?: string;
  title?: string;
}

export type ActivePlanInfo = { id: string; name: string };
