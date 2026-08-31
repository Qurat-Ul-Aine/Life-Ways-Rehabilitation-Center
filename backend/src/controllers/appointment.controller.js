const prisma = require("../lib/prisma");
const {
  findServiceByIdOrSlug,
  resolveDoctorForBooking,
  assignPatientToDoctorForBooking,
  ensureDoctorPatientLink,
} = require("../services/rehabAssignment.service");
const { resolveAnalysisIdForBooking } = require("../services/recommendation.service");
const { notifyDoctorPatientAssignment, notifyAppointmentBooked, notifyAppointmentCancelled, notifyAppointmentApproved, notifyAppointmentUpdated, describeAppointmentChanges } = require("../services/notification.service");
const { issueMeetingCredentials } = require("../services/jitsi.service");
const { assertApprovedActiveDoctor } = require("../utils/doctorApproval");
const {
  assertNotPastDate,
  assertNotPastTime,
  localTodayStr,
  buildLocalDateTime,
} = require("../utils/appointmentTime");
const { markMissedAppointments } = require("../services/appointmentMissed.service");
const {
  syncAppointmentSessionNotes,
  buildPatientVisibleSummary,
  parseExercisesDiscussed,
  resolveAutoTherapyPlanIdForBooking,
} = require("../services/therapySessionNotes.service");

const parseId = (raw) => (isNaN(Number(raw)) ? String(raw) : Number(raw));

// ─── Status mappers ───────────────────────────────────────────────────────────
// Schema enum: BOOKED | CONFIRMED | CANCELLED | COMPLETED | MISSED
const STATUS_TO_DB = {
  pending:     "BOOKED",
  scheduled:   "BOOKED",
  booked:      "BOOKED",
  confirmed:   "CONFIRMED",
  rescheduled: "BOOKED",
  completed:   "COMPLETED",
  cancelled:   "CANCELLED",
  missed:      "MISSED",
  "no-show":   "MISSED",
};

const STATUS_TO_FRONTEND = {
  BOOKED:    "scheduled",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  MISSED:    "missed",
};

const SLOT_BLOCKING_STATUSES = ["CANCELLED", "COMPLETED", "MISSED"];

const toDbStatus = (raw) => {
  if (!raw) return "BOOKED";
  const key = String(raw).toLowerCase();
  return STATUS_TO_DB[key] ?? (["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED", "MISSED"].includes(raw) ? raw : "BOOKED");
};

const toFrontendStatus = (raw) => STATUS_TO_FRONTEND[raw] ?? "scheduled";

// ─── Date parser ──────────────────────────────────────────────────────────────
// appointment_date is @db.Date — store as ISO string, Prisma handles it
const toDate = (raw) => {
  if (!raw) return null;
  const str = String(raw);
  // "2026-06-10" → append time so no UTC shift
  const d = str.length === 10 ? new Date(str + "T12:00:00.000Z") : new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// ─── Time parser ──────────────────────────────────────────────────────────────
// appointment_time is @db.Time(6) — Prisma expects a full Date object
// Frontend sends "09:30" or "09:30 AM" — convert to a Date object (date part ignored)
const toTime = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();

  // Handle "HH:MM" format
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(parseInt(match24[1], 10));
    d.setUTCMinutes(parseInt(match24[2], 10));
    return d;
  }

  // Handle "HH:MM AM/PM" format
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

  return null;
};

// ─── Format time back to "HH:MM" for frontend ────────────────────────────────
const formatTime = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
};

const APPT_INCLUDE = {
  patients: { include: { users: true } },
  doctors:  { include: { users: true } },
  rehabilitation_services: true,
  telehealth_sessions: { select: { meeting_link: true }, take: 1 },
};

const SLOT_MINUTES = 30;

const DEFAULT_WEEKLY = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
  slotMinutes: SLOT_MINUTES,
}));

