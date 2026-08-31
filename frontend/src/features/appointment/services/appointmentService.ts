import api from "@/lib/api";
import type {
  Appointment,
  AppointmentCreatePayload,
  AppointmentListQuery,
  AppointmentUpdatePayload,
  BookableSlot,
  Consultation,
  ConsultationCreatePayload,
  DoctorOption,
  NotificationPayload,
  RehabilitationService,
  SlotsResponse,
} from "../appointment.types";

const extractError = (error: unknown): string => {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;
  if (data) {
    if (typeof data === "object" && data !== null && "message" in data) {
      const message = (data as { message?: string }).message;
      if (typeof message === "string" && message) return message;
    }
    if (typeof data === "object" && data !== null && "error" in data) {
      const errorMsg = (data as { error?: string }).error;
      if (typeof errorMsg === "string" && errorMsg) return errorMsg;
    }
    if (typeof data === "string" && data) return data;
  }
  return err?.message ?? "An unexpected error occurred.";
};

const mapCreatePayload = (payload: AppointmentCreatePayload) => ({
  patient_id: payload.patientId,
  doctor_id: payload.doctorId,
  service_id: payload.serviceId,
  service_slug: payload.serviceSlug,
  sub_service: payload.subService,
  analysis_id: payload.analysisId,
  analysisId: payload.analysisId,
  appointment_date: payload.date,
  appointment_time: payload.startTime,
  date: payload.date,
  startTime: payload.startTime,
  time: payload.startTime,
  mode: payload.mode,
  reason: payload.reason,
  notes: payload.notes,
});

const sendNotification = async (payload: NotificationPayload) => {
  try {
    await api.post("/notifications/send", payload);
  } catch {
    // non-critical
  }
};

export const appointmentService = {
  /** GET /api/appointments */
  async list(query: AppointmentListQuery = {}): Promise<Appointment[]> {
    try {
      const params: Record<string, string> = {};
      if (query.patientId) params.patientId = query.patientId;
      if (query.doctorId) params.doctorId = query.doctorId;
      if (query.status && query.status !== "all") params.status = query.status;
      if (query.fromDate) params.fromDate = query.fromDate;
      if (query.toDate) params.toDate = query.toDate;

      const { data } = await api.get<{ items: Appointment[]; total: number } | Appointment[]>(
        "/appointments",
        { params },
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** GET /api/appointments/:id */
  async getById(id: string): Promise<Appointment> {
    try {
      const { data } = await api.get<Appointment>(`/appointments/${id}`);
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** POST /api/appointments */
  async create(payload: AppointmentCreatePayload): Promise<Appointment> {
    try {
      const { data } = await api.post<Appointment>("/appointments", mapCreatePayload(payload));
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** PUT /api/appointments/:id */
  async update(id: string, payload: AppointmentUpdatePayload): Promise<Appointment> {
    try {
      const { data } = await api.put<Appointment>(`/appointments/${id}`, payload);
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** POST /api/appointments/:id/cancel */
  async cancel(id: string, reason?: string): Promise<Appointment> {
    try {
      const { data } = await api.post<Appointment>(`/appointments/${id}/cancel`, {
        reason: reason ?? null,
      });
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** POST /api/appointments/:id/reschedule */
  async reschedule(id: string, date: string, time: string): Promise<Appointment> {
    try {
      const { data } = await api.post<Appointment>(`/appointments/${id}/reschedule`, {
        date,
        appointment_time: time,
      });
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** POST /api/appointments/:id/confirm */
  async confirm(id: string): Promise<Appointment> {
    try {
      const { data } = await api.post<Appointment>(`/appointments/${id}/confirm`);
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** GET /api/appointments/slots */
  async getBookableSlots(doctorId: string, date: string): Promise<BookableSlot[]> {
    try {
      const { data } = await api.get<SlotsResponse>(
        "/appointments/slots",
        { params: { doctorId, date } },
      );
      return data.slots ?? [];
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** GET /api/services — active rehabilitation programs */
  async listServices(): Promise<RehabilitationService[]> {
    try {
      const { data } = await api.get<{ items: RehabilitationService[] } | RehabilitationService[]>(
        "/services",
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      return list;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** GET /api/doctors — bookable doctors, optionally filtered by service */
  async listDoctors(serviceId?: string): Promise<DoctorOption[]> {
    try {
      const params: Record<string, string> = { limit: "100", bookable: "true" };
      if (serviceId) params.serviceId = serviceId;

      const { data } = await api.get<{ items: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
        "/doctors",
        { params },
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      return list.map((d) => ({
        id: String(d.id),
        name: String(d.name ?? d.fullName ?? "Unknown"),
        specialization: String(d.specialization ?? d.department ?? ""),
      }));
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** POST /api/consultations */
  async createConsultation(payload: ConsultationCreatePayload): Promise<Consultation> {
    try {
      const { data } = await api.post<Consultation>("/consultations", payload);
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** GET /api/consultations/:patientId */
  async listConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    try {
      const { data } = await api.get<Consultation[]>(`/consultations/${patientId}`);
      return data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  /** Send appointment reminder notification */
  async sendReminder(
    appointmentId: string,
    channel: NotificationPayload["channel"],
  ): Promise<void> {
    const apt = await this.getById(appointmentId);
    await sendNotification({
      channel,
      to: apt.patientName,
      subject: "Appointment reminder",
      body: `Reminder: appointment with ${apt.doctorName} on ${apt.date} at ${apt.startTime}.`,
    });
  },
};
