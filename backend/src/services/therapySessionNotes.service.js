"use strict";

const prisma = require("../lib/prisma");
const { notifyTherapyResourceAdded } = require("./notification.service");

function parseExercisesDiscussed(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    // fall through
  }
  return text.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

function serializeExercisesDiscussed(raw) {
  const items = parseExercisesDiscussed(raw);
  return items.length ? JSON.stringify(items) : null;
}

function buildSessionWriteData(payload = {}) {
  const progress =
    payload.progress_notes ?? payload.progressNotes ?? payload.notes ?? null;
  const exercisesDiscussed = serializeExercisesDiscussed(
    payload.exercises_discussed ?? payload.exercisesDiscussed,
  );

  return {
    session_date: payload.session_date ?? payload.sessionDate ?? undefined,
    duration: payload.duration ?? payload.durationMinutes ?? undefined,
    session_type: payload.session_type ?? payload.sessionType ?? undefined,
    chief_complaint: payload.chief_complaint ?? payload.chiefComplaint ?? undefined,
    observations: payload.observations ?? undefined,
    progress_notes: progress ?? undefined,
    exercises_discussed: exercisesDiscussed ?? undefined,
    next_steps: payload.next_steps ?? payload.nextSteps ?? undefined,
    confidential_notes:
      payload.confidential_notes ?? payload.confidentialNotes ?? undefined,
    status: payload.status ? String(payload.status).toUpperCase() : undefined,
    outcome: payload.outcome ?? undefined,
    pain_level: payload.pain_level ?? payload.painLevel ?? undefined,
    attendance: payload.attendance ?? undefined,
    mood: payload.mood ?? undefined,
  };
}

function appendStructuredNotesFallback(cleanData = {}) {
  const progress = String(cleanData.progress_notes ?? "").trim();
  const discussed = parseExercisesDiscussed(cleanData.exercises_discussed);
  const extras = [
    cleanData.chief_complaint?.trim()
      ? `[Chief complaint] ${String(cleanData.chief_complaint).trim()}`
      : null,
    cleanData.observations?.trim()
      ? `[Observations] ${String(cleanData.observations).trim()}`
      : null,
    discussed.length ? `[Exercises] ${discussed.join(", ")}` : null,
    cleanData.next_steps?.trim()
      ? `[Next steps] ${String(cleanData.next_steps).trim()}`
      : null,
  ].filter(Boolean);

  if (!extras.length) return progress || null;
  return [progress, ...extras].filter(Boolean).join("\n\n");
}

function isSchemaColumnMismatchError(err) {
  const msg = String(err?.message ?? "");
  return (
    err?.code === "P2022" ||
    msg.includes("does not exist") ||
    msg.includes("Unknown argument")
  );
}

function buildExtendedSessionRow({
  planId,
  appointmentId = null,
  sessionDate,
  cleanData = {},
}) {
  return {
    therapy_plan_id: String(planId),
    appointment_id: appointmentId ? String(appointmentId) : null,
    session_date: sessionDate,
    status: cleanData.status ?? "COMPLETED",
    duration: cleanData.duration ?? null,
    session_type: cleanData.session_type ?? null,
    chief_complaint: cleanData.chief_complaint ?? null,
    observations: cleanData.observations ?? null,
    progress_notes: cleanData.progress_notes ?? null,
    exercises_discussed: cleanData.exercises_discussed ?? null,
    next_steps: cleanData.next_steps ?? null,
    confidential_notes: cleanData.confidential_notes ?? null,
    outcome: cleanData.outcome ?? null,
    pain_level: cleanData.pain_level ?? null,
    attendance: cleanData.attendance ?? null,
    mood: cleanData.mood ?? null,
  };
}

function buildLegacySessionRow({ planId, sessionDate, cleanData = {} }) {
  return {
    therapy_plan_id: String(planId),
    session_date: sessionDate,
    status: cleanData.status ?? "COMPLETED",
    duration: cleanData.duration ?? null,
    progress_notes: appendStructuredNotesFallback(cleanData),
    outcome: cleanData.outcome ?? null,
    pain_level: cleanData.pain_level ?? null,
    attendance: cleanData.attendance ?? null,
    mood: cleanData.mood ?? null,
  };
}

async function persistTherapySessionRow({
  planId,
  appointmentId = null,
  sessionDate,
  cleanData = {},
}) {
  const extended = buildExtendedSessionRow({
    planId,
    appointmentId,
    sessionDate,
    cleanData,
  });

  try {
    return await prisma.therapy_sessions.create({ data: extended });
  } catch (err) {
    if (!isSchemaColumnMismatchError(err)) throw err;
    console.warn(
      "[therapy] structured session columns unavailable — saving legacy session row",
    );
    return await prisma.therapy_sessions.create({
      data: buildLegacySessionRow({ planId, sessionDate, cleanData }),
    });
  }
}

