import api from "@/lib/api";
import { refreshPatientTherapy } from "@/features/patient/utils/patientTherapyRefresh";
import type {
  TherapyFile,
  TherapyPlan,
  TherapyPlanCreatePayload,
  TherapyPlanUpdatePayload,
  TherapyReportSummary,
  TherapySessionCreatePayload,
  TherapySessionRecord,
} from "../therapy.types";

/** Map frontend status values to backend enum */
const toDbStatus = (s?: string): string | undefined => {
  if (!s) return undefined;
  const lower = s.toLowerCase().replace(/-/g, "_");
  if (lower === "active") return "ACTIVE";
  if (lower === "completed") return "COMPLETED";
  if (lower === "paused" || lower === "on_hold") return "ON_HOLD";
  if (lower === "cancelled") return "CANCELLED";
  return s.toUpperCase();
};

const mapPlanPayload = (payload: TherapyPlanCreatePayload | TherapyPlanUpdatePayload) => {
  const { frequencyPerWeek, status, ...rest } = payload;
  return {
    ...rest,
    ...(frequencyPerWeek !== undefined && { frequencyPerWeek }),
    ...(status !== undefined && { status: toDbStatus(status as string) }),
  };
};

const extractError = (error: unknown, fallback: string): never => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  throw new Error(err?.response?.data?.message ?? err?.message ?? fallback);
};

export const THERAPY_FILE_MAX_BYTES = 250 * 1024 * 1024;

const mapSessionPayload = (payload: TherapySessionCreatePayload | Partial<TherapySessionCreatePayload>) => ({
  appointment_id: payload.appointmentId ?? payload.appointment_id,
  session_date: payload.session_date ?? payload.date,
  duration: payload.duration ?? payload.durationMinutes,
  session_type: payload.sessionType ?? payload.session_type,
  chief_complaint: payload.chiefComplaint ?? payload.chief_complaint,
  observations: payload.observations,
  progress_notes: payload.progress_notes ?? payload.notes,
  exercises_discussed: payload.exercisesDiscussed ?? payload.exercises_discussed,
  next_steps: payload.nextSteps ?? payload.next_steps,
  confidential_notes: payload.confidentialNotes ?? payload.confidential_notes,
  status: payload.status,
  outcome: payload.outcome,
  pain_level: payload.painLevel ?? payload.pain_level,
  attendance: payload.attendance,
  mood: payload.mood,
});

