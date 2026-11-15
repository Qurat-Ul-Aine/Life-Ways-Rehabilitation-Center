const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const prisma = require("../lib/prisma");
const { hasPermission, isFamilyRole } = require("../policies/accessPolicy");
const { recordAudit, listPatientAuditLogs } = require("../services/auditLog.service");
const { assertClinicalRecordAccess } = require("../services/medicalAccess.service");
const { purgePatientDocumentFiles } = require("../utils/secureDelete");
const { notifyDoctorPatientAssignment } = require("../services/notification.service");
const { assertApprovedActiveDoctor } = require("../utils/doctorApproval");
const { buildPatientDocumentPdf } = require("../utils/pdfGenerator");
const { markMissedAppointments } = require("../services/appointmentMissed.service");
const {
  localCalendarDate,
  isStartingSoon,
  ACTIVE_REMINDER_STATUSES,
} = require("../utils/appointmentTime");
const { findActiveTherapyPlansForPatient, buildSessionWriteData, persistTherapySessionRow } = require("../services/therapySessionNotes.service");

const parseId = (raw) => (isNaN(Number(raw)) ? String(raw) : Number(raw));

// ─── CHANGE 1: mapPatient now accepts precomputed extras ──────────────────────
function computeAgeFromDob(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function shouldHideConfidentialFromViewer(role) {
  const norm = String(role ?? "").toUpperCase();
  return norm === "PATIENT" || norm === "FAMILY";
}

function assertDoctorClinicalWrite(req) {
  if (String(req.user?.role ?? "").toUpperCase() !== "DOCTOR") {
    const err = new Error("Only doctors can add or update clinical records.");
    err.status = 403;
    throw err;
  }
}

function parseMedicalHistoryRows(rows, { hideConfidential = false } = {}) {
  const medicalHistory = [];
  const confidentialNotes = [];

  for (const h of rows ?? []) {
    const raw = String(h.history ?? "").trim();
    if (!raw) continue;

    if (raw.startsWith("[CONFIDENTIAL]")) {
      if (!hideConfidential) {
        confidentialNotes.push({
          id: String(h.id),
          body: raw.replace(/^\[CONFIDENTIAL\]\s*/, ""),
          authorName: "Clinical staff",
          authorRole: "doctor",
          date: new Date().toISOString(),
        });
      }
      continue;
    }

    const match = raw.match(/^\[([^\]]+)\]\s*([\s\S]+)$/);
    const typeRaw = match ? match[1] : "note";
    const content = match ? match[2].trim() : raw;
    const colonIdx = content.indexOf(": ");
    const title = colonIdx >= 0 ? content.slice(0, colonIdx) : content;
    const details = colonIdx >= 0 ? content.slice(colonIdx + 2) : "";

    medicalHistory.push({
      id: String(h.id),
      type: typeRaw,
      title,
      details,
      date: new Date().toISOString(),
      authorName: "Clinical staff",
    });
  }

  return { medicalHistory, confidentialNotes };
}

