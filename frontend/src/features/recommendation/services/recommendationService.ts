import axios from "axios";
import api from "@/lib/api";
import type {
  DoctorAiMatchDetail,
  DoctorAiMatchesResponse,
  DoctorAiMatchNotesPayload,
  DoctorAiMatchNotes,
} from "@/dashboard/doctor/types/doctor-ai-matches.types";
import type {
  AdminRecommendationManagement,
  AdminRecommendationQuery,
  AssessmentPayload,
  DoctorRecommendation,
  GenerateRecommendationsPayload,
  GenerateRecommendationsResult,
  PatientRecommendationsDashboard,
  RecommendationListResult,
  RehabilitationService,
} from "../recommendation.types";

const toErrorMessage = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      throw new Error(message);
    }
  }
  if (error instanceof Error && error.message.trim()) {
    throw new Error(error.message);
  }
  throw new Error(fallback);
};

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const recommendationService = {
  async getDashboard(): Promise<PatientRecommendationsDashboard> {
    try {
      const { data } = await api.get("/recommendations/me/dashboard");
      return unwrap<PatientRecommendationsDashboard>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load AI recommendations dashboard.");
    }
  },

  async listMine(): Promise<RecommendationListResult> {
    try {
      const { data } = await api.get("/recommendations/me");
      return unwrap<RecommendationListResult>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load recommendations.");
    }
  },

  async listByPatient(patientId: string): Promise<RecommendationListResult> {
    try {
      const { data } = await api.get(`/recommendations/patient/${patientId}`);
      return unwrap<RecommendationListResult>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load patient recommendations.");
    }
  },

  async getById(id: string): Promise<DoctorRecommendation & { patientName?: string }> {
    try {
      const { data } = await api.get(`/recommendations/${id}`);
      return unwrap<DoctorRecommendation & { patientName?: string }>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load recommendation.");
    }
  },

  async assess(payload: AssessmentPayload): Promise<GenerateRecommendationsResult> {
    try {
      const { data } = await api.post("/recommendations/assess", payload);
      return unwrap<GenerateRecommendationsResult>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to generate recommendations.");
    }
  },

  async generate(
    payload: GenerateRecommendationsPayload = {},
  ): Promise<GenerateRecommendationsResult> {
    try {
      const { data } = await api.post("/recommendations/generate", payload);
      return unwrap<GenerateRecommendationsResult>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to generate recommendations.");
    }
  },

  async listServices(): Promise<RehabilitationService[]> {
    try {
      const { data } = await api.get("/services");
      const body = unwrap<{ items?: RehabilitationService[] }>(data);
      return body?.items ?? [];
    } catch (error) {
      toErrorMessage(error, "Failed to load rehabilitation services.");
    }
  },

  async getDoctorMatches(): Promise<DoctorAiMatchesResponse> {
    try {
      const { data } = await api.get("/recommendations/doctor/matches");
      return unwrap<DoctorAiMatchesResponse>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load AI matches.");
    }
  },

  async getDoctorMatchDetail(recommendationId: string): Promise<DoctorAiMatchDetail> {
    try {
      const { data } = await api.get(`/recommendations/doctor/matches/${recommendationId}`);
      return unwrap<DoctorAiMatchDetail>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load AI match details.");
    }
  },

  async updateDoctorMatchNotes(
    recommendationId: string,
    payload: DoctorAiMatchNotesPayload,
  ): Promise<DoctorAiMatchNotes> {
    try {
      const { data } = await api.put(
        `/recommendations/doctor/matches/${recommendationId}/notes`,
        payload,
      );
      return unwrap<DoctorAiMatchNotes>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to save doctor notes.");
    }
  },

  async getAdminManagement(
    query: AdminRecommendationQuery = {},
  ): Promise<AdminRecommendationManagement> {
    try {
      const { data } = await api.get("/recommendations/admin/management", { params: query });
      return unwrap<AdminRecommendationManagement>(data);
    } catch (error) {
      toErrorMessage(error, "Failed to load AI recommendation management.");
    }
  },
};
