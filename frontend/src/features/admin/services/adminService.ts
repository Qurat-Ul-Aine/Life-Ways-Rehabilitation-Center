import axios from "axios";
import api from "@/lib/api";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }
  return "Request failed. Please try again.";
};

export type AdminDashboardStats = {
  totalPatients: number;
  totalDoctors: number;
  totalStaff: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingDoctors: number;
  therapyPlans?: number;
  prescriptions?: number;
  screeningTests?: number;
  internees?: number;
};

export type AdminRecentPatient = {
  id: string;
  fullName?: string;
  name?: string;
  condition?: string;
  gender?: string;
  status?: string;
};

export type AdminRecentAppointment = {
  id: string;
  date?: string | null;
  startTime?: string | null;
  status?: string;
  doctorName?: string;
  patientName?: string;
};

export type AdminDashboardSummary = {
  stats: AdminDashboardStats;
  recentPatients: AdminRecentPatient[];
  recentAppointments: AdminRecentAppointment[];
  weeklyAppointments: AdminRecentAppointment[];
};

export type ScreeningTestRow = {
  id: string;
  patientId: string | null;
  patientName: string;
  testType: string;
  score: number | null;
  riskLevel: string | null;
  testDate: string | null;
};

export type InterneeRow = {
  id: string;
  name: string;
  email: string;
  specialization: string;
  supervisor: string;
  mentorId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  universities: string[];
};

export type ReportsSummary = {
  patientsByStatus: { status: string; count: number }[];
  doctorsBySpecialization: { specialization: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
  therapyPlans: number;
  activePrescriptions: number;
  screeningsByRisk: { riskLevel: string; count: number }[];
  generatedAt: string;
};

export type AdminSearchPatient = {
  id: string;
  name: string;
  email: string;
  subtitle: string;
};

export type AdminSearchDoctor = {
  id: string;
  name: string;
  email: string;
  subtitle: string;
};

export type AdminSearchStaff = {
  id: string;
  name: string;
  email: string;
  subtitle: string;
};

export type AdminSearchAppointment = {
  id: string;
  patientName: string;
  doctorName: string;
  date: string | null;
  startTime: string | null;
  status: string;
};

export type AdminGlobalSearchResults = {
  patients: AdminSearchPatient[];
  doctors: AdminSearchDoctor[];
  staff: AdminSearchStaff[];
  appointments: AdminSearchAppointment[];
};

export const adminService = {
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    try {
      const { data } = await api.get<{ success: boolean; data: AdminDashboardSummary }>(
        "/admin/dashboard-summary",
      );
      return data.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async listScreeningTests(): Promise<ScreeningTestRow[]> {
    try {
      const { data } = await api.get<{ success: boolean; items: ScreeningTestRow[] }>(
        "/admin/screening-tests",
      );
      return data.items ?? [];
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async listInternees(): Promise<{
    items: InterneeRow[];
    stats: {
      total: number;
      active: number;
      onboarding: number;
      completingSoon: number;
      joinedThisMonth: number;
    };
  }> {
    try {
      const { data } = await api.get<{
        success: boolean;
        items: InterneeRow[];
        stats: {
          total: number;
          active: number;
          onboarding: number;
          completingSoon: number;
          joinedThisMonth: number;
        };
      }>("/admin/internees");
      return { items: data.items ?? [], stats: data.stats };
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async getReportsSummary(): Promise<ReportsSummary> {
    try {
      const { data } = await api.get<{ success: boolean; data: ReportsSummary }>(
        "/admin/reports-summary",
      );
      return data.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },

  async globalSearch(query: string): Promise<AdminGlobalSearchResults> {
    try {
      const { data } = await api.get<{ success: boolean; data: AdminGlobalSearchResults }>(
        "/admin/search",
        { params: { q: query } },
      );
      return (
        data.data ?? {
          patients: [],
          doctors: [],
          staff: [],
          appointments: [],
        }
      );
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },
};
