"use strict";

const { hasPermission } = require("../policies/accessPolicy");

async function resolveDoctorForUser(prisma, userId) {
  if (!userId) return null;
  return prisma.doctors.findFirst({
    where: { user_id: String(userId) },
    select: { id: true },
  });
}

async function assertDoctorAssignedToPatient(prisma, doctorId, patientId) {
  const link = await prisma.doctor_patient.findUnique({
    where: {
      doctor_id_patient_id: {
        doctor_id: String(doctorId),
        patient_id: String(patientId),
      },
    },
  });
  if (!link) {
    const err = new Error("You are not assigned to this patient.");
    err.status = 403;
    throw err;
  }
}

/**
 * SRS-47: Only admin, assigned doctor/therapist, or the patient (read-only) may access records.
 */
async function assertClinicalRecordAccess(prisma, req, patientId, { write = false } = {}) {
  const role = req.user?.role;
  const patient = await prisma.patients.findUnique({
    where: { id: String(patientId) },
    select: { id: true, user_id: true },
  });
  if (!patient) {
    const err = new Error("Patient not found.");
    err.status = 404;
    throw err;
  }

  if (role === "ADMIN") return patient;

  if (role === "DOCTOR") {
    const doctor = await resolveDoctorForUser(prisma, req.user.id);
    if (!doctor) {
      const err = new Error("Doctor profile not found.");
      err.status = 404;
      throw err;
    }
    await assertDoctorAssignedToPatient(prisma, doctor.id, patient.id);
    return patient;
  }

  if (role === "PATIENT" || role === "FAMILY") {
    if (write) {
      const err = new Error("Patients and family accounts have read-only access to clinical records.");
      err.status = 403;
      throw err;
    }

    let linkedPatientId = null;
    if (role === "FAMILY") {
      const link = await prisma.family_members.findUnique({
        where: { user_id: req.user.id },
        select: { patient_id: true },
      });
      linkedPatientId = link?.patient_id ?? null;
    } else {
      const self = await prisma.patients.findUnique({
        where: { user_id: req.user.id },
        select: { id: true },
      });
      linkedPatientId = self?.id ?? null;
    }

    if (!linkedPatientId || String(linkedPatientId) !== String(patient.id)) {
      const err = new Error("You may only access your own patient records.");
      err.status = 403;
      throw err;
    }
    return patient;
  }

  const err = new Error("You do not have permission to access these medical records.");
  err.status = 403;
  throw err;
}

function assertConfidentialWrite(role) {
  if (!hasPermission(role, "patients:confidential")) {
    const err = new Error("You do not have permission to add confidential clinical notes.");
    err.status = 403;
    throw err;
  }
}

module.exports = {
  assertClinicalRecordAccess,
  assertConfidentialWrite,
  resolveDoctorForUser,
  assertDoctorAssignedToPatient,
};
