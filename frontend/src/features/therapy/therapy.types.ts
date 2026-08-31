export type TherapyPlanStatus =
  | "active"
  | "completed"
  | "paused"
  | "cancelled"
  | "ACTIVE"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";
export type SessionOutcome = "improved" | "no-change" | "regressed" | "n/a";

export interface TherapyExercise {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  repetitions?: number;
  media_url?: string;
  created_at?: string | null;
}

export interface TherapyFile {
  id: string;
  planId: string;
  fileName: string;
  title?: string;
  fileType: "video" | "document" | "image";
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeKb?: number;
  mimeType?: string | null;
  storedFileName?: string;
}

export interface TherapyPlan {
  id: string;
  // Backend fields
  patient_id?: string;
  doctor_id?: string;
  therapy_type?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: TherapyPlanStatus;
  therapy_exercises?: TherapyExercise[];
  therapy_sessions?: TherapySessionRecord[];
  patients?: { users?: { name?: string } };
  doctors?: { users?: { name?: string } };
  // Frontend mapped fields
  patientId?: string;
  patientName?: string;
  therapistId?: string;
  therapistName?: string;
  title?: string;
  diagnosis?: string;
  startDate?: string;
  endDate?: string;
  frequencyPerWeek?: number;
  frequency_per_week?: number;
  goals?: string[];
  exercises?: TherapyExercise[];
  files?: TherapyFile[];
  therapy_plan_files?: TherapyFile[];
  createdAt?: string;
  updatedAt?: string;
}

export type SessionType = "TELEHEALTH" | "IN_PERSON" | "telehealth" | "in_person";

export interface TherapySessionRecord {
  id: string;
  planId?: string;
  therapy_plan_id?: string;
  appointmentId?: string | null;
  appointment_id?: string | null;
  patientId?: string;
  therapistId?: string;
  therapistName?: string;
  date?: string;
  session_date?: string;
  durationMinutes?: number;
  duration?: number;
  sessionType?: SessionType;
  session_type?: SessionType;
  chiefComplaint?: string;
  chief_complaint?: string;
  observations?: string;
  exercisesDiscussed?: string[];
  exercises_discussed?: string[];
  nextSteps?: string;
  next_steps?: string;
  confidentialNotes?: string;
  confidential_notes?: string;
  exercisesCompleted?: string[];
  outcome?: SessionOutcome;
  painLevel?: number;
  pain_level?: number;
  attendance?: string;
  mood?: string;
  notes?: string;
  progress_notes?: string;
  status?: string;
  createdAt?: string;
}

export type TherapyPlanCreatePayload = {
  patient_id: string;
  doctor_id: string;
  therapy_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  diagnosis?: string;
  goals?: string[];
  frequencyPerWeek?: number;
};

export type TherapyPlanUpdatePayload = Partial<TherapyPlanCreatePayload>;

export type TherapySessionCreatePayload = {
  planId?: string;
  appointmentId?: string;
  appointment_id?: string;
  session_date?: string;
  date?: string;
  duration?: number;
  durationMinutes?: number;
  sessionType?: SessionType;
  session_type?: SessionType;
  chiefComplaint?: string;
  chief_complaint?: string;
  observations?: string;
  progress_notes?: string;
  notes?: string;
  exercisesDiscussed?: string[] | string;
  exercises_discussed?: string[] | string;
  nextSteps?: string;
  next_steps?: string;
  confidentialNotes?: string;
  confidential_notes?: string;
  status?: string;
  outcome?: SessionOutcome;
  painLevel?: number;
  pain_level?: number;
  attendance?: string;
  mood?: string;
};

export interface TherapyReportSummary {
  planId: string;
  totalSessions: number;
  completedExercises: number;
  improvedCount: number;
  averagePainLevel: number | null;
  generatedAt: string;
}