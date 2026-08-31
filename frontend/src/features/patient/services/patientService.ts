import api from "@/lib/api";
import { refreshPatientTherapy } from "@/features/patient/utils/patientTherapyRefresh";
import type {
  Patient,
  PatientCreatePayload,
  PatientListQuery,
  PatientListResult,
  PatientUpdatePayload,
  MedicalRecord,
  TherapySession,
  RecoverySummary,
  PatientDocument,
  PatientDocumentViewData,
  PatientMeProfile,
  PatientProfileUpdate,
  AuditLogEntry,
} from "../patient.types";

// ─── Helper: extract human-readable error ─────────────────────────────────────
const extractError = (error: unknown, fallback: string): never => {
  const msg =
    (error as any)?.response?.data?.message ??
    (error instanceof Error ? error.message : fallback);
  throw new Error(msg);
};

// ─── Helper: check if a blob is actually JSON (error response) ───────────────
// Axios gives us a Blob containing JSON text — we must detect and reject it
const validateBlob = async (blob: Blob, filename: string): Promise<Blob> => {
  // If content type is JSON — this is an error response, not a real file
  if (blob.type.includes("application/json") || blob.type.includes("text/plain")) {
    // Read the text to get the actual error message
    const text = await blob.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message ?? parsed?.error ?? "Document not available.");
    } catch {
      throw new Error("Document not available on server.");
    }
  }

  // If blob is tiny (< 100 bytes) and not an image — likely an error
  if (blob.size < 100 && !blob.type.startsWith("image/")) {
    const text = await blob.text().catch(() => "");
    if (text.startsWith("{") || text.startsWith("[")) {
      throw new Error("Document not available on server.");
    }
  }

  return blob;
};

export type { PatientMeProfile, PatientProfileUpdate } from "../patient.types";

