import api from "@/lib/api";
import type { Doctor, DoctorInput } from "../doctor.types";

export interface DoctorListResponse {
  items: Doctor[];
  total: number;
  page: number;
  limit: number;
}

export interface DoctorFilters {
  search?: string;
  specialization?: string;
  approved?: boolean;
  page?: number;
  limit?: number;
}

export const doctorService = {
  async getAll(filters?: DoctorFilters): Promise<DoctorListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.specialization) params.set("specialization", filters.specialization);
    if (filters?.approved !== undefined) params.set("approved", String(filters.approved));
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const { data } = await api.get(`/doctors?${params.toString()}`);
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      limit: data.limit ?? 50,
    };
  },

  async getById(id: string): Promise<Doctor> {
    const { data } = await api.get(`/doctors/${id}`);
    // Backend { success, data: Doctor } return karta hai
    return data?.data ?? data;
  },

  async create(input: DoctorInput): Promise<Doctor> {
    const { data } = await api.post("/doctors", input);
    return data?.data ?? data;
  },

  async update(id: string, input: DoctorInput): Promise<Doctor> {
    const { data } = await api.patch(`/doctors/${id}`, input);
    return data?.data ?? data;
  },

  async approve(id: string): Promise<Doctor> {
    const { data } = await api.patch(`/doctors/${id}/approve`);
    return data?.data ?? data;
  },

  async toggleActive(id: string): Promise<{ is_active: boolean }> {
    const { data } = await api.patch(`/doctors/${id}/toggle-active`);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/doctors/${id}`);
  },

  async setServices(id: string, serviceIds: string[]): Promise<Doctor> {
    const { data } = await api.patch(`/doctors/${id}/services`, { serviceIds });
    return data?.data ?? data;
  },
};