async function updateTherapySessionRow(sessionId, { sessionDate, cleanData = {} }) {
  const extended = {
    ...(sessionDate ? { session_date: sessionDate } : {}),
    status: cleanData.status,
    duration: cleanData.duration,
    session_type: cleanData.session_type,
    chief_complaint: cleanData.chief_complaint,
    observations: cleanData.observations,
    progress_notes: cleanData.progress_notes,
    exercises_discussed: cleanData.exercises_discussed,
    next_steps: cleanData.next_steps,
    confidential_notes: cleanData.confidential_notes,
    outcome: cleanData.outcome,
    pain_level: cleanData.pain_level,
    attendance: cleanData.attendance,
    mood: cleanData.mood,
  };
  const cleanExtended = Object.fromEntries(
    Object.entries(extended).filter(([, v]) => v !== undefined),
  );

  try {
    return await prisma.therapy_sessions.update({
      where: { id: String(sessionId) },
      data: cleanExtended,
    });
  } catch (err) {
    if (!isSchemaColumnMismatchError(err)) throw err;
    console.warn(
      "[therapy] structured session columns unavailable — updating legacy session row",
    );
    return await prisma.therapy_sessions.update({
      where: { id: String(sessionId) },
      data: {
        ...(sessionDate ? { session_date: sessionDate } : {}),
        status: cleanData.status,
        duration: cleanData.duration,
        progress_notes: appendStructuredNotesFallback(cleanData),
        outcome: cleanData.outcome,
        pain_level: cleanData.pain_level,
        attendance: cleanData.attendance,
        mood: cleanData.mood,
      },
    });
  }
}

function buildPatientVisibleSummary(session) {
  if (!session) return "";
  const parts = [
    session.progress_notes,
    session.next_steps ? `Next steps: ${session.next_steps}` : null,
    session.exercises_discussed
      ? `Exercises: ${parseExercisesDiscussed(session.exercises_discussed).join(", ")}`
      : null,
  ].filter(Boolean);
  return parts.join("\n\n");
}

const PLAN_NOTIFY_INCLUDE = {
  patients: { include: { users: { select: { id: true, name: true, email: true } } } },
  doctors: { include: { users: { select: { id: true, name: true, email: true } } } },
};

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function findActiveTherapyPlansForPatient(patientId, doctorId) {
  if (!patientId) return [];
  return prisma.therapy_plans.findMany({
    where: {
      patient_id: String(patientId),
      status: "ACTIVE",
      ...(doctorId ? { doctor_id: String(doctorId) } : {}),
    },
    orderBy: [{ start_date: "desc" }, { id: "desc" }],
  });
}

async function findActiveTherapyPlanForPatient(patientId, doctorId) {
  const plans = await findActiveTherapyPlansForPatient(patientId, doctorId);
  if (plans.length === 0) return null;
  if (plans.length === 1) return plans[0];

  console.warn(
    `[therapy] Multiple ACTIVE therapy plans for patient ${patientId}` +
      (doctorId ? ` and doctor ${doctorId}` : "") +
      ` (${plans.length} plans) — explicit planId required`,
  );
  return null;
}

/** Returns plan id when patient has exactly one ACTIVE plan for the doctor; otherwise null. */
async function resolveAutoTherapyPlanIdForBooking(patientId, doctorId) {
  const plans = await findActiveTherapyPlansForPatient(patientId, doctorId);
  if (plans.length !== 1) return null;
  return plans[0].id;
}

async function resolveStoredTherapyPlan(appointment) {
  const storedId = appointment.therapy_plan_id;
  if (!storedId) return null;

  const plan = await prisma.therapy_plans.findFirst({
    where: {
      id: String(storedId),
      patient_id: String(appointment.patient_id),
      status: "ACTIVE",
      ...(appointment.doctor_id
        ? { doctor_id: String(appointment.doctor_id) }
        : {}),
    },
  });
  if (!plan) {
    console.warn(
      `[therapy] Appointment ${appointment.id} has stale therapy_plan_id ${storedId} — falling back to runtime resolution`,
    );
    return null;
  }
  return plan;
}

