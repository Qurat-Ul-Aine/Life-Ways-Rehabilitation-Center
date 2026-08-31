import axios from "axios";
import api from "@/lib/api";
import type {
  Prescription,
  PrescriptionAuditRecord,
  PrescriptionCreatePayload,
  PrescriptionUpdatePayload,
  DosePeriod,
} from "./prescription.types";

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

async function request<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new Error(toErrorMessage(error, fallback));
  }
}

export const prescriptionService = {
  async list(params?: { patientId?: string; status?: string; includeDeleted?: boolean | string }): Promise<Prescription[]> {
    const { data } = await api.get("/prescriptions", {
      params: {
        ...params,
        includeDeleted:
          params?.includeDeleted === true || params?.includeDeleted === "1" ? "1" : undefined,
      },
    });
    return data?.items ?? [];
  },

  async get(id: string): Promise<Prescription> {
    const { data } = await api.get(`/prescriptions/${id}`);
    return data?.data ?? data;
  },

  async create(payload: PrescriptionCreatePayload): Promise<Prescription> {
    return request(async () => {
      const { data } = await api.post("/prescriptions", payload);
      return data?.data ?? data;
    }, "Failed to save prescription");
  },

  async update(id: string, payload: PrescriptionUpdatePayload): Promise<Prescription> {
    const { data } = await api.put(`/prescriptions/${id}`, payload);
    return data?.data ?? data;
  },

  async stop(id: string): Promise<Prescription> {
    const { data } = await api.patch(`/prescriptions/${id}/stop`);
    return data?.data ?? data;
  },

  async setStatus(id: string, status: string): Promise<Prescription> {
    const { data } = await api.patch(`/prescriptions/${id}/status`, { status });
    return data?.data ?? data;
  },

  async markTaken(id: string, dosePeriod: DosePeriod): Promise<Prescription> {
    const { data } = await api.post(`/prescriptions/${id}/mark-taken`, { dosePeriod });
    return data?.data ?? data;
  },

  async markInvalid(id: string): Promise<Prescription> {
    const { data } = await api.patch(`/prescriptions/${id}/invalidate`);
    return data?.data ?? data;
  },

  async softDelete(id: string): Promise<Prescription> {
    const { data } = await api.delete(`/prescriptions/${id}`);
    return data?.data ?? data;
  },

  async listAudit(patientId?: string): Promise<PrescriptionAuditRecord[]> {
    const { data } = await api.get("/prescriptions/audit", {
      params: patientId ? { patientId } : undefined,
    });
    return data?.items ?? [];
  },
};
