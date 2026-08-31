"use strict";

const prisma = require("../lib/prisma");
const { recordAudit } = require("../services/auditLog.service");
const { deliverNotification } = require("../services/notification.service");
const {
  parseId,
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
} = require("../services/prescription.service");

function parseDurationDays(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function mapCreateError(e) {
  const code = e?.code;
  if (code === "P2003") {
    return { status: 400, message: "Invalid patient or doctor reference." };
  }
  if (code === "P2025") {
    return { status: 404, message: "Related record not found." };
  }
  return { status: 500, message: e?.message || "Failed to create prescription" };
}

async function list(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    const patientId = req.query?.patientId ?? req.query?.patient_id;
    const status = req.query?.status;
    const includeDeleted =
      role === "ADMIN" &&
      (req.query?.includeDeleted === "1" ||
        req.query?.includeDeleted === "true" ||
        req.query?.includeDeleted === true);

    const items = await listPrescriptions(req.user, { patientId, status, includeDeleted });
    return res.json({ items, total: items.length });
  } catch (e) {
    const code = e.message === "Forbidden" ? 403 : 500;
    return res.status(code).json({ message: e.message });
  }
}

async function getOne(req, res) {
  try {
    const includeDeleted = String(req.user.role ?? "").toUpperCase() === "ADMIN";
    const item = await getPrescriptionById(req.params.id, req.user, { includeDeleted });
    if (!item) return res.status(404).json({ message: "Prescription not found" });
    return res.json({ data: item });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    if (role !== "DOCTOR" && role !== "ADMIN") {
      return res.status(403).json({ message: "Only doctors can prescribe medication" });
    }

    const patientId = parseId(req.body?.patientId ?? req.body?.patient_id);
    const medicationName = String(req.body?.medicationName ?? req.body?.medication_name ?? "").trim();
    const dosage = String(req.body?.dosage ?? "").trim();
    const frequency = String(req.body?.frequency ?? "").trim();
    const durationDays = parseDurationDays(req.body?.durationDays ?? req.body?.duration_days);
    const schedule = parseSchedule(req.body?.schedule);
    const instructions = String(req.body?.instructions ?? "").trim() || null;
    const notes = String(req.body?.notes ?? "").trim() || null;
    const startDateRaw = req.body?.startDate ?? req.body?.start_date ?? new Date();
    const endDateRaw = req.body?.endDate ?? req.body?.end_date;
    const documentId = parseId(req.body?.documentId ?? req.body?.document_id);

    if (!patientId) return res.status(400).json({ message: "patientId is required" });
    if (!medicationName) return res.status(400).json({ message: "medicationName is required" });
    if (!dosage) return res.status(400).json({ message: "dosage is required" });
    if (!frequency) return res.status(400).json({ message: "frequency is required" });

    let doctorId = parseId(req.body?.prescribedBy ?? req.body?.prescribed_by);
    if (role === "DOCTOR") {
      doctorId = await resolveDoctorIdForUser(req.user);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found" });
    }
    if (!doctorId) return res.status(400).json({ message: "prescribedBy is required" });

    const allowed = await doctorCanAccessPatient(doctorId, patientId);
    if (!allowed && role !== "ADMIN") {
      return res.status(403).json({ message: "Doctor is not linked to this patient" });
    }

    const startDate = toDate(startDateRaw) ?? new Date();
    const endDate = await computeEndDate(startDate, durationDays, endDateRaw);

    const createData = {
      patient_id: patientId,
      prescribed_by: doctorId,
      medication_name: medicationName,
      dosage,
      frequency,
      duration_days: durationDays,
      instructions,
      notes,
      status: "ACTIVE",
      start_date: startDate,
      end_date: endDate,
    };
    if (schedule.length) createData.schedule = schedule;
    if (documentId) createData.document_id = documentId;

    const created = await prisma.prescriptions.create({
      data: createData,
      include: PRESCRIPTION_INCLUDE,
    });

    const mapped = mapPrescription(created);

    try {
      await recordAudit({
        action: "CREATE",
        entityType: "prescription",
        entityId: created.id,
        patientId,
        actor: req.user,
        summary: `Prescribed ${medicationName} for patient`,
        metadata: { dosage, frequency },
      });
    } catch (auditErr) {
      console.warn("[prescription] Audit log failed:", auditErr.message);
    }

    try {
      const patient = await prisma.patients.findUnique({
        where: { id: patientId },
        include: { users: true },
      });
      if (patient?.users?.id) {
        const message = `New prescription: ${medicationName} (${dosage}) — ${frequency}`;
        await deliverNotification({
          userId: patient.users.id,
          user: patient.users,
          category: "medication",
          type: "SYSTEM",
          title: "New Prescription",
          message,
          emailSubject: "New Prescription — Life Ways Rehab",
          emailHtml: `<p>Dear ${patient.users.name || "Patient"},</p><p>${message}</p>`,
        });
      }
    } catch (notifyErr) {
      console.warn("[prescription] Notification failed:", notifyErr.message);
    }

    return res.status(201).json({ data: mapped });
  } catch (e) {
    console.error("[prescription] create failed:", e);
    const mapped = mapCreateError(e);
    return res.status(mapped.status).json({ message: mapped.message });
  }
}

