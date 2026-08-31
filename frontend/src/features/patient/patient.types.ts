export type PatientStatus = "active" | "discharged" | "on-hold";
export type PatientGender = "male" | "female" | "other";

export interface MedicalRecord {
  id: string;
  date: string; // ISO
  type: "diagnosis" | "prescription" | "report" | "note" | "past_disease" | "allergies" | "addiction" | string;
  title: string;
  details: string;
  attachmentUrl?: string;
  authorName: string;
}

export interface TherapySession {
  id: string;
  date: string; // ISO
  therapistName: string;
  type: string;
  status: "scheduled" | "completed" | "cancelled" | "missed";
  notes?: string;
}

export interface RecoveryPoint {
  date: string; // ISO date
  score: number; // 0..100
  note?: string;
}

export interface ConfidentialNote {
  id: string;
  authorRole: "admin" | "doctor";
  authorName: string;
  date: string;
  body: string;
}

export interface LinkedFamilyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  relationship?: string | null;
  isActive: boolean;
  linkedAt?: string | null;
}

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: PatientGender;
  dateOfBirth: string; // ISO
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: PatientStatus;
  userId?: string | null;
  portalAccountType?: "patient" | "family";
  linkedFamilyMembers?: LinkedFamilyMember[];
  isActive?: boolean;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  admissionDate: string; // ISO
  primaryDiagnosis?: string;
  recoveryProgress: number; // 0..100
  medicalHistory: MedicalRecord[];
  therapySessions: TherapySession[];
  recoveryTimeline: RecoveryPoint[];
  confidentialNotes: ConfidentialNote[];
  createdAt: string;
  updatedAt: string;
}

export type PatientCreatePayload = Omit<
  Patient,
  | "id"
  | "medicalHistory"
  | "therapySessions"
  | "recoveryTimeline"
  | "confidentialNotes"
  | "recoveryProgress"
  | "createdAt"
  | "updatedAt"
> & {
  recoveryProgress?: number;
};

export type PatientUpdatePayload = Partial<PatientCreatePayload> & {
  status?: PatientStatus;
};

