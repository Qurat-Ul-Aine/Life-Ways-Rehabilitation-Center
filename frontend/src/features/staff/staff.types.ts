export type StaffRole =
  | "receptionist"
  | "ward_attendant"
  | "pharmacist"
  | "lab_technician"
  | "cleaner"
  | "security_guard";

export type StaffStatus = "active" | "on-leave" | "inactive";
export type AttendanceStatus = "present" | "absent";
export type TaskStatus = "pending" | "completed";
export type ShiftType = "morning" | "evening";

export type StaffDocumentCategory = "certificate" | "id_proof" | "other";

export const STAFF_DEPARTMENTS = [
  "Psychiatry",
  "Clinical Psychology",
  "Addiction Recovery",
  "CBT/DBT Therapy",
  "Social Work",
  "Nursing",
  "Medical (General)",
  "Physiotherapy",
  "Case Management",
  "Administration",
  "HR",
  "Finance",
  "Reception",
  "IT",
  "Security",
] as const;

export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  receptionist: "Receptionist",
  ward_attendant: "Ward Boy/Attendant",
  pharmacist: "Pharmacist",
  lab_technician: "Lab Technician",
  cleaner: "Cleaner/Housekeeping",
  security_guard: "Security Guard",
};

export const STAFF_ROLES = Object.keys(ROLE_LABELS) as StaffRole[];

const LEGACY_ROLE_MAP: Record<string, StaffRole> = {
  receptionist: "receptionist",
  ward_attendant: "ward_attendant",
  ward_boy: "ward_attendant",
  attendant: "ward_attendant",
  pharmacist: "pharmacist",
  lab_technician: "lab_technician",
  cleaner: "cleaner",
  housekeeping: "cleaner",
  security_guard: "security_guard",
  security: "security_guard",
};

/** Map stored/legacy role values to the allowed staff role set. */
export function normalizeStaffRole(raw?: string | null): StaffRole {
  const key = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((STAFF_ROLES as readonly string[]).includes(key)) return key as StaffRole;
  return LEGACY_ROLE_MAP[key] ?? "receptionist";
}

export function staffRoleLabel(raw?: string | null): string {
  return ROLE_LABELS[normalizeStaffRole(raw)] ?? String(raw ?? "—");
}

export interface StaffDocument {
  id: string;
  category: StaffDocumentCategory;
  title: string;
  fileType: string;
  uploadedAt: string | null;
  mimeType?: string | null;
  fileName?: string;
  fileSize?: number | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface AttendanceSummary {
  presentDays: number;
  totalDays: number;
  percentage: number;
}

export interface StaffTaskSummary {
  total: number;
  completed: number;
  pending: number;
  completedValue: string;
  completedHint: string;
  pendingValue: string;
  pendingHint: string;
}

export interface StaffTenureSummary {
  displayValue: string;
  subtitle: string;
  joinedDate: string | null;
  months: number;
}

export interface StaffTaskRecord {
  id: string;
  taskDescription: string;
  assignedBy: string;
  assignedById?: string | null;
  status: TaskStatus;
  date: string | null;
}

export interface StaffNoteRecord {
  id: string;
  noteText: string;
  addedBy: string;
  addedById?: string | null;
  addedByRole?: string | null;
  date: string | null;
}

export interface FeedbackRecord {
  id: string;
  patientName: string;
  rating: number; // 1..5
  comment?: string;
  date: string;
}

export interface ActivityLogEntry {
  id: string;
  date: string;
  type: "patient" | "session" | "report";
  summary: string;
}

export interface StaffMember {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  role: StaffRole;
  specialty?: string;
  qualifications?: string;
  status?: StaffStatus;
  joinedOn?: string;
  joinedAt?: string;
  department?: string;
  position?: string;
  baseSalary?: number;
  currency?: string;
  shiftType?: ShiftType | string | null;
  shiftTiming?: string | null;

  attendance?: AttendanceRecord[];
  attendanceSummary?: AttendanceSummary;
  taskSummary?: StaffTaskSummary;
  tenureSummary?: StaffTenureSummary;
  tasks?: StaffTaskRecord[];
  notes?: StaffNoteRecord[];
  documents?: StaffDocument[];

  createdAt?: string;
  updatedAt?: string;
}

export interface StaffCreatePayload {
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  specialty?: string;
  qualifications?: string;
  status: StaffStatus;
  joinedOn: string;
  baseSalary: number;
  currency: string;
  shiftType?: string;
  shiftTiming?: string;
}

export type StaffUpdatePayload = Partial<StaffCreatePayload>;

export interface StaffListQuery {
  search?: string;
  role?: StaffRole | "all";
  status?: StaffStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface StaffListResult {
  items: StaffMember[];
  total: number;
  page: number;
  pageSize: number;
}
