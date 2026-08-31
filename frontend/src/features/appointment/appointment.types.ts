export type AppointmentMode = "online" | "in-person";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "missed"
  | "rescheduled"
  | "no-show";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization?: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm
  mode: AppointmentMode;
  meetingUrl?: string;
  reason: string | null;
  notes?: string | null;
  cancelledReason?: string | null;
  outcome?: string | null;
  status: AppointmentStatus;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceSlug?: string | null;
  analysisId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RehabilitationService {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  isActive?: boolean;
}

export type AppointmentFilter = "all" | "upcoming" | "completed" | "cancelled";

export interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

export interface SlotsResponse {
  doctorId: string;
  doctorName: string;
  date: string;
  slots: BookableSlot[];
}

export type AppointmentCreatePayload = Omit<
  Appointment,
  "id" | "status" | "createdAt" | "updatedAt" | "serviceName" | "serviceSlug"
> & {
  status?: AppointmentStatus;
  serviceId?: string;
  serviceSlug?: string;
  subService?: string;
};

export type AppointmentUpdatePayload = Partial<
  Pick<Appointment, "date" | "startTime" | "endTime" | "mode" | "meetingUrl" | "reason" | "status">
>;

export interface AppointmentListQuery {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus | "all";
  fromDate?: string;
  toDate?: string;
}

/** Doctor weekly availability — a recurring weekly slot template. */
export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotMinutes: number; // length of each bookable sub-slot
}

export interface DoctorAvailability {
  doctorId: string;
  doctorName: string;
  slots: AvailabilitySlot[];
}

/** A computed bookable slot resolved against a specific date. */
export interface BookableSlot {
  date: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  available: boolean;
}

/** Immutable consultation record — once created, never edited or deleted. */
export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  followUpDate?: string;
  createdAt: string;
}

export type ConsultationCreatePayload = Omit<Consultation, "id" | "createdAt">;

export interface NotificationPayload {
  channel: "email" | "sms" | "whatsapp";
  to: string;
  subject?: string;
  body: string;
}