function mapTherapySessions(plans) {
  const sessions = [];

  for (const plan of plans ?? []) {
    const therapistName = plan.doctors?.users?.name ?? "Assigned doctor";
    const planType = plan.therapy_type ?? "Therapy";

    if (plan.therapy_sessions?.length) {
      for (const s of plan.therapy_sessions) {
        const noteParts = [
          s.progress_notes,
          s.outcome ? `Patient behavior/progress: ${s.outcome}` : null,
          s.mood ? `Mood: ${s.mood}` : null,
          s.attendance ? `Attendance: ${s.attendance}` : null,
        ].filter(Boolean);

        sessions.push({
          id: s.id,
          date: s.session_date
            ? new Date(s.session_date).toISOString()
            : plan.start_date
              ? new Date(plan.start_date).toISOString()
              : new Date().toISOString(),
          therapistName,
          type: planType,
          status: String(s.status ?? "scheduled").toLowerCase(),
          notes: noteParts.join(" · ") || plan.description || "",
        });
      }
    } else if (plan.description || plan.therapy_type) {
      sessions.push({
        id: plan.id,
        date: plan.start_date
          ? new Date(plan.start_date).toISOString()
          : new Date().toISOString(),
        therapistName,
        type: planType,
        status: String(plan.status ?? "active").toLowerCase(),
        notes: plan.description ?? "",
      });
    }
  }

  return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mapRecoveryTimeline(screeningTests) {
  return (screeningTests ?? [])
    .filter((t) => t.test_type === "recovery_progress")
    .map((t) => ({
      date: t.test_date
        ? new Date(t.test_date).toISOString()
        : new Date().toISOString(),
      score: Number(t.score ?? 0),
      note: null,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function mapLinkedFamilyMember(fm) {
  return {
    id: fm.id,
    userId: fm.user_id,
    name: fm.users?.name ?? "",
    email: fm.users?.email ?? "",
    relationship: fm.relationship ?? null,
    isActive: fm.users?.is_active !== false,
    linkedAt: fm.created_at?.toISOString?.() ?? null,
  };
}

function mapPatient(p, extras = {}) {
  const age = p.age ?? computeAgeFromDob(p.date_of_birth);
  const hideConfidential = extras.hideConfidential === true;
  const { medicalHistory, confidentialNotes } = parseMedicalHistoryRows(
    p.patient_medical_history,
    { hideConfidential },
  );

  return {
    id: p.id,
    fullName: p.users?.name ?? "",
    email: p.users?.email ?? "",
    phone: p.users?.user_phones?.[0]?.phone ?? p.patient_phones?.[0]?.phone ?? "",
    age,
    gender: p.gender ?? "other",
    condition: p.condition ?? "",
    nationality: p.nationality ?? "",
    dateOfBirth: p.date_of_birth ? p.date_of_birth.toISOString() : null,
    address: p.patient_addresses?.[0]?.address ?? null,
    emergencyContactName: p.emergency_contact_name ?? null,
    emergencyContactPhone: p.emergency_contact_phone ?? null,
    profileImageUrl: p.profile_image_url ?? null,
    aboutMe: p.about_me ?? null,
    allergies: p.allergies ?? null,
    bloodGroup: p.blood_group ?? null,
    status: p.status ?? "active",
    userId: p.user_id ?? p.users?.id ?? null,
    portalAccountType:
      String(p.users?.role ?? "PATIENT").toUpperCase() === "FAMILY" ? "family" : "patient",
    linkedFamilyMembers: (p.family_members ?? []).map(mapLinkedFamilyMember),
    isActive: p.users?.is_active !== false,
    admissionDate: p.patient_admissions?.[0]?.admission_date
      ? p.patient_admissions[0].admission_date.toISOString()
      : null,
    primaryDiagnosis: p.condition ?? null,
    assignedDoctorId: p.doctor_patient?.[0]?.doctor_id ?? null,
    assignedDoctorName: p.doctor_patient?.[0]?.doctors?.users?.name ?? null,
    selectedServiceId: p.patient_services?.service_id ?? null,
    selectedServiceName: p.patient_services?.rehabilitation_services?.title ?? null,
    selectedServiceSlug: p.patient_services?.rehabilitation_services?.slug ?? null,
    selectedSubService: p.patient_services?.sub_service ?? null,
    medicalHistory,
    therapySessions: mapTherapySessions(p.therapy_plans),
    recoveryTimeline: mapRecoveryTimeline(p.screening_tests),
    confidentialNotes: hideConfidential ? [] : confidentialNotes,
    recoveryProgress: extras.recoveryProgress ?? (() => {
      const tests = p.screening_tests ?? [];
      const latest = tests
        .filter((t) => t.test_type === "recovery_progress")
        .sort((a, b) => new Date(b.test_date) - new Date(a.test_date))[0];
      return latest?.score ?? 0;
    })(),
    createdAt: p.created_at?.toISOString() ?? new Date().toISOString(),
    updatedAt: p.updated_at?.toISOString() ?? new Date().toISOString(),
  };
}

const PATIENT_INCLUDE = {
  users: { include: { user_phones: true } },
  doctor_patient: { include: { doctors: { include: { users: true } } } },
  patient_services: {
    include: {
      rehabilitation_services: { select: { id: true, slug: true, title: true } },
    },
  },
  patient_medical_history: true,
  patient_addresses: true,
  patient_admissions: true,
  patient_phones: true,
  screening_tests: true,
  therapy_plans: {
    include: {
      therapy_sessions: true,
      doctors: { include: { users: true } },
    },
  },
  family_members: {
    include: {
      users: { select: { id: true, name: true, email: true, is_active: true, role: true } },
    },
  },
};

async function resolveDoctorForUser(userId) {
  if (!userId) return null;
  return prisma.doctors.findFirst({
    where: { user_id: String(userId) },
    select: { id: true },
  });
}

async function assertDoctorAssignedToPatient(doctorId, patientId) {
  const link = await prisma.doctor_patient.findUnique({
    where: {
      doctor_id_patient_id: {
        doctor_id: String(doctorId),
        patient_id: String(patientId),
      },
    },
  });
  if (!link) {
    const err = new Error("You are not assigned to this patient");
    err.status = 403;
    throw err;
  }
}

const APPT_STATUS_TO_FRONTEND = {
  BOOKED: "scheduled",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  MISSED: "missed",
};

const formatAppointmentTime = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const toScore = (raw) => {
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const toDateStr = (raw) => {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const INTERNAL_RECOVERY_METRICS = new Set([
  "recovery_progress",
  "mobility",
  "therapy_goals",
  "pain_management",
]);

const formatAssessmentType = (testType) => {
  const labels = {
    recovery_progress: "Recovery Progress Assessment",
    mobility: "Mobility Assessment",
    therapy_goals: "Therapy Goals Review",
    pain_management: "Pain Management Assessment",
    audit: "Alcohol Use Disorder (AUDIT)",
    phq9: "Depression Screening (PHQ-9)",
    phq_9: "Depression Screening (PHQ-9)",
    gad7: "Anxiety Screening (GAD-7)",
    gad_7: "Anxiety Screening (GAD-7)",
  };
  const key = String(testType ?? "").trim().toLowerCase();
  if (labels[key]) return labels[key];
  return key
    ? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Clinical Assessment";
};

const mapAssessmentRow = (row) => ({
  id: row.id,
  testType: formatAssessmentType(row.test_type),
  rawType: row.test_type ?? null,
  score: toScore(row.score),
  riskLevel: row.risk_level ?? null,
  testDate: toDateStr(row.test_date),
  isRecoveryMetric: INTERNAL_RECOVERY_METRICS.has(String(row.test_type ?? "").toLowerCase()),
});

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

const THERAPY_PLAN_INCLUDE = {
  doctors: { include: { users: true } },
  therapy_sessions: { orderBy: { session_date: "desc" } },
};

function isSchemaColumnMismatchError(err) {
  const msg = String(err?.message ?? "");
  return (
    err?.code === "P2022" ||
    msg.includes("does not exist") ||
    msg.includes("Unknown argument")
  );
}

/** Loads active plan + sessions; falls back when therapy_sessions extended columns are not migrated yet. */
async function loadActiveTherapyPlanForDashboard(patientId) {
  try {
    return await prisma.therapy_plans.findFirst({
      where: { patient_id: patientId, status: "ACTIVE" },
      orderBy: { start_date: "desc" },
      include: THERAPY_PLAN_INCLUDE,
    });
  } catch (err) {
    if (!isSchemaColumnMismatchError(err)) throw err;

    const plan = await prisma.therapy_plans.findFirst({
      where: { patient_id: patientId, status: "ACTIVE" },
      orderBy: { start_date: "desc" },
      include: { doctors: { include: { users: true } } },
    });
    if (!plan) return null;

    let sessions = [];
    try {
      sessions = await prisma.$queryRaw`
        SELECT id, therapy_plan_id, session_date, duration, progress_notes, status, outcome, pain_level, attendance, mood
        FROM therapy_sessions
        WHERE therapy_plan_id = ${plan.id}::uuid
        ORDER BY session_date DESC NULLS LAST
      `;
    } catch {
      sessions = [];
    }

    return { ...plan, therapy_sessions: sessions };
  }
}

/** Session attendance counts; deduplicates when appointment_id exists, legacy sum otherwise. */
async function getDashboardSessionMetrics(patientId) {
  const [
    therapySessionTotal,
    therapySessionCompleted,
    appointmentTotal,
    appointmentCompleted,
  ] = await Promise.all([
    prisma.therapy_sessions.count({
      where: { therapy_plans: { patient_id: patientId } },
    }),
    prisma.therapy_sessions.count({
      where: {
        status: "COMPLETED",
        therapy_plans: { patient_id: patientId },
      },
    }),
    prisma.appointments.count({
      where: { patient_id: patientId, status: { not: "CANCELLED" } },
    }),
    prisma.appointments.count({
      where: { patient_id: patientId, status: "COMPLETED" },
    }),
  ]);

  try {
    const [orphanTherapyTotal, orphanTherapyCompleted] = await Promise.all([
      prisma.therapy_sessions.count({
        where: {
          therapy_plans: { patient_id: patientId },
          appointment_id: null,
        },
      }),
      prisma.therapy_sessions.count({
        where: {
          status: "COMPLETED",
          therapy_plans: { patient_id: patientId },
          appointment_id: null,
        },
      }),
    ]);

    return {
      therapySessionTotal,
      therapySessionCompleted,
      appointmentTotal,
      appointmentCompleted,
      orphanTherapyTotal,
      orphanTherapyCompleted,
      totalSessions: appointmentTotal + orphanTherapyTotal,
      completedSessions: appointmentCompleted + orphanTherapyCompleted,
    };
  } catch (err) {
    if (!isSchemaColumnMismatchError(err)) throw err;

    return {
      therapySessionTotal,
      therapySessionCompleted,
      appointmentTotal,
      appointmentCompleted,
      orphanTherapyTotal: therapySessionTotal,
      orphanTherapyCompleted: therapySessionCompleted,
      totalSessions: therapySessionTotal + appointmentTotal,
      completedSessions: therapySessionCompleted + appointmentCompleted,
    };
  }
}

/** Resolve patients row from authenticated user (JWT sub = users.id, not patients.id). */
async function resolvePatientForUser(user) {
  if (!user?.id) return null;

  if (user.role === "FAMILY") {
    const link = await prisma.family_members.findUnique({
      where: { user_id: user.id },
      include: { patients: { include: PATIENT_INCLUDE } },
    });
    return link?.patients ?? null;
  }

  const byUserId = await prisma.patients.findUnique({
    where: { user_id: user.id },
    include: PATIENT_INCLUDE,
  });
  if (byUserId) return byUserId;

  if (!user.email) return null;

  return prisma.patients.findFirst({
    where: {
      users: { email: { equals: user.email } },
    },
    include: PATIENT_INCLUDE,
  });
}

// ─── GET /patients ────────────────────────────────────────────────────────────
async function list(req, res) {
  try {
    const where = {};

    if (req.user?.role === "DOCTOR") {
      const doctor = await resolveDoctorForUser(req.user.id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor profile not found" });
      }
      where.doctor_patient = { some: { doctor_id: doctor.id } };
    } else if (req.query.assignedDoctorId) {
      where.doctor_patient = {
        some: { doctor_id: parseId(req.query.assignedDoctorId) },
      };
    }
    if (req.query.condition) {
      where.condition = req.query.condition;
    }
    if (req.query.status && req.query.status !== "all") {
      where.status = req.query.status;
    }
    if (req.query.search) {
      where.users = {
        OR: [
          { name: { contains: req.query.search } },
          { email: { contains: req.query.search } },
        ],
      };
    }

    const patients = await prisma.patients.findMany({
      where,
      include: PATIENT_INCLUDE,
      orderBy: { id: "desc" },
    });

    return res.json({ items: patients.map((p) => mapPatient(p)), total: patients.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /patients/:id ────────────────────────────────────────────────────────
async function getById(req, res) {
  try {
    const p = await prisma.patients.findUnique({
      where: { id: parseId(req.params.id) },
      include: PATIENT_INCLUDE,
    });
    if (!p) return res.status(404).json({ success: false, message: "Patient not found" });

    if (req.user?.role === "DOCTOR") {
      const doctor = await resolveDoctorForUser(req.user.id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor profile not found" });
      }
      try {
        await assertDoctorAssignedToPatient(doctor.id, p.id);
      } catch (e) {
        return res.status(e.status ?? 403).json({ success: false, message: e.message });
      }
    }

    if (req.user?.role === "FAMILY") {
      const self = await resolvePatientForUser(req.user);
      if (!self || self.id !== p.id) {
        return res.status(403).json({ success: false, message: "You may only view your linked patient record." });
      }
    }

    if (req.user?.role === "PATIENT") {
      const self = await resolvePatientForUser(req.user);
      if (!self || self.id !== p.id) {
        return res.status(403).json({ success: false, message: "You may only view your own patient record." });
      }
    }

    const hideConfidential = shouldHideConfidentialFromViewer(req.user?.role);
    return res.json(mapPatient(p, { hideConfidential }));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /patients/me — logged-in patient's own profile
async function getMe(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient record not found" });
    }
    return res.json(mapPatient(patient, { hideConfidential: shouldHideConfidentialFromViewer(req.user?.role) }));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function applyPatientProfileFields(tx, patientRow, body) {
  const {
    name,
    phone,
    gender,
    nationality,
    condition,
    address,
    dateOfBirth,
    emergencyContactName,
    emergencyContactPhone,
    aboutMe,
    allergies,
    bloodGroup,
    profileImageUrl,
  } = body ?? {};

  const patientId = patientRow.id;
  const userId = patientRow.user_id;

  if ((name !== undefined || body.email !== undefined) && userId) {
    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (body.email !== undefined) updateData.email = String(body.email).trim().toLowerCase();
    if (Object.keys(updateData).length > 0) {
      await tx.users.update({ where: { id: userId }, data: updateData });
    }
  }

  if (phone !== undefined && userId) {
    const trimmed = String(phone).trim();
    const existingPhone = await tx.user_phones.findFirst({ where: { user_id: userId } });
    if (existingPhone) {
      await tx.user_phones.update({ where: { id: existingPhone.id }, data: { phone: trimmed } });
    } else if (trimmed) {
      await tx.user_phones.create({ data: { user_id: userId, phone: trimmed } });
    }
  }

  if (address !== undefined) {
    const trimmed = String(address).trim();
    const existingAddr = await tx.patient_addresses.findFirst({ where: { patient_id: patientId } });
    if (existingAddr) {
      await tx.patient_addresses.update({ where: { id: existingAddr.id }, data: { address: trimmed } });
    } else if (trimmed) {
      await tx.patient_addresses.create({ data: { patient_id: patientId, address: trimmed } });
    }
  }

  const patientData = {};
  if (gender !== undefined) patientData.gender = gender ? String(gender).trim() : null;
  if (nationality !== undefined) patientData.nationality = nationality ? String(nationality).trim() : null;
  if (condition !== undefined) patientData.condition = condition ? String(condition).trim() : null;
  if (dateOfBirth !== undefined) {
    patientData.date_of_birth = dateOfBirth ? new Date(dateOfBirth) : null;
  }
  if (emergencyContactName !== undefined) {
    patientData.emergency_contact_name = emergencyContactName
      ? String(emergencyContactName).trim()
      : null;
  }
  if (emergencyContactPhone !== undefined) {
    patientData.emergency_contact_phone = emergencyContactPhone
      ? String(emergencyContactPhone).trim()
      : null;
  }
  if (aboutMe !== undefined) patientData.about_me = aboutMe ? String(aboutMe).trim() : null;
  if (allergies !== undefined) patientData.allergies = allergies ? String(allergies).trim() : null;
  if (bloodGroup !== undefined) patientData.blood_group = bloodGroup ? String(bloodGroup).trim() : null;
  if (profileImageUrl !== undefined) {
    patientData.profile_image_url = profileImageUrl ? String(profileImageUrl).trim() : null;
  }

  if (Object.keys(patientData).length === 0) {
    return tx.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
  }

  return tx.patients.update({
    where: { id: patientId },
    data: patientData,
    include: PATIENT_INCLUDE,
  });
}

// PATCH /patients/me — patient self-service profile update
async function patchMe(req, res) {
  try {
    if (isFamilyRole(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Family member accounts have read-only access to patient records.",
      });
    }
    if (req.user?.role !== "PATIENT") {
      return res.status(403).json({ success: false, message: "Only patients can update this profile." });
    }

    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient record not found" });
    }

    const allowedKeys = [
      "name",
      "email",
      "phone",
      "gender",
      "nationality",
      "address",
      "dateOfBirth",
      "emergencyContactName",
      "emergencyContactPhone",
      "aboutMe",
      "allergies",
      "bloodGroup",
      "profileImageUrl",
    ];
    const body = req.body ?? {};
    const hasUpdates = allowedKeys.some((k) => body[k] !== undefined);
    if (!hasUpdates) {
      return res.status(400).json({ success: false, message: "No updatable fields provided." });
    }

    const updated = await prisma.$transaction((tx) =>
      applyPatientProfileFields(tx, patient, body),
    );

    return res.json({ success: true, data: mapPatient(updated) });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email already in use." });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

// POST /patients/me/profile-image — upload patient avatar
async function uploadProfileImage(req, res) {
  try {
    if (req.user?.role !== "PATIENT") {
      return res.status(403).json({ success: false, message: "Only patients can upload a profile image." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded." });
    }

    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient record not found" });
    }

    const imageUrl = `/uploads/avatars/patients/${file.filename}`;
    const updated = await prisma.patients.update({
      where: { id: patient.id },
      data: { profile_image_url: imageUrl },
      include: PATIENT_INCLUDE,
    });

    return res.json({
      success: true,
      url: imageUrl,
      data: mapPatient(updated),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── CHANGE 4: NEW — GET /patients/me/dashboard-summary ──────────────────────
// This is the single endpoint HomePanel calls for all dashboard data.
// Add route BEFORE /:id routes so "me" is not treated as an id.
async function getDashboardSummary(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const patientId = patient.id;
    const todayDate = localCalendarDate();

    await markMissedAppointments({ patient_id: patientId });

    // ── 2. Upcoming appointments (today and future, active statuses only) ─
    const upcomingAppointments = await prisma.appointments.findMany({
      where: {
        patient_id: patientId,
        appointment_date: { gte: todayDate },
        status: { in: ACTIVE_REMINDER_STATUSES },
      },
      orderBy: [{ appointment_date: "asc" }, { appointment_time: "asc" }],
      take: 5,
      include: {
        doctors: { include: { users: true } },
        telehealth_sessions: { select: { meeting_link: true }, take: 1 },
      },
    });

    // ── Today's reminders: only today's scheduled/confirmed appointments ─
    const todaysAppointmentRows = await prisma.appointments.findMany({
      where: {
        patient_id: patientId,
        appointment_date: todayDate,
        status: { in: ACTIVE_REMINDER_STATUSES },
      },
      orderBy: [{ appointment_time: "asc" }],
      include: {
        doctors: { include: { users: true } },
        patients: { include: { users: true } },
        telehealth_sessions: { select: { meeting_link: true }, take: 1 },
      },
    });

    const todaysAppointments = todaysAppointmentRows.map((a) => ({
      id: a.id,
      patientName: a.patients?.users?.name ?? mapPatient(patient).fullName ?? null,
      doctorName: a.doctors?.users?.name ?? null,
      date: toDateStr(a.appointment_date),
      startTime: formatAppointmentTime(a.appointment_time),
      status: APPT_STATUS_TO_FRONTEND[a.status] ?? "scheduled",
      mode: a.type === "ONLINE" ? "online" : "in-person",
      reason: a.reason ?? null,
      meetingUrl: a.telehealth_sessions?.[0]?.meeting_link ?? null,
      startingSoon: isStartingSoon(a.appointment_date, a.appointment_time),
    }));

    const sessionMetrics = await getDashboardSessionMetrics(patientId);
    const {
      therapySessionTotal,
      therapySessionCompleted,
      orphanTherapyTotal,
      orphanTherapyCompleted,
      appointmentTotal,
      appointmentCompleted,
      totalSessions,
      completedSessions,
    } = sessionMetrics;

    // ── 4. Recovery progress — latest screening_test of type recovery_progress
    const latestRecovery = await prisma.screening_tests.findFirst({
      where: { patient_id: patientId, test_type: "recovery_progress" },
      orderBy: { test_date: "desc" },
    });

    // ── 5. Recovery breakdown — mobility / therapy_goals / pain_mgmt
    const [mobilityTest, therapyGoalsTest, painMgmtTest] = await Promise.all([
      prisma.screening_tests.findFirst({
        where: { patient_id: patientId, test_type: "mobility" },
        orderBy: { test_date: "desc" },
      }),
      prisma.screening_tests.findFirst({
        where: { patient_id: patientId, test_type: "therapy_goals" },
        orderBy: { test_date: "desc" },
      }),
      prisma.screening_tests.findFirst({
        where: { patient_id: patientId, test_type: "pain_management" },
        orderBy: { test_date: "desc" },
      }),
    ]);

    // ── 6. Notifications (linked to users.id, not patients.id) ───────────
    let notifications = [];
    try {
      notifications = await prisma.notifications.findMany({
        where: { user_id: req.user.id },
        orderBy: { sent_date: "desc" },
        take: 5,
      });
    } catch {
      // notifications table may not exist yet — silently ignore
    }

    // ── 7. Therapy plan (with sessions + therapist) ─────────────────────────
    const therapyPlan = await loadActiveTherapyPlanForDashboard(patientId);

    const planGoals = parseGoals(therapyPlan?.goals);
    const planSessions = therapyPlan?.therapy_sessions ?? [];
    const completedPlanSessions = planSessions.filter((s) => s.status === "COMPLETED").length;

    const screeningFollowUps = await prisma.screening_tests.findMany({
      where: {
        patient_id: patientId,
        OR: [{ flagged: true }, { follow_up_date: { not: null } }],
      },
      orderBy: [{ follow_up_date: "asc" }, { test_date: "desc" }],
      take: 5,
      include: { conditions: { select: { name: true } } },
    });

    const screeningAlerts = screeningFollowUps.map((s) => ({
      id: s.id,
      condition: s.conditions?.name ?? s.test_type ?? "Screening",
      flagged: Boolean(s.flagged),
      followUpDate: toDateStr(s.follow_up_date),
      testDate: toDateStr(s.test_date),
      riskLevel: s.risk_level ?? null,
      message: s.flagged
        ? "Your care team has flagged this screening for follow-up."
        : s.follow_up_date
          ? `Follow-up recommended by ${toDateStr(s.follow_up_date)}.`
          : null,
    }));

    const therapyPlanProgressPct =
      planGoals.length > 0
        ? Math.min(100, Math.round((completedPlanSessions / planGoals.length) * 100))
        : planSessions.length > 0
          ? Math.round((completedPlanSessions / planSessions.length) * 100)
          : 0;

    // Build treatment goals for display
    const treatmentGoals = planGoals.map((label, index) => ({
      id: `${therapyPlan?.id ?? "plan"}-goal-${index}`,
      label,
      completed: index < completedPlanSessions,
    }));

    // ── 8. Latest doctor / therapist note ───────────────────────────────────
    const latestSessionNote = planSessions.find(
      (s) => (s.progress_notes ?? "").trim().length > 0,
    );

    // ── 9. Assessments (all screening tests) ───────────────────────────────
    const screeningRows = await prisma.screening_tests.findMany({
      where: { patient_id: patientId },
      orderBy: { test_date: "desc" },
      take: 8,
    });

    const recentAssessments = screeningRows.map(mapAssessmentRow);
    const latestAssessment = recentAssessments[0] ?? null;
    const clinicalAssessments = recentAssessments.filter((a) => !a.isRecoveryMetric);

    // ── 10. Recent reports (DB reports + patient documents) ────────────────
    let recentReports = [];
    try {
      const documentItems = await collectPatientDocuments(patientId);
      recentReports = documentItems
        .filter(
          (d) =>
            d.source === "report"
            || d.category === "medical_report"
            || d.category === "therapy_assessment",
        )
        .slice(0, 5)
        .map((d) => ({
          id: String(d.id),
          reportType: d.title ?? "Report",
          generatedDate: d.uploadedAt ?? null,
          source: d.source ?? "report",
          category: d.category ?? "medical_report",
          fileType: d.fileType ?? null,
        }));
    } catch {
      recentReports = [];
    }

    const recoveryOverall = toScore(latestRecovery?.score);
    const sessionAdherencePct =
      totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const therapistName = therapyPlan?.doctors?.users?.name ?? null;
    const assignedDoctor = mapPatient(patient).assignedDoctorName;

    const upcomingTasks = [];

    todaysAppointments.forEach((appt) => {
      upcomingTasks.push({
        id: `task-appt-${appt.id}`,
        type: "session",
        label: appt.reason?.trim() || (appt.mode === "online" ? "Telehealth session" : "Clinic visit"),
        dueLabel: appt.startTime ?? "",
        appointmentId: appt.id,
        mode: appt.mode,
        status: appt.status,
        startingSoon: appt.startingSoon,
      });
    });
    
    // Only include today's notifications
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayNotifications = notifications.filter((n) => {
      if (!n.sent_date) return false;
      const sentDate = new Date(n.sent_date);
      return sentDate >= todayStart && sentDate <= todayEnd;
    });
    
    todayNotifications.slice(0, 3).forEach((n) => {
      const msg = n.message ?? "";
      if (/medication|prescription|pill|refill/i.test(msg)) {
        upcomingTasks.push({
          id: `task-notif-${n.id}`,
          type: "medication",
          label: msg,
          dueLabel: formatAppointmentTime(n.sent_date?.split("T")[1]) ?? "",
        });
      } else if (/session|appointment|therapy/i.test(msg)) {
        upcomingTasks.push({
          id: `task-notif-${n.id}`,
          type: "session",
          label: msg,
          dueLabel: formatAppointmentTime(n.sent_date?.split("T")[1]) ?? "",
        });
      }
    });

    const prescriptionRows = await prisma.prescriptions.findMany({
      where: {
        patient_id: patientId,
        deleted_at: null,
        is_invalid: false,
        status: "ACTIVE",
      },
      include: {
        doctors: { include: { users: { select: { name: true } } } },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    const medications = prescriptionRows.map((rx) => ({
      id: rx.id,
      name: rx.medication_name,
      dosage: rx.dosage,
      frequency: rx.frequency,
      status: "active",
      prescribedBy: rx.doctors?.users?.name ?? "Doctor",
    }));

    const dosesToday = await prisma.medication_dose_logs.count({
      where: { patient_id: patientId, log_date: { gte: todayStart } },
    });
    const medicationAdherence =
      prescriptionRows.length > 0
        ? Math.min(100, Math.round((dosesToday / prescriptionRows.length) * 100))
        : null;

    // ── Build response ──────────────────────────────────────────────────────
    return res.json({
      profile: mapPatient(patient, {
        recoveryProgress: recoveryOverall,
      }),
      upcomingAppointments: upcomingAppointments.map((a) => ({
        id: a.id,
        date: a.appointment_date
          ? new Date(a.appointment_date).toISOString().slice(0, 10)
          : null,
        startTime: formatAppointmentTime(a.appointment_time),
        status: APPT_STATUS_TO_FRONTEND[a.status] ?? "scheduled",
        mode: a.type === "ONLINE" ? "online" : "in-person",
        reason: a.reason ?? null,
        doctorName: a.doctors?.users?.name ?? null,
        doctorId: a.doctor_id ?? null,
        meetingUrl: a.telehealth_sessions?.[0]?.meeting_link ?? null,
      })),
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        therapyTotal: therapySessionTotal,
        therapyCompleted: therapySessionCompleted,
        appointmentTotal,
        appointmentCompleted,
        orphanTherapyTotal,
        orphanTherapyCompleted,
        label:
          totalSessions > 0
            ? `${completedSessions} of ${totalSessions} sessions completed`
            : "—",
      },
      recovery: {
        overall: recoveryOverall,
        treatmentGoals: toScore(therapyGoalsTest?.score),
        sessionAdherence: sessionAdherencePct,
        medicationAdherence,
        mobility: toScore(mobilityTest?.score),
        therapyGoals: toScore(therapyGoalsTest?.score),
        painManagement: toScore(painMgmtTest?.score),
      },
      metrics: {
        programCompletion: recoveryOverall,
        therapyPlanProgress: therapyPlanProgressPct,
        medicationAdherence,
      },
      medications,
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        sent_date: n.sent_date,
        status: n.status,
      })),
      therapyPlan: therapyPlan
        ? {
            id: therapyPlan.id,
            therapyType: therapyPlan.therapy_type ?? "Therapy plan",
            description: therapyPlan.description ?? "",
            startDate: toDateStr(therapyPlan.start_date),
            endDate: toDateStr(therapyPlan.end_date),
            status: therapyPlan.status,
            progressPct: therapyPlanProgressPct,
            currentPhase:
              completedPlanSessions === 0
                ? "Getting started"
                : therapyPlanProgressPct >= 80
                  ? "Maintenance"
                  : therapyPlanProgressPct >= 40
                    ? "Active treatment"
                    : "Early phase",
            therapistName,
            goalsCount: planGoals.length,
            sessionsCompleted: completedPlanSessions,
          }
        : null,
      careTeam: {
        doctor: assignedDoctor,
        therapist: therapistName,
        caseManager: null,
      },
      treatmentGoals,
      latestDoctorNote: latestSessionNote
        ? {
            date: toDateStr(latestSessionNote.session_date),
            author: therapistName ?? assignedDoctor ?? "Care team",
            summary: (latestSessionNote.progress_notes ?? "").trim(),
          }
        : null,
      latestAssessment: latestAssessment
        ? {
            id: latestAssessment.id,
            testType: latestAssessment.testType,
            score: latestAssessment.score,
            riskLevel: latestAssessment.riskLevel,
            testDate: latestAssessment.testDate,
          }
        : null,
      recentAssessments,
      clinicalAssessments,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        generatedDate: r.generatedDate,
        source: r.source,
        category: r.category,
        fileType: r.fileType,
      })),
      upcomingTasks,
      todaysAppointments,
      screeningAlerts,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

const RECOVERY_METRIC_TYPES = ["recovery_progress", "mobility", "therapy_goals", "pain_management"];

const computeReminderBadge = (dateRaw) => {
  const dateStr = toDateStr(dateRaw);
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T12:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 7) return `In ${diff} days`;
  if (diff > 7) return "Scheduled";
  return null;
};

const computeGoalStatus = (currentPct, startDate, endDate) => {
  if (currentPct >= 100) return "Completed";
  if (!startDate || !endDate) {
    return currentPct >= 40 ? "On Track" : "At Risk";
  }
  const start = new Date(`${toDateStr(startDate)}T12:00:00`).getTime();
  const end = new Date(`${toDateStr(endDate)}T12:00:00`).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return currentPct >= 40 ? "On Track" : "At Risk";
  }
  const expectedPct = Math.min(100, Math.round(((now - start) / (end - start)) * 100));
  if (currentPct + 15 < expectedPct) return "At Risk";
  return "On Track";
};

const computeGoalProgress = (goalIndex, completedSessions, goalCount, startDate, endDate) => {
  if (goalIndex < completedSessions) return 100;
  if (goalIndex > completedSessions) return 0;

  if (startDate && endDate) {
    const start = new Date(`${toDateStr(startDate)}T12:00:00`).getTime();
    const end = new Date(`${toDateStr(endDate)}T12:00:00`).getTime();
    const now = Date.now();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const timePct = Math.min(99, Math.round(((now - start) / (end - start)) * 100));
      const sessionPct = goalCount > 0
        ? Math.min(99, Math.round((completedSessions / goalCount) * 100))
        : 0;
      return Math.max(sessionPct, Math.min(timePct, 85));
    }
  }

  return goalCount > 0
    ? Math.min(99, Math.round((completedSessions / goalCount) * 100))
    : 0;
};

const buildTreatmentGoals = (plan) => {
  if (!plan) return [];

  const goals = parseGoals(plan.goals);
  const sessions = plan.therapy_sessions ?? [];
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const planStart = toDateStr(plan.start_date);
  const planEnd = toDateStr(plan.end_date);
  const goalLabels = goals.length > 0 ? goals : [plan.therapy_type ?? "Therapy goal"];

  return goalLabels.map((name, index) => {
    const currentProgressPct = computeGoalProgress(
      index,
      completedSessions,
      goalLabels.length,
      plan.start_date,
      plan.end_date,
    );

    return {
      id: `${plan.id}-goal-${index}`,
      name: String(name),
      currentProgressPct,
      targetPct: 100,
      status: computeGoalStatus(currentProgressPct, plan.start_date, plan.end_date),
      startDate: planStart,
      expectedCompletionDate: planEnd,
    };
  });
};

const buildRiskAlerts = ({
  missedTherapySessions,
  missedAppointments,
  cancelledAppointments,
  cancelledTherapySessions,
  attendancePct,
  totalAttendanceEligible,
  recoveryScores,
}) => {
  const alerts = [];

  const missedTotal = missedTherapySessions + missedAppointments;
  if (missedTotal > 0) {
    alerts.push({
      id: "missed-sessions",
      type: "missed_session",
      severity: missedTotal >= 2 ? "high" : "medium",
      title: "Missed session warning",
      message: `You have ${missedTotal} scheduled session${missedTotal === 1 ? "" : "s"} that passed without completion. Please contact your care team to reschedule.`,
    });
  }

  const cancellationTotal = cancelledAppointments + cancelledTherapySessions;
  if (cancellationTotal >= 2) {
    alerts.push({
      id: "multiple-cancellations",
      type: "multiple_cancellations",
      severity: cancellationTotal >= 4 ? "high" : "medium",
      title: "Multiple cancellations",
      message: `${cancellationTotal} appointments or therapy sessions were cancelled in the last 90 days. Consistent attendance supports your recovery.`,
    });
  }

  if (
    attendancePct !== null &&
    totalAttendanceEligible >= 3 &&
    attendancePct < 50
  ) {
    alerts.push({
      id: "low-attendance",
      type: "low_attendance",
      severity: attendancePct < 30 ? "high" : "medium",
      title: "Low attendance",
      message: `Your care attendance is ${attendancePct}%. Regular participation is important for meeting your treatment goals.`,
    });
  }

  if (recoveryScores.length >= 2) {
    const latest = toScore(recoveryScores[0].score);
    const previous = toScore(recoveryScores[1].score);
    const latestDate = recoveryScores[0].test_date
      ? new Date(recoveryScores[0].test_date).getTime()
      : null;
    const prevDate = recoveryScores[1].test_date
      ? new Date(recoveryScores[1].test_date).getTime()
      : null;

    if (latestDate && prevDate) {
      const daysBetween = Math.round((latestDate - prevDate) / 86_400_000);
      if (daysBetween >= 30 && latest <= previous && latest < 80) {
        alerts.push({
          id: "recovery-stagnation",
          type: "recovery_stagnation",
          severity: latest < previous ? "high" : "medium",
          title: "Recovery stagnation",
          message: `Your recovery score has not improved since your last assessment (${previous}% → ${latest}%). Discuss your progress with your care team.`,
        });
      }
    }
  }

  return alerts;
};

// GET /patients/me/recovery-summary — clinical notes + upcoming schedule for Recovery page
async function getRecoverySummary(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const patientId = patient.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lookback = new Date(today);
    lookback.setDate(lookback.getDate() - 90);

    const [
      latestDoctorAppt,
      latestMedicalNote,
      latestTherapistSession,
      latestRecoveryTest,
      latestCompletedSession,
      highRiskScreenings,
      highSeverityRecs,
      nextTherapySession,
      nextDoctorAppointment,
      upcomingAssessments,
      upcomingAssessmentAppts,
      missedTherapySessions,
      missedAppointments,
      cancelledAppointments,
      cancelledTherapySessions,
      totalAppointments,
      completedAppointments,
      recoveryScoresHistory,
      activeTherapyPlan,
    ] = await Promise.all([
      prisma.appointments.findFirst({
        where: {
          patient_id: patientId,
          status: "COMPLETED",
          notes: { not: null },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
        include: { doctors: { include: { users: true } } },
      }),
      prisma.patient_medical_history.findFirst({
        where: { patient_id: patientId, history: { not: null } },
        orderBy: { id: "desc" },
      }),
      prisma.therapy_sessions.findFirst({
        where: {
          progress_notes: { not: null },
          therapy_plans: { patient_id: patientId },
        },
        orderBy: { session_date: "desc" },
        include: {
          therapy_plans: { include: { doctors: { include: { users: true } } } },
        },
      }),
      prisma.screening_tests.findFirst({
        where: { patient_id: patientId, test_type: "recovery_progress" },
        orderBy: { test_date: "desc" },
      }),
      prisma.therapy_sessions.findFirst({
        where: {
          status: "COMPLETED",
          therapy_plans: { patient_id: patientId },
          OR: [{ outcome: { not: null } }, { progress_notes: { not: null } }],
        },
        orderBy: { session_date: "desc" },
        include: {
          therapy_plans: { include: { doctors: { include: { users: true } } } },
        },
      }),
      prisma.screening_tests.findMany({
        where: {
          patient_id: patientId,
          risk_level: { in: ["HIGH", "MEDIUM"] },
        },
        orderBy: { test_date: "desc" },
        take: 5,
      }),
      prisma.recommendation_log.findMany({
        where: {
          patient_id: patientId,
          score: { gte: 60 },
        },
        orderBy: { score: "desc" },
        take: 5,
        include: { doctors: { include: { users: true } } },
      }),
      prisma.therapy_sessions.findFirst({
        where: {
          status: "SCHEDULED",
          session_date: { gte: today },
          therapy_plans: { patient_id: patientId },
        },
        orderBy: { session_date: "asc" },
        include: {
          therapy_plans: { include: { doctors: { include: { users: true } } } },
        },
      }),
      prisma.appointments.findFirst({
        where: {
          patient_id: patientId,
          appointment_date: { gte: today },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
        },
        orderBy: [{ appointment_date: "asc" }, { appointment_time: "asc" }],
        include: { doctors: { include: { users: true } } },
      }),
      prisma.screening_tests.findMany({
        where: {
          patient_id: patientId,
          test_date: { gte: today },
          NOT: { test_type: { in: RECOVERY_METRIC_TYPES } },
        },
        orderBy: { test_date: "asc" },
        take: 5,
      }),
      prisma.appointments.findMany({
        where: {
          patient_id: patientId,
          appointment_date: { gte: today },
          status: { notIn: ["CANCELLED", "COMPLETED"] },
          OR: [
            { reason: { contains: "assessment" } },
            { reason: { contains: "screening" } },
            { reason: { contains: "evaluation" } },
          ],
        },
        orderBy: [{ appointment_date: "asc" }, { appointment_time: "asc" }],
        take: 5,
        include: { doctors: { include: { users: true } } },
      }),
      prisma.therapy_sessions.count({
        where: {
          status: "SCHEDULED",
          session_date: { lt: today },
          therapy_plans: { patient_id: patientId },
        },
      }),
      prisma.appointments.count({
        where: {
          patient_id: patientId,
          status: { in: ACTIVE_REMINDER_STATUSES },
          appointment_date: { lt: today },
        },
      }),
      prisma.appointments.count({
        where: {
          patient_id: patientId,
          status: "CANCELLED",
          appointment_date: { gte: lookback },
        },
      }),
      prisma.therapy_sessions.count({
        where: {
          status: "CANCELLED",
          session_date: { gte: lookback },
          therapy_plans: { patient_id: patientId },
        },
      }),
      prisma.appointments.count({
        where: {
          patient_id: patientId,
          status: { not: "CANCELLED" },
        },
      }),
      prisma.appointments.count({
        where: {
          patient_id: patientId,
          status: "COMPLETED",
        },
      }),
      prisma.screening_tests.findMany({
        where: { patient_id: patientId, test_type: "recovery_progress" },
        orderBy: { test_date: "desc" },
        take: 3,
      }),
      prisma.therapy_plans.findFirst({
        where: { patient_id: patientId, status: "ACTIVE" },
        orderBy: { start_date: "desc" },
        include: THERAPY_PLAN_INCLUDE,
      }),
    ]);

    const assignedDoctor = mapPatient(patient).assignedDoctorName;

    const attendancePct =
      totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : null;

    const riskAlerts = buildRiskAlerts({
      missedTherapySessions,
      missedAppointments,
      cancelledAppointments,
      cancelledTherapySessions,
      attendancePct,
      totalAttendanceEligible: totalAppointments,
      recoveryScores: recoveryScoresHistory,
    });

    const treatmentGoals = buildTreatmentGoals(activeTherapyPlan);

    const doctorNoteFromAppt = latestDoctorAppt?.notes?.trim()
      ? {
          date: toDateStr(latestDoctorAppt.appointment_date),
          author: latestDoctorAppt.doctors?.users?.name ?? assignedDoctor ?? "Doctor",
          summary: latestDoctorAppt.notes.trim(),
        }
      : null;

    const doctorNoteFromHistory = latestMedicalNote?.history?.trim()
      ? {
          date: null,
          author: assignedDoctor ?? "Doctor",
          summary: latestMedicalNote.history.trim(),
        }
      : null;

    const latestDoctorNote = doctorNoteFromAppt ?? doctorNoteFromHistory;

    const latestTherapistFeedback = latestTherapistSession?.progress_notes?.trim()
      ? {
          date: toDateStr(latestTherapistSession.session_date),
          author:
            latestTherapistSession.therapy_plans?.doctors?.users?.name ??
            "Therapist",
          summary: latestTherapistSession.progress_notes.trim(),
          sessionId: latestTherapistSession.id,
        }
      : null;

    let progressRemarks = null;
    if (latestRecoveryTest) {
      progressRemarks = {
        date: toDateStr(latestRecoveryTest.test_date),
        summary: `Recovery score recorded at ${toScore(latestRecoveryTest.score)}% based on your latest clinical assessment.`,
        source: "recovery_assessment",
      };
    } else if (latestCompletedSession?.outcome?.trim()) {
      progressRemarks = {
        date: toDateStr(latestCompletedSession.session_date),
        summary: latestCompletedSession.outcome.trim(),
        source: "therapy_session",
      };
    } else if (latestCompletedSession?.progress_notes?.trim()) {
      const note = latestCompletedSession.progress_notes.trim();
      progressRemarks = {
        date: toDateStr(latestCompletedSession.session_date),
        summary: note.length > 160 ? `${note.slice(0, 157)}…` : note,
        source: "therapy_session",
      };
    }

    const warnings = [];

    highRiskScreenings.forEach((t) => {
      const level = t.risk_level ?? "MEDIUM";
      warnings.push({
        id: `screening-${t.id}`,
        date: toDateStr(t.test_date),
        title: `${t.test_type ?? "Screening"} — ${level} risk`,
        message:
          level === "HIGH"
            ? "Your care team recommends prompt follow-up based on this screening result."
            : "Please discuss this screening result with your care team at your next visit.",
        severity: level === "HIGH" ? "high" : "medium",
      });
    });

    highSeverityRecs.forEach((r) => {
      const isHigh = (r.score ?? 0) >= 80;
      warnings.push({
        id: `rec-${r.id}`,
        date: r.created_at ? toDateStr(r.created_at) : null,
        title: "Doctor recommendation",
        message: r.reason || "Your care team has a specialist recommendation for you.",
        severity: isHigh ? "high" : "medium",
      });
    });

    const assessmentItems = [
      ...upcomingAssessments.map((t) => ({
        id: t.id,
        testType: t.test_type ?? "Assessment",
        testDate: toDateStr(t.test_date),
        riskLevel: t.risk_level ?? null,
        reminderBadge: computeReminderBadge(t.test_date),
        source: "screening",
      })),
      ...upcomingAssessmentAppts.map((a) => ({
        id: `appt-${a.id}`,
        testType: a.reason?.trim() || "Clinical assessment",
        testDate: toDateStr(a.appointment_date),
        riskLevel: null,
        reminderBadge: computeReminderBadge(a.appointment_date),
        source: "appointment",
        doctorName: a.doctors?.users?.name ?? null,
        startTime: formatAppointmentTime(a.appointment_time),
      })),
    ].sort((a, b) => String(a.testDate).localeCompare(String(b.testDate)));

    return res.json({
      clinicalNotes: {
        latestDoctorNote,
        latestTherapistFeedback,
        progressRemarks,
        warnings,
      },
      upcomingSchedule: {
        nextTherapySession: nextTherapySession
          ? {
              id: nextTherapySession.id,
              date: toDateStr(nextTherapySession.session_date),
              therapyType: nextTherapySession.therapy_plans?.therapy_type ?? "Therapy session",
              therapistName:
                nextTherapySession.therapy_plans?.doctors?.users?.name ?? null,
              status: nextTherapySession.status ?? "SCHEDULED",
              duration: nextTherapySession.duration ?? null,
              reminderBadge: computeReminderBadge(nextTherapySession.session_date),
            }
          : null,
        nextDoctorAppointment: nextDoctorAppointment
          ? {
              id: nextDoctorAppointment.id,
              date: toDateStr(nextDoctorAppointment.appointment_date),
              startTime: formatAppointmentTime(nextDoctorAppointment.appointment_time),
              doctorName: nextDoctorAppointment.doctors?.users?.name ?? null,
              doctorSpecialization:
                nextDoctorAppointment.doctors?.specialization ?? null,
              mode: nextDoctorAppointment.type === "ONLINE" ? "online" : "in-person",
              reason: nextDoctorAppointment.reason ?? null,
              status: APPT_STATUS_TO_FRONTEND[nextDoctorAppointment.status] ?? "scheduled",
              reminderBadge: computeReminderBadge(nextDoctorAppointment.appointment_date),
            }
          : null,
        upcomingAssessments: assessmentItems,
      },
      riskAlerts,
      treatmentGoals,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /patients ───────────────────────────────────────────────────────────
async function create(req, res) {
  try {
    const {
      name, email, gender, nationality, condition,
      phone, address, dateOfBirth, admissionDate,
      emergencyContactName, emergencyContactPhone, status,
    } = req.body ?? {};

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.users.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ success: false, message: "A patient with this email already exists." });
    }

    const patient = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          password: "",
          role: "PATIENT",
        },
      });

      if (phone) {
        await tx.user_phones.create({
          data: { user_id: user.id, phone: String(phone).trim() },
        });
      }

      const p = await tx.patients.create({
        data: {
          users: { connect: { id: user.id } },
          gender: gender ?? null,
          nationality: nationality ?? null,
          condition: condition ?? null,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          emergency_contact_name: emergencyContactName ?? null,
          emergency_contact_phone: emergencyContactPhone ?? null,
          status: status ?? "active",
        },
        include: PATIENT_INCLUDE,
      });

      if (address) {
        await tx.patient_addresses.create({
          data: { patient_id: p.id, address: String(address).trim() },
        });
      }

      if (admissionDate) {
        await tx.patient_admissions.create({
          data: {
            patient_id: p.id,
            admission_date: new Date(admissionDate),
            condition: condition ?? null,
          },
        });
      }

      return await tx.patients.findUnique({ where: { id: p.id }, include: PATIENT_INCLUDE });
    });

    return res.status(201).json(mapPatient(patient));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "A patient with this email already exists." });
    }
    return res.status(400).json({ success: false, message: e.message });
  }
}

// ─── PUT /patients/:id ────────────────────────────────────────────────────────
async function updatePut(req, res) {
  try {
    const {
      name, email, gender, nationality, condition,
      phone, address, dateOfBirth, admissionDate,
      emergencyContactName, emergencyContactPhone, status,
    } = req.body ?? {};

    const patientId = parseId(req.params.id);

    const patient = await prisma.$transaction(async (tx) => {
      const existing = await tx.patients.findUnique({ where: { id: patientId } });
      if (!existing) throw new Error("Patient not found");

      if (name || email) {
        const updateData = {};
        if (name) updateData.name = String(name).trim();
        if (email) updateData.email = String(email).trim().toLowerCase();
        await tx.users.update({ where: { id: existing.user_id }, data: updateData });
      }

      if (phone) {
        const existingPhone = await tx.user_phones.findFirst({ where: { user_id: existing.user_id } });
        if (existingPhone) {
          await tx.user_phones.update({ where: { id: existingPhone.id }, data: { phone: String(phone).trim() } });
        } else {
          await tx.user_phones.create({ data: { user_id: existing.user_id, phone: String(phone).trim() } });
        }
      }

      if (address) {
        const existingAddr = await tx.patient_addresses.findFirst({ where: { patient_id: patientId } });
        if (existingAddr) {
          await tx.patient_addresses.update({ where: { id: existingAddr.id }, data: { address: String(address).trim() } });
        } else {
          await tx.patient_addresses.create({ data: { patient_id: patientId, address: String(address).trim() } });
        }
      }

      if (admissionDate) {
        const existingAdmission = await tx.patient_admissions.findFirst({ where: { patient_id: patientId } });
        if (existingAdmission) {
          await tx.patient_admissions.update({
            where: { id: existingAdmission.id },
            data: { admission_date: new Date(admissionDate) },
          });
        } else {
          await tx.patient_admissions.create({
            data: { patient_id: patientId, admission_date: new Date(admissionDate), condition: condition ?? null },
          });
        }
      }

      return await tx.patients.update({
        where: { id: patientId },
        data: {
          gender: gender ?? null,
          nationality: nationality ?? null,
          condition: condition ?? null,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
          emergency_contact_name: emergencyContactName ?? null,
          emergency_contact_phone: emergencyContactPhone ?? null,
          status: status ?? null,
        },
        include: PATIENT_INCLUDE,
      });
    });

    return res.json(mapPatient(patient));
  } catch (e) {
    if (e.message === "Patient not found" || e.code === "P2025") {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── PATCH /patients/:id ──────────────────────────────────────────────────────
async function updatePatch(req, res) {
  try {
    const {
      name, email, gender, nationality, condition,
      phone, address, dateOfBirth, admissionDate,
      emergencyContactName, emergencyContactPhone, status,
    } = req.body ?? {};

    const patientId = parseId(req.params.id);

    const patient = await prisma.$transaction(async (tx) => {
      const existing = await tx.patients.findUnique({ where: { id: patientId } });
      if (!existing) throw new Error("Patient not found");

      if (name || email) {
        const updateData = {};
        if (name) updateData.name = String(name).trim();
        if (email) updateData.email = String(email).trim().toLowerCase();
        await tx.users.update({ where: { id: existing.user_id }, data: updateData });
      }

      if (phone) {
        const existingPhone = await tx.user_phones.findFirst({ where: { user_id: existing.user_id } });
        if (existingPhone) {
          await tx.user_phones.update({ where: { id: existingPhone.id }, data: { phone: String(phone).trim() } });
        } else {
          await tx.user_phones.create({ data: { user_id: existing.user_id, phone: String(phone).trim() } });
        }
      }

      if (address) {
        const existingAddr = await tx.patient_addresses.findFirst({ where: { patient_id: patientId } });
        if (existingAddr) {
          await tx.patient_addresses.update({ where: { id: existingAddr.id }, data: { address: String(address).trim() } });
        } else {
          await tx.patient_addresses.create({ data: { patient_id: patientId, address: String(address).trim() } });
        }
      }

      if (admissionDate) {
        const existingAdmission = await tx.patient_admissions.findFirst({ where: { patient_id: patientId } });
        if (existingAdmission) {
          await tx.patient_admissions.update({
            where: { id: existingAdmission.id },
            data: { admission_date: new Date(admissionDate) },
          });
        } else {
          await tx.patient_admissions.create({
            data: { patient_id: patientId, admission_date: new Date(admissionDate), condition: condition ?? null },
          });
        }
      }

      return await tx.patients.update({
        where: { id: patientId },
        data: {
          gender: gender ?? undefined,
          nationality: nationality ?? undefined,
          condition: condition ?? undefined,
          date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          emergency_contact_name: emergencyContactName ?? undefined,
          emergency_contact_phone: emergencyContactPhone ?? undefined,
          status: status ?? undefined,
        },
        include: PATIENT_INCLUDE,
      });
    });

    return res.json(mapPatient(patient));
  } catch (e) {
    if (e.message === "Patient not found" || e.code === "P2025") {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email already exists." });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── DELETE /patients/:id ─────────────────────────────────────────────────────
async function remove(req, res) {
  try {
    const patientId = parseId(req.params.id);
    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      include: { users: true },
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const snapshot = {
      patientId: patient.id,
      patientName: patient.users?.name ?? null,
      email: patient.users?.email ?? null,
    };

    await prisma.$transaction(async (tx) => {
      const planIds = (
        await tx.therapy_plans.findMany({ where: { patient_id: patientId }, select: { id: true } })
      ).map((row) => row.id);
      if (planIds.length) {
        await tx.therapy_sessions.deleteMany({ where: { therapy_plan_id: { in: planIds } } });
        await tx.therapy_exercises.deleteMany({ where: { therapy_plan_id: { in: planIds } } });
      }
      await tx.therapy_plans.deleteMany({ where: { patient_id: patientId } });

      const apptIds = (
        await tx.appointments.findMany({ where: { patient_id: patientId }, select: { id: true } })
      ).map((row) => row.id);
      if (apptIds.length) {
        await tx.telehealth_sessions.deleteMany({ where: { appointment_id: { in: apptIds } } });
      }
      await tx.appointments.deleteMany({ where: { patient_id: patientId } });

      await tx.doctor_match_notes.deleteMany({ where: { patient_id: patientId } });
      await tx.family_members.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_services.deleteMany({ where: { patient_id: patientId } });
      await tx.doctor_patient.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_addresses.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_admissions.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_medical_history.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_phones.deleteMany({ where: { patient_id: patientId } });
      await tx.patient_documents.deleteMany({ where: { patient_id: patientId } });
      await tx.feedback.deleteMany({ where: { patient_id: patientId } });
      await tx.doctor_recommendations.deleteMany({ where: { patient_id: patientId } });
      await tx.recommendation_log.deleteMany({ where: { patient_id: patientId } });
      await tx.ai_analysis.deleteMany({ where: { patient_id: patientId } });
      await tx.reports.deleteMany({ where: { patient_id: patientId } });

      const screeningIds = (
        await tx.screening_tests.findMany({ where: { patient_id: patientId }, select: { id: true } })
      ).map((row) => row.id);
      if (screeningIds.length) {
        await tx.screening_answers.deleteMany({ where: { screening_id: { in: screeningIds } } });
      }
      await tx.screening_tests.deleteMany({ where: { patient_id: patientId } });

      await tx.medication_dose_logs.deleteMany({ where: { patient_id: patientId } });
      await tx.prescriptions.deleteMany({ where: { patient_id: patientId } });

      const threadIds = (
        await tx.message_threads.findMany({ where: { patient_id: patientId }, select: { id: true } })
      ).map((row) => row.id);
      if (threadIds.length) {
        await tx.messages.deleteMany({ where: { thread_id: { in: threadIds } } });
        await tx.message_threads.deleteMany({ where: { id: { in: threadIds } } });
      }

      await tx.patients.delete({ where: { id: patientId } });

      if (patient.user_id) {
        const userId = patient.user_id;
        await tx.notifications.deleteMany({ where: { user_id: userId } });
        await tx.messages.deleteMany({ where: { sender_user_id: userId } });
        await tx.family_members.deleteMany({ where: { user_id: userId } });
        await tx.users.delete({ where: { id: userId } });
      }
    });

    purgePatientDocumentFiles(patientId);

    await recordAudit({
      action: "DELETE",
      entityType: "patient",
      entityId: patientId,
      patientId,
      actor: req.user,
      summary: `Patient profile and associated records securely deleted: ${snapshot.patientName ?? patientId}`,
      metadata: snapshot,
    });

    return res.status(200).json({ success: true, message: "Patient deleted successfully." });
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── PATCH /patients/:id/assign-doctor ───────────────────────────────────────
async function assignDoctor(req, res) {
  try {
    const docId = req.body?.doctorId ?? req.body?.doctor_id;
    if (!docId) return res.status(400).json({ success: false, message: "doctorId is required" });

    const patientId = parseId(req.params.id);
    const doctorId = parseId(docId);

    try {
      await assertApprovedActiveDoctor(prisma, doctorId, { assignment: true });
    } catch (e) {
      return res.status(e.status ?? 400).json({ success: false, message: e.message });
    }

    const previous = await prisma.doctor_patient.findFirst({
      where: { patient_id: patientId },
      select: { doctor_id: true },
    });
    const previousDoctorId = previous?.doctor_id ?? null;

    await prisma.doctor_patient.deleteMany({ where: { patient_id: patientId } });
    await prisma.doctor_patient.create({ data: { doctor_id: doctorId, patient_id: patientId } });

    const p = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    if (!p) return res.status(404).json({ success: false, message: "Patient not found" });

    if (String(previousDoctorId) !== String(doctorId)) {
      await notifyDoctorPatientAssignment({
        doctorId,
        patientId,
        event: previousDoctorId ? "updated" : "assigned",
      });
    }

    await recordAudit({
      action: "UPDATE",
      entityType: "patient_assignment",
      entityId: patientId,
      patientId,
      actor: req.user,
      summary: `Assigned doctor updated for patient ${p.users?.name ?? patientId}`,
      metadata: { doctorId },
    });

    return res.json(mapPatient(p));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── POST /patients/:id/medical-records ──────────────────────────────────────
async function addMedicalRecord(req, res) {
  try {
    assertDoctorClinicalWrite(req);
    const patientId = parseId(req.params.id);
    const { type, title, details } = req.body ?? {};
    if (!title) return res.status(400).json({ success: false, message: "Title is required." });

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const record = await prisma.patient_medical_history.create({
      data: {
        patient_id: patientId,
        history: `[${type ?? "note"}] ${title}${details ? `: ${details}` : ""}`,
      },
    });

    await recordAudit({
      action: "CREATE",
      entityType: "medical_record",
      entityId: String(record.id),
      patientId,
      actor: req.user,
      summary: `Medical record added: ${title}`,
      metadata: { type: type ?? "note", title, details: details ?? null },
    });

    const updated = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    return res.status(201).json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function updateMedicalRecord(req, res) {
  try {
    assertDoctorClinicalWrite(req);
    const patientId = parseId(req.params.id);
    const recordId = Number(req.params.recordId);
    if (!Number.isFinite(recordId)) {
      return res.status(400).json({ success: false, message: "Invalid record id." });
    }

    const { type, title, details } = req.body ?? {};
    if (!title) return res.status(400).json({ success: false, message: "Title is required." });

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const existing = await prisma.patient_medical_history.findFirst({
      where: { id: recordId, patient_id: patientId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Medical record not found." });
    }
    if (String(existing.history ?? "").startsWith("[CONFIDENTIAL]")) {
      return res.status(400).json({ success: false, message: "Confidential notes cannot be edited here." });
    }

    await prisma.patient_medical_history.update({
      where: { id: recordId },
      data: {
        history: `[${type ?? "note"}] ${title}${details ? `: ${details}` : ""}`,
      },
    });

    await recordAudit({
      action: "UPDATE",
      entityType: "medical_record",
      entityId: String(recordId),
      patientId,
      actor: req.user,
      summary: `Medical record updated: ${title}`,
      metadata: { type: type ?? "note", title, details: details ?? null },
    });

    const updated = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    return res.json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// PATCH /patients/:id/diagnosis — SRS-44: doctors update patient diagnosis
async function updateDiagnosis(req, res) {
  try {
    assertDoctorClinicalWrite(req);
    const patientId = parseId(req.params.id);
    const diagnosis = req.body?.diagnosis ?? req.body?.primaryDiagnosis ?? req.body?.condition;
    if (diagnosis === undefined) {
      return res.status(400).json({ success: false, message: "diagnosis is required." });
    }

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const before = await prisma.patients.findUnique({
      where: { id: patientId },
      select: { condition: true },
    });
    if (!before) return res.status(404).json({ success: false, message: "Patient not found" });

    const nextValue = diagnosis ? String(diagnosis).trim() : null;
    const updated = await prisma.patients.update({
      where: { id: patientId },
      data: { condition: nextValue },
      include: PATIENT_INCLUDE,
    });

    await recordAudit({
      action: "UPDATE",
      entityType: "diagnosis",
      entityId: patientId,
      patientId,
      actor: req.user,
      summary: `Diagnosis updated to "${nextValue ?? "—"}"`,
      metadata: { previous: before.condition, current: nextValue },
    });

    return res.json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// GET /patients/:id/audit-log — SRS-43, SRS-48
async function getAuditLog(req, res) {
  try {
    const patientId = parseId(req.params.id);
    await assertClinicalRecordAccess(prisma, req, patientId, { write: false });

    const limit = Number(req.query.limit) || 50;
    const items = await listPatientAuditLogs(patientId, limit);
    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// ─── POST /patients/:id/therapy-sessions ─────────────────────────────────────
// DEPRECATED: Prefer POST /therapy-plans/:planId/sessions or telehealth notes sync.
// Still used by legacy PatientProfile "Add session" dialog — do not remove without migrating that UI.
async function addTherapySession(req, res) {
  console.warn(
    "[DEPRECATED] POST /patients/:id/therapy-sessions — use POST /therapy-plans/:planId/sessions instead",
  );
  try {
    assertDoctorClinicalWrite(req);
    const patientId = parseId(req.params.id);
    const { type, date, notes, therapistName, status, behavior, progress, mood, attendance } = req.body ?? {};

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const doctor = await resolveDoctorForUser(req.user.id);
    const activePlans = await findActiveTherapyPlansForPatient(patientId, doctor?.id);

    if (activePlans.length === 0) {
      return res.status(422).json({
        success: false,
        message: "No active therapy plan found for this patient. Create a therapy plan first.",
      });
    }
    if (activePlans.length > 1) {
      return res.status(422).json({
        success: false,
        message:
          "Multiple active therapy plans found for this patient. Use the Therapy Plan page to record sessions.",
      });
    }

    const plan = activePlans[0];

    const statusMap = {
      scheduled: "SCHEDULED",
      completed: "COMPLETED",
      cancelled: "CANCELLED",
      missed: "MISSED",
    };
    const normalizedStatus = String(status ?? "completed").toLowerCase();

    const outcomeParts = [behavior, progress].filter(Boolean);
    const writeData = buildSessionWriteData({
      notes,
      mood,
      attendance,
      outcome: outcomeParts.length ? outcomeParts.join(" · ") : undefined,
      chief_complaint: type ? String(type).trim() : undefined,
      status: statusMap[normalizedStatus] ?? "COMPLETED",
    });
    delete writeData.session_date;

    const sessionDate = date ? new Date(date) : new Date();
    if (Number.isNaN(sessionDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid session date." });
    }

    const session = await persistTherapySessionRow({
      planId: plan.id,
      sessionDate,
      cleanData: writeData,
    });

    await recordAudit({
      action: "CREATE",
      entityType: "therapy_session",
      entityId: session.id,
      patientId,
      actor: req.user,
      summary: `Therapy session recorded: ${type ?? "General"}`,
      metadata: { type, date, notes, therapistName, status: normalizedStatus },
    });

    const updated = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    return res.status(201).json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// ─── POST /patients/:id/recovery-points ──────────────────────────────────────
async function addRecoveryPoint(req, res) {
  try {
    assertDoctorClinicalWrite(req);
    const patientId = parseId(req.params.id);
    const { score } = req.body ?? {};

    if (score === undefined || score === null) {
      return res.status(400).json({ success: false, message: "Score is required." });
    }

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const clamped = Math.max(0, Math.min(100, Math.round(Number(score))));

    const point = await prisma.screening_tests.create({
      data: {
        patient_id: patientId,
        test_type: "recovery_progress",
        score: clamped,
        risk_level: clamped >= 70 ? "LOW" : clamped >= 40 ? "MEDIUM" : "HIGH",
        test_date: new Date(),
      },
    });

    await recordAudit({
      action: "CREATE",
      entityType: "recovery_point",
      entityId: point.id,
      patientId,
      actor: req.user,
      summary: `Recovery progress updated to ${clamped}%`,
      metadata: { score: clamped },
    });

    const updated = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    return res.status(201).json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// ─── POST /patients/:id/confidential-notes ───────────────────────────────────
async function addConfidentialNote(req, res) {
  try {
    assertDoctorClinicalWrite(req);

    const patientId = parseId(req.params.id);
    const { body } = req.body ?? {};
    if (!body) return res.status(400).json({ success: false, message: "Note body is required." });

    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const note = await prisma.patient_medical_history.create({
      data: { patient_id: patientId, history: `[CONFIDENTIAL] ${body}` },
    });

    await recordAudit({
      action: "CREATE",
      entityType: "confidential_note",
      entityId: String(note.id),
      patientId,
      actor: req.user,
      summary: "Confidential clinical note added",
      metadata: { length: String(body).length },
    });

    const updated = await prisma.patients.findUnique({ where: { id: patientId }, include: PATIENT_INCLUDE });
    return res.status(201).json(mapPatient(updated));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

const VALID_DOC_CATEGORIES = new Set([
  "therapy_assessment",
  "medical_report",
  "prescription",
  "lab_result",
]);

const inferDocumentCategory = (text) => {
  const s = String(text ?? "").toLowerCase();
  if (/prescription|\brx\b|medication refill|meds\b/i.test(s)) return "prescription";
  if (/lab|blood|urine|pathology|cbc|metabolic|lipid/i.test(s)) return "lab_result";
  if (/assessment|screening|audit|phq|evaluation|neurological|therapy/i.test(s)) {
    return "therapy_assessment";
  }
  if (/report|summary|discharge|progress/i.test(s)) return "medical_report";
  return "medical_report";
};

const fileTypeLabel = (name, mimeType) => {
  if (mimeType) {
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("png")) return "PNG";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPG";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Excel";
    if (mimeType.includes("word")) return "DOC";
    if (mimeType.includes("json")) return "JSON";
  }
  const ext = path.extname(String(name)).replace(".", "").toUpperCase();
  return ext || "FILE";
};

const uploadsDirForPatient = (patientId) =>
  path.join(__dirname, "..", "..", "uploads", "documents", String(patientId));

function mapDbDocumentItem(d) {
  return {
    id: d.id,
    source: "file",
    category: VALID_DOC_CATEGORIES.has(d.category) ? d.category : inferDocumentCategory(d.title),
    title: d.title,
    fileType: fileTypeLabel(d.original_name, d.mime_type),
    uploadedAt: d.uploaded_at ? new Date(d.uploaded_at).toISOString() : null,
    mimeType: d.mime_type ?? null,
    fileName: d.file_name,
    fileSize: d.file_size ?? null,
  };
}

async function collectPatientDocuments(patientId) {
  const items = [];
  const uploadDir = uploadsDirForPatient(patientId);
  const patientKey = String(patientId);

  let dbDocs = [];
  try {
    dbDocs = await prisma.patient_documents.findMany({
      where: { patient_id: patientKey },
      orderBy: { uploaded_at: "desc" },
    });
  } catch {
    dbDocs = [];
  }

  let reports = [];
  let screenings = [];
  try {
    [reports, screenings] = await Promise.all([
      prisma.reports.findMany({
        where: { patient_id: patientKey },
        orderBy: { generated_date: "desc" },
      }),
      prisma.screening_tests.findMany({
        where: { patient_id: patientKey },
        orderBy: { test_date: "desc" },
      }),
    ]);
  } catch {
    reports = [];
    screenings = [];
  }

  reports.forEach((r) => {
    const title = r.report_type?.trim() || "Medical report";
    items.push({
      id: r.id,
      source: "report",
      category: inferDocumentCategory(title),
      title,
      fileType: "PDF",
      uploadedAt: r.generated_date ? new Date(r.generated_date).toISOString() : null,
      mimeType: "application/pdf",
    });
  });

  screenings.forEach((t) => {
    const title = t.test_type?.trim() || "Therapy assessment";
    items.push({
      id: t.id,
      source: "screening",
      category: inferDocumentCategory(title),
      title,
      fileType: "Assessment",
      uploadedAt: t.test_date ? new Date(`${toDateStr(t.test_date)}T12:00:00`).toISOString() : null,
      mimeType: "application/json",
    });
  });

  dbDocs.forEach((d) => {
    items.push(mapDbDocumentItem(d));
  });

  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const dbFileNames = new Set(dbDocs.map((d) => d.file_name));
      files.forEach((fileName) => {
        if (dbFileNames.has(fileName)) return;
        const fp = path.join(uploadDir, fileName);
        const stat = fs.statSync(fp);
        if (!stat.isFile()) return;
        const original = fileName.replace(/^\d+-/, "");
        items.push({
          id: encodeURIComponent(fileName),
          source: "file",
          category: inferDocumentCategory(original),
          title: original,
          fileType: fileTypeLabel(original),
          uploadedAt: stat.mtime.toISOString(),
          mimeType: null,
          fileName,
          fileSize: stat.size,
        });
      });
    }
  } catch {
    // non-fatal if uploads dir is unavailable
  }

  return items.sort((a, b) =>
    String(b.uploadedAt ?? "").localeCompare(String(a.uploadedAt ?? "")),
  );
}

async function resolveOwnedDocument(patientId, source, docId) {
  if (source === "report") {
    const row = await prisma.reports.findFirst({
      where: { id: parseId(docId), patient_id: patientId },
    });
    if (!row) return null;
    return { source, row, fileName: null };
  }

  if (source === "screening") {
    const row = await prisma.screening_tests.findFirst({
      where: { id: parseId(docId), patient_id: patientId },
    });
    if (!row) return null;
    return { source, row, fileName: null };
  }

  if (source === "file") {
    const decodedId = decodeURIComponent(String(docId));
    let row = null;
    try {
      row = await prisma.patient_documents.findFirst({
        where: { id: parseId(docId), patient_id: patientId },
      });
    } catch {
      row = null;
    }

    const fileName = row?.file_name ?? decodedId;
    const fp = path.join(uploadsDirForPatient(patientId), fileName);
    if (!fs.existsSync(fp)) return null;
    return { source, row, fileName, filePath: fp };
  }

  return null;
}

// GET /patients/me/documents
async function getMyDocuments(req, res) {
  try {
    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const items = await collectPatientDocuments(patient.id);
    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /patients/me/documents/:source/:docId
async function viewMyDocument(req, res) {
  try {
    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const doc = await resolveOwnedDocument(patient.id, req.params.source, req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (doc.source === "report") {
      return res.json({
        id: doc.row.id,
        title: doc.row.report_type ?? "Medical report",
        category: inferDocumentCategory(doc.row.report_type),
        generatedDate: doc.row.generated_date,
        content: doc.row.report_data ?? null,
      });
    }

    if (doc.source === "screening") {
      return res.json({
        id: doc.row.id,
        title: doc.row.test_type ?? "Assessment",
        category: inferDocumentCategory(doc.row.test_type),
        testDate: doc.row.test_date,
        score: doc.row.score != null ? Number(doc.row.score) : null,
        riskLevel: doc.row.risk_level ?? null,
      });
    }

    const mime = doc.row?.mime_type ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `inline; filename="${doc.fileName}"`);
    return res.sendFile(path.resolve(doc.filePath));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /patients/me/documents/:source/:docId/download
async function downloadMyDocument(req, res) {
  try {
    const patient = await resolvePatientForUser(req.user);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const doc = await resolveOwnedDocument(patient.id, req.params.source, req.params.docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (doc.source === "report") {
      let parsedContent = doc.row.report_data;
      if (typeof parsedContent === "string") {
        try {
          parsedContent = JSON.parse(parsedContent);
        } catch {
          parsedContent = { content: doc.row.report_data };
        }
      }

      const summaryRows = [
        { label: "Report ID", value: doc.row.id },
        { label: "Report Type", value: doc.row.report_type ?? "Clinical Report" },
        { label: "Generated", value: doc.row.generated_date ? new Date(doc.row.generated_date).toLocaleString() : "—" },
      ];

      const detailRows = [];
      if (parsedContent && typeof parsedContent === "object") {
        for (const [key, value] of Object.entries(parsedContent)) {
          if (value == null) continue;
          detailRows.push({
            label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            value: typeof value === "object" ? JSON.stringify(value, null, 2) : String(value),
          });
        }
      }

      const buffer = await buildPatientDocumentPdf({
        title: doc.row.report_type ?? "Clinical Report",
        subtitle: "Life Ways Rehabilitation Center — Patient Report",
        generatedDate: doc.row.generated_date,
        summaryRows,
        detailRows,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report-${doc.row.id}.pdf"`,
      );
      return res.send(buffer);
    }

    if (doc.source === "screening") {
      const recommendations = Array.isArray(doc.row.recommendations)
        ? doc.row.recommendations
        : doc.row.recommendations
          ? [String(doc.row.recommendations)]
          : [];

      const buffer = await buildPatientDocumentPdf({
        title: "Screening Assessment",
        subtitle: doc.row.test_type ?? "Health Screening Result",
        generatedDate: doc.row.test_date,
        summaryRows: [
          { label: "Assessment ID", value: doc.row.id },
          { label: "Assessment Type", value: doc.row.test_type ?? "—" },
          { label: "Test Date", value: doc.row.test_date ? new Date(doc.row.test_date).toLocaleDateString() : "—" },
          { label: "Score", value: doc.row.score != null ? String(Number(doc.row.score)) : "—" },
          { label: "Risk Level", value: doc.row.risk_level ?? "—" },
        ],
        detailRows: [
          ...(doc.row.explanation ? [{ label: "Explanation", value: doc.row.explanation }] : []),
          ...(recommendations.length
            ? [{ label: "Recommendations", value: recommendations.join("\n• ") }]
            : []),
        ],
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="assessment-${doc.row.id}.pdf"`,
      );
      return res.send(buffer);
    }

    const mime = doc.row?.mime_type ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    return res.sendFile(path.resolve(doc.filePath));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// ─── GET /patients/:id/documents ─────────────────────────────────────────────
async function documentsList(req, res) {
  try {
    const patientId = parseId(req.params.id);
    await assertClinicalRecordAccess(prisma, req, patientId, { write: false });

    const items = await collectPatientDocuments(patientId);
    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsServe(req, res) {
  try {
    const patientId = parseId(req.params.id);
    await assertClinicalRecordAccess(prisma, req, patientId, { write: false });

    const fn = String(req.params.filename ?? "");
    if (fn.includes("..") || fn.includes(path.sep)) return res.status(400).send("Bad filename");
    const fp = path.join(__dirname, "..", "..", "uploads", "documents", String(patientId), fn);
    if (!fs.existsSync(fp)) return res.status(404).send("File not found");
    return res.sendFile(path.resolve(fp));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsUpload(req, res) {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ success: false, message: "No file uploaded" });

    const patientId = parseId(req.params.id);
    await assertClinicalRecordAccess(prisma, req, patientId, { write: true });

    const categoryRaw = String(req.body?.category ?? "").toLowerCase();
    const category = VALID_DOC_CATEGORIES.has(categoryRaw)
      ? categoryRaw
      : inferDocumentCategory(req.body?.title ?? f.originalname);
    const title = String(req.body?.title ?? f.originalname ?? "Document").trim();

    const record = await prisma.patient_documents.create({
      data: {
        patient_id: String(patientId),
        category,
        title,
        file_name: f.filename,
        original_name: f.originalname,
        mime_type: f.mimetype ?? null,
        file_size: f.size ?? null,
      },
    });

    const item = mapDbDocumentItem(record);

    await recordAudit({
      action: "UPLOAD",
      entityType: "medical_document",
      entityId: record.id,
      patientId: String(patientId),
      actor: req.user,
      summary: `Medical document uploaded: ${title}`,
      metadata: {
        category,
        fileName: f.originalname,
        mimeType: f.mimetype,
        fileSize: f.size,
      },
    });

    return res.status(201).json({
      savedAs: f.filename,
      item,
      document: record,
    });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// ─── GET /patients/:id/report.pdf ────────────────────────────────────────────
async function reportPdf(req, res) {
  try {
    const patientId = parseId(req.params.id);
    await assertClinicalRecordAccess(prisma, req, patientId, { write: false });

    const p = await prisma.patients.findUnique({
      where: { id: patientId },
      include: PATIENT_INCLUDE,
    });
    if (!p) return res.status(404).json({ message: "Patient not found" });

    const m = mapPatient(p);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="patient-${m.id}-report.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(18).text("Life Ways Rehabilitation Center", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`Patient Report: ${m.fullName}`);
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`ID           : ${m.id}`)
      .text(`Email        : ${m.email || "—"}`)
      .text(`Phone        : ${m.phone || "—"}`)
      .text(`Gender       : ${m.gender || "—"}`)
      .text(`Condition    : ${m.condition || "—"}`)
      .text(`Nationality  : ${m.nationality || "—"}`)
      .text(`Assigned doc : ${m.assignedDoctorName ?? m.assignedDoctorId ?? "Unassigned"}`);
    doc.moveDown();
    doc.text("Medical history:");
    if (m.medicalHistory.length) {
      m.medicalHistory.forEach((h) => doc.text(`  • ${h.details}`));
    } else {
      doc.text("  No records.");
    }
    doc.end();
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// PATCH /patients/:id/toggle-active — admin suspend / reactivate login (SRS-26, SRS-28)
async function toggleAccountStatus(req, res) {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const patientId = parseId(req.params.id);
    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      include: { users: true },
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    if (!patient.user_id) {
      return res.status(400).json({ success: false, message: "Patient has no linked user account." });
    }
    if (patient.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot suspend your own account." });
    }

    const newStatus = patient.users?.is_active === false;
    await prisma.users.update({
      where: { id: patient.user_id },
      data: { is_active: newStatus },
    });

    return res.json({
      success: true,
      is_active: newStatus,
      message: newStatus ? "Patient account reactivated." : "Patient account suspended.",
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  list, getById, getMe, patchMe, uploadProfileImage, create, updatePut, updatePatch, remove,
  assignDoctor, addMedicalRecord, updateMedicalRecord, updateDiagnosis, getAuditLog, addTherapySession,
  addRecoveryPoint, addConfidentialNote,
  documentsList, documentsServe, documentsUpload, reportPdf,
  getDashboardSummary,
  getRecoverySummary,
  getMyDocuments,
  viewMyDocument,
  downloadMyDocument,
  toggleAccountStatus,
};