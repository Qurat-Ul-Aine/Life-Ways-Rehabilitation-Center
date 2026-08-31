export const INTERN_DEPARTMENTS = [
  "Psychiatry",
  "Clinical Psychology",
  "Addiction Recovery",
  "Physiotherapy",
  "Occupational Therapy",
  "Nursing",
  "Social Work",
  "Rehabilitation Sciences",
  "Administration",
] as const;

export type InternDepartment = (typeof INTERN_DEPARTMENTS)[number];

export type ApplicationStatus =
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "SUSPENDED"
  | "REJECTED"
  | "INACTIVE";

export interface Mentor {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  specialization: string;
}

export interface Intern {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  education: string;
  university?: string;
  degree?: string;
  department: string;
  gender?: string;
  dateOfBirth?: string | null;
  address?: string;
  cnic?: string;
  semester?: string;
  emergencyContact?: string;
  skills?: string;
  notes?: string;
  requiredHours?: number;
  applicationStatus?: ApplicationStatus;
  internshipStart: string | null;
  internshipEnd: string | null;
  mentorId: string | null;
  mentor: Mentor | null;
  isActive: boolean;
  is_active: boolean;
  generatedPassword?: string;
}

export interface InternCreatePayload {
  name: string;
  email: string;
  phone: string;
  education: string;
  department: string;
  password?: string;
  university?: string;
  degree?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  cnic?: string;
  semester?: string;
  emergencyContact?: string;
  skills?: string;
  notes?: string;
  requiredHours?: number;
  internshipStart?: string;
  internshipEnd?: string;
}

export interface InternUpdatePayload extends Partial<InternCreatePayload> {
  applicationStatus?: ApplicationStatus;
}

export interface InternListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  status?: string;
  department?: string;
  mentorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InternListResult {
  items: Intern[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrainingLog {
  id: string;
  internId: string;
  hoursWorked: number;
  tasksCompleted: string;
  learningNotes: string;
  skillsLearned?: string;
  challenges?: string;
  mentorRemarks?: string;
  logType?: string;
  status?: string;
  logDate: string | null;
  createdAt: string | null;
  createdBy: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainingLogPayload {
  hoursWorked: number;
  tasksCompleted: string;
  learningNotes: string;
  logDate: string;
  skillsLearned?: string;
  challenges?: string;
  logType?: string;
}

export interface TrainingLogsResult {
  items: TrainingLog[];
  total: number;
  totalHours: number;
}

export type InternshipStatus = "Active" | "Inactive" | "Completed" | "Pending";

export interface AttendanceRecord {
  id: string;
  date: string;
  recordDate?: string;
  status: "present" | "absent" | "leave";
  hours: number;
  hoursWorked?: number;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AttendancePayload {
  recordDate: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked: number;
  status: "present" | "absent" | "leave" | "weekly" | "late";
  periodType?: "daily" | "weekly";
  remarks?: string;
}

export interface InternAttendanceData {
  attendancePercentage: number;
  presentDays: number;
  expectedDays: number;
  history: AttendanceRecord[];
  items?: AttendanceRecord[];
  total?: number;
}

export interface ProgressMetrics {
  completedHours: number;
  remainingHours: number;
  requiredHours: number;
  attendancePercentage: number;
  tasksCompleted: number;
  trainingProgress: number;
  completionPercentage: number;
  timelineProgress: number;
  hoursProgress: number;
  evaluationCount: number;
}

export interface InternEvaluation {
  id: string;
  internId: string;
  mentorId: string | null;
  rating: number | null;
  comments: string;
  criteria?: Record<string, unknown> | null;
  evaluatedAt: string | null;
  mentor?: { id: string; name: string; specialization: string } | null;
}

export function isAttendanceLocked(record: AttendanceRecord): boolean {
  return Boolean(record.approvedBy || record.approvedAt);
}

export function isTrainingLogLocked(log: TrainingLog): boolean {
  return Boolean(
    log.reviewedBy || log.reviewedAt || String(log.status ?? "").toLowerCase() === "reviewed",
  );
}

export interface InternDashboardData {
  intern: Intern;
  stats: {
    totalLogs: number;
    totalHours: number;
    progress: number;
    attendancePercentage: number;
    tasksCompleted: number;
    internshipStatus: InternshipStatus;
    completedHours?: number;
    remainingHours?: number;
    requiredHours?: number;
    trainingProgress?: number;
    completionPercentage?: number;
  };
  progress?: ProgressMetrics;
  attendance: InternAttendanceData;
  mentorAssignedAt: string | null;
  recentLogs: TrainingLog[];
}
