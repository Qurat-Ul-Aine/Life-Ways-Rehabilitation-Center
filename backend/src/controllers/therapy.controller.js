const prisma = require("../lib/prisma");
const { assertApprovedActiveDoctor } = require("../utils/doctorApproval");
const { notifyTherapyPlanAssigned, notifyTherapyResourceAdded } = require("../services/notification.service");
const {
  parseExercisesDiscussed,
  buildSessionWriteData,
  persistTherapySessionRow,
  updateTherapySessionRow,
} = require("../services/therapySessionNotes.service");
const {
  loadTherapyPlanFiles,
  addTherapyPlanFile,
  deleteTherapyPlanFile,
  resolveTherapyPlanFilePath,
} = require("../services/therapyPlanFiles.service");

const parseId = (raw) => (raw == null || raw === "" ? null : String(raw));

/** Resolve patients.id for the authenticated patient or linked family user. */
async function resolvePatientIdForUser(user) {
  if (!user?.id) return null;
  const patient = await prisma.patients.findUnique({
    where: { user_id: user.id },
    select: { id: true },
  });
  if (patient?.id) return patient.id;
  const family = await prisma.family_members.findUnique({
    where: { user_id: user.id },
    select: { patient_id: true },
  });
  return family?.patient_id ?? null;
}

async function resolveDoctorIdForUser(user) {
  if (!user?.id) return null;
  const doctor = await prisma.doctors.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  });
  return doctor?.id ?? null;
}

async function assertTherapyPlanAccess(req, planId) {
  const plan = await prisma.therapy_plans.findUnique({
    where: { id: String(planId) },
  });
  if (!plan) {
    const err = new Error("Therapy plan not found");
    err.status = 404;
    throw err;
  }

  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") return plan;

  if (role === "DOCTOR") {
    const ownDoctorId = await resolveDoctorIdForUser(req.user);
    if (ownDoctorId && String(plan.doctor_id) === String(ownDoctorId)) return plan;
  }

  if (role === "PATIENT") {
    const ownPatientId = await resolvePatientIdForUser(req.user);
    if (ownPatientId && String(plan.patient_id) === String(ownPatientId)) return plan;
  }

  if (role === "FAMILY") {
    const ownPatientId = await resolvePatientIdForUser(req.user);
    if (ownPatientId && String(plan.patient_id) === String(ownPatientId)) return plan;
  }

  const err = new Error("Forbidden");
  err.status = 403;
  throw err;
}

function therapyForbidden(message = "Forbidden") {
  const err = new Error(message);
  err.status = 403;
  throw err;
}

async function assertDoctorOwnsPlan(req, plan) {
  const ownDoctorId = await resolveDoctorIdForUser(req.user);
  if (!ownDoctorId || String(plan.doctor_id) !== String(ownDoctorId)) {
    therapyForbidden("You can only modify your own therapy plans.");
  }
}

/** Therapy plan create — admin: any doctor; doctor: own doctor_id only. */
async function assertTherapyPlanCreateAccess(req, doctorId) {
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") return;
  if (role === "DOCTOR") {
    const ownDoctorId = await resolveDoctorIdForUser(req.user);
    const targetDoctorId = parseId(doctorId);
    if (!ownDoctorId || !targetDoctorId || String(ownDoctorId) !== String(targetDoctorId)) {
      therapyForbidden("Doctors can only create therapy plans assigned to themselves.");
    }
    return;
  }
  therapyForbidden();
}

/** Therapy plan edit — admin: all; doctor: own plan only. */
async function assertTherapyPlanEditAccess(req, planId) {
  const plan = await assertTherapyPlanAccess(req, planId);
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") return plan;
  if (role === "DOCTOR") {
    await assertDoctorOwnsPlan(req, plan);
    return plan;
  }
  therapyForbidden();
}

/** Therapy plan delete — admin only. */
async function assertTherapyPlanDeleteAccess(req, planId) {
  await assertTherapyPlanAccess(req, planId);
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") return;
  therapyForbidden("Only administrators can delete therapy plans.");
}

