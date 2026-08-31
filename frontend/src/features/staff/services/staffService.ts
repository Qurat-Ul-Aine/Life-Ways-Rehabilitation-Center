import api from "@/lib/api";
import type {
  AttendanceRecord,
  AttendanceStatus,
  StaffCreatePayload,
  StaffDocument,
  StaffDocumentCategory,
  StaffListQuery,
  StaffListResult,
  StaffMember,
  StaffNoteRecord,
  StaffTaskRecord,
  StaffUpdatePayload,
  TaskStatus,
} from "../staff.types";

const extractErrorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;
  if (data) {
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message?: string }).message;
      if (typeof message === "string" && message) return message;
    }
    if (typeof data === "object" && data !== null && "error" in data) {
      const errorMsg = (data as { error?: string }).error;
      if (typeof errorMsg === "string" && errorMsg) return errorMsg;
    }
    if (typeof data === "string" && data) return data;
  }
  if (typeof err?.message === "string" && err.message) return err.message;
  return "An unexpected error occurred. Please try again.";
};

const validateBlob = async (blob: Blob, filename: string): Promise<Blob> => {
  if (blob.type.includes("application/json") || blob.type.includes("text/plain")) {
    const text = await blob.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message ?? parsed?.error ?? "Document not available.");
    } catch (err) {
      if (err instanceof Error && err.message !== "Document not available.") throw err;
      throw new Error("Document not available on server.");
    }
  }
  if (blob.size === 0) throw new Error("Document not available on server.");
  return blob;
};

export const staffService = {
  /** GET /api/staff */
  async list(query: StaffListQuery = {}): Promise<StaffListResult> {
    try {
      const { data } = await api.get<StaffListResult>("/staff", { params: query });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** GET /api/staff/:id */
  async getById(id: string): Promise<StaffMember> {
    try {
      const { data } = await api.get<StaffMember>(`/staff/${id}`);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** POST /api/staff */
  async create(payload: StaffCreatePayload): Promise<StaffMember> {
    try {
      const { data } = await api.post<StaffMember>("/staff", payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** PATCH /api/staff/:id */
  async update(id: string, payload: StaffUpdatePayload): Promise<StaffMember> {
    try {
      const { data } = await api.patch<StaffMember>(`/staff/${id}`, payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** DELETE /api/staff/:id */
  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/staff/${id}`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** PATCH /api/staff/:id/toggle-active */
  async toggleAccountActive(id: string): Promise<{ is_active: boolean; message: string }> {
    try {
      const { data } = await api.patch<{ is_active: boolean; message: string }>(
        `/staff/${id}/toggle-active`,
      );
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** POST /api/staff/:id/attendance */
  async addAttendance(
    id: string,
    record: { date: string; status: AttendanceStatus; checkIn?: string; checkOut?: string },
  ): Promise<StaffMember> {
    try {
      const { data } = await api.post<{ staff: StaffMember; item: AttendanceRecord }>(
        `/staff/${id}/attendance`,
        record,
      );
      return data.staff;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** POST /api/staff/:id/tasks */
  async addTask(id: string, taskDescription: string): Promise<StaffMember> {
    try {
      const { data } = await api.post<{ staff: StaffMember; item: StaffTaskRecord }>(
        `/staff/${id}/tasks`,
        { taskDescription },
      );
      return data.staff;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** PATCH /api/staff/:id/tasks/:taskId */
  async updateTaskStatus(id: string, taskId: string, status: TaskStatus): Promise<StaffMember> {
    try {
      const { data } = await api.patch<{ staff: StaffMember; item: StaffTaskRecord }>(
        `/staff/${id}/tasks/${taskId}`,
        { status },
      );
      return data.staff;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** POST /api/staff/:id/notes */
  async addNote(id: string, noteText: string): Promise<StaffMember> {
    try {
      const { data } = await api.post<{ staff: StaffMember; item: StaffNoteRecord }>(
        `/staff/${id}/notes`,
        { noteText },
      );
      return data.staff;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** GET /api/staff/:id/documents */
  async listDocuments(staffId: string): Promise<StaffDocument[]> {
    try {
      const { data } = await api.get<{ items: StaffDocument[] }>(`/staff/${staffId}/documents`);
      return data.items ?? [];
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** POST /api/staff/:id/documents */
  async uploadDocument(
    staffId: string,
    file: File,
    meta: { title?: string; category?: StaffDocumentCategory } = {},
  ): Promise<{ staff: StaffMember; item: StaffDocument }> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", meta.title?.trim() || file.name);
      if (meta.category) formData.append("category", meta.category);
      const { data } = await api.post<{ staff: StaffMember; item: StaffDocument }>(
        `/staff/${staffId}/documents`,
        formData,
      );
      if (!data?.item) {
        throw new Error("Upload succeeded but server returned an invalid response.");
      }
      return { staff: data.staff, item: data.item };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** DELETE /api/staff/:id/documents/:documentId */
  async deleteDocument(staffId: string, documentId: string): Promise<StaffMember> {
    try {
      const { data } = await api.delete<{ success?: boolean; staff: StaffMember }>(
        `/staff/${staffId}/documents/${documentId}`,
      );
      if (!data?.staff) {
        throw new Error("Delete succeeded but server returned an invalid response.");
      }
      return data.staff;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /** GET /api/staff/:id/documents/serve/:filename */
  async openDocumentFile(staffId: string, fileName: string): Promise<void> {
    try {
      const { data } = await api.get<Blob>(
        `/staff/${staffId}/documents/serve/${encodeURIComponent(fileName)}`,
        { responseType: "blob" },
      );
      const blob = await validateBlob(data, fileName);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};
