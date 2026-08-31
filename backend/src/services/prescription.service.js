"use strict";

const prisma = require("../lib/prisma");

const parseId = (raw) => (raw == null || raw === "" ? null : String(raw));

const toDateStr = (raw) => {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const toDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDays = (start, days) => {
  const d = new Date(start);
  d.setDate(d.getDate() + Number(days));
  return d;
};

async function resolveDoctorIdForUser(user) {
  if (!user?.id) return null;
  const doctor = await prisma.doctors.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  });
  return doctor?.id ?? null;
}

async function resolvePatientIdForUser(user) {
  if (!user?.id) return null;
  const role = String(user.role ?? "").toUpperCase();
  if (role === "FAMILY") {
    const link = await prisma.family_members.findFirst({
      where: { user_id: user.id },
      select: { patient_id: true },
    });
    return link?.patient_id ?? null;
  }
  const patient = await prisma.patients.findUnique({
    where: { user_id: user.id },
    select: { id: true },
  });
  return patient?.id ?? null;
}

async function doctorCanAccessPatient(doctorId, patientId) {
  const did = parseId(doctorId);
  const pid = parseId(patientId);
  if (!did || !pid) return false;

  const assigned = await prisma.doctor_patient.findUnique({
    where: { doctor_id_patient_id: { doctor_id: did, patient_id: pid } },
  });
  if (assigned) return true;

  const appt = await prisma.appointments.findFirst({
    where: { doctor_id: did, patient_id: pid },
    select: { id: true },
  });
  if (appt) return true;

  const plan = await prisma.therapy_plans.findFirst({
    where: { doctor_id: did, patient_id: pid },
    select: { id: true },
  });
  return Boolean(plan);
}

const PRESCRIPTION_INCLUDE = {
  doctors: { include: { users: { select: { id: true, name: true } } } },
  patients: { include: { users: { select: { id: true, name: true } } } },
  patient_documents: true,
  dose_logs: { orderBy: { taken_at: "desc" }, take: 30 },
};

function parseSchedule(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).toUpperCase()).filter((s) =>
      ["MORNING", "AFTERNOON", "NIGHT"].includes(s),
    );
  }
  return [];
}

function mapStatusToClient(status) {
  const s = String(status ?? "ACTIVE").toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "COMPLETED") return "Completed";
  if (s === "DISCONTINUED") return "Stopped";
  if (s === "ON_HOLD") return "On Hold";
  if (s === "INVALID") return "Invalid";
  return "Active";
}

function mapPrescription(p, options = {}) {
  const { includeDeleted = false, todayLogs = [] } = options;
  if (!p) return null;
  if (!includeDeleted && p.deleted_at) return null;

  const schedule = parseSchedule(p.schedule);
  const doctorName = p.doctors?.users?.name ?? "Doctor";
  const patientName = p.patients?.users?.name ?? "Patient";
  const doc = p.patient_documents;
  const patientId = p.patient_id;

  const documentUrl = doc?.file_name
    ? `/api/patients/${patientId}/documents/serve/${encodeURIComponent(doc.file_name)}`
    : null;

  const today = toDateStr(new Date());
  const takenToday = todayLogs.length
    ? todayLogs
    : (p.dose_logs ?? [])
        .filter((l) => toDateStr(l.log_date) === today)
        .map((l) => String(l.dose_period));

  return {
    id: p.id,
    patientId: p.patient_id,
    patientName,
    prescribedBy: p.prescribed_by,
    prescribedByName: doctorName,
    medicationName: p.medication_name,
    name: p.medication_name,
    dosage: p.dosage,
    frequency: p.frequency,
    durationDays: p.duration_days,
    duration: p.duration_days ? `${p.duration_days} Days` : "—",
    schedule,
    instructions: p.instructions ?? "",
    notes: p.notes ?? "",
    status: mapStatusToClient(p.is_invalid ? "INVALID" : p.status),
    rawStatus: p.is_invalid ? "INVALID" : p.status,
    startDate: toDateStr(p.start_date),
    endDate: toDateStr(p.end_date),
    documentId: p.document_id,
    documentTitle: doc?.title ?? doc?.original_name ?? null,
    documentUrl,
    isInvalid: p.is_invalid,
    deletedAt: p.deleted_at?.toISOString?.() ?? null,
    createdAt: p.created_at?.toISOString?.() ?? p.created_at,
    updatedAt: p.updated_at?.toISOString?.() ?? p.updated_at,
    takenToday,
  };
}