const DAY_NAME_TO_NUM = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const addMinutesToTime = (time, minutes) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const timesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const parseHoursRange = (hours) => {
  if (!hours) return null;
  const match = String(hours).match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const pad = (t) => {
    const [h, m] = t.split(":");
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return { start: pad(match[1]), end: pad(match[2]) };
};

const timeToMinutes = (time) => {
  const [h, m] = String(time).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const slotOverlapsBreak = (slotStart, slotEnd, breakStart, breakEnd) => {
  if (!breakStart || !breakEnd) return false;
  return timesOverlap(slotStart, slotEnd, breakStart, breakEnd);
};

const normalizeSchedule = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_WEEKLY;
  return raw
    .map((s) => {
      const hoursParsed = parseHoursRange(s.hours);
      const breakStart = s.breakStart ?? s.break_start ?? null;
      const breakEnd = s.breakEnd ?? s.break_end ?? null;
      return {
        dayOfWeek: Number(
          s.dayOfWeek ?? s.day_of_week ?? DAY_NAME_TO_NUM[String(s.day ?? "").toLowerCase()] ?? 1,
        ),
        startTime: String(s.startTime ?? s.start ?? hoursParsed?.start ?? "09:00").slice(0, 5),
        endTime: String(s.endTime ?? s.end ?? hoursParsed?.end ?? "17:00").slice(0, 5),
        slotMinutes: Number(s.slotMinutes ?? s.slot_minutes ?? SLOT_MINUTES),
        breakStart: breakStart ? String(breakStart).slice(0, 5) : null,
        breakEnd: breakEnd ? String(breakEnd).slice(0, 5) : null,
      };
    })
    .filter((s) => s.enabled !== false);
};

const buildSlotsForDate = (schedule, dateStr) => {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const daySlots = normalizeSchedule(schedule).filter((s) => s.dayOfWeek === day);
  const result = [];

  for (const slot of daySlots) {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;

    while (cur + slot.slotMinutes <= end) {
      const startTime = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
      const endTime = addMinutesToTime(startTime, slot.slotMinutes);
      if (!slotOverlapsBreak(startTime, endTime, slot.breakStart, slot.breakEnd)) {
        result.push({ date: dateStr, startTime, endTime, slotMinutes: slot.slotMinutes });
      }
      cur += slot.slotMinutes;
    }
  }

  return result;
};

async function resolvePatientForUser(user) {
  if (!user?.id) return null;

  if (user.role === "FAMILY") {
    const link = await prisma.family_members.findUnique({
      where: { user_id: user.id },
      select: { patient_id: true },
    });
    if (!link) return null;
    return prisma.patients.findUnique({ where: { id: link.patient_id }, select: { id: true } });
  }

  return prisma.patients.findUnique({ where: { user_id: user.id }, select: { id: true } });
}

async function ensureTelehealthSession(appointmentId) {
  const existing = await prisma.telehealth_sessions.findFirst({
    where: { appointment_id: appointmentId },
    select: { id: true, meeting_link: true },
  });
  if (existing?.meeting_link) return existing.meeting_link;

  const { meetingLink } = issueMeetingCredentials(appointmentId);
  if (existing) {
    await prisma.telehealth_sessions.update({
      where: { id: existing.id },
      data: { meeting_link: meetingLink },
    });
  } else {
    await prisma.telehealth_sessions.create({
      data: { appointment_id: appointmentId, meeting_link: meetingLink },
    });
  }
  return meetingLink;
}

async function reloadAppointment(id) {
  return prisma.appointments.findUnique({
    where: { id: parseId(id) },
    include: APPT_INCLUDE,
  });
}

async function loadAppointmentOr404(id) {
  const row = await prisma.appointments.findUnique({
    where: { id: parseId(id) },
    include: APPT_INCLUDE,
  });
  return row;
}

async function assertPatientOwnsAppointment(req, appointment) {
  if (!["PATIENT", "FAMILY"].includes(req.user?.role)) return;
  const patient = await resolvePatientForUser(req.user);
  if (!patient || String(appointment.patient_id) !== String(patient.id)) {
    const err = new Error("You do not have access to this appointment");
    err.status = 403;
    throw err;
  }
}

function assertTerminalLocked(status) {
  if (status === "COMPLETED") {
    const err = new Error("Completed appointments cannot be changed");
    err.status = 400;
    throw err;
  }
  if (status === "CANCELLED") {
    const err = new Error("Cancelled appointments cannot be changed");
    err.status = 400;
    throw err;
  }
}

function assertModifiableStatus(status) {
  assertTerminalLocked(status);
  if (status === "MISSED") {
    const err = new Error("Missed appointments cannot be changed this way");
    err.status = 400;
    throw err;
  }
}

/** Allow completing active or missed appointments (late completion). */
function assertCompletableStatus(status) {
  assertTerminalLocked(status);
}

/** Allow rescheduling active or missed appointments. */
function assertReschedulableStatus(status) {
  assertTerminalLocked(status);
}

async function assertSlotAvailable(doctorId, dateRaw, timeRaw, excludeId = null) {
  const time = toTime(timeRaw);
  if (!time) {
    const err = new Error("Invalid appointment time");
    err.status = 400;
    throw err;
  }

  assertNotPastTime(dateRaw, timeRaw);

  const startLabel = formatTime(time);
  const endLabel = addMinutesToTime(startLabel, SLOT_MINUTES);

  const booked = await prisma.appointments.findMany({
    where: {
      doctor_id: parseId(doctorId),
      appointment_date: toDate(dateRaw),
      status: { notIn: SLOT_BLOCKING_STATUSES },
      ...(excludeId ? { id: { not: parseId(excludeId) } } : {}),
    },
    select: { id: true, appointment_time: true },
  });

  const taken = booked.some((b) => {
    const bStart = formatTime(b.appointment_time);
    if (!bStart) return false;
    const bEnd = addMinutesToTime(bStart, SLOT_MINUTES);
    return timesOverlap(startLabel, endLabel, bStart, bEnd);
  });

  if (taken) {
    const err = new Error("This time slot is no longer available");
    err.status = 409;
    throw err;
  }
}

// ─── Map DB row → frontend object ────────────────────────────────────────────
function formatAppointmentDateOnly(raw) {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mapAppointment(a) {
  const startTime = formatTime(a.appointment_time);
  return {
    id:           a.id,
    patientId:    a.patient_id,
    patientName:  a.patients?.users?.name ?? "",
    doctorId:     a.doctor_id,
    doctorName:   a.doctors?.users?.name ?? "",
    doctorSpecialization: a.doctors?.specialization ?? null,
    date:         formatAppointmentDateOnly(a.appointment_date),
    startTime,
    time:         startTime,
    endTime:      startTime ? addMinutesToTime(startTime, SLOT_MINUTES) : null,
    mode:         a.type === "ONLINE" ? "online" : "in-person",
    type:         a.type ?? null,
    status:       toFrontendStatus(a.status),
    notes:        a.notes ?? null,
    reason:           a.reason           ?? null,
    cancelledReason:  a.cancelled_reason ?? null,
    serviceId:    a.service_id ?? null,
    serviceName:  a.rehabilitation_services?.title ?? null,
    serviceSlug:  a.rehabilitation_services?.slug ?? null,
    outcome:      a.status === "COMPLETED" ? (a.notes ? "Documented" : "Completed") : null,
    meetingUrl:   a.telehealth_sessions?.[0]?.meeting_link ?? null,
    createdAt:    null,
  };
}

// ─── GET /appointments ────────────────────────────────────────────────────────
async function list(req, res) {
  try {
    const where = {};

    // FIX: never send "all" to DB
    if (req.query.status && req.query.status !== "all") {
      where.status = toDbStatus(req.query.status);
    }
    if (req.query.patientId) where.patient_id = parseId(req.query.patientId);
    if (req.query.doctorId)  where.doctor_id  = parseId(req.query.doctorId);

    if (req.query.fromDate || req.query.toDate) {
      where.appointment_date = {};
      if (req.query.fromDate) where.appointment_date.gte = toDate(req.query.fromDate);
      if (req.query.toDate) where.appointment_date.lte = toDate(req.query.toDate);
    }

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      const patient = await resolvePatientForUser(req.user);
      if (!patient)
        return res.status(404).json({ success: false, message: "Patient profile not found" });
      where.patient_id = patient.id;
    }

    if (req.user?.role === "DOCTOR") {
      const doctor = await prisma.doctors.findUnique({
        where:  { user_id: req.user.id },
        select: { id: true },
      });
      if (!doctor)
        return res.status(404).json({ success: false, message: "Doctor profile not found" });
      where.doctor_id = doctor.id;
      await markMissedAppointments({ doctor_id: doctor.id });
    } else if (where.patient_id) {
      await markMissedAppointments({ patient_id: where.patient_id });
    } else {
      await markMissedAppointments();
    }

    const appts = await prisma.appointments.findMany({
      where,
      include: APPT_INCLUDE,
      orderBy: { appointment_date: "desc" },
    });

    return res.json({ items: appts.map(mapAppointment), total: appts.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /appointments/slots?doctorId=&date= ─────────────────────────────────
async function getSlots(req, res) {
  try {
    const doctorId = req.query.doctorId;
    const dateStr = req.query.date;

    if (!doctorId || !dateStr) {
      return res.status(400).json({
        success: false,
        message: "doctorId and date are required",
      });
    }

    try {
      assertNotPastDate(dateStr);
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const doctor = await prisma.doctors.findUnique({
      where: { id: parseId(doctorId) },
      include: { users: { select: { name: true } } },
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (String(doctor.availability ?? "AVAILABLE").toUpperCase() === "UNAVAILABLE") {
      return res.json({
        doctorId: doctor.id,
        doctorName: doctor.users?.name ?? "Doctor",
        date: dateStr,
        slots: [],
      });
    }

    const templateSlots = buildSlotsForDate(doctor.availability_schedule, dateStr);

    const booked = await prisma.appointments.findMany({
      where: {
        doctor_id: doctor.id,
        appointment_date: toDate(dateStr),
        status: { notIn: SLOT_BLOCKING_STATUSES },
      },
      select: { appointment_time: true },
    });

    const bookedStarts = booked
      .map((b) => formatTime(b.appointment_time))
      .filter(Boolean);

    const slots = templateSlots.map((slot) => {
      const taken = bookedStarts.some((bStart) => {
        const bEnd = addMinutesToTime(bStart, SLOT_MINUTES);
        return timesOverlap(slot.startTime, slot.endTime, bStart, bEnd);
      });
      let available = !taken;
      if (dateStr === localTodayStr()) {
        const slotAt = buildLocalDateTime(dateStr, slot.startTime);
        if (slotAt && slotAt <= new Date()) available = false;
      }
      return {
        ...slot,
        doctorId: doctor.id,
        available,
      };
    });

    return res.json({
      doctorId: doctor.id,
      doctorName: doctor.users?.name ?? "",
      date: dateStr,
      slots,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /appointments/:id ────────────────────────────────────────────────────
async function getById(req, res) {
  try {
    const row = await prisma.appointments.findUnique({
      where:   { id: parseId(req.params.id) },
      include: APPT_INCLUDE,
    });
    if (!row)
      return res.status(404).json({ success: false, message: "Appointment not found" });

    try {
      await assertPatientOwnsAppointment(req, row);
    } catch (e) {
      return res.status(e.status ?? 403).json({ success: false, message: e.message });
    }

    return res.json(mapAppointment(row));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /appointments ───────────────────────────────────────────────────────
async function create(req, res) {
  try {
    const {
      patient_id, patientId,
      doctor_id,  doctorId,
      service_id, serviceId,
      service_slug, serviceSlug,
      sub_service, subService,
      type, status, notes, mode,
    } = req.body ?? {};

    const dateRaw = req.body?.appointment_date ?? req.body?.date;
    const timeRaw = req.body?.appointment_time ?? req.body?.time ?? req.body?.startTime;

    let pId = parseId(patient_id ?? patientId);
    let dId = doctor_id ?? doctorId ? parseId(doctor_id ?? doctorId) : null;

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      const patient = await resolvePatientForUser(req.user);
      if (!patient) {
        return res.status(404).json({ success: false, message: "Patient profile not found" });
      }
      pId = patient.id;
    }

    if (!pId) {
      return res.status(400).json({
        success: false, message: "patient_id is required",
      });
    }
    if (!dateRaw) {
      return res.status(400).json({
        success: false, message: "appointment_date is required",
      });
    }
    if (!timeRaw) {
      return res.status(400).json({
        success: false, message: "appointment_time is required",
      });
    }

    const service = await findServiceByIdOrSlug({
      serviceId: service_id ?? serviceId,
      serviceSlug: service_slug ?? serviceSlug,
    });

    if ((req.user?.role === "PATIENT" || req.user?.role === "FAMILY") && !service) {
      return res.status(400).json({
        success: false,
        message: "serviceId or serviceSlug is required when booking as a patient",
      });
    }

    try {
      assertNotPastDate(dateRaw);
      assertNotPastTime(dateRaw, timeRaw);

      if (service) {
        dId = await resolveDoctorForBooking(service.id, {
          doctorId: dId,
          date: dateRaw,
          time: timeRaw,
        });
      } else if (!dId) {
        const err = new Error("doctor_id is required when no rehabilitation service is selected");
        err.status = 400;
        throw err;
      } else {
        await assertApprovedActiveDoctor(prisma, dId, { booking: true });
        await assertSlotAvailable(dId, dateRaw, timeRaw);
      }
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const dbType = (() => {
      const m = String(mode ?? type ?? "in-person").toLowerCase();
      return m === "online" ? "ONLINE" : "PHYSICAL";
    })();

    const autoTherapyPlanId = await resolveAutoTherapyPlanIdForBooking(pId, dId);

    const analysisIdRaw = req.body?.analysis_id ?? req.body?.analysisId;
    let analysisId = analysisIdRaw ? parseId(analysisIdRaw) : null;

    if (!analysisId && dId) {
      analysisId = await resolveAnalysisIdForBooking(pId, dId, null);
    }

    if (analysisId) {
      const analysis = await prisma.ai_analysis.findFirst({
        where: {
          id: String(analysisId),
          patient_id: String(pId),
        },
        select: { id: true },
      });

      if (!analysis) {
        return res.status(400).json({
          success: false,
          message: "Invalid assessment reference for this patient",
        });
      }
    }

    const data = {
      patient_id:       pId,
      doctor_id:        dId,
      service_id:       service?.id ?? null,
      therapy_plan_id:  autoTherapyPlanId,
      analysis_id:      analysisId ? String(analysisId) : null,
      appointment_date: toDate(dateRaw),
      appointment_time: toTime(timeRaw),
      type:             dbType,
      status:           toDbStatus(status),
      notes:            notes ? String(notes) : null,
      reason:           req.body?.reason ? String(req.body.reason) : null,
    };

    let row = await prisma.appointments.create({
      data,
      include: APPT_INCLUDE,
    });

    if (analysisId && dId) {
      await prisma.ai_analysis.updateMany({
        where: {
          id: String(analysisId),
          patient_id: String(pId),
        },
        data: { selected_doctor_id: String(dId) },
      });
    }

    if (dbType === "ONLINE") {
      await ensureTelehealthSession(row.id);
      row = await reloadAppointment(row.id);
    }

    if (service) {
      await assignPatientToDoctorForBooking({
        patientId: pId,
        doctorId: dId,
        serviceId: service.id,
        subService: sub_service ?? subService,
      });
    } else if (dId) {
      const linkCreated = await ensureDoctorPatientLink(dId, pId);
      if (linkCreated) {
        await notifyDoctorPatientAssignment({
          doctorId: dId,
          patientId: pId,
          event: "assigned",
        });
      }
    }

    try {
      await notifyAppointmentBooked(row);
    } catch (notifyErr) {
      console.warn("[appointment] booking notification failed:", notifyErr.message);
    }

    return res.status(201).json(mapAppointment(row));
  } catch (e) {
    const status = e.status ?? (e.code?.startsWith?.("P") ? 500 : 400);
    return res.status(status).json({ success: false, message: e.message });
  }
}

// ─── PATCH / PUT /appointments/:id ───────────────────────────────────────────
async function update(req, res) {
  try {
    const existing = await loadAppointmentOr404(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const dateRaw = req.body?.appointment_date ?? req.body?.date;
    const timeRaw = req.body?.appointment_time ?? req.body?.time ?? req.body?.startTime;
    const modeRaw = req.body?.mode ?? req.body?.type;
    const nextStatus = req.body?.status ? toDbStatus(req.body.status) : undefined;

    if (nextStatus === "COMPLETED") {
      assertCompletableStatus(existing.status);
    } else if (nextStatus && nextStatus !== existing.status) {
      assertModifiableStatus(existing.status);
    }
    if (dateRaw || timeRaw) {
      assertReschedulableStatus(existing.status);
    }

    const data = {
      appointment_date: dateRaw ? toDate(dateRaw) : undefined,
      appointment_time: timeRaw ? toTime(timeRaw) : undefined,
      status: nextStatus,
      notes: req.body?.notes ?? undefined,
      cancelled_reason: req.body?.cancelled_reason ?? req.body?.reason ?? undefined,
    };

    if (modeRaw !== undefined) {
      const m = String(modeRaw).toLowerCase();
      data.type = m === "online" || m === "ONLINE" ? "ONLINE" : m === "physical" || m === "PHYSICAL" ? "PHYSICAL" : undefined;
    }

    if (req.body?.doctor_id ?? req.body?.doctorId) {
      data.doctor_id = parseId(req.body.doctor_id ?? req.body.doctorId);
    }

    const nextPatientId = existing.patient_id;
    const nextDoctorId = data.doctor_id ?? existing.doctor_id;
    if (!existing.therapy_plan_id && !(req.body?.therapy_plan_id ?? req.body?.therapyPlanId)) {
      const autoTherapyPlanId = await resolveAutoTherapyPlanIdForBooking(
        nextPatientId,
        nextDoctorId,
      );
      if (autoTherapyPlanId) {
        data.therapy_plan_id = autoTherapyPlanId;
      }
    }

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) delete data[key];
    });

    const row = await prisma.appointments.update({
      where: { id: parseId(req.params.id) },
      data,
      include: APPT_INCLUDE,
    });

    try {
      if (nextStatus === "CANCELLED" && existing.status !== "CANCELLED") {
        await notifyAppointmentCancelled(row);
      } else {
        const changes = describeAppointmentChanges(existing, row);
        if (changes.length > 0) {
          await notifyAppointmentUpdated(row, { changeSummary: changes.join("; ") });
        }
      }
    } catch (notifyErr) {
      console.warn("[appointment] update notification failed:", notifyErr.message);
    }

    return res.json(mapAppointment(row));
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /appointments/:id/cancel ───────────────────────────────────────────
async function cancel(req, res) {
  try {
    const existing = await loadAppointmentOr404(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    try {
      await assertPatientOwnsAppointment(req, existing);
      assertModifiableStatus(existing.status);
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const row = await prisma.appointments.update({
      where:   { id: parseId(req.params.id) },
      data:    {
        status: "CANCELLED",
        cancelled_reason: req.body?.reason ? String(req.body.reason) : null,
      },
      include: APPT_INCLUDE,
    });

    try {
      await notifyAppointmentCancelled(row);
    } catch (notifyErr) {
      console.warn("[appointment] cancel notification failed:", notifyErr.message);
    }

    return res.json(mapAppointment(row));
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /appointments/:id/confirm ──────────────────────────────────────────
async function confirm(req, res) {
  try {
    const existing = await loadAppointmentOr404(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    try {
      assertModifiableStatus(existing.status);
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const row = await prisma.appointments.update({
      where:   { id: parseId(req.params.id) },
      data:    { status: "CONFIRMED" },
      include: APPT_INCLUDE,
    });

    try {
      await notifyAppointmentApproved(row);
    } catch (notifyErr) {
      console.warn("[appointment] approve notification failed:", notifyErr.message);
    }

    return res.json(mapAppointment(row));
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /appointments/:id/reschedule ───────────────────────────────────────
async function reschedule(req, res) {
  try {
    const dateRaw = req.body?.appointment_date ?? req.body?.date;
    const timeRaw = req.body?.appointment_time ?? req.body?.time ?? req.body?.startTime;

    if (!dateRaw) {
      return res.status(400).json({ success: false, message: "New date is required" });
    }
    if (!timeRaw) {
      return res.status(400).json({ success: false, message: "New time is required" });
    }

    const existing = await loadAppointmentOr404(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    try {
      await assertPatientOwnsAppointment(req, existing);
      assertReschedulableStatus(existing.status);
      assertNotPastDate(dateRaw);
      assertNotPastTime(dateRaw, timeRaw);
      await assertSlotAvailable(existing.doctor_id, dateRaw, timeRaw, existing.id);
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const row = await prisma.appointments.update({
      where: { id: parseId(req.params.id) },
      data: {
        appointment_date: toDate(dateRaw),
        appointment_time: toTime(timeRaw),
        status:           "BOOKED",
        reminder_sent:    false,
      },
      include: APPT_INCLUDE,
    });

    try {
      const changes = describeAppointmentChanges(existing, row);
      await notifyAppointmentUpdated(row, {
        changeSummary: changes.length > 0 ? changes.join("; ") : "Appointment was rescheduled.",
      });
    } catch (notifyErr) {
      console.warn("[appointment] reschedule notification failed:", notifyErr.message);
    }

    return res.json(mapAppointment(row));
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── DELETE /appointments/:id ─────────────────────────────────────────────────
async function remove(req, res) {
  try {
    await prisma.appointments.delete({ where: { id: parseId(req.params.id) } });
    return res.status(204).send();
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Appointment not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /appointments/:id/telehealth/notes ────────────────────────────────────
async function getTelehealthNotes(req, res) {
  try {
    const appointmentId = parseId(req.params.id);
    const role = String(req.user?.role ?? "").toUpperCase();
    const isStaff = role === "ADMIN" || role === "DOCTOR";

    const telehealth = await prisma.telehealth_sessions.findFirst({
      where: { appointment_id: appointmentId },
      select: { notes: true },
    });

    const therapySession = await prisma.therapy_sessions.findFirst({
      where: { appointment_id: appointmentId },
    });

    const exercisesDiscussed = parseExercisesDiscussed(therapySession?.exercises_discussed);

    return res.json({
      notes: telehealth?.notes ?? buildPatientVisibleSummary(therapySession) ?? "",
      session: therapySession
        ? {
            id: therapySession.id,
            session_date: therapySession.session_date,
            duration: therapySession.duration,
            session_type: therapySession.session_type ?? "TELEHEALTH",
            chief_complaint: isStaff ? therapySession.chief_complaint ?? "" : undefined,
            observations: isStaff ? therapySession.observations ?? "" : undefined,
            progress_notes: therapySession.progress_notes ?? "",
            exercises_discussed: exercisesDiscussed,
            next_steps: therapySession.next_steps ?? "",
            confidential_notes: isStaff ? therapySession.confidential_notes ?? "" : undefined,
            status: therapySession.status,
            outcome: therapySession.outcome,
            pain_level: therapySession.pain_level,
            mood: therapySession.mood,
          }
        : null,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── PUT /appointments/:id/telehealth/notes ─────────────────────────────────────
async function updateTelehealthNotes(req, res) {
  try {
    const body = req.body ?? {};
    const appointmentId = parseId(req.params.id);
    const role = String(req.user?.role ?? "").toUpperCase();
    if (role !== "DOCTOR") {
      return res.status(403).json({ success: false, message: "Only doctors can save session notes." });
    }

    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: { doctor_id: true },
    });
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const doctor = await prisma.doctors.findFirst({
      where: { user_id: req.user.id },
      select: { id: true },
    });
    if (!doctor?.id || String(appointment.doctor_id) !== String(doctor.id)) {
      return res.status(403).json({
        success: false,
        message: "You can only save session notes for your own appointments.",
      });
    }

    const result = await syncAppointmentSessionNotes(appointmentId, body);
    const linked = Boolean(result.linked && result.sessionId);

    if (!linked) {
      return res.status(422).json({
        success: false,
        linked: false,
        sessionId: null,
        therapyPlanId: result.therapyPlanId ?? null,
        message: "Session notes could not be linked to a therapy plan.",
      });
    }

    return res.json({
      success: true,
      linked: true,
      sessionId: result.sessionId,
      therapyPlanId: result.therapyPlanId,
      notes: result.summary ?? body.notes ?? "",
    });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// ─── POST /appointments/:id/feedback ─────────────────────────────────────────────
async function saveFeedback(req, res) {
  try {
    const { rating, comment } = req.body ?? {};
    const appointmentId = parseId(req.params.id);

    // Get appointment details to find patient, doctor, and date
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: { patient_id: true, doctor_id: true, appointment_date: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    await prisma.feedback.create({
      data: {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        rating: rating ? Number(rating) : null,
        comments: comment ?? null,
        feedback_date: appointment.appointment_date,
      },
    });

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /appointments/:id/feedback ─────────────────────────────────────────────
async function getFeedback(req, res) {
  try {
    const appointmentId = parseId(req.params.id);

    // Get appointment details to find patient, doctor, and date
    const appointment = await prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: { patient_id: true, doctor_id: true, appointment_date: true },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Find feedback matching patient, doctor, and appointment date
    const feedback = await prisma.feedback.findFirst({
      where: {
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        feedback_date: appointment.appointment_date,
      },
    });

    if (!feedback) {
      return res.json({ rating: null, comment: null, feedback_date: null });
    }

    return res.json({
      rating: feedback.rating,
      comment: feedback.comments,
      feedback_date: feedback.feedback_date,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { list, getSlots, getById, create, update, cancel, confirm, reschedule, remove, getTelehealthNotes, updateTelehealthNotes, saveFeedback, getFeedback };