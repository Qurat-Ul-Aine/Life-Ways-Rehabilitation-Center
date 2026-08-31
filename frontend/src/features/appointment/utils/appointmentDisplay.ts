import type { Appointment, AppointmentFilter, AppointmentStatus } from "../appointment.types";

/** Local calendar date (YYYY-MM-DD) — matches backend appointment date storage */
export const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const PAST_TIME_MESSAGE =
  "You cannot book an appointment for a time that has already passed. Please select a future time.";

export const buildLocalDateTime = (dateStr: string, timeStr: string) => {
  const [y, m, day] = dateStr.slice(0, 10).split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  if ([y, m, day, h, min].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, day, h, min, 0, 0);
};

export const isPastSlot = (dateStr: string, timeStr: string, now = new Date()) => {
  const slotAt = buildLocalDateTime(dateStr, timeStr);
  if (!slotAt) return false;
  return slotAt <= now;
};

export const isStartingSoon = (
  dateStr: string,
  timeStr: string,
  withinMinutes = 30,
  now = new Date(),
) => {
  const apptAt = buildLocalDateTime(dateStr, timeStr);
  if (!apptAt) return false;
  const diffMs = apptAt.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= withinMinutes * 60 * 1000;
};

export const validateNotPastTime = (dateStr: string, timeStr: string) => {
  if (dateStr !== todayStr()) return null;
  if (isPastSlot(dateStr, timeStr)) return PAST_TIME_MESSAGE;
  return null;
};

export const parseDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`);

export const formatTime12 = (time?: string | null) => {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
};

export const formatDateLabel = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseDate(dateStr);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" });
};

export const formatFullDate = (dateStr: string) =>
  parseDate(dateStr).toLocaleDateString("en-PK", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const formatShortDate = (dateStr: string) =>
  parseDate(dateStr).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });

export const modeLabel = (mode: Appointment["mode"]) =>
  mode === "online" ? "Telehealth" : "In-person";

export const statusLabel = (status: AppointmentStatus) => {
  if (status === "missed") return "Missed";
  if (status === "no-show") return "No show";
  return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
};

export const statusBadgeClass = (status: AppointmentStatus) => {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "confirmed") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "cancelled" || status === "no-show") return "bg-red-50 text-red-700 border-red-200";
  if (status === "missed") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "scheduled" || status === "rescheduled") {
    return "bg-primary/10 text-primary border-primary/20";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export const modeBadgeClass = (mode: Appointment["mode"]) =>
  mode === "online" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-teal-50 text-teal-700 border-teal-200";

export const appointmentTypeLabel = (a: Appointment) =>
  a.reason?.trim() || modeLabel(a.mode);

export const isActiveReminder = (status: string) =>
  status === "scheduled" || status === "confirmed";

export const isUpcoming = (a: Appointment) => {
  const today = todayStr();
  if (a.date < today) return false;
  return (
    a.status !== "completed"
    && a.status !== "cancelled"
    && a.status !== "missed"
    && a.status !== "no-show"
  );
};

export const isCompleted = (a: Appointment) => a.status === "completed";

export const isCancelled = (a: Appointment) => a.status === "cancelled";

export const isMissed = (a: Appointment) => a.status === "missed";

export const isHistory = (a: Appointment) =>
  isCompleted(a) || isCancelled(a) || isMissed(a);

export const canModify = (a: Appointment) => isUpcoming(a);

export const TELEHEALTH_JOIN_EARLY_MINUTES = 5;
export const TELEHEALTH_JOIN_LATE_MINUTES = 120;

/** Frontend statuses aligned with backend TELEHEALTH_JOIN_STATUSES (BOOKED → scheduled, CONFIRMED → confirmed) */
export const TELEHEALTH_JOINABLE_STATUSES = new Set([
  "scheduled",
  "confirmed",
  "rescheduled",
]);

export type TelehealthJoinable = {
  mode: string;
  date: string;
  startTime?: string | null;
  status: string;
};

export const canJoinTelehealth = (a: TelehealthJoinable, now = new Date()) => {
  if (a.mode !== "online" || !a.startTime || !a.date) return false;
  if (!TELEHEALTH_JOINABLE_STATUSES.has(a.status)) return false;

  const startAt = buildLocalDateTime(a.date, a.startTime);
  if (!startAt) return false;

  const nowMs = now.getTime();
  const startMs = startAt.getTime();
  const earlyMs = TELEHEALTH_JOIN_EARLY_MINUTES * 60 * 1000;
  const lateMs = TELEHEALTH_JOIN_LATE_MINUTES * 60 * 1000;

  return nowMs >= startMs - earlyMs && nowMs <= startMs + lateMs;
};

export const telehealthJoinMessage = (a: TelehealthJoinable, now = new Date()) => {
  if (a.mode !== "online" || !a.startTime || !a.date) {
    return "Telehealth session is not available";
  }
  if (canJoinTelehealth(a, now)) return null;

  const startAt = buildLocalDateTime(a.date, a.startTime);
  if (!startAt) return "Session time unavailable";

  const nowMs = now.getTime();
  const startMs = startAt.getTime();
  const earlyMs = TELEHEALTH_JOIN_EARLY_MINUTES * 60 * 1000;
  const lateMs = TELEHEALTH_JOIN_LATE_MINUTES * 60 * 1000;

  if (nowMs < startMs - earlyMs) {
    const mins = Math.ceil((startMs - earlyMs - nowMs) / 60_000);
    return `Join opens ${mins} minute${mins === 1 ? "" : "s"} before your session (5 min early)`;
  }
  if (nowMs > startMs + lateMs) {
    return "This telehealth session has ended";
  }
  return "Join is not available right now";
};

export const filterAppointments = (
  items: Appointment[],
  filter: AppointmentFilter,
  search: string,
) => {
  const q = search.trim().toLowerCase();
  return items.filter((a) => {
    if (filter === "upcoming" && !isUpcoming(a)) return false;
    if (filter === "completed" && !isCompleted(a)) return false;
    if (filter === "cancelled" && !isCancelled(a)) return false;
    if (filter === "completed" && isMissed(a)) return false;

    if (q) {
      const doctor = (a.doctorName ?? "").toLowerCase();
      const reason = (a.reason ?? "").toLowerCase();
      const specialty = (a.doctorSpecialization ?? "").toLowerCase();
      const mode = modeLabel(a.mode).toLowerCase();
      const type = appointmentTypeLabel(a).toLowerCase();
      const status = statusLabel(a.status).toLowerCase();
      const dateLabel = formatDateLabel(a.date).toLowerCase();
      const shortDate = formatShortDate(a.date).toLowerCase();
      const haystack = [doctor, reason, specialty, mode, type, status, dateLabel, shortDate, a.date, a.startTime ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};

export const addMinutes = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