function buildWhereForUser(user, { patientId, includeDeleted = false, status } = {}) {
  const role = String(user.role ?? "").toUpperCase();
  const where = {};

  if (!includeDeleted) where.deleted_at = null;

  if (status) {
    const s = String(status).toUpperCase();
    if (s === "ACTIVE") where.status = "ACTIVE";
    else if (s === "HISTORY") {
      where.status = { in: ["COMPLETED", "DISCONTINUED", "ON_HOLD", "INVALID"] };
    } else where.status = s;
  }

  if (role === "ADMIN") {
    if (patientId) where.patient_id = parseId(patientId);
    return where;
  }

  if (role === "DOCTOR") {
    return { asyncApply: async () => {
      const doctorId = await resolveDoctorIdForUser(user);
      if (!doctorId) throw new Error("Doctor profile not found");
      where.prescribed_by = doctorId;
      if (patientId) where.patient_id = parseId(patientId);
      return where;
    }};
  }

  if (role === "PATIENT" || role === "FAMILY") {
    return { asyncApply: async () => {
      const pid = await resolvePatientIdForUser(user);
      if (!pid) throw new Error("Patient profile not found");
      where.patient_id = pid;
      where.is_invalid = false;
      return where;
    }};
  }

  throw new Error("Forbidden");
}

async function resolveWhere(user, opts) {
  const built = buildWhereForUser(user, opts);
  if (built.asyncApply) return built.asyncApply();
  return built;
}

async function listPrescriptions(user, opts = {}) {
  const where = await resolveWhere(user, opts);
  const rows = await prisma.prescriptions.findMany({
    where,
    include: PRESCRIPTION_INCLUDE,
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
  });
  return rows.map((r) => mapPrescription(r, { includeDeleted: opts.includeDeleted }));
}

async function getPrescriptionById(id, user, opts = {}) {
  const row = await prisma.prescriptions.findUnique({
    where: { id: parseId(id) },
    include: PRESCRIPTION_INCLUDE,
  });
  if (!row) return null;
  if (!opts.includeDeleted && row.deleted_at) return null;

  const role = String(user.role ?? "").toUpperCase();
  if (role === "ADMIN") return mapPrescription(row, opts);

  if (role === "DOCTOR") {
    const doctorId = await resolveDoctorIdForUser(user);
    if (!doctorId || String(row.prescribed_by) !== String(doctorId)) {
      const allowed = await doctorCanAccessPatient(doctorId, row.patient_id);
      if (!allowed) return null;
    }
    return mapPrescription(row, opts);
  }

  if (role === "PATIENT" || role === "FAMILY") {
    const pid = await resolvePatientIdForUser(user);
    if (!pid || String(row.patient_id) !== String(pid)) return null;
    if (row.is_invalid) return null;
    return mapPrescription(row, opts);
  }

  return null;
}

async function computeEndDate(startDate, durationDays, endDateRaw) {
  if (endDateRaw) return toDate(endDateRaw);
  if (durationDays && startDate) return addDays(startDate, durationDays);
  return null;
}

module.exports = {
  parseId,
  toDateStr,
  toDate,
  resolveDoctorIdForUser,
  resolvePatientIdForUser,
  doctorCanAccessPatient,
  parseSchedule,
  mapPrescription,
  listPrescriptions,
  getPrescriptionById,
  computeEndDate,
  PRESCRIPTION_INCLUDE,
};
