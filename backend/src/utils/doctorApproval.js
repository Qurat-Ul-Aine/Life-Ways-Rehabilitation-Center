"use strict";

/**
 * Load a doctor that is approved and has an active user account.
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} db
 * @param {string} doctorId
 * @param {{ assignment?: boolean; booking?: boolean }} [context]
 */
async function assertApprovedActiveDoctor(db, doctorId, context = {}) {
  const doctor = await db.doctors.findUnique({
    where: { id: String(doctorId) },
    include: { users: { select: { is_active: true } } },
  });

  if (!doctor) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }

  if (!doctor.is_approved) {
    const err = new Error(
      context.assignment
        ? "Doctor must be approved by admin before assigning to a patient"
        : "Selected doctor is not available until approved by admin",
    );
    err.status = 400;
    throw err;
  }

  if (!doctor.users?.is_active) {
    const err = new Error("Doctor account is inactive");
    err.status = 400;
    throw err;
  }

  return doctor;
}

function isPublicDoctorVisible(doctor) {
  return Boolean(doctor?.is_approved && doctor?.users?.is_active);
}

module.exports = {
  assertApprovedActiveDoctor,
  isPublicDoctorVisible,
};
