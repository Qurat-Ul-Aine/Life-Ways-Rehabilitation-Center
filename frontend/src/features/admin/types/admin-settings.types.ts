export type HospitalSettings = {
  hospitalName: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  updatedAt: string | null;
};

export type SystemPreferences = {
  defaultAppointmentDuration: number;
  timezone: string;
  dateFormat: string;
  updatedAt: string | null;
};

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: string;
};

export type HospitalSettingsUpdate = Partial<{
  hospitalName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  logoUrl: string | null;
}>;

export type SystemPreferencesUpdate = Partial<{
  defaultAppointmentDuration: number;
  timezone: string;
  dateFormat: string;
}>;

export type AdminProfileUpdate = Partial<{
  name: string;
  email: string;
  phone: string;
}>;

export const DATE_FORMAT_OPTIONS = [
  { value: "dd MMM yyyy", label: "14 Jun 2026" },
  { value: "MMM d, yyyy", label: "Jun 14, 2026" },
  { value: "yyyy-MM-dd", label: "2026-06-14" },
  { value: "dd/MM/yyyy", label: "14/06/2026" },
] as const;

export const APPOINTMENT_DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;

export { TIMEZONE_REGIONS, ALL_TIMEZONE_VALUES, formatTimezoneDisplay } from "../data/timezoneRegions";
