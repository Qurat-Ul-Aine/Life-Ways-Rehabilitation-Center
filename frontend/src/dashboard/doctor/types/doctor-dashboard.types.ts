export interface DoctorAssignedService {
  id: string;
  slug: string;
  title: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  specialization: string;
  role: string;
  phone: string;
  license_no: string;
  qualification: string;
  experience: number;
  consultationFee?: number | null;
  patientsTreated: number;
  successRate: number;
  gender?: string | null;
  about?: string;
  image?: string;
  department?: string | null;
  availability?: unknown[];
  availability_status?: string;
  services?: DoctorAssignedService[];
  is_active?: boolean;
  is_approved?: boolean;
}

export interface DoctorProfileUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  about?: string;
  image?: string;
  specialization?: string;
  qualification?: string;
  experience?: number | null;
  consultationFee?: number | null;
  gender?: string | null;
  availability?: unknown[];
  availabilityStatus?: "AVAILABLE" | "UNAVAILABLE";
  availability_status?: "AVAILABLE" | "UNAVAILABLE";
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  newThisMonth: number;
  discharged: number;
  newThisWeek: number;
  sessionsToday: number;
  sessionsCompleted: number;
  pendingNotes: number;
  avgRecovery: number;
}

export interface TodayScheduleItem {
  id: string;
  time: string;
  patientName: string;
  condition: string;
  /** "Telehealth" | "In-person" — aligned with backend */
  type: string;
  /** "Done" | "Now" | "Pending" | "Confirmed" | "Missed" | "NeedsReview */
  status: string;
  /** True when appointment_time is missing — requires manual review */
  needsReview?: boolean;
  patientId: string;
  /** Telehealth join link when available */
  meetingUrl?: string | null;
}

export interface PatientAlert {
  name: string;
  message: string;
  type: string;
  patientId?: string;
}

export interface ProgramDistribution {
  psychotic: number;
  drug: number;
  littleSoul: number;
}

export interface PendingDocumentation {
  sessionNotes: number;
  therapyReviews: number;
  assessments: number;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
}

/** @deprecated Use DoctorPatient instead — this was misused as patient list */
export interface PatientRecovery {
  id: string;
  initials: string;
  name: string;
  condition: string;
  recoveryScore: number;
}

/**
 * Real patient entity for doctor's caseload.
 * Replaces misuse of PatientRecovery as a patient list.
 */
export interface DoctorPatient {
  id: string;
  initials: string;
  name: string;
  /** patients.condition — maps to program track */
  program: string | null;
  /** Active therapy plan type */
  therapyType: string | null;
  /** patients.status */
  status: string | null;
  /** ISO date string of last therapy session */
  lastSessionDate: string | null;
  /** ISO date string of next appointment */
  nextAppointmentDate: string | null;
  /** Session adherence % (completed / total sessions) */
  progressPct: number;
  /** From recovery_points screening if available */
  recoveryScore: number | null;
}

export interface DoctorDashboardSummary {
  profile: DoctorProfile;
  stats: DashboardStats;
  todaySchedule: TodayScheduleItem[];
  patientAlerts: PatientAlert[];
  /** @deprecated use patients instead */
  patientRecovery: PatientRecovery[];
  /** Real patient caseload — use this going forward */
  patients: DoctorPatient[];
  programDistribution?: ProgramDistribution;
  pendingDocumentation?: PendingDocumentation;
  recentActivity?: RecentActivityItem[];
}

/** Context value shape */
export interface DoctorDashboardContextValue {
  data: DoctorDashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