async function resolveTherapyPlanForAppointment(appointment, payload = {}) {
  const storedPlan = await resolveStoredTherapyPlan(appointment);
  if (storedPlan) return storedPlan;

  const explicitId =
    payload.therapy_plan_id ??
    payload.therapyPlanId ??
    payload.planId ??
    payload.plan_id ??
    null;

  if (explicitId) {
    const plan = await prisma.therapy_plans.findFirst({
      where: {
        id: String(explicitId),
        patient_id: String(appointment.patient_id),
        status: "ACTIVE",
        ...(appointment.doctor_id
          ? { doctor_id: String(appointment.doctor_id) }
          : {}),
      },
    });
    if (!plan) {
      throw createHttpError(
        422,
        "Selected therapy plan is not active or does not match this patient and doctor.",
      );
    }
    return plan;
  }

  const plan = await findActiveTherapyPlanForPatient(
    appointment.patient_id,
    appointment.doctor_id,
  );
  if (plan) return plan;

  const candidates = await findActiveTherapyPlansForPatient(
    appointment.patient_id,
    appointment.doctor_id,
  );
  if (candidates.length > 1) {
    throw createHttpError(
      422,
      "Multiple active therapy plans found for this patient. Please select a plan.",
    );
  }

  throw createHttpError(422, "No active therapy plan found for this patient.");
}

async function upsertTherapySessionNotes({ planId, appointmentId, payload = {} }) {
  const data = buildSessionWriteData(payload);
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );
  const sessionDate =
    cleanData.session_date != null ? new Date(cleanData.session_date) : new Date();

  if (appointmentId) {
    let existing = null;
    try {
      existing = await prisma.therapy_sessions.findFirst({
        where: { appointment_id: String(appointmentId) },
      });
    } catch (err) {
      if (!isSchemaColumnMismatchError(err)) throw err;
    }
    if (existing) {
      return updateTherapySessionRow(existing.id, { sessionDate, cleanData });
    }
  }

  return persistTherapySessionRow({
    planId,
    appointmentId,
    sessionDate,
    cleanData,
  });
}

async function syncAppointmentSessionNotes(appointmentId, payload = {}) {
  const appointment = await prisma.appointments.findUnique({
    where: { id: String(appointmentId) },
    select: {
      id: true,
      patient_id: true,
      doctor_id: true,
      therapy_plan_id: true,
      appointment_date: true,
      type: true,
    },
  });
  if (!appointment?.patient_id) {
    throw createHttpError(422, "Appointment has no linked patient.");
  }

  const plan = await resolveTherapyPlanForAppointment(appointment, payload);

  const sessionType =
    payload.session_type ??
    payload.sessionType ??
    (String(appointment.type ?? "").toUpperCase() === "ONLINE"
      ? "TELEHEALTH"
      : "IN_PERSON");

  const mergedPayload = {
    ...payload,
    session_type: sessionType,
    session_date:
      payload.session_date ??
      payload.sessionDate ??
      appointment.appointment_date,
    status: payload.status ?? "COMPLETED",
  };

  const session = await upsertTherapySessionNotes({
    planId: plan.id,
    appointmentId: appointment.id,
    payload: mergedPayload,
  });

  try {
    const fullPlan = await prisma.therapy_plans.findUnique({
      where: { id: plan.id },
      include: PLAN_NOTIFY_INCLUDE,
    });
    if (fullPlan) {
      await notifyTherapyResourceAdded(fullPlan, {
        title: "session notes",
        kind: "session",
      });
    }
  } catch (notifyErr) {
    console.warn("[therapy] telehealth session notes notification failed:", notifyErr.message);
  }

  const summary =
    mergedPayload.progress_notes ??
    mergedPayload.progressNotes ??
    mergedPayload.notes ??
    buildPatientVisibleSummary(session);

  const telehealth = await prisma.telehealth_sessions.findFirst({
    where: { appointment_id: appointment.id },
  });

  if (telehealth) {
    await prisma.telehealth_sessions.update({
      where: { id: telehealth.id },
      data: { notes: summary || telehealth.notes },
    });
  } else if (summary) {
    await prisma.telehealth_sessions.create({
      data: {
        appointment_id: appointment.id,
        notes: summary,
        status: "completed",
      },
    });
  }

  const linked = Boolean(session?.id && plan?.id);

  return {
    session,
    plan,
    summary,
    linked,
    therapyPlanId: plan?.id ?? null,
    sessionId: session?.id ?? null,
  };
}

module.exports = {
  parseExercisesDiscussed,
  serializeExercisesDiscussed,
  buildSessionWriteData,
  appendStructuredNotesFallback,
  persistTherapySessionRow,
  updateTherapySessionRow,
  buildPatientVisibleSummary,
  findActiveTherapyPlansForPatient,
  findActiveTherapyPlanForPatient,
  resolveAutoTherapyPlanIdForBooking,
  resolveTherapyPlanForAppointment,
  upsertTherapySessionNotes,
  syncAppointmentSessionNotes,
};