/** Exercises & file resources — admin: all; doctor: own plan only. */
async function assertTherapyExerciseWriteAccess(req, planId) {
  const plan = await assertTherapyPlanAccess(req, planId);
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") return plan;
  if (role === "DOCTOR") {
    await assertDoctorOwnsPlan(req, plan);
    return plan;
  }
  therapyForbidden("Only admin or assigned doctor can modify exercises.");
}

/** Session notes create — doctor only, own plan. */
async function assertTherapySessionCreateAccess(req, planId) {
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") {
    therapyForbidden("Administrators cannot add session notes.");
  }
  if (role !== "DOCTOR") therapyForbidden();
  const plan = await assertTherapyPlanAccess(req, planId);
  await assertDoctorOwnsPlan(req, plan);
  return plan;
}

/** Session notes edit — doctor only, own plan/session. */
async function assertTherapySessionEditAccess(req, planId, sessionId) {
  const role = String(req.user?.role ?? "").toUpperCase();
  if (role === "ADMIN") {
    therapyForbidden("Administrators cannot edit session notes.");
  }
  if (role !== "DOCTOR") therapyForbidden();
  const plan = await assertTherapyPlanAccess(req, planId);
  await assertDoctorOwnsPlan(req, plan);

  const session = await prisma.therapy_sessions.findFirst({
    where: {
      id: String(sessionId),
      therapy_plan_id: String(planId),
    },
  });
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  return { plan, session };
}

/** @deprecated Use assertTherapyExerciseWriteAccess for exercises/files. */
async function assertTherapyPlanWriteAccess(req, planId) {
  return assertTherapyExerciseWriteAccess(req, planId);
}

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const toDateStr = (raw) => {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const toDbStatus = (status) => {
  if (!status) return "ACTIVE";
  const s = String(status).toLowerCase().replace(/-/g, "_");
  if (s === "active") return "ACTIVE";
  if (s === "completed") return "COMPLETED";
  if (s === "paused" || s === "on_hold") return "ON_HOLD";
  if (s === "cancelled") return "CANCELLED";
  return String(status).toUpperCase();
};

const fromDbStatus = (status) => {
  if (!status) return "active";
  const s = String(status).toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "COMPLETED") return "completed";
  if (s === "ON_HOLD") return "paused";
  if (s === "CANCELLED") return "cancelled";
  return String(status).toLowerCase();
};

const parseGoals = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((g) => String(g)).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((g) => String(g)).filter(Boolean);
    } catch {
      return raw.split("\n").map((g) => g.trim()).filter(Boolean);
    }
  }
  return [];
};

const PLAN_NOTIFY_INCLUDE = {
  patients: { include: { users: { select: { id: true, name: true, email: true } } } },
  doctors: { include: { users: { select: { id: true, name: true, email: true } } } },
};

const PLAN_INCLUDE = {
  patients: { include: { users: { select: { id: true, name: true, email: true } } } },
  doctors: { include: { users: { select: { id: true, name: true, email: true } } } },
  therapy_exercises: { orderBy: { created_at: "desc" } },
  therapy_plan_files: { orderBy: { uploaded_at: "desc" } },
  therapy_sessions: { orderBy: { session_date: "desc" } },
};