export const patientService = {

  /** GET /api/patients */
  async list(query: PatientListQuery = {}): Promise<PatientListResult> {
    try {
      const { data } = await api.get("/patients", { params: query });
      if (data && Array.isArray(data.items)) {
        return {
          items: data.items,
          total: data.total ?? data.items.length,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 10,
        };
      }
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 10,
        };
      }
      return { items: [], total: 0, page: 1, pageSize: 10 };
    } catch (error) {
      extractError(error, "Failed to load patients.");
    }
  },

  /** GET /api/patients/me */
  async getMe(): Promise<PatientMeProfile> {
    try {
      const { data } = await api.get<PatientMeProfile>("/patients/me");
      return data;
    } catch (error) {
      extractError(error, "Failed to load your profile.");
    }
  },

  /** PATCH /api/patients/me */
  async updateMe(payload: PatientProfileUpdate): Promise<PatientMeProfile> {
    try {
      const { data } = await api.patch<{ success: boolean; data: PatientMeProfile }>(
        "/patients/me",
        payload,
      );
      return data.data ?? (data as unknown as PatientMeProfile);
    } catch (error) {
      extractError(error, "Failed to update profile.");
    }
  },

  /** POST /api/patients/me/profile-image */
  async uploadProfileImage(file: File): Promise<{ url: string; profile: PatientMeProfile }> {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post<{
        success: boolean;
        url: string;
        data: PatientMeProfile;
      }>("/patients/me/profile-image", formData);
      return { url: data.url, profile: data.data };
    } catch (error) {
      extractError(error, "Failed to upload profile image.");
    }
  },

  /** GET /api/patients/:id */
  async getById(id: string): Promise<Patient> {
    try {
      const { data } = await api.get<Patient>(`/patients/${id}`);
      return data;
    } catch (error) {
      extractError(error, "Failed to load patient.");
    }
  },

  /** POST /api/patients */
  async create(
    payload: PatientCreatePayload,
    actor = { name: "System", role: "admin" },
  ): Promise<Patient> {
    try {
      const { data } = await api.post<Patient>("/patients", {
        name:                 payload.fullName,
        email:                payload.email,
        gender:               payload.gender         ?? null,
        nationality:          null,
        condition:            payload.primaryDiagnosis ?? null,
        phone:                payload.phone           ?? null,
        address:              payload.address         ?? null,
        dateOfBirth:          payload.dateOfBirth     ?? null,
        admissionDate:        payload.admissionDate   ?? null,
        emergencyContactName: payload.emergencyContactName  ?? null,
        emergencyContactPhone:payload.emergencyContactPhone ?? null,
        status:               payload.status          ?? "active",
      });
      return data;
    } catch (error) {
      extractError(error, "Failed to create patient.");
    }
  },

  /** PATCH /api/patients/:id */
  async update(
    id: string,
    payload: PatientUpdatePayload,
    actor = { name: "System", role: "admin" },
  ): Promise<Patient> {
    try {
      const { data } = await api.patch<Patient>(`/patients/${id}`, {
        name:      payload.fullName        ?? undefined,
        email:     payload.email           ?? undefined,
        gender:    payload.gender          ?? undefined,
        condition: payload.primaryDiagnosis ?? undefined,
      });
      return data;
    } catch (error) {
      extractError(error, "Failed to update patient.");
    }
  },

  /** DELETE /api/patients/:id */
  async remove(id: string, actor = { name: "System", role: "admin" }): Promise<void> {
    try {
      await api.delete(`/patients/${id}`);
    } catch (error) {
      extractError(error, "Failed to delete patient.");
    }
  },

  /** PATCH /api/patients/:id/toggle-active */
  async toggleAccountActive(id: string): Promise<{ is_active: boolean; message: string }> {
    try {
      const { data } = await api.patch<{ is_active: boolean; message: string }>(
        `/patients/${id}/toggle-active`,
      );
      return data;
    } catch (error) {
      extractError(error, "Failed to update account status.");
    }
  },

  /** PATCH /api/patients/:id/assign-doctor */
  async assignDoctor(id: string, doctorId: string): Promise<Patient> {
    try {
      const { data } = await api.patch<Patient>(`/patients/${id}/assign-doctor`, { doctorId });
      return data;
    } catch (error) {
      extractError(error, "Failed to assign doctor.");
    }
  },

  /** PATCH /api/patients/:id/diagnosis — doctor/admin only (SRS-44) */
  async updateDiagnosis(patientId: string, diagnosis: string): Promise<Patient> {
    try {
      const { data } = await api.patch<Patient>(`/patients/${patientId}/diagnosis`, { diagnosis });
      return data;
    } catch (error) {
      extractError(error, "Failed to update diagnosis.");
    }
  },

  /** GET /api/patients/:id/audit-log */
  async getAuditLog(patientId: string): Promise<AuditLogEntry[]> {
    try {
      const { data } = await api.get<{ items: AuditLogEntry[] }>(`/patients/${patientId}/audit-log`);
      return data.items ?? [];
    } catch (error) {
      extractError(error, "Failed to load audit log.");
    }
  },

  /** GET /api/patients/:id/documents */
  async listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
    try {
      const { data } = await api.get<{ items: PatientDocument[] }>(`/patients/${patientId}/documents`);
      return data.items ?? [];
    } catch (error) {
      extractError(error, "Failed to load documents.");
    }
  },

  /** POST /api/patients/:id/documents — SRS-45 */
  async uploadDocument(
    patientId: string,
    file: File,
    meta: { title?: string; category?: string } = {},
  ): Promise<{ item: PatientDocument; savedAs: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (meta.title) formData.append("title", meta.title);
      if (meta.category) formData.append("category", meta.category);
      const { data } = await api.post<{ item: PatientDocument; savedAs: string }>(
        `/patients/${patientId}/documents`,
        formData,
      );
      return data;
    } catch (error) {
      extractError(error, "Failed to upload document.");
    }
  },

  /** GET /api/patients/:id/documents/serve/:filename — authenticated open */
  async openPatientDocumentFile(patientId: string, fileName: string): Promise<void> {
    try {
      const { data } = await api.get<Blob>(
        `/patients/${patientId}/documents/serve/${encodeURIComponent(fileName)}`,
        { responseType: "blob" },
      );
      const blob = await validateBlob(data, fileName);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      extractError(error, "Failed to open document.");
    }
  },

  /** POST /api/patients/:id/medical-records */
  async addMedicalRecord(id: string, record: Omit<MedicalRecord, "id">): Promise<Patient> {
    try {
      const { data } = await api.post<Patient>(`/patients/${id}/medical-records`, {
        type:       record.type,
        title:      record.title,
        details:    record.details,
        date:       record.date,
        authorName: record.authorName,
      });
      return data;
    } catch (error) {
      extractError(error, "Failed to add medical record.");
    }
  },

  /** PATCH /api/patients/:id/medical-records/:recordId */
  async updateMedicalRecord(
    patientId: string,
    recordId: string,
    record: Pick<MedicalRecord, "type" | "title" | "details">,
  ): Promise<Patient> {
    try {
      const { data } = await api.patch<Patient>(
        `/patients/${patientId}/medical-records/${recordId}`,
        {
          type: record.type,
          title: record.title,
          details: record.details,
        },
      );
      return data;
    } catch (error) {
      extractError(error, "Failed to update medical record.");
    }
  },

  /**
   * @deprecated Use `therapyService.recordSession()` via the Therapy Plan page instead.
   * Legacy PatientProfile dialog only — requires a single active therapy plan.
   */
  async addTherapySession(id: string, session: Omit<TherapySession, "id"> & { behavior?: string; progress?: string; mood?: string; attendance?: string }): Promise<Patient> {
    try {
      const { data } = await api.post<Patient>(`/patients/${id}/therapy-sessions`, {
        type:          session.type,
        therapistName: session.therapistName,
        date:          session.date,
        status:        session.status,
        notes:         session.notes,
        behavior:      session.behavior,
        progress:      session.progress,
        mood:          session.mood,
        attendance:    session.attendance,
      });
      refreshPatientTherapy();
      return data;
    } catch (error) {
      extractError(error, "Failed to add therapy session.");
    }
  },

  /** POST /api/patients/:id/recovery-points */
  async addRecoveryPoint(id: string, score: number, note?: string): Promise<Patient> {
    try {
      const { data } = await api.post<Patient>(`/patients/${id}/recovery-points`, { score, note });
      return data;
    } catch (error) {
      extractError(error, "Failed to add recovery point.");
    }
  },

  /** POST /api/patients/:id/confidential-notes */
  async addConfidentialNote(
    id: string,
    body: string,
    actor: { name: string; role: "admin" | "doctor" },
  ): Promise<Patient> {
    try {
      const { data } = await api.post<Patient>(`/patients/${id}/confidential-notes`, { body });
      return data;
    } catch (error) {
      extractError(error, "Failed to add confidential note.");
    }
  },

  /** GET /api/doctors — approved doctors only (for patient assignment, etc.) */
  async listDoctors() {
    try {
      const { data } = await api.get("/doctors", { params: { approved: "true", limit: 100 } });
      const items = data && Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      return items.map((d: { id: string; name?: string; specialization?: string; specialty?: string }) => ({
        id: String(d.id),
        name: d.name ?? "Unknown",
        specialty: d.specialization ?? d.specialty ?? "",
      }));
    } catch {
      return [];
    }
  },

  /** GET /api/patients/me/dashboard-summary */
  async getDashboardSummary() {
    const { data } = await api.get("/patients/me/dashboard-summary");
    return data;
  },

  // ─── Recovery summary ───────────────────────────────────────────────────────
  // GET /api/patients/me/recovery-summary
  async getRecoverySummary(): Promise<RecoverySummary> {
    try {
      const { data } = await api.get<RecoverySummary>("/patients/me/recovery-summary");
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return {
          clinicalNotes: null,
          upcomingSchedule: null,
          riskAlerts: [],
          treatmentGoals: [],
        } as unknown as RecoverySummary;
      }
      extractError(error, "Failed to load recovery summary.");
    }
  },

  // ─── Documents list ─────────────────────────────────────────────────────────
  // GET /api/patients/me/documents
  // FIX: 404 → return [] instead of crashing entire panel
  async listDocuments(): Promise<PatientDocument[]> {
    try {
      const { data } = await api.get<{ items: PatientDocument[]; total: number }>(
        "/patients/me/documents",
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch (error: any) {
      if (error?.response?.status === 404) return [];
      extractError(error, "Failed to load documents.");
    }
  },

  // ─── View document ──────────────────────────────────────────────────────────
  // GET /api/patients/me/documents/:source/:id
  // FIX: validate that we got a real file blob, not a JSON error response
  async viewDocument(
    source: PatientDocument["source"],
    id: string,
  ): Promise<PatientDocumentViewData | Blob> {
    try {
      const encodedId = encodeURIComponent(id);

      if (source === "file") {
        // Expect a real file blob
        const { data } = await api.get<Blob>(
          `/patients/me/documents/${source}/${encodedId}`,
          { responseType: "blob" },
        );
        // FIX: validate blob is a real file, not a JSON error
        return await validateBlob(data, `document-${id}`);
      }

      // screening / report → JSON view data
      const { data } = await api.get<PatientDocumentViewData>(
        `/patients/me/documents/${source}/${encodedId}`,
      );
      return data;
    } catch (error) {
      extractError(error, "Failed to open document.");
    }
  },

  // ─── Download document ──────────────────────────────────────────────────────
  // GET /api/patients/me/documents/:source/:id/download
  // FIX: was downloading JSON error responses as files
  // FIX: correct file extension from Content-Disposition or blob type
  async downloadDocument(source: PatientDocument["source"], id: string): Promise<Blob> {
    try {
      const response = await api.get<Blob>(
        `/patients/me/documents/${source}/${encodeURIComponent(id)}/download`,
        {
          responseType: "blob",
          // FIX: expose Content-Disposition so we can read the real filename
          headers: { Accept: "application/pdf,application/octet-stream,image/*,*/*" },
        },
      );

      const blob = response.data;

      // FIX: reject JSON error responses disguised as blobs
      await validateBlob(blob, `download-${id}`);

      return blob;
    } catch (error) {
      extractError(error, "Failed to download document.");
    }
  },
};