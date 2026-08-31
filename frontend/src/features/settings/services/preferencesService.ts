import axios from "axios";
import api from "@/lib/api";
import type { UserPreferences, UserPreferencesUpdate } from "../settings.types";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "Failed to save preferences.";
};

export const preferencesService = {
  async getMine(): Promise<UserPreferences> {
    try {
      const { data } = await api.get<{ success: boolean; data: UserPreferences }>(
        "/auth/preferences",
      );
      return data.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async updateMine(payload: UserPreferencesUpdate): Promise<UserPreferences> {
    try {
      const { data } = await api.patch<{ success: boolean; data: UserPreferences }>(
        "/auth/preferences",
        payload,
      );
      return data.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },
};
