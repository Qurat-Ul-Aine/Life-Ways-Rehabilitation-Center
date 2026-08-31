export type DoctorRole = "Doctor" | "Therapist" | "Psychologist" | "Consultant";
export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export interface AvailabilityDay {
  day: string;
  hours: string;
}

export interface AssignedPatient {
  id: string;
  name: string;
  condition: string;
}

export interface RehabilitationServiceRef {
  id: string;
  slug: string;
  title: string;
}

export interface Doctor {
  id: string;
  name: string;
  userId?: string;
  email?: string;
  phone?: string;
  license_no?: string;
  specialization?: string;
  qualification?: string;
  role?: DoctorRole;
  experience?: number;
  consultationFee?: number | null;
  patientsTreated?: number | null;
  successRate?: number | null;
  rating?: number | null;
  gender?: string | null;
  image?: string;
  about?: string;
  availability?: AvailabilityDay[];
  availability_status?: AvailabilityStatus;
  is_approved?: boolean;
  is_active?: boolean;
  totalPatients?: number;
  sessionsCompleted?: number;
  assignedPatients?: AssignedPatient[];
  services?: RehabilitationServiceRef[];
  inviteEmailSent?: boolean;
  welcomeEmailSent?: boolean;
  devLoginUrl?: string | null;
  devTemporaryPassword?: string | null;
}

export type DoctorInput = {
  name: string;
  email: string;
  phone: string;
  license_no: string;
  specialization: string;
  qualification?: string;
  role: DoctorRole;
  experience: number;
  consultationFee?: number | null;
  patientsTreated?: number | null;
  successRate?: number | null;
  gender?: string | null;
  image?: string;
  about?: string;
  availability: AvailabilityDay[];
};