export type ClinicalNoteType = "Progress note" | "Session note" | "Confidential";

export type ClinicalNoteItem = {
  id: string;
  patientId: string;
  patientName: string;
  program: string;
  planId: string | null;
  sessionId: string | null;
  noteType: ClinicalNoteType;
  content: string;
  status: "pending" | "draft" | "saved";
  sessionDate: string | null;
};

export type ClinicalNotesSummary = {
  total: number;
  pending: number;
  documented: number;
  patientCount: number;
  pendingItems: ClinicalNoteItem[];
  recentItems: ClinicalNoteItem[];
};

export type SaveClinicalNotePayload = {
  patientId: string;
  noteType: ClinicalNoteType;
  content: string;
  sessionId?: string | null;
  isDraft?: boolean;
};
