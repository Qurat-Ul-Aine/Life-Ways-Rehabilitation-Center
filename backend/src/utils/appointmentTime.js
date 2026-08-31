/**
 * Server-local appointment date/time helpers.
 * Uses the Node.js process timezone for calendar day and clock comparisons.
 */

const PAST_TIME_MESSAGE =
  "You cannot book an appointment for a time that has already passed. Please select a future time.";

const toTimeDate = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();

  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(parseInt(match24[1], 10));
    d.setUTCMinutes(parseInt(match24[2], 10));
    return d;
  }

  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(h);
    d.setUTCMinutes(m);
    return d;
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

  return null;
};

const toCalendarDate = (raw) => {
  if (!raw) return null;
  const str = String(raw);
  const d = str.length === 10 ? new Date(`${str}T12:00:00.000Z`) : new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatTimeLabel = (raw) => {
  const d = toTimeDate(raw);
  if (!d) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const toDateStr = (raw) => {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** Server-local calendar day as noon UTC — matches @db.Date storage */
const localCalendarDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${day}T12:00:00.000Z`);
};

const localTodayStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Combine appointment date + time into server-local Date */
const buildLocalDateTime = (dateRaw, timeRaw) => {
  const dateStr = typeof dateRaw === "string"
    ? dateRaw.slice(0, 10)
    : toDateStr(dateRaw);
  const timeStr = formatTimeLabel(timeRaw);
  if (!dateStr || !timeStr) return null;

  const [y, m, day] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  if ([y, m, day, h, min].some((n) => Number.isNaN(n))) return null;

  return new Date(y, m - 1, day, h, min, 0, 0);
};

const assertNotPastDate = (dateRaw) => {
  const d = toCalendarDate(dateRaw);
  if (!d) {
    const err = new Error("Invalid appointment date");
    err.status = 400;
    throw err;
  }
  const today = localCalendarDate();
  if (d < today) {
    const err = new Error("Cannot book or reschedule to a past date");
    err.status = 400;
    throw err;
  }
  return d;
};

const assertNotPastTime = (dateRaw, timeRaw) => {
  const dateStr = String(dateRaw).slice(0, 10);
  if (dateStr !== localTodayStr()) return;

  const apptAt = buildLocalDateTime(dateRaw, timeRaw);
  if (!apptAt) {
    const err = new Error("Invalid appointment time");
    err.status = 400;
    throw err;
  }
  if (apptAt <= new Date()) {
    const err = new Error(PAST_TIME_MESSAGE);
    err.status = 400;
    throw err;
  }
};

const isAppointmentPast = (dateRaw, timeRaw, now = new Date()) => {
  const apptAt = buildLocalDateTime(dateRaw, timeRaw);
  if (!apptAt) return false;
  return apptAt <= now;
};

const isStartingSoon = (dateRaw, timeRaw, withinMinutes = 30, now = new Date()) => {
  const apptAt = buildLocalDateTime(dateRaw, timeRaw);
  if (!apptAt) return false;
  const diffMs = apptAt.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= withinMinutes * 60 * 1000;
};

/** Active appointment statuses for reminders, today's list, and missed-job eligibility */
const ACTIVE_REMINDER_STATUSES = ["BOOKED", "CONFIRMED"];

/** Appointment DB statuses that allow telehealth join (socket + waiting room) */
const TELEHEALTH_JOIN_STATUSES = ["BOOKED", "CONFIRMED"];

const TELEHEALTH_JOIN_EARLY_MS = 5 * 60 * 1000;
const TELEHEALTH_JOIN_LATE_MS = 2 * 60 * 60 * 1000;

const canJoinTelehealthSession = ({
  appointmentDate,
  appointmentTime,
  status,
  mode,
  now = new Date(),
}) => {
  const modeNorm = String(mode ?? "").toLowerCase();
  if (modeNorm !== "online") return false;
  if (!TELEHEALTH_JOIN_STATUSES.includes(String(status ?? "").toUpperCase())) return false;

  const startAt = buildLocalDateTime(appointmentDate, appointmentTime);
  if (!startAt) return false;

  const nowMs = now.getTime();
  const startMs = startAt.getTime();
  return (
    nowMs >= startMs - TELEHEALTH_JOIN_EARLY_MS
    && nowMs <= startMs + TELEHEALTH_JOIN_LATE_MS
  );
};

module.exports = {
  PAST_TIME_MESSAGE,
  ACTIVE_REMINDER_STATUSES,
  TELEHEALTH_JOIN_STATUSES,
  toTimeDate,
  toCalendarDate,
  formatTimeLabel,
  toDateStr,
  localCalendarDate,
  localTodayStr,
  buildLocalDateTime,
  assertNotPastDate,
  assertNotPastTime,
  isAppointmentPast,
  isStartingSoon,
  canJoinTelehealthSession,
  TELEHEALTH_JOIN_EARLY_MS,
};
