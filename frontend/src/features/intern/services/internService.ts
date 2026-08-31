import api from "@/lib/api";
import type {
  AttendancePayload,
  Intern,
  InternCreatePayload,
  InternDashboardData,
  InternListQuery,
  InternListResult,
  InternUpdatePayload,
  Mentor,
  TrainingLog,
  TrainingLogPayload,
  TrainingLogsResult,
} from "../intern.types";

const extractErrorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;
  if (data) {
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message?: string }).message;
      if (typeof message === "string" && message) return message;
    }
    if (typeof data === "string" && data) return data;
  }
  if (typeof err?.message === "string" && err.message) return err.message;
  return "An unexpected error occurred. Please try again.";
};

function unwrap<T>(data: T | { data?: T }): T {
  if (data && typeof data === "object" && "data" in (data as object)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export const internService = {
  async list(query: InternListQuery = {}): Promise<InternListResult> {
    try {
      const { data } = await api.get<InternListResult>("/interns", { params: query });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getById(id: string): Promise<Intern> {
    try {
      const { data } = await api.get<{ data?: Intern } | Intern>(`/interns/${id}`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async create(payload: InternCreatePayload): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>("/interns", {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        education: payload.education,
        degree: payload.degree ?? payload.education,
        university: payload.university,
        department: payload.department,
        password: payload.password,
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth,
        address: payload.address,
        cnic: payload.cnic,
        semester: payload.semester,
        emergency_contact: payload.emergencyContact,
        skills: payload.skills,
        notes: payload.notes,
        required_hours: payload.requiredHours,
        internship_start: payload.internshipStart,
        internship_end: payload.internshipEnd,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async update(id: string, payload: InternUpdatePayload): Promise<Intern> {
    try {
      const { data } = await api.put<{ data?: Intern } | Intern>(`/interns/${id}`, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        education: payload.education,
        degree: payload.degree ?? payload.education,
        university: payload.university,
        department: payload.department,
        password: payload.password,
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth,
        address: payload.address,
        cnic: payload.cnic,
        semester: payload.semester,
        emergency_contact: payload.emergencyContact,
        skills: payload.skills,
        notes: payload.notes,
        required_hours: payload.requiredHours,
        internship_start: payload.internshipStart,
        internship_end: payload.internshipEnd,
        application_status: payload.applicationStatus,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/interns/${id}`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async listMentors(): Promise<Mentor[]> {
    try {
      const { data } = await api.get<{ data?: { items: Mentor[] } } | { items: Mentor[] }>(
        "/interns/mentors"
      );
      const unwrapped = unwrap(data);
      return "items" in unwrapped ? unwrapped.items : [];
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async signup(payload: InternCreatePayload): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>("/interns/signup", {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        education: payload.education,
        department: payload.department,
        password: payload.password,
        internship_start: payload.internshipStart,
        internship_end: payload.internshipEnd,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async assignMentor(internId: string, mentorId: string): Promise<Intern> {
    try {
      const { data } = await api.put<{ data?: Intern } | Intern>(
        `/interns/${internId}/mentor`,
        { mentor_id: mentorId }
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async addLog(internId: string, payload: TrainingLogPayload): Promise<TrainingLog> {
    try {
      const { data } = await api.post<{ data?: TrainingLog } | TrainingLog>(
        `/interns/${internId}/logs`,
        {
          hours_worked: payload.hoursWorked,
          tasks_completed: payload.tasksCompleted,
          learning_notes: payload.learningNotes,
          skills_learned: payload.skillsLearned,
          challenges: payload.challenges,
          log_date: payload.logDate,
          log_type: payload.logType ?? "daily",
        }
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getLogs(
    internId: string,
    params?: { fromDate?: string; toDate?: string }
  ): Promise<TrainingLogsResult> {
    try {
      const { data } = await api.get<{ data?: TrainingLogsResult } | TrainingLogsResult>(
        `/interns/${internId}/logs`,
        { params }
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async updateLog(logId: string, payload: TrainingLogPayload): Promise<TrainingLog> {
    try {
      const { data } = await api.put<{ data?: TrainingLog } | TrainingLog>(
        `/interns/logs/${logId}`,
        {
          hours_worked: payload.hoursWorked,
          tasks_completed: payload.tasksCompleted,
          learning_notes: payload.learningNotes,
          skills_learned: payload.skillsLearned,
          challenges: payload.challenges,
          log_date: payload.logDate,
          log_type: payload.logType,
        },
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getDashboard(): Promise<InternDashboardData> {
    try {
      const { data } = await api.get<{ data?: InternDashboardData } | InternDashboardData>(
        "/interns/me/dashboard"
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async approve(id: string): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>(`/interns/${id}/approve`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async reject(id: string, reason?: string): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>(`/interns/${id}/reject`, {
        reason,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async reactivate(id: string): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>(`/interns/${id}/reactivate`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async complete(id: string): Promise<Intern> {
    try {
      const { data } = await api.post<{ data?: Intern } | Intern>(`/interns/${id}/complete`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async removeMentor(internId: string): Promise<Intern> {
    try {
      const { data } = await api.delete<{ data?: Intern } | Intern>(`/interns/${internId}/mentor`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getAuditLogs(internId: string) {
    try {
      const { data } = await api.get<{ data?: { items: unknown[] } }>(
        `/interns/${internId}/audit-logs`,
      );
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getProgress(internId: string) {
    try {
      const { data } = await api.get(`/interns/${internId}/progress`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async addAttendance(internId: string, payload: AttendancePayload) {
    try {
      const { data } = await api.post(`/interns/${internId}/attendance`, {
        record_date: payload.recordDate,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        hours_worked: payload.hoursWorked,
        status: payload.status,
        remarks: payload.remarks,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getAttendance(
    internId: string,
    params?: { fromDate?: string; toDate?: string; status?: string },
  ) {
    try {
      const { data } = await api.get(`/interns/${internId}/attendance`, { params });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async updateAttendance(attendanceId: string, payload: AttendancePayload) {
    try {
      const { data } = await api.put(`/interns/attendance/${attendanceId}`, {
        record_date: payload.recordDate,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        hours_worked: payload.hoursWorked,
        status: payload.status,
        remarks: payload.remarks,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async approveAttendance(attendanceId: string) {
    try {
      const { data } = await api.patch(`/interns/attendance/${attendanceId}/approve`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async reviewLog(logId: string, mentorRemarks: string) {
    try {
      const { data } = await api.patch(`/interns/logs/${logId}/review`, {
        mentor_remarks: mentorRemarks,
      });
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async addEvaluation(internId: string, payload: { rating: number; comments?: string }) {
    try {
      const { data } = await api.post(`/interns/${internId}/evaluations`, payload);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getEvaluations(internId: string) {
    try {
      const { data } = await api.get(`/interns/${internId}/evaluations`);
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async exportReport(params: {
    type: string;
    internId?: string;
    format?: "json" | "excel" | "csv";
    fromDate?: string;
    toDate?: string;
  }) {
    try {
      const { data } = await api.get("/interns/reports/export", {
        params,
        responseType: params.format === "csv" || params.format === "excel" ? "blob" : "json",
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async getMe(): Promise<Intern> {
    try {
      const { data } = await api.get<{ data?: Intern } | Intern>("/interns/me");
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async listMyMentees() {
    try {
      const { data } = await api.get("/interns/me/mentees");
      return unwrap(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};
