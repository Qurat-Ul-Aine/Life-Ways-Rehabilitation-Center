import axios from "axios";
import api from "@/lib/api";
import { therapyService } from "@/features/therapy/services/therapyService";
import type { TherapyPlan } from "@/features/therapy/therapy.types";
import type {
  ClinicalNoteItem,
  ClinicalNoteType,
  ClinicalNotesSummary,
  SaveClinicalNotePayload,
} from "../types/doctor-notes.types";

const NOTE_TYPE_PREFIX: Record<ClinicalNoteType, string> = {
  "Progress note": "[PROGRESS]",
  "Session note": "[SESSION]",
  Confidential: "[CONFIDENTIAL]",
};

const inferNoteType = (notes: string): ClinicalNoteType => {
  const trimmed = notes.trim();
  if (trimmed.startsWith("[CONFIDENTIAL]")) return "Confidential";
  if (trimmed.startsWith("[SESSION]")) return "Session note";
  return "Progress note";
};

const stripNotePrefix = (notes: string): string => {
  const trimmed = notes.trim();
  for (const prefix of Object.values(NOTE_TYPE_PREFIX)) {
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return trimmed;
};

const withNotePrefix = (type: ClinicalNoteType, content: string): string => {
  const body = content.trim();
  if (type === "Confidential") return body;
  const prefix = NOTE_TYPE_PREFIX[type];
  return body.startsWith(prefix) ? body : `${prefix} ${body}`;
};

const getPlanPatientId = (plan: TherapyPlan) =>
  String(plan.patient_id ?? plan.patientId ?? "");

const getPatientName = (plan: TherapyPlan) =>
  plan.patients?.users?.name ?? plan.patientName ?? "Patient";

const getProgram = (plan: TherapyPlan) =>
  plan.therapy_type ?? plan.title ?? plan.diagnosis ?? "Rehabilitation";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Failed to save clinical note.";
};

const buildSummary = (plans: TherapyPlan[]): ClinicalNotesSummary => {
  const pendingItems: ClinicalNoteItem[] = [];
  const recentItems: ClinicalNoteItem[] = [];
  const patientIds = new Set<string>();
  let documented = 0;

  for (const plan of plans) {
    const patientId = getPlanPatientId(plan);
    if (!patientId) continue;
    patientIds.add(patientId);

    const patientName = getPatientName(plan);
    const program = getProgram(plan);
    const planId = String(plan.id);

    for (const session of plan.therapy_sessions ?? []) {
      const sessionId = String(session.id);
      const notes = (session.progress_notes ?? session.notes ?? "").trim();
      const status = String(session.status ?? "").toUpperCase();
      const sessionDate = session.session_date ?? session.date ?? null;

      if (status === "COMPLETED" && !notes) {
        pendingItems.push({
          id: `pending-${sessionId}`,
          patientId,
          patientName,
          program,
          planId,
          sessionId,
          noteType: "Session note",
          content: "",
          status: "pending",
          sessionDate,
        });
        continue;
      }

      if (status === "SCHEDULED" && notes) {
        pendingItems.push({
          id: `draft-${sessionId}`,
          patientId,
          patientName,
          program,
          planId,
          sessionId,
          noteType: inferNoteType(notes),
          content: stripNotePrefix(notes),
          status: "draft",
          sessionDate,
        });
        continue;
      }

      if (notes) {
        documented += 1;
        recentItems.push({
          id: `saved-${sessionId}`,
          patientId,
          patientName,
          program,
          planId,
          sessionId,
          noteType: inferNoteType(notes),
          content: stripNotePrefix(notes),
          status: "saved",
          sessionDate,
        });
      }
    }
  }

  pendingItems.sort((a, b) => {
    const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return db - da;
  });

  recentItems.sort((a, b) => {
    const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return db - da;
  });

  return {
    total: documented + pendingItems.length,
    pending: pendingItems.filter((n) => n.status === "pending").length,
    documented,
    patientCount: patientIds.size,
    pendingItems,
    recentItems: recentItems.slice(0, 12),
  };
};

export const doctorNotesService = {
  async loadSummary(): Promise<ClinicalNotesSummary> {
    const plans = await therapyService.listPlans();
    const active = plans.filter(
      (p) => String(p.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
    );
    return buildSummary(active.length > 0 ? active : plans);
  },

  async saveNote(payload: SaveClinicalNotePayload): Promise<void> {
    const { patientId, noteType, content, sessionId, isDraft } = payload;
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Note content is required.");

    if (noteType === "Confidential") {
      await api.post(`/patients/${patientId}/confidential-notes`, { body: trimmed });
      return;
    }

    const plans = await therapyService.listPlans(patientId);
    const plan = plans.find((p) => String(p.status ?? "ACTIVE").toUpperCase() === "ACTIVE") ?? plans[0];
    if (!plan) throw new Error("No therapy plan found for this patient.");

    const planId = String(plan.id);
    const noteBody = withNotePrefix(noteType, trimmed);
    const today = new Date().toISOString().slice(0, 10);

    if (sessionId) {
      await api.put(`/therapy-plans/${planId}/sessions/${sessionId}`, {
        progress_notes: noteBody,
        status: isDraft ? "SCHEDULED" : "COMPLETED",
      });
      return;
    }

    await therapyService.recordSession({
      planId,
      session_date: today,
      date: today,
      progress_notes: noteBody,
      notes: noteBody,
      status: isDraft ? "SCHEDULED" : "COMPLETED",
    });
  },

  toErrorMessage,
};
