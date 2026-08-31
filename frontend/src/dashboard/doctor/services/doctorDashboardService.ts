import axios from "axios";
import api from "@/lib/api";
import type { DoctorProfileUpdatePayload } from "../types/doctor-dashboard.types";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "Request failed. Please try again.";
};

export const doctorDashboardService = {
  async getSummary() {
    const response = await api.get("/doctors/me/dashboard-summary");
    return response.data;
  },

  async getMe() {
    const response = await api.get("/doctors/me");
    return response.data;
  },

  async updateProfile(payload: DoctorProfileUpdatePayload) {
    try {
      const response = await api.patch("/doctors/me", payload);
      return response.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async uploadProfileImage(file: File) {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/doctors/me/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },
};