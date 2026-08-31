import axios from "axios";
import api from "@/lib/api";
import type {
  AdminProfile,
  AdminProfileUpdate,
  HospitalSettings,
  HospitalSettingsUpdate,
  SystemPreferences,
  SystemPreferencesUpdate,
} from "../types/admin-settings.types";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed. Please try again.";
};

export const adminSettingsService = {
  async getProfile(): Promise<AdminProfile> {
    const { data } = await api.get("/admin/settings/profile");
    return data?.data ?? data;
  },

  async updateProfile(payload: AdminProfileUpdate): Promise<AdminProfile> {
    try {
      const { data } = await api.patch("/admin/settings/profile", payload);
      return data?.data ?? data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async uploadProfileImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/admin/settings/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.url ?? data?.data?.avatarUrl ?? "";
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async getHospital(): Promise<HospitalSettings> {
    const { data } = await api.get("/settings/hospital");
    return data?.data ?? data;
  },

  async updateHospital(payload: HospitalSettingsUpdate): Promise<HospitalSettings> {
    try {
      const { data } = await api.patch("/admin/settings/hospital", payload);
      return data?.data ?? data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async uploadHospitalLogo(file: File): Promise<HospitalSettings> {
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const { data } = await api.post("/admin/settings/hospital-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.data ?? data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async getSystemPreferences(): Promise<SystemPreferences> {
    const { data } = await api.get("/admin/settings/system");
    return data?.data ?? data;
  },

  async updateSystemPreferences(
    payload: SystemPreferencesUpdate,
  ): Promise<SystemPreferences> {
    try {
      const { data } = await api.patch("/admin/settings/system", payload);
      return data?.data ?? data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },
};
