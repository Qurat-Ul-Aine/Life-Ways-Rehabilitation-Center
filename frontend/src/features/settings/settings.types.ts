export type ThemePreference = "light" | "dark" | "system";
export type ProfileVisibility = "public" | "care_team" | "private";

export interface UserPreferences {
  appointmentNotifications: boolean;
  medicationReminders: boolean;
  recoveryNotifications: boolean;
  sessionNotifications: boolean;
  patientUpdates: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  doctorRegistrationNotifications?: boolean;
  patientRegistrationNotifications?: boolean;
  telehealthNotifications?: boolean;
  profileVisibility: ProfileVisibility;
  dataSharing: boolean;
  theme: ThemePreference;
}

export type UserPreferencesUpdate = Partial<UserPreferences>;

import type { ReactNode } from "react";

export type SettingsSection = {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
};

export type DaySchedule = {
  day: string;
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

export const WEEK_DAYS: DaySchedule[] = [
  { day: "Sunday", dayOfWeek: 0, enabled: false, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "" },
  { day: "Monday", dayOfWeek: 1, enabled: true, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
  { day: "Tuesday", dayOfWeek: 2, enabled: true, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
  { day: "Wednesday", dayOfWeek: 3, enabled: true, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
  { day: "Thursday", dayOfWeek: 4, enabled: true, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
  { day: "Friday", dayOfWeek: 5, enabled: true, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" },
  { day: "Saturday", dayOfWeek: 6, enabled: false, startTime: "09:00", endTime: "13:00", breakStart: "", breakEnd: "" },
];

export function parseAvailabilitySchedule(raw: unknown): DaySchedule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return WEEK_DAYS.map((d) => ({ ...d }));
  }

  const dayNameToNum: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const parseHours = (hours?: string) => {
    if (!hours) return { start: "09:00", end: "17:00" };
    const match = String(hours).match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!match) return { start: "09:00", end: "17:00" };
    const pad = (t: string) => {
      const [h, m] = t.split(":");
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    return { start: pad(match[1]), end: pad(match[2]) };
  };

  const byDay = new Map<number, DaySchedule>();

  for (const entry of raw) {
    const e = entry as Record<string, unknown>;
    const dayOfWeek = Number(
      e.dayOfWeek ?? e.day_of_week ?? dayNameToNum[String(e.day ?? "").toLowerCase()] ?? -1,
    );
    if (dayOfWeek < 0 || dayOfWeek > 6) continue;

    const hoursParsed = parseHours(e.hours as string | undefined);
    const base = WEEK_DAYS.find((d) => d.dayOfWeek === dayOfWeek)!;

    byDay.set(dayOfWeek, {
      day: base.day,
      dayOfWeek,
      enabled: e.enabled !== false,
      startTime: String(e.startTime ?? e.start ?? hoursParsed.start).slice(0, 5),
      endTime: String(e.endTime ?? e.end ?? hoursParsed.end).slice(0, 5),
      breakStart: String(e.breakStart ?? e.break_start ?? "").slice(0, 5),
      breakEnd: String(e.breakEnd ?? e.break_end ?? "").slice(0, 5),
    });
  }

  return WEEK_DAYS.map((d) => byDay.get(d.dayOfWeek) ?? { ...d, enabled: false });
}

export function serializeAvailabilitySchedule(schedule: DaySchedule[]) {
  return schedule
    .filter((d) => d.enabled)
    .map((d) => ({
      day: d.day,
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      breakStart: d.breakStart || null,
      breakEnd: d.breakEnd || null,
      enabled: true,
    }));
}
