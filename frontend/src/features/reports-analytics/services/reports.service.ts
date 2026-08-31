import api from "@/lib/api";
import type {
  DoctorPerformanceReport,
  ExportReportType,
  FinancialReport,
  PatientPerformanceReport,
  ReportFilters,
  TherapyDailyReport,
  TherapyMonthlyReport,
} from "../types/reports.types";

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function toParams(filters: ReportFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.from) p.from = filters.from;
  if (filters.to) p.to = filters.to;
  if (filters.doctorId) p.doctorId = filters.doctorId;
  if (filters.patientId) p.patientId = filters.patientId;
  return p;
}

export const reportsService = {
  async getTherapyDaily(filters: ReportFilters): Promise<TherapyDailyReport> {
    const { data } = await api.get("/reports/therapy/daily", { params: toParams(filters) });
    return unwrap<TherapyDailyReport>(data);
  },

  async getTherapyMonthly(filters: ReportFilters): Promise<TherapyMonthlyReport> {
    const { data } = await api.get("/reports/therapy/monthly", { params: toParams(filters) });
    return unwrap<TherapyMonthlyReport>(data);
  },

  async getDoctorPerformance(filters: ReportFilters): Promise<DoctorPerformanceReport> {
    const { data } = await api.get("/reports/doctors/performance", { params: toParams(filters) });
    return unwrap<DoctorPerformanceReport>(data);
  },

  async getPatientPerformance(filters: ReportFilters): Promise<PatientPerformanceReport> {
    const { data } = await api.get("/reports/patients/performance", { params: toParams(filters) });
    return unwrap<PatientPerformanceReport>(data);
  },

  async getFinancial(filters: ReportFilters): Promise<FinancialReport> {
    const { data } = await api.get("/reports/financial", { params: toParams(filters) });
    return unwrap<FinancialReport>(data);
  },

  async downloadExport(
    format: "pdf" | "excel",
    type: ExportReportType,
    filters: ReportFilters
  ): Promise<void> {
    const endpoint = format === "pdf" ? "/reports/export/pdf" : "/reports/export/excel";
    const response = await api.get(endpoint, {
      params: { ...toParams(filters), type },
      responseType: "blob",
    });

    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (response.data as Blob).text();
      const json = JSON.parse(text) as { message?: string };
      throw new Error(json.message ?? "Export failed.");
    }

    const blob = new Blob([response.data], {
      type: contentType || "application/octet-stream",
    });

    const disposition = String(response.headers["content-disposition"] ?? "");
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const fallbackExt = format === "pdf" ? "pdf" : "xlsx";
    const downloadName = filenameMatch?.[1] || `${type}-report.${fallbackExt}`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
