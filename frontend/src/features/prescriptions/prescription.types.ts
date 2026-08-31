export type PrescriptionStatus =
  | "Active"
  | "Completed"
  | "Stopped"
  | "On Hold"
  | "Invalid"
  | "ACTIVE"
  | "COMPLETED"
  | "DISCONTINUED"
  | "ON_HOLD"
  | "INVALID";

export type DosePeriod = "MORNING" | "AFTERNOON" | "NIGHT";

export interface Prescription {
  id: string;
  patientId: string;
  patientName?: string;
  prescribedBy: string;
  prescribedByName: string;
  medicationName: string;
  name?: string;
  dosage: string;
  frequency: string;
  durationDays?: number | null;
  duration?: string;
  schedule: DosePeriod[];
  instructions?: string;
  notes?: string;
  status: PrescriptionStatus;
  rawStatus?: string;
  startDate: string;
  endDate?: string | null;
  documentId?: string | null;
  documentTitle?: string | null;
  documentUrl?: string | null;
  isInvalid?: boolean;
  deletedAt?: string | null;
  takenToday?: DosePeriod[];
  createdAt?: string;
  updatedAt?: string;
}

export type PrescriptionCreatePayload = {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  schedule?: DosePeriod[];
  instructions?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  documentId?: string;
};

export type PrescriptionUpdatePayload = Partial<PrescriptionCreatePayload>;

export interface PrescriptionAuditRecord {
  id: string;
  action: string;
  entityId?: string | null;
  patientId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  summary?: string | null;
  timestamp?: string;
}