function mapSession(s, exercises = [], viewerRole = "PATIENT") {
  if (!s) return null;
  const exercisesDiscussed = parseExercisesDiscussed(s.exercises_discussed);
  const exercisesCompleted = deriveExercisesCompleted(s, exercises, exercisesDiscussed);
  const isStaff = ["ADMIN", "DOCTOR"].includes(String(viewerRole).toUpperCase());

  const mapped = {
    id: s.id,
    therapy_plan_id: s.therapy_plan_id,
    planId: s.therapy_plan_id,
    appointment_id: s.appointment_id ?? null,
    appointmentId: s.appointment_id ?? null,
    session_date: toDateStr(s.session_date),
    date: toDateStr(s.session_date),
    duration: s.duration ?? 0,
    durationMinutes: s.duration ?? 0,
    session_type: s.session_type ?? null,
    sessionType: s.session_type ?? null,
    chief_complaint: isStaff ? (s.chief_complaint ?? "") : undefined,
    chiefComplaint: isStaff ? (s.chief_complaint ?? "") : undefined,
    observations: isStaff ? (s.observations ?? "") : undefined,
    progress_notes: s.progress_notes ?? "",
    notes: s.progress_notes ?? "",
    exercises_discussed: exercisesDiscussed,
    exercisesDiscussed: exercisesDiscussed,
    next_steps: s.next_steps ?? "",
    nextSteps: s.next_steps ?? "",
    confidential_notes: isStaff ? (s.confidential_notes ?? "") : undefined,
    confidentialNotes: isStaff ? (s.confidential_notes ?? "") : undefined,
    status: s.status ?? null,
    painLevel: s.pain_level ?? null,
    pain_level: s.pain_level ?? null,
    outcome: s.outcome ?? null,
    attendance: s.attendance ?? null,
    mood: s.mood ?? null,
    exercisesCompleted,
  };

  if (!isStaff) {
    delete mapped.chief_complaint;
    delete mapped.chiefComplaint;
    delete mapped.observations;
    delete mapped.confidential_notes;
    delete mapped.confidentialNotes;
  }

  return mapped;
}

function deriveExercisesCompleted(session, exercises = [], exercisesDiscussed = []) {
  if (exercisesDiscussed.length > 0) {
    const discussedLower = exercisesDiscussed.map((d) => d.toLowerCase());
    const matched = (exercises ?? [])
      .filter((ex) => {
        const title = String(ex.title ?? "").trim().toLowerCase();
        const id = String(ex.id ?? "");
        return discussedLower.some(
          (d) => d === title || d === id || (title && d.includes(title)),
        );
      })
      .map((ex) => ex.id);
    if (matched.length > 0) return matched;
    return exercisesDiscussed;
  }

  if (String(session?.status ?? "").toUpperCase() !== "COMPLETED") return [];

  const note = String(session.progress_notes ?? "").toLowerCase();
  const matched = (exercises ?? [])
    .filter((ex) => {
      const title = String(ex.title ?? "").trim().toLowerCase();
      const id = String(ex.id ?? "");
      return (title && note.includes(title)) || (id && note.includes(id));
    })
    .map((ex) => ex.id);

  if (matched.length > 0) return matched;

  const sessionDate = toDateStr(session.session_date);
  if (!sessionDate) return [];

  return (exercises ?? [])
    .filter((ex) => {
      const created = ex.created_at ? String(ex.created_at).slice(0, 10) : null;
      return !created || sessionDate >= created;
    })
    .map((ex) => ex.id);
}

function mapExercise(ex) {
  if (!ex) return null;
  return {
    id: ex.id,
    title: ex.title ?? "",
    name: ex.title ?? "",
    description: ex.description ?? "",
    media_url: ex.media_url ?? null,
    created_at: ex.created_at ? new Date(ex.created_at).toISOString() : null,
  };
}

function mapPlan(p, viewerRole = "PATIENT") {
  if (!p) return null;
  const goals = parseGoals(p.goals);
  const exercises = (p.therapy_exercises ?? []).map(mapExercise).filter(Boolean);
  const files = (p.therapy_plan_files ?? []).map((f) => ({
    id: f.id,
    planId: f.therapy_plan_id,
    fileName: f.original_name,
    title: f.title,
    fileType: f.file_type ?? "document",
    url: `/api/therapy-plans/${f.therapy_plan_id}/files/serve/${encodeURIComponent(f.file_name)}`,
    uploadedBy: f.uploaded_by ?? "Unknown",
    uploadedAt: f.uploaded_at ? new Date(f.uploaded_at).toISOString() : null,
    sizeKb: f.file_size ? Math.round(f.file_size / 1024) : null,
    mimeType: f.mime_type ?? null,
    storedFileName: f.file_name,
  }));
  return {
    id: p.id,
    patient_id: p.patient_id,
    doctor_id: p.doctor_id,
    patientId: p.patient_id,
    doctorId: p.doctor_id,
    therapy_type: p.therapy_type ?? "",
    title: p.therapy_type ?? "",
    description: p.description ?? "",
    diagnosis: p.diagnosis ?? "",
    start_date: toDateStr(p.start_date),
    startDate: toDateStr(p.start_date),
    end_date: toDateStr(p.end_date),
    endDate: toDateStr(p.end_date),
    status: fromDbStatus(p.status),
    frequencyPerWeek: p.frequency_per_week ?? 0,
    frequency_per_week: p.frequency_per_week ?? 0,
    goals,
    patientName: p.patients?.users?.name ?? "",
    therapistName: p.doctors?.users?.name ?? "",
    patients: p.patients ?? null,
    doctors: p.doctors ?? null,
    therapy_exercises: exercises,
    exercises,
    therapy_plan_files: files,
    files,
    therapy_sessions: (p.therapy_sessions ?? []).map((s) =>
      mapSession(s, p.therapy_exercises ?? [], viewerRole),
    ),
  };
}