export const therapyService = {
  async listPlans(patientId?: string): Promise<TherapyPlan[]> {
    const { data } = await api.get("/therapy-plans", {
      params: patientId ? { patientId } : undefined,
    });
    return data?.items ?? data ?? [];
  },

  async getPlan(id: string): Promise<TherapyPlan> {
    const { data } = await api.get(`/therapy-plans/${id}`);
    return data?.data ?? data;
  },

  async listByPatient(patientId: string): Promise<TherapyPlan[]> {
    return this.listPlans(patientId);
  },

  async createPlan(payload: TherapyPlanCreatePayload): Promise<TherapyPlan> {
    const { data } = await api.post("/therapy-plans", mapPlanPayload(payload));
    return data?.data ?? data;
  },

  async updatePlan(id: string, payload: TherapyPlanUpdatePayload): Promise<TherapyPlan> {
    const { data } = await api.put(`/therapy-plans/${id}`, mapPlanPayload(payload));
    return data?.data ?? data;
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/therapy-plans/${id}`);
  },

  async recordSession(payload: TherapySessionCreatePayload): Promise<TherapySessionRecord> {
    const planId = payload.planId;
    if (!planId) throw new Error("planId is required");

    try {
      const { data } = await api.post(`/therapy-plans/${planId}/sessions`, mapSessionPayload(payload));
      const result = data?.data ?? data;
      refreshPatientTherapy();
      return result;
    } catch (error) {
      extractError(error, "Failed to save session notes.");
    }
  },

  async updateSession(
    planId: string,
    sessionId: string,
    payload: Partial<TherapySessionCreatePayload>,
  ): Promise<TherapySessionRecord> {
    try {
      const { data } = await api.put(
        `/therapy-plans/${planId}/sessions/${sessionId}`,
        mapSessionPayload(payload),
      );
      const result = data?.data ?? data;
      refreshPatientTherapy();
      return result;
    } catch (error) {
      extractError(error, "Failed to update session notes.");
    }
  },

  async deleteSession(planId: string, sessionId: string): Promise<void> {
    try {
      await api.delete(`/therapy-plans/${planId}/sessions/${sessionId}`);
    } catch (error) {
      extractError(error, "Failed to delete session notes.");
    }
  },

  async listSessions(planId: string): Promise<TherapySessionRecord[]> {
    const { data } = await api.get(`/therapy-plans/${planId}/sessions`);
    return data?.items ?? data ?? [];
  },

  async uploadFile(
    planId: string,
    file: File,
    meta: { uploadedBy?: string; title?: string } = {},
  ): Promise<TherapyFile> {
    if (file.size > THERAPY_FILE_MAX_BYTES) {
      const maxMb = Math.round(THERAPY_FILE_MAX_BYTES / (1024 * 1024));
      throw new Error(`File is too large. Maximum allowed size is ${maxMb} MB.`);
    }
    try {
      const fd = new FormData();
      fd.append("planId", planId);
      fd.append("file", file);
      if (meta.uploadedBy) fd.append("uploadedBy", meta.uploadedBy);
      if (meta.title) fd.append("title", meta.title);
      const { data } = await api.post<{ item: TherapyFile }>("/therapy-files", fd, {
        timeout: 600_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return data.item;
    } catch (error) {
      extractError(error, "Upload failed.");
    }
  },

  async listFiles(planId: string): Promise<TherapyFile[]> {
    try {
      const { data } = await api.get<{ items: TherapyFile[] }>(`/therapy-files/${planId}`);
      return data?.items ?? [];
    } catch {
      return [];
    }
  },

  async deleteFile(planId: string, fileId: string): Promise<void> {
    try {
      await api.delete(`/therapy-files/${planId}/${fileId}`);
    } catch (error) {
      extractError(error, "Failed to delete file.");
    }
  },

  async openFile(planId: string, file: TherapyFile): Promise<void> {
    const fileName = file.storedFileName ?? file.url?.split("/").pop();
    if (!fileName) throw new Error("File reference missing.");
    try {
      const { data } = await api.get<Blob>(
        `/therapy-plans/${planId}/files/serve/${encodeURIComponent(fileName)}`,
        { responseType: "blob" },
      );
      const blob = data.type ? data : new Blob([data], { type: file.mimeType ?? "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      extractError(error, "Failed to open file.");
    }
  },

  async createExercise(
    planId: string,
    payload: { title: string; description?: string; media_url?: string },
  ): Promise<void> {
    try {
      await api.post(`/therapy-plans/${planId}/exercises`, payload);
    } catch (error) {
      extractError(error, "Failed to add exercise.");
    }
  },

  async updateExercise(
    planId: string,
    exerciseId: string,
    payload: { title?: string; description?: string; media_url?: string },
  ): Promise<void> {
    try {
      await api.put(`/therapy-plans/${planId}/exercises/${exerciseId}`, payload);
    } catch (error) {
      extractError(error, "Failed to update exercise.");
    }
  },

  async deleteExercise(planId: string, exerciseId: string): Promise<void> {
    try {
      await api.delete(`/therapy-plans/${planId}/exercises/${exerciseId}`);
    } catch (error) {
      extractError(error, "Failed to delete exercise.");
    }
  },

  async getReport(planId: string): Promise<TherapyReportSummary> {
    try {
      const { data } = await api.get(`/therapy-reports/${planId}`);
      return data;
    } catch {
      const sessions = await this.listSessions(planId);
      const pains = sessions
        .map((s) => s.painLevel ?? s.pain_level)
        .filter((v): v is number => typeof v === "number");
      return {
        planId,
        totalSessions: sessions.length,
        completedExercises: 0,
        improvedCount: sessions.filter((s) => s.outcome === "improved").length,
        averagePainLevel: pains.length
          ? pains.reduce((a, b) => a + b, 0) / pains.length
          : null,
        generatedAt: new Date().toISOString(),
      };
    }
  },
};
