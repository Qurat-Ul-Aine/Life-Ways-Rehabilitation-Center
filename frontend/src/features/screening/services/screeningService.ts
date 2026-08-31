import api from "@/lib/api";
import type {
  AdminScreeningAnalytics,
  AdminScreeningDetail,
  AdminScreeningItem,
  AdminScreeningStats,
  PatientScreeningHistoryItem,
  ScreeningCondition,
  ScreeningIntroConfig,
  ScreeningQuestion,
  ScreeningResult,
} from "@/features/screening/types/screening.types";

function unwrap<T>(data: T | { data?: T }): T {
  if (data && typeof data === "object" && "data" in (data as object)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

const extractError = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? "Request failed.";
};

export async function getIntroConfig(): Promise<ScreeningIntroConfig> {
  const { data } = await api.get("/screening/config");
  return unwrap(data);
}

export async function getConditions(): Promise<ScreeningCondition[]> {
  const { data } = await api.get("/screening/conditions");
  return unwrap(data);
}

export async function getQuestionnaire(conditionId: string): Promise<{
  condition: ScreeningCondition;
  questions: ScreeningQuestion[];
}> {
  const { data } = await api.get(`/screening/questions/${conditionId}`);
  return unwrap(data);
}

export async function submitAssessment(payload: {
  conditionId: string;
  assessmentType: string;
  age?: number;
  gender?: string;
  answers: { questionId: string; value: string }[];
  patientId?: string;
}): Promise<ScreeningResult> {
  try {
    const { data } = await api.post("/screening/submit", payload);
    return unwrap(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getResult(id: string): Promise<ScreeningResult> {
  const { data } = await api.get(`/screening/result/${id}`);
  return unwrap(data);
}

export async function getHistory(): Promise<PatientScreeningHistoryItem[]> {
  try {
    const { data } = await api.get("/screening/my-history");
    return unwrap<PatientScreeningHistoryItem[]>(data);
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function listDoctorAssignments(params?: Record<string, string | number | undefined>): Promise<{
  items: AdminScreeningItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const { data } = await api.get("/screening/doctor/assignments", { params });
    const payload = unwrap<{
      items?: AdminScreeningItem[];
      total?: number;
      page?: number;
      pageSize?: number;
    }>(data);
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      total: payload?.total ?? 0,
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? 20,
    };
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function listAdmin(params?: Record<string, string | number | undefined>): Promise<{
  items: AdminScreeningItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const { data } = await api.get("/admin/screenings", { params });
    const payload = unwrap<{
      items?: AdminScreeningItem[];
      total?: number;
      page?: number;
      pageSize?: number;
    }>(data);
    return {
      items: Array.isArray(payload?.items) ? payload.items : [],
      total: payload?.total ?? 0,
      page: payload?.page ?? 1,
      pageSize: payload?.pageSize ?? 20,
    };
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getAdminStats(): Promise<AdminScreeningStats> {
  const { data } = await api.get("/admin/screenings/stats");
  return unwrap(data);
}

export async function getAdminAnalytics(): Promise<AdminScreeningAnalytics> {
  const { data } = await api.get("/admin/screenings/analytics");
  return unwrap(data);
}

export async function getAdminDetail(id: string): Promise<AdminScreeningDetail> {
  const { data } = await api.get(`/admin/screenings/${id}`);
  return unwrap(data);
}

export async function assignDoctor(payload: {
  screeningId: string;
  doctorId: string;
  flagPatient?: boolean;
  followUpDate?: string;
  status?: string;
}) {
  const { data } = await api.post("/admin/screenings/assign-doctor", payload);
  return unwrap(data);
}

/** @deprecated Use named exports. Kept for gradual migration. */
export const screeningService = {
  getIntroConfig,
  getConditions,
  getQuestions: getQuestionnaire,
  submit: submitAssessment,
  getResult,
  getMyHistory: getHistory,
  listDoctorAssignments,
  listAdmin,
  getAdminStats,
  getAdminAnalytics,
  getAdminDetail,
  assignDoctor,
};