// ─── GET /therapy-plans ────────────────────────────────────────────────────────
async function listPlans(req, res) {
  try {
    const where = {};
    const pid = req.query?.patientId ?? req.query?.patient_id;
    const did = req.query?.doctorId ?? req.query?.doctor_id;

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      const ownPatientId = await resolvePatientIdForUser(req.user);
      if (!ownPatientId) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      where.patient_id = ownPatientId;
    } else if (req.user?.role === "DOCTOR") {
      const ownDoctorId = await resolveDoctorIdForUser(req.user);
      if (!ownDoctorId) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }
      where.doctor_id = ownDoctorId;
      if (pid) where.patient_id = parseId(pid);
    } else {
      if (pid) where.patient_id = parseId(pid);
      if (did) where.doctor_id = parseId(did);
    }

    const plans = await prisma.therapy_plans.findMany({
      where,
      include: PLAN_INCLUDE,
      orderBy: { id: "desc" },
    });

    return res.json({ items: plans.map((p) => mapPlan(p, req.user?.role)), total: plans.length });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// ─── GET /therapy (patient dashboard alias) ────────────────────────────────────
async function listTherapyAlias(req, res) {
  try {
    let pid = req.query?.patientId ?? req.query?.patient_id;

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      const ownPatientId = await resolvePatientIdForUser(req.user);
      if (!ownPatientId) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      pid = ownPatientId;
    } else if (!pid) {
      return res.status(400).json({ message: "patientId query param is required" });
    }

    const plans = await prisma.therapy_plans.findMany({
      where: { patient_id: parseId(pid) },
      include: PLAN_INCLUDE,
    });

    return res.json(plans.map((p) => mapPlan(p, req.user?.role)));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// ─── GET /therapy-plans/:id ────────────────────────────────────────────────────
async function getPlan(req, res) {
  try {
    const p = await prisma.therapy_plans.findUnique({
      where: { id: parseId(req.params.id) },
      include: PLAN_INCLUDE,
    });
    if (!p) return res.status(404).json({ message: "Therapy plan not found" });

    await assertTherapyPlanAccess(req, p.id);

    return res.json(mapPlan(p, req.user?.role));
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── POST /therapy-plans ───────────────────────────────────────────────────────
async function createPlan(req, res) {
  try {
    const {
      patient_id, patientId,
      doctor_id, doctorId,
      therapy_type, title,
      description, diagnosis, status, goals,
      frequencyPerWeek, frequency_per_week,
    } = req.body ?? {};

    const pId = parseId(patient_id ?? patientId);
    const dId = parseId(doctor_id ?? doctorId);

    if (!pId || !dId) {
      return res.status(400).json({ message: "patient_id and doctor_id are required" });
    }

    await assertTherapyPlanCreateAccess(req, dId);

    try {
      await assertApprovedActiveDoctor(prisma, dId, { assignment: true });
    } catch (e) {
      return res.status(e.status ?? 400).json({ message: e.message });
    }

    const startRaw = req.body?.start_date ?? req.body?.startDate;
    const endRaw = req.body?.end_date ?? req.body?.endDate;
    const goalList = parseGoals(goals);
    const freq = frequencyPerWeek ?? frequency_per_week;

    const p = await prisma.therapy_plans.create({
      data: {
        patient_id: pId,
        doctor_id: dId,
        therapy_type: therapy_type ?? title ?? null,
        description: description ?? null,
        diagnosis: diagnosis ?? null,
        goals: goalList.length ? goalList : undefined,
        frequency_per_week: freq != null ? Number(freq) : null,
        start_date: toDate(startRaw),
        end_date: toDate(endRaw),
        status: toDbStatus(status),
      },
      include: PLAN_INCLUDE,
    });

    try {
      await notifyTherapyPlanAssigned(p);
    } catch (notifyErr) {
      console.warn("[therapy] plan assignment notification failed:", notifyErr.message);
    }

    return res.status(201).json(mapPlan(p, req.user?.role));
  } catch (e) {
    return res.status(e.status ?? 400).json({ message: e.message });
  }
}

// ─── PUT/PATCH /therapy-plans/:id ──────────────────────────────────────────────
async function updatePlan(req, res) {
  try {
    const planId = parseId(req.params.id);
    await assertTherapyPlanEditAccess(req, planId);

    const {
      doctor_id, doctorId,
      therapy_type, title,
      description, diagnosis, status, goals,
      frequencyPerWeek, frequency_per_week,
    } = req.body ?? {};

    const startRaw = req.body?.start_date ?? req.body?.startDate;
    const endRaw = req.body?.end_date ?? req.body?.endDate;
    const dId = doctor_id ?? doctorId;
    const goalList = goals !== undefined ? parseGoals(goals) : undefined;
    const freq = frequencyPerWeek ?? frequency_per_week;

    if (dId !== undefined && dId !== "") {
      try {
        await assertApprovedActiveDoctor(prisma, dId, { assignment: true });
      } catch (e) {
        return res.status(e.status ?? 400).json({ message: e.message });
      }
    }

    const data = {
      ...(therapy_type !== undefined || title !== undefined
        ? { therapy_type: therapy_type ?? title }
        : {}),
      ...(description !== undefined && { description }),
      ...(diagnosis !== undefined && { diagnosis }),
      ...(startRaw !== undefined && { start_date: startRaw ? toDate(startRaw) : null }),
      ...(endRaw !== undefined && { end_date: endRaw ? toDate(endRaw) : null }),
      ...(status !== undefined && { status: toDbStatus(status) }),
      ...(dId !== undefined && dId !== "" && { doctor_id: parseId(dId) }),
      ...(goalList !== undefined && { goals: goalList }),
      ...(freq !== undefined && { frequency_per_week: freq != null ? Number(freq) : null }),
    };

    const p = await prisma.therapy_plans.update({
      where: { id: planId },
      data,
      include: PLAN_INCLUDE,
    });

    return res.json(mapPlan(p, req.user?.role));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ message: "Therapy plan not found" });
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── DELETE /therapy-plans/:id ─────────────────────────────────────────────────
async function deletePlan(req, res) {
  try {
    const planId = parseId(req.params.id);
    await assertTherapyPlanDeleteAccess(req, planId);
    await prisma.therapy_plans.delete({ where: { id: planId } });
    return res.status(204).send();
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ message: "Therapy plan not found" });
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── GET /therapy-plans/:planId/sessions ─────────────────────────────────────
async function listSessions(req, res) {
  try {
    const planId = parseId(req.params.planId ?? req.params.id);
    await assertTherapyPlanAccess(req, planId);

    const sessions = await prisma.therapy_sessions.findMany({
      where: { therapy_plan_id: planId },
      orderBy: { session_date: "desc" },
    });

    const exercises = await prisma.therapy_exercises.findMany({
      where: { therapy_plan_id: planId },
    });

    return res.json({
      items: sessions.map((s) => mapSession(s, exercises, req.user?.role)),
      total: sessions.length,
    });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── POST /therapy-plans/:planId/sessions ──────────────────────────────────────
async function createSession(req, res) {
  try {
    const planId = parseId(req.params.planId ?? req.params.id);
    await assertTherapySessionCreateAccess(req, planId);

    const plan = await prisma.therapy_plans.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ message: "Therapy plan not found" });

    const dateRaw = req.body?.session_date ?? req.body?.date;
    const writeData = buildSessionWriteData(req.body);
    const cleanData = Object.fromEntries(
      Object.entries(writeData).filter(([, v]) => v !== undefined),
    );
    delete cleanData.session_date;

    const row = await persistTherapySessionRow({
      planId,
      appointmentId: req.body?.appointment_id ?? req.body?.appointmentId ?? null,
      sessionDate: dateRaw ? toDate(dateRaw) : toDate(new Date()),
      cleanData,
    });

    const exercises = await prisma.therapy_exercises.findMany({
      where: { therapy_plan_id: planId },
    });

    try {
      const fullPlan = await prisma.therapy_plans.findUnique({
        where: { id: planId },
        include: PLAN_NOTIFY_INCLUDE,
      });
      if (fullPlan) {
        await notifyTherapyResourceAdded(fullPlan, {
          title: "session notes",
          kind: "session",
        });
      }
    } catch (notifyErr) {
      console.warn("[therapy] session notes notification failed:", notifyErr.message);
    }

    return res.status(201).json(mapSession(row, exercises, req.user?.role));
  } catch (e) {
    return res.status(e.status ?? 400).json({ message: e.message });
  }
}

// ─── PUT /therapy-plans/:planId/sessions/:sessionId ────────────────────────────
async function updateSession(req, res) {
  try {
    const planId = parseId(req.params.planId ?? req.params.id);
    const sessionId = parseId(req.params.sessionId);
    await assertTherapySessionEditAccess(req, planId, sessionId);

    const dateRaw = req.body?.session_date ?? req.body?.date;
    const writeData = buildSessionWriteData(req.body);
    const cleanData = Object.fromEntries(
      Object.entries(writeData).filter(([, v]) => v !== undefined),
    );
    if (!dateRaw) delete cleanData.session_date;

    const row = await updateTherapySessionRow(sessionId, {
      sessionDate: dateRaw ? toDate(dateRaw) : undefined,
      cleanData,
    });

    const exercises = await prisma.therapy_exercises.findMany({
      where: { therapy_plan_id: planId },
    });

    return res.json(mapSession(row, exercises, req.user?.role));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ message: "Session not found" });
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── DELETE /therapy-plans/:planId/sessions/:sessionId ─────────────────────────
async function deleteSession(req, res) {
  try {
    const planId = parseId(req.params.planId ?? req.params.id);
    const sessionId = parseId(req.params.sessionId);
    await assertTherapySessionEditAccess(req, planId, sessionId);
    await prisma.therapy_sessions.delete({ where: { id: sessionId } });
    return res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ message: "Session not found" });
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── POST /therapy-files ───────────────────────────────────────────────────────
async function uploadFile(req, res) {
  try {
    const planId = req.body?.planId;
    if (!planId) return res.status(400).json({ message: "planId is required" });

    await assertTherapyExerciseWriteAccess(req, planId);

    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const item = await addTherapyPlanFile(planId, file, {
      title: req.body?.title,
      uploadedBy: req.body?.uploadedBy ?? req.user?.name ?? "Unknown",
    });

    try {
      const plan = await prisma.therapy_plans.findUnique({
        where: { id: String(planId) },
        include: PLAN_NOTIFY_INCLUDE,
      });
      if (plan) {
        await notifyTherapyResourceAdded(plan, {
          title: item.title ?? item.fileName,
          kind: "file",
        });
      }
    } catch (notifyErr) {
      console.warn("[therapy] exercise upload notification failed:", notifyErr.message);
    }

    return res.status(201).json({ item });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── GET /therapy-files/:planId ────────────────────────────────────────────────
async function listFiles(req, res) {
  try {
    const planId = parseId(req.params.planId);
    await assertTherapyPlanAccess(req, planId);
    const items = await loadTherapyPlanFiles(planId);
    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── DELETE /therapy-files/:planId/:fileId ─────────────────────────────────────
async function deleteFile(req, res) {
  try {
    const planId = parseId(req.params.planId);
    const fileId = parseId(req.params.fileId);
    await assertTherapyExerciseWriteAccess(req, planId);
    await deleteTherapyPlanFile(planId, fileId);
    const items = await loadTherapyPlanFiles(planId);
    return res.json({ success: true, items, total: items.length });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── GET /therapy-plans/:planId/files/serve/:filename ──────────────────────────
async function serveFile(req, res) {
  try {
    const planId = parseId(req.params.planId);
    await assertTherapyPlanAccess(req, planId);
    const fp = resolveTherapyPlanFilePath(planId, req.params.filename);
    if (!fp) return res.status(404).send("File not found");
    return res.sendFile(require("path").resolve(fp));
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── POST /therapy-plans/:planId/exercises ─────────────────────────────────────
async function createExercise(req, res) {
  try {
    const planId = parseId(req.params.planId);
    await assertTherapyExerciseWriteAccess(req, planId);

    const title = String(req.body?.title ?? "").trim();
    if (!title) return res.status(400).json({ message: "title is required" });

    const row = await prisma.therapy_exercises.create({
      data: {
        therapy_plan_id: planId,
        title,
        description: req.body?.description ?? null,
        media_url: req.body?.media_url ?? null,
      },
    });

    try {
      const plan = await prisma.therapy_plans.findUnique({
        where: { id: String(planId) },
        include: PLAN_NOTIFY_INCLUDE,
      });
      if (plan) {
        await notifyTherapyResourceAdded(plan, { title, kind: "exercise" });
      }
    } catch (notifyErr) {
      console.warn("[therapy] exercise create notification failed:", notifyErr.message);
    }

    return res.status(201).json({ item: mapExercise(row) });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── PUT /therapy-plans/:planId/exercises/:exerciseId ────────────────────────────
async function updateExercise(req, res) {
  try {
    const planId = parseId(req.params.planId);
    const exerciseId = parseId(req.params.exerciseId);
    await assertTherapyExerciseWriteAccess(req, planId);

    const row = await prisma.therapy_exercises.findFirst({
      where: { id: exerciseId, therapy_plan_id: planId },
    });
    if (!row) return res.status(404).json({ message: "Exercise not found" });

    const titleRaw = req.body?.title;
    const title =
      titleRaw !== undefined && titleRaw !== null ? String(titleRaw).trim() : undefined;
    if (title !== undefined && !title) {
      return res.status(400).json({ message: "title cannot be empty" });
    }

    const updated = await prisma.therapy_exercises.update({
      where: { id: exerciseId },
      data: {
        ...(title !== undefined && { title }),
        ...(req.body?.description !== undefined && {
          description: req.body.description ? String(req.body.description) : null,
        }),
        ...(req.body?.media_url !== undefined && {
          media_url: req.body.media_url ? String(req.body.media_url) : null,
        }),
      },
    });

    return res.json({ item: mapExercise(updated) });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

// ─── DELETE /therapy-plans/:planId/exercises/:exerciseId ───────────────────────
async function deleteExercise(req, res) {
  try {
    const planId = parseId(req.params.planId);
    const exerciseId = parseId(req.params.exerciseId);
    await assertTherapyExerciseWriteAccess(req, planId);

    const row = await prisma.therapy_exercises.findFirst({
      where: { id: exerciseId, therapy_plan_id: planId },
    });
    if (!row) return res.status(404).json({ message: "Exercise not found" });

    await prisma.therapy_exercises.delete({ where: { id: exerciseId } });
    return res.json({ success: true });
  } catch (e) {
    return res.status(e.status ?? 500).json({ message: e.message });
  }
}

module.exports = {
  listPlans,
  listTherapyAlias,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  uploadFile,
  listFiles,
  deleteFile,
  serveFile,
  createExercise,
  updateExercise,
  deleteExercise,
};