export interface PatientListQuery {
  search?: string;
  status?: PatientStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface PatientListResult {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogEntry {
  id: string;
  patientId?: string | null;
  action: string;
  entityType?: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  summary: string;
}

export interface DashboardSummary {
  profile: Patient;
  upcomingAppointments: Array<{
    id: string;
    date: string;
    startTime: string | null;
    status: string;
    mode: string;
    reason: string | null;
    doctorName: string | null;
    doctorId: string | null;
    meetingUrl?: string | null;
  }>;
  sessions: {
    total: number;
    completed: number;
    label: string;
    therapyTotal?: number;
    therapyCompleted?: number;
    appointmentTotal?: number;
    appointmentCompleted?: number;
  };
  screeningAlerts?: Array<{
    id: string;
    condition: string;
    flagged: boolean;
    followUpDate: string | null;
    testDate: string | null;
    riskLevel: string | null;
    message: string | null;
  }>;
  recovery: {
    overall: number;
    treatmentGoals: number;
    sessionAdherence: number;
    medicationAdherence: number | null;
    mobility: number;
    therapyGoals: number;
    painManagement: number;
  };
  metrics: {
    programCompletion: number;
    therapyPlanProgress: number;
    medicationAdherence: number | null;
  };
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    status: string;
  }>;
  notifications: Array<{
    id: string;
    message: string;
    sent_date?: string;
    status?: string;
  }>;
  therapyPlan: {
    id: string;
    therapyType: string;
    description: string;
    startDate: string | null;
    endDate?: string | null;
    status: string;
    progressPct: number;
    currentPhase: string;
    therapistName: string | null;
    goalsCount: number;
    sessionsCompleted: number;
  } | null;
  careTeam: {
    doctor: string | null;
    therapist: string | null;
    caseManager: string | null;
  };
  treatmentGoals: Array<{
    id: string;
    label: string;
    completed: boolean;
  }>;
  latestDoctorNote: {
    date: string | null;
    author: string;
    summary: string;
  } | null;
  latestAssessment: {
    id: string;
    testType: string;
    score: number;
    riskLevel: string | null;
    testDate: string | null;
  } | null;
  recentAssessments?: Array<{
    id: string;
    testType: string;
    rawType: string | null;
    score: number;
    riskLevel: string | null;
    testDate: string | null;
    isRecoveryMetric?: boolean;
  }>;
  clinicalAssessments?: Array<{
    id: string;
    testType: string;
    score: number;
    riskLevel: string | null;
    testDate: string | null;
  }>;
  recentReports: Array<{
    id: string;
    reportType: string;
    generatedDate: string | null;
    source?: string;
    category?: string;
    fileType?: string | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    type: "session" | "medication";
    label: string;
    dueLabel: string;
    appointmentId?: string;
    mode?: string;
    status?: string;
    startingSoon?: boolean;
  }>;
  todaysAppointments: Array<{
    id: string;
    patientName: string | null;
    doctorName: string | null;
    date: string;
    startTime: string | null;
    status: string;
    mode: string;
    reason: string | null;
    meetingUrl?: string | null;
    startingSoon: boolean;
  }>;
}

export interface ClinicalNoteEntry {
  date: string | null;
  author: string;
  summary: string;
  sessionId?: string;
}

export interface RecoveryWarningNote {
  id: string;
  date: string | null;
  title: string;
  message: string;
  severity: "high" | "medium";
}

export type RecoveryRiskAlertType =
  | "missed_session"
  | "multiple_cancellations"
  | "low_attendance"
  | "recovery_stagnation";

export interface RecoveryRiskAlert {
  id: string;
  type: RecoveryRiskAlertType;
  severity: "high" | "medium";
  title: string;
  message: string;
}

export type TreatmentGoalStatus = "On Track" | "At Risk" | "Completed";

export interface TreatmentGoal {
  id: string;
  name: string;
  currentProgressPct: number;
  targetPct: number;
  status: TreatmentGoalStatus;
  startDate: string | null;
  expectedCompletionDate: string | null;
}

export interface RecoverySummary {
  clinicalNotes: {
    latestDoctorNote: ClinicalNoteEntry | null;
    latestTherapistFeedback: ClinicalNoteEntry | null;
    progressRemarks: {
      date: string | null;
      summary: string;
      source: string;
    } | null;
    warnings: RecoveryWarningNote[];
  };
  upcomingSchedule: {
    nextTherapySession: {
      id: string;
      date: string | null;
      therapyType: string;
      therapistName: string | null;
      status: string;
      duration: number | null;
      reminderBadge: string | null;
    } | null;
    nextDoctorAppointment: {
      id: string;
      date: string | null;
      startTime: string | null;
      doctorName: string | null;
      doctorSpecialization: string | null;
      mode: string;
      reason: string | null;
      status: string;
      reminderBadge: string | null;
    } | null;
    upcomingAssessments: Array<{
      id: string;
      testType: string;
      testDate: string | null;
      riskLevel: string | null;
      reminderBadge: string | null;
      source: string;
      doctorName?: string | null;
      startTime?: string | null;
    }>;
  };
  riskAlerts: RecoveryRiskAlert[];
  treatmentGoals: TreatmentGoal[];
}

export type PatientDocumentCategory =
  | "therapy_assessment"
  | "medical_report"
  | "prescription"
  | "lab_result";

export type PatientDocumentSource = "file" | "report" | "screening";

export interface PatientDocument {
  id: string;
  source: PatientDocumentSource;
  category: PatientDocumentCategory;
  title: string;
  fileType: string;
  uploadedAt: string | null;
  mimeType?: string | null;
  fileName?: string;
  fileSize?: number | null;
}

export interface PatientDocumentViewData {
  id: string;
  title?: string;
  category?: string;
  generatedDate?: string | null;
  testDate?: string | null;
  score?: number | null;
  riskLevel?: string | null;
  content?: string | null;
  [key: string]: unknown;
}

export type PatientMeProfile = Patient & {
  nationality?: string | null;
  profileImageUrl?: string | null;
  aboutMe?: string | null;
  allergies?: string | null;
  bloodGroup?: string | null;
};

export type PatientProfileUpdate = {
  name?: string;
  email?: string;
  phone?: string | null;
  gender?: string | null;
  nationality?: string | null;
  condition?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  aboutMe?: string | null;
  allergies?: string | null;
  bloodGroup?: string | null;
  profileImageUrl?: string | null;
};