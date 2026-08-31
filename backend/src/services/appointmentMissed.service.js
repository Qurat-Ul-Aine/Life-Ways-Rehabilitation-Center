const prisma = require("../lib/prisma");
const {
  ACTIVE_REMINDER_STATUSES,
  isAppointmentPast,
} = require("../utils/appointmentTime");

/**
 * Mark overdue BOOKED/CONFIRMED appointments as MISSED when the enum value exists.
 * No-ops safely if the migration has not been applied yet.
 */
async function markMissedAppointments(scope = {}) {
  try {
    const where = {
      status: { in: ACTIVE_REMINDER_STATUSES },
      appointment_date: { not: null },
      appointment_time: { not: null },
      ...scope,
    };

    const rows = await prisma.appointments.findMany({
      where,
      select: { id: true, appointment_date: true, appointment_time: true },
    });

    const missedIds = rows
      .filter((row) => isAppointmentPast(row.appointment_date, row.appointment_time))
      .map((row) => row.id);

    if (missedIds.length === 0) return 0;

    await prisma.appointments.updateMany({
      where: { id: { in: missedIds } },
      data: { status: "MISSED" },
    });

    return missedIds.length;
  } catch (err) {
    const msg = String(err?.message ?? "");
    if (
      msg.includes("MISSED")
      || msg.includes("CONFIRMED")
      || msg.includes("appointment_status")
      || err?.code === "P2007"
    ) {
      console.warn(
        "[appointments] Missed-status migration not applied yet — skipping auto-mark:",
        msg.split("\n")[0],
      );
      return 0;
    }
    throw err;
  }
}

module.exports = { markMissedAppointments };
