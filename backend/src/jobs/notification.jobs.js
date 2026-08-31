const cron = require("node-cron");
const prisma = require("../lib/prisma");
const { markMissedAppointments } = require("../services/appointmentMissed.service");
const { ACTIVE_REMINDER_STATUSES } = require("../utils/appointmentTime");
const {
  notifySessionReminder,
  notifyTherapySessionReminder,
  processPaymentNotifications,
  processTherapyMilestones,
  processWelcomeEmails,
} = require("../services/notification.service");

const APPT_INCLUDE = {
  patients: { include: { users: true } },
  doctors: { include: { users: true } },
};

const SESSION_INCLUDE = {
  therapy_plans: {
    include: {
      patients: { include: { users: true } },
      doctors: { include: { users: true } },
    },
  },
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Mark overdue scheduled/confirmed appointments as missed.
 */
async function processMissedAppointments() {
  return markMissedAppointments();
}

/**
 * Hourly: 24-hour appointment reminders (SRS appointment reminders).
 */
async function processAppointmentReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(in24h.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(in24h.getTime() + 30 * 60 * 1000);

  const appointments = await prisma.appointments.findMany({
    where: {
      status: { in: ACTIVE_REMINDER_STATUSES },
      reminder_sent: false,
      appointment_date: { not: null },
    },
    include: APPT_INCLUDE,
  });

  for (const appt of appointments) {
    if (!appt.appointment_date || !appt.appointment_time) continue;

    const dateStr = new Date(appt.appointment_date).toISOString().slice(0, 10);
    const time = new Date(appt.appointment_time);
    const sessionAt = new Date(
      `${dateStr}T${String(time.getUTCHours()).padStart(2, "0")}:${String(time.getUTCMinutes()).padStart(2, "0")}:00`,
    );

    if (sessionAt >= windowStart && sessionAt <= windowEnd) {
      await prisma.appointments.update({
        where: { id: appt.id },
        data: { reminder_sent: true },
      });
      await notifySessionReminder(appt);
    }
  }
}

/**
 * Hourly: 24-hour therapy session reminders from therapy_sessions (SRS-172).
 */
async function processTherapySessionReminders() {
  try {
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const dayAfter = startOfDay(addDays(new Date(), 2));

    const sessions = await prisma.therapy_sessions.findMany({
      where: {
        status: "SCHEDULED",
        reminder_sent: false,
        session_date: { gte: tomorrow, lt: dayAfter },
      },
      include: SESSION_INCLUDE,
    });

    for (const session of sessions) {
      await prisma.therapy_sessions.update({
        where: { id: session.id },
        data: { reminder_sent: true },
      });
      await notifyTherapySessionReminder(session);
    }
  } catch (err) {
    if (!String(err.message).includes("reminder_sent")) {
      throw err;
    }
  }
}

function startNotificationJobs() {
  try {
    cron.schedule("0 * * * *", async () => {
      try {
        await processMissedAppointments();
        await processAppointmentReminders();
        await processTherapySessionReminders();
        await processPaymentNotifications();
        await processTherapyMilestones();
        console.log("[cron] notification jobs completed");
      } catch (err) {
        console.error("[cron] notification jobs failed:", err.message);
      }
    });

    cron.schedule("*/5 * * * *", async () => {
      try {
        await processWelcomeEmails();
      } catch (err) {
        console.error("[cron] welcome email job failed:", err.message);
      }
    });

    cron.schedule("*/15 * * * *", async () => {
      try {
        await processMissedAppointments();
      } catch (err) {
        console.error("[cron] missed appointment job failed:", err.message);
      }
    });

    console.log("[cron] notification jobs scheduled (hourly + welcome every 5m + missed every 15m)");
  } catch (err) {
    console.warn("[cron] notification jobs not started:", err.message);
  }
}

module.exports = {
  startNotificationJobs,
  processMissedAppointments,
  processAppointmentReminders,
  processTherapySessionReminders,
  processPaymentNotifications,
  processTherapyMilestones,
  processWelcomeEmails,
};