async function update(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    const id = parseId(req.params.id);
    const existing = await prisma.prescriptions.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (role === "DOCTOR") {
      const doctorId = await resolveDoctorIdForUser(req.user);
      if (!doctorId || String(existing.prescribed_by) !== String(doctorId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = {};
    if (req.body?.medicationName ?? req.body?.medication_name) {
      data.medication_name = String(req.body.medicationName ?? req.body.medication_name).trim();
    }
    if (req.body?.dosage) data.dosage = String(req.body.dosage).trim();
    if (req.body?.frequency) data.frequency = String(req.body.frequency).trim();
    if (req.body?.durationDays != null || req.body?.duration_days != null) {
      data.duration_days = parseDurationDays(req.body.durationDays ?? req.body.duration_days);
    }
    if (req.body?.schedule) data.schedule = parseSchedule(req.body.schedule);
    if (req.body?.instructions !== undefined) {
      data.instructions = String(req.body.instructions ?? "").trim() || null;
    }
    if (req.body?.notes !== undefined) {
      data.notes = String(req.body.notes ?? "").trim() || null;
    }
    if (req.body?.startDate ?? req.body?.start_date) {
      data.start_date = toDate(req.body.startDate ?? req.body.start_date);
    }
    if (req.body?.endDate !== undefined || req.body?.end_date !== undefined) {
      data.end_date = toDate(req.body.endDate ?? req.body.end_date);
    }
    if (req.body?.documentId !== undefined || req.body?.document_id !== undefined) {
      data.document_id = parseId(req.body.documentId ?? req.body.document_id);
    }

    const updated = await prisma.prescriptions.update({
      where: { id },
      data,
      include: PRESCRIPTION_INCLUDE,
    });

    await recordAudit({
      action: "UPDATE",
      entityType: "prescription",
      entityId: id,
      patientId: existing.patient_id,
      actor: req.user,
      summary: `Updated prescription ${updated.medication_name}`,
    });

    return res.json({ data: mapPrescription(updated) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function stopMedication(req, res) {
  req.body = { ...req.body, status: "DISCONTINUED" };
  return setStatus(req, res, "DISCONTINUED", "Stopped medication");
}

async function setStatus(req, res, forcedStatus, auditLabel) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    const id = parseId(req.params.id);
    const existing = await prisma.prescriptions.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    if (role === "DOCTOR") {
      const doctorId = await resolveDoctorIdForUser(req.user);
      if (!doctorId || String(existing.prescribed_by) !== String(doctorId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    } else if (role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const status = forcedStatus ?? String(req.body?.status ?? "ACTIVE").toUpperCase();
    const valid = ["ACTIVE", "COMPLETED", "DISCONTINUED", "ON_HOLD"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await prisma.prescriptions.update({
      where: { id },
      data: { status },
      include: PRESCRIPTION_INCLUDE,
    });

    await recordAudit({
      action: "STATUS_CHANGE",
      entityType: "prescription",
      entityId: id,
      patientId: existing.patient_id,
      actor: req.user,
      summary: auditLabel ?? `Status set to ${status}`,
    });

    return res.json({ data: mapPrescription(updated) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function markInvalid(req, res) {
  try {
    if (String(req.user.role ?? "").toUpperCase() !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }
    const id = parseId(req.params.id);
    const existing = await prisma.prescriptions.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Prescription not found" });

    const updated = await prisma.prescriptions.update({
      where: { id },
      data: { is_invalid: true, status: "INVALID" },
      include: PRESCRIPTION_INCLUDE,
    });

    await recordAudit({
      action: "INVALIDATE",
      entityType: "prescription",
      entityId: id,
      patientId: existing.patient_id,
      actor: req.user,
      summary: `Marked prescription invalid: ${existing.medication_name}`,
    });

    return res.json({ data: mapPrescription(updated, { includeDeleted: true }) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function softDelete(req, res) {
  try {
    if (String(req.user.role ?? "").toUpperCase() !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }
    const id = parseId(req.params.id);
    const existing = await prisma.prescriptions.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Prescription not found" });

    const updated = await prisma.prescriptions.update({
      where: { id },
      data: { deleted_at: new Date(), status: "DISCONTINUED" },
      include: PRESCRIPTION_INCLUDE,
    });

    await recordAudit({
      action: "SOFT_DELETE",
      entityType: "prescription",
      entityId: id,
      patientId: existing.patient_id,
      actor: req.user,
      summary: `Soft-deleted prescription: ${existing.medication_name}`,
    });

    return res.json({ data: mapPrescription(updated, { includeDeleted: true }) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function markTaken(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    if (role !== "PATIENT" && role !== "FAMILY") {
      return res.status(403).json({ message: "Patients only" });
    }

    const prescriptionId = parseId(req.params.id);
    const dosePeriod = String(req.body?.dosePeriod ?? req.body?.dose_period ?? "").toUpperCase();
    if (!["MORNING", "AFTERNOON", "NIGHT"].includes(dosePeriod)) {
      return res.status(400).json({ message: "dosePeriod must be MORNING, AFTERNOON, or NIGHT" });
    }

    const patientId = await resolvePatientIdForUser(req.user);
    if (!patientId) return res.status(404).json({ message: "Patient profile not found" });

    const rx = await prisma.prescriptions.findUnique({ where: { id: prescriptionId } });
    if (!rx || rx.deleted_at || String(rx.patient_id) !== String(patientId)) {
      return res.status(404).json({ message: "Prescription not found" });
    }
    if (rx.status !== "ACTIVE") {
      return res.status(400).json({ message: "Only active prescriptions can be marked" });
    }

    const logDate = new Date();
    logDate.setHours(0, 0, 0, 0);

    await prisma.medication_dose_logs.upsert({
      where: {
        prescription_id_dose_period_log_date: {
          prescription_id: prescriptionId,
          dose_period: dosePeriod,
          log_date: logDate,
        },
      },
      create: {
        prescription_id: prescriptionId,
        patient_id: patientId,
        dose_period: dosePeriod,
        log_date: logDate,
      },
      update: { taken_at: new Date() },
    });

    const refreshed = await prisma.prescriptions.findUnique({
      where: { id: prescriptionId },
      include: PRESCRIPTION_INCLUDE,
    });

    return res.json({ data: mapPrescription(refreshed) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function listAudit(req, res) {
  try {
    if (String(req.user.role ?? "").toUpperCase() !== "ADMIN") {
      return res.status(403).json({ message: "Admin only" });
    }
    const patientId = parseId(req.query?.patientId);
    const where = { entity_type: "prescription" };
    if (patientId) where.patient_id = patientId;

    const rows = await prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return res.json({
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityId: r.entity_id,
        patientId: r.patient_id,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        summary: r.summary,
        timestamp: r.created_at?.toISOString?.() ?? r.created_at,
      })),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  stopMedication,
  setStatus,
  markInvalid,
  softDelete,
  markTaken,
  listAudit,
};
