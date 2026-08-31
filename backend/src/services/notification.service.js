"use strict";

const prisma = require("../lib/prisma");
const { sendEmail, isEmailConfigured } = require("./email.service");
const {
  DEFAULT_HOSPITAL,
  buildAppointmentConfirmationEmail,
  buildAppointmentCancellationEmail,
  buildAppointmentUpdateEmail,
  buildReminderEmail,
  buildTherapyReminderEmail,
  buildPaymentEmail,
  buildMilestoneEmail,
  buildWelcomeEmail,
} = require("./notification.emailTemplates");

let cachedHospitalBranding = null;

async function getHospitalBranding() {
  if (cachedHospitalBranding) return cachedHospitalBranding;
  try {
    const row = await prisma.hospital_settings.findUnique({ where: { id: "default" } });
    cachedHospitalBranding = row || DEFAULT_HOSPITAL;
  } catch {
    cachedHospitalBranding = DEFAULT_HOSPITAL;
  }
  return cachedHospitalBranding;
}

const PENDING_REMINDER_DAYS_BEFORE = 3;
const THERAPY_MILESTONE_THRESHOLDS = [1, 3, 5, 10, 15, 20, 25, 50];
const WELCOME_TITLE = "Welcome to Life Ways Rehab";

const DEFAULT_PREFS = {
  inApp: true,
  email: true,
  appointment: true,
  session: true,
  recovery: true,
  medication: true,
  patientUpdates: true,
  telehealth: true,
  payment: true,
  sms: false,
  whatsapp: false,
};

const ROLE_LOGIN_PATHS = {
  PATIENT: "/login/patient",
  DOCTOR: "/login/doctor",
  INTERN: "/intern/login",
  ADMIN: "/login/admin",
  STAFF: "/login/admin",
};

async function getNotificationPreferences(userId) {
  if (!userId) return { ...DEFAULT_PREFS };
  try {
    const row = await prisma.user_preferences.findUnique({
      where: { user_id: String(userId) },
    });
    if (!row) return { ...DEFAULT_PREFS };
    return {
      inApp: row.in_app_notifications !== false,
      email: row.email_notifications !== false,
      appointment: row.appointment_notifications !== false,
      session: row.session_notifications !== false,
      recovery: row.recovery_notifications !== false,
      medication: row.medication_reminders !== false,
      patientUpdates: row.patient_updates !== false,
      telehealth: row.telehealth_notifications !== false,
      payment: row.patient_updates !== false,
      sms: false,
      whatsapp: false,
    };
  } catch (err) {
    console.warn("[notification] preference lookup failed:", err.message);
    return { ...DEFAULT_PREFS };
  }
}

async function createUserNotification({
  userId,
  message,
  title = null,
  type = "SYSTEM",
  status = "unread",
  relatedId = null,
}) {
  if (!userId || !message) return null;

  return prisma.notifications.create({
    data: {
      user_id: String(userId),
      type,
      title: title ? String(title).slice(0, 200) : null,
      message: String(message).trim(),
      status,
      is_read: status === "read",
      sent_date: new Date(),
      created_at: new Date(),
      related_id: relatedId ? String(relatedId) : null,
    },
  });
}

async function sendEmailIfConfigured(to, subject, html) {
  if (!to) return { sent: false, reason: "missing_recipient" };
  if (!isEmailConfigured()) {
    console.warn(
      "[notification] email skipped — set EMAIL_USER and EMAIL_PASS in .env (optional EMAIL_FROM for sender address)",
    );
    return { sent: false, reason: "email_not_configured" };
  }
  return sendEmail({ to, subject, html });
}

async function sendSmsIfConfigured(_to, _message) {
  console.log("[notification] SMS channel not configured (Coming Soon)");
  return { sent: false, reason: "sms_not_configured" };
}

async function sendWhatsAppIfConfigured(_to, _message) {
  console.log("[notification] WhatsApp channel not configured (Coming Soon)");
  return { sent: false, reason: "whatsapp_not_configured" };
}

async function deliverNotification({
  userId,
  user,
  category = "general",
  type = "SYSTEM",
  title,
  message,
  emailSubject,
  emailHtml,
  relatedId = null,
}) {
  if (!userId || !message) return;

  const prefs = await getNotificationPreferences(userId);
  const categoryAllowed = (() => {
    switch (category) {
      case "appointment":
        return prefs.appointment;
      case "session":
        return prefs.session;
      case "recovery":
      case "screening":
        return prefs.recovery;
      case "medication":
        return prefs.medication;
      case "telehealth":
        return prefs.telehealth;
      case "patient_update":
        return prefs.patientUpdates;
      case "payment":
        return prefs.payment;
      default:
        return true;
    }
  })();

  if (!categoryAllowed) return;

  if (prefs.inApp) {
    await createUserNotification({ userId, message, title, type, relatedId });
  }

  if (prefs.email && user?.email && emailSubject && emailHtml) {
    const result = await sendEmailIfConfigured(user.email, emailSubject, emailHtml);
    if (!result.sent && result.reason !== "email_not_configured") {
      console.error(`[notification] email delivery failed for ${user.email}:`, result.reason);
    }
  }

  if (prefs.sms) {
    await sendSmsIfConfigured(user?.phone, message);
  }
  if (prefs.whatsapp) {
    await sendWhatsAppIfConfigured(user?.phone, message);
  }
}

function formatApptDate(appt) {
  if (!appt?.appointment_date) return "—";
  return new Date(appt.appointment_date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatApptTime(appt) {
  if (!appt?.appointment_time) return "—";
  const t = new Date(appt.appointment_time);
  return t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatApptDateTime(appt) {
  const date = formatApptDate(appt);
  const time = formatApptTime(appt);
  if (date === "—") return "scheduled date";
  if (time === "—") return date;
  return `${date} at ${time}`;
}

function formatAppointmentMode(appt) {
  return appt?.type === "ONLINE" ? "Online" : "In-Person";
}

function formatAppointmentType(appt) {
  return appt?.rehabilitation_services?.title ?? appt?.type ?? "General Consultation";
}

function formatStatusLabel(status) {
  const raw = String(status ?? "CONFIRMED").toUpperCase();
  const map = {
    BOOKED: "Booked",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
    MISSED: "Missed",
  };
  return map[raw] || raw.charAt(0) + raw.slice(1).toLowerCase();
}

async function buildAppointmentContext(appointment) {
  const hospital = await getHospitalBranding();
  const patientUser = appointment.patients?.users;
  const doctorUser = appointment.doctors?.users;
  const isOnline = appointment?.type === "ONLINE";
  const meetingLink =
    appointment?.telehealth_sessions?.[0]?.meeting_link ??
    appointment?.telehealth_sessions?.meeting_link ??
    null;
  const location = isOnline
    ? "Online (Telehealth)"
    : hospital?.address || "Life Ways Rehabilitation Center";

  return {
    patientName: patientUser?.name?.trim() || "Patient",
    doctorName: doctorUser?.name?.trim() || "Doctor",
    date: formatApptDate(appointment),
    time: formatApptTime(appointment),
    when: formatApptDateTime(appointment),
    mode: formatAppointmentMode(appointment),
    appointmentType: formatAppointmentType(appointment),
    status: appointment.status ?? "BOOKED",
    statusLabel: formatStatusLabel(appointment.status ?? "BOOKED"),
    location,
    meetingLink: isOnline ? meetingLink : null,
    patientUser,
    doctorUser,
    reason: appointment.cancelled_reason ?? appointment.reason ?? null,
  };
}

function buildAppointmentInAppMessage(ctx, event = "confirmed") {
  const parts = [];
  if (event === "cancelled") {
    parts.push(
      `Appointment with Dr. ${ctx.doctorName} on ${ctx.when} has been cancelled (${ctx.mode}).`,
    );
  } else if (event === "updated") {
    parts.push(`Appointment with Dr. ${ctx.doctorName} on ${ctx.when} was updated (${ctx.mode}).`);
  } else {
    parts.push(`Appointment confirmed with Dr. ${ctx.doctorName} on ${ctx.when} (${ctx.mode}).`);
  }
  parts.push(`Status: ${ctx.statusLabel}.`);
  if (ctx.mode === "In-Person" && ctx.location) parts.push(`Location: ${ctx.location}.`);
  if (ctx.mode === "Online" && ctx.meetingLink) parts.push(`Meeting: ${ctx.meetingLink}.`);
  if (ctx.reason) parts.push(`Reason: ${ctx.reason}.`);
  return parts.join(" ");
}

async function buildConfirmationEmailHtml(ctx, recipientRole) {
  const hospital = await getHospitalBranding();
  return buildAppointmentConfirmationEmail(ctx, recipientRole, hospital);
}

async function buildCancellationEmailHtml(ctx, recipientRole) {
  const hospital = await getHospitalBranding();
  return buildAppointmentCancellationEmail(ctx, recipientRole, hospital);
}

async function buildUpdateEmailHtml(ctx, changeSummary, recipientRole) {
  const hospital = await getHospitalBranding();
  return buildAppointmentUpdateEmail(ctx, changeSummary, recipientRole, hospital);
}

async function buildReminderEmailHtml(ctx, recipientRole, kind = "appointment") {
  const hospital = await getHospitalBranding();
  return buildReminderEmail(ctx, recipientRole, kind, hospital);
}

function formatMoney(amount) {
  const value = Number(amount ?? 0);
  return `PKR ${value.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPaymentDate(date) {
  if (!date) return new Date().toLocaleDateString("en-GB");
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildInvoiceNumber(payment) {
  if (payment.reference_number) return String(payment.reference_number);
  return `INV-${String(payment.id).slice(0, 8).toUpperCase()}`;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "http://localhost:8081").replace(
    /\/$/,
    "",
  );
}

function getRoleLoginPath(role) {
  return ROLE_LOGIN_PATHS[String(role ?? "").toUpperCase()] || "/login";
}

function getRoleLabel(role) {
  switch (String(role ?? "").toUpperCase()) {
    case "PATIENT":
      return "patient";
    case "DOCTOR":
      return "doctor";
    case "INTERN":
      return "intern";
    case "ADMIN":
      return "administrator";
    case "STAFF":
      return "staff";
    default:
      return "user";
  }
}

function describeAppointmentChanges(before, after) {
  const changes = [];
  const beforeDate = before.appointment_date
    ? new Date(before.appointment_date).toISOString().slice(0, 10)
    : null;
  const afterDate = after.appointment_date
    ? new Date(after.appointment_date).toISOString().slice(0, 10)
    : null;

  if (beforeDate !== afterDate) {
    changes.push(`Date changed from ${formatApptDate(before)} to ${formatApptDate(after)}`);
  }

  const beforeTime = formatApptTime(before);
  const afterTime = formatApptTime(after);
  if (beforeTime !== afterTime && beforeTime !== "—" && afterTime !== "—") {
    changes.push(`Time changed from ${beforeTime} to ${afterTime}`);
  }

  if (String(before.doctor_id ?? "") !== String(after.doctor_id ?? "")) {
    changes.push("Assigned doctor was changed");
  }

  if (String(before.type ?? "") !== String(after.type ?? "")) {
    changes.push(`Mode changed from ${formatAppointmentMode(before)} to ${formatAppointmentMode(after)}`);
  }

  return changes;
}

async function getDoctorUserId(doctorId) {
  const doctor = await prisma.doctors.findUnique({
    where: { id: String(doctorId) },
    select: { user_id: true },
  });
  return doctor?.user_id ?? null;
}

async function getPatientDisplayName(patientId) {
  const patient = await prisma.patients.findUnique({
    where: { id: String(patientId) },
    include: { users: { select: { name: true } } },
  });
  return patient?.users?.name?.trim() || "A patient";
}

async function getPatientUserFromPayment(payment) {
  const patient = payment.patients ?? (await prisma.patients.findUnique({
    where: { id: String(payment.patient_id) },
    include: { users: true },
  }));
  return patient?.users ?? null;
}

async function notifyDoctorPatientAssignment({ doctorId, patientId, event = "assigned" }) {
  try {
    const doctor = await prisma.doctors.findUnique({
      where: { id: String(doctorId) },
      include: { users: true },
    });
    const doctorUser = doctor?.users;
    if (!doctorUser?.id) return null;

    const patientName = await getPatientDisplayName(patientId);
    const message =
      event === "updated"
        ? `Patient assignment updated: ${patientName} has been reassigned to you. Please review their profile and care plan.`
        : `New patient assigned: ${patientName} has been assigned to you. Please review their profile and care plan.`;

    await deliverNotification({
      userId: doctorUser.id,
      user: doctorUser,
      category: "patient_update",
      type: "SYSTEM",
      title: event === "updated" ? "Patient Assignment Updated" : "New Patient Assigned",
      message,
      emailSubject: `${event === "updated" ? "Patient Assignment Updated" : "New Patient Assigned"} — Life Ways Rehab`,
      emailHtml: `<p>Dear ${doctorUser.name || "Doctor"},</p><p>${message}</p>`,
    });
    return true;
  } catch (err) {
    console.warn("[notification] Failed to notify doctor of patient assignment:", err.message);
    return null;
  }
}

async function persistAndNotifyReport({
  patientId,
  generatedBy,
  reportType,
  reportData,
  status,
  event,
  patientUser,
  doctorUser,
}) {
  try {
    const reportDataStr =
      typeof reportData === "string" ? reportData : JSON.stringify(reportData ?? {});

    await prisma.reports.create({
      data: {
        patient_id: patientId ? String(patientId) : null,
        generated_by: generatedBy ? String(generatedBy) : null,
        report_type: reportType ? String(reportType).slice(0, 50) : null,
        report_data: reportDataStr,
        generated_date: new Date(),
      },
    });

    const eventLabel =
      event === "exported" ? "exported" : event === "finalized" ? "finalized" : "generated";
    const label = reportType || "report";
    const statusNote = status ? ` (${status})` : "";

    if (patientUser?.id) {
      await deliverNotification({
        userId: patientUser.id,
        user: patientUser,
        category: "recovery",
        type: "MILESTONE",
        title: "Report Available",
        message: `Your ${label} has been ${eventLabel}${statusNote}.`,
        emailSubject: `Your ${label} — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: patientUser.name || "Patient",
          patientName: patientUser.name || "Patient",
          milestoneTitle: "Report Available",
          milestoneMessage: `Your ${label} has been ${eventLabel}${statusNote}.`,
          recipientRole: "patient",
        }),
      });
    }

    if (doctorUser?.id && event !== "exported") {
      const patientName = patientUser?.name?.trim() || "a patient";
      await deliverNotification({
        userId: doctorUser.id,
        user: doctorUser,
        category: "recovery",
        type: "MILESTONE",
        title: "Patient Report Update",
        message: `${label} for ${patientName} has been ${eventLabel}.`,
        emailSubject: `Patient Report Update — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: doctorUser.name || "Doctor",
          patientName,
          milestoneTitle: "Patient Report Update",
          milestoneMessage: `${label} for ${patientName} has been ${eventLabel}.`,
          recipientRole: "doctor",
        }),
      });
    }
  } catch (err) {
    console.warn("[notification] persistAndNotifyReport failed:", err.message);
  }
}

async function notifyProgressReport({
  patientUser,
  doctorUser,
  reportType,
  progressId,
  event,
}) {
  try {
    const eventLabel = event === "finalized" ? "finalized" : "updated";
    const label = reportType || "Progress report";
    const ref = progressId ? ` (ref: ${String(progressId).slice(0, 8)})` : "";

    if (patientUser?.id) {
      await deliverNotification({
        userId: patientUser.id,
        user: patientUser,
        category: "recovery",
        type: "MILESTONE",
        title: "Progress Report Update",
        message: `Your ${label} has been ${eventLabel}${ref}.`,
        emailSubject: `Progress Report ${eventLabel} — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: patientUser.name || "Patient",
          patientName: patientUser.name || "Patient",
          milestoneTitle: "Progress Report Update",
          milestoneMessage: `Your ${label} has been ${eventLabel}${ref}.`,
          recipientRole: "patient",
        }),
        relatedId: progressId,
      });
    }

    if (doctorUser?.id) {
      const patientName = patientUser?.name?.trim() || "a patient";
      await deliverNotification({
        userId: doctorUser.id,
        user: doctorUser,
        category: "recovery",
        type: "MILESTONE",
        title: "Progress Report Update",
        message: `${label} for ${patientName} has been ${eventLabel}.`,
        emailSubject: `Progress Report Update — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: doctorUser.name || "Doctor",
          patientName,
          milestoneTitle: "Progress Report Update",
          milestoneMessage: `${label} for ${patientName} has been ${eventLabel}.`,
          recipientRole: "doctor",
        }),
        relatedId: progressId,
      });
    }
  } catch (err) {
    console.warn("[notification] notifyProgressReport failed:", err.message);
  }
}

/** SRS-181 — Welcome email + in-app for any new account role. */
async function notifyWelcomeNewAccount(user, { extraMessage = "" } = {}) {
  try {
    if (!user?.id || !user?.email) return null;

    const existing = await prisma.notifications.findFirst({
      where: { user_id: user.id, title: WELCOME_TITLE },
      select: { id: true },
    });
    if (existing) return false;

    const roleLabel = getRoleLabel(user.role);
    const loginUrl = `${getFrontendUrl()}${getRoleLoginPath(user.role)}`;
    const message = `Welcome to Life Ways Rehab! Your ${roleLabel} account is ready. Sign in to get started.`;

    await deliverNotification({
      userId: user.id,
      user,
      category: "general",
      type: "SYSTEM",
      title: WELCOME_TITLE,
      message,
      emailSubject: `Welcome to Life Ways Rehab — ${roleLabel} account`,
      emailHtml: buildWelcomeEmail({
        userName: user.name || roleLabel,
        roleLabel,
        loginUrl,
        extraMessage: extraMessage || message,
      }, await getHospitalBranding()),
    });

    return true;
  } catch (err) {
    console.warn("[notification] notifyWelcomeNewAccount failed:", err.message);
    return null;
  }
}

async function sendWelcomeEmail(user, { loginPath = "/intern/login", extraMessage = "" } = {}) {
  const loginUrl = `${getFrontendUrl()}${loginPath}`;
  const html = buildWelcomeEmail({
    userName: user.name || "User",
    roleLabel: "intern",
    loginUrl,
    extraMessage: extraMessage || "Your internship account has been created.",
  });
  return sendEmailIfConfigured(user.email, "Welcome to Life Ways Internship Program", html);
}

async function notifyAppointmentBooked(appointment) {
  try {
    const ctx = await buildAppointmentContext(appointment);
    const message = buildAppointmentInAppMessage(ctx, "confirmed");

    if (ctx.patientUser?.id) {
      await deliverNotification({
        userId: ctx.patientUser.id,
        user: ctx.patientUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Confirmed",
        message,
        emailSubject: "Appointment Confirmation — Life Ways Rehab",
        emailHtml: await buildConfirmationEmailHtml(ctx, "patient"),
        relatedId: appointment.id,
      });
    }

    if (ctx.doctorUser?.id) {
      const doctorMessage = `${ctx.patientName} booked an appointment on ${ctx.when} (${ctx.mode}, ${ctx.appointmentType}). Status: ${ctx.statusLabel}.`;
      await deliverNotification({
        userId: ctx.doctorUser.id,
        user: ctx.doctorUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "New Appointment Booked",
        message: doctorMessage,
        emailSubject: "New Appointment Booking — Life Ways Rehab",
        emailHtml: await buildConfirmationEmailHtml(ctx, "doctor"),
        relatedId: appointment.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifyAppointmentBooked failed:", err.message);
  }
}

async function notifyAppointmentCancelled(appointment) {
  try {
    const ctx = await buildAppointmentContext(appointment);
    const message = buildAppointmentInAppMessage(ctx, "cancelled");

    if (ctx.patientUser?.id) {
      await deliverNotification({
        userId: ctx.patientUser.id,
        user: ctx.patientUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Cancelled",
        message,
        emailSubject: "Appointment Cancelled — Life Ways Rehab",
        emailHtml: await buildCancellationEmailHtml(ctx, "patient"),
        relatedId: appointment.id,
      });
    }

    if (ctx.doctorUser?.id) {
      const doctorMessage = `Appointment with ${ctx.patientName} on ${ctx.when} was cancelled (${ctx.mode}).${ctx.reason ? ` Reason: ${ctx.reason}.` : ""}`;
      await deliverNotification({
        userId: ctx.doctorUser.id,
        user: ctx.doctorUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Cancelled",
        message: doctorMessage,
        emailSubject: "Appointment Cancelled — Life Ways Rehab",
        emailHtml: await buildCancellationEmailHtml(ctx, "doctor"),
        relatedId: appointment.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifyAppointmentCancelled failed:", err.message);
  }
}

async function notifyAppointmentUpdated(appointment, { changeSummary } = {}) {
  try {
    const ctx = await buildAppointmentContext(appointment);
    const summary = changeSummary || "Appointment details were updated.";
    const message = `${buildAppointmentInAppMessage(ctx, "updated")} ${summary}`;

    if (ctx.patientUser?.id) {
      await deliverNotification({
        userId: ctx.patientUser.id,
        user: ctx.patientUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Updated",
        message,
        emailSubject: "Appointment Updated — Life Ways Rehab",
        emailHtml: await buildUpdateEmailHtml(ctx, summary, "patient"),
        relatedId: appointment.id,
      });
    }

    if (ctx.doctorUser?.id) {
      await deliverNotification({
        userId: ctx.doctorUser.id,
        user: ctx.doctorUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Updated",
        message: `Appointment with ${ctx.patientName} was updated: ${summary}`,
        emailSubject: "Appointment Updated — Life Ways Rehab",
        emailHtml: await buildUpdateEmailHtml(ctx, summary, "doctor"),
        relatedId: appointment.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifyAppointmentUpdated failed:", err.message);
  }
}

async function notifyAppointmentApproved(appointment) {
  try {
    const ctx = await buildAppointmentContext(appointment);
    if (!ctx.patientUser?.id) return;

    await deliverNotification({
      userId: ctx.patientUser.id,
      user: ctx.patientUser,
      category: "appointment",
      type: "APPOINTMENT",
      title: "Appointment Approved",
      message: `Your appointment with Dr. ${ctx.doctorName} on ${ctx.when} has been approved. Status: ${ctx.statusLabel}.`,
      emailSubject: "Appointment Approved — Life Ways Rehab",
      emailHtml: await buildConfirmationEmailHtml(ctx, "patient"),
      relatedId: appointment.id,
    });
  } catch (err) {
    console.error("[notification] notifyAppointmentApproved failed:", err.message);
  }
}

async function notifyTherapyPlanAssigned(plan) {
  try {
    const patientUser = plan.patients?.users;
    const doctorUser = plan.doctors?.users;
    const therapyType = plan.therapy_type || "therapy";

    if (patientUser?.id) {
      await deliverNotification({
        userId: patientUser.id,
        user: patientUser,
        category: "session",
        type: "MILESTONE",
        title: "Therapy Plan Assigned",
        message: `A new ${therapyType} plan has been assigned to you by Dr. ${doctorUser?.name || "your doctor"}.`,
        emailSubject: "Therapy Plan Assigned — Life Ways Rehab",
        emailHtml: buildMilestoneEmail({
          recipientName: patientUser.name || "Patient",
          patientName: patientUser.name || "Patient",
          milestoneTitle: "Therapy Plan Assigned",
          milestoneMessage: `Dr. ${doctorUser?.name || "Your doctor"} assigned a new ${therapyType} therapy plan.`,
          recipientRole: "patient",
        }),
        relatedId: plan.id,
      });
    }
  } catch (err) {
    console.warn("[notification] notifyTherapyPlanAssigned failed:", err.message);
  }
}

async function notifyTherapyResourceAdded(plan, { title, kind = "exercise" } = {}) {
  try {
    const patientUser = plan?.patients?.users;
    if (!patientUser?.id) return;

    const doctorName = plan?.doctors?.users?.name || "your therapist";
    const resourceTitle = String(title ?? "").trim() || "a new therapy resource";
    const label =
      kind === "file" ? "exercise file" : kind === "session" ? "session notes" : "exercise";
    const action =
      kind === "session"
        ? "Open your Therapy Plan to view session notes."
        : "Open your Therapy Plan to view it.";

    await deliverNotification({
      userId: patientUser.id,
      user: patientUser,
      category: "session",
      type: "MILESTONE",
      title: kind === "session" ? "Session Notes Updated" : "New Therapy Exercise",
      message: `Dr. ${doctorName} added ${label}: ${resourceTitle}. ${action}`,
      emailSubject: "New Therapy Exercise — Life Ways Rehab",
      emailHtml: buildMilestoneEmail({
        recipientName: patientUser.name || "Patient",
        patientName: patientUser.name || "Patient",
        milestoneTitle: kind === "session" ? "Session Notes Updated" : "New Therapy Exercise",
        milestoneMessage: `Dr. ${doctorName} added ${label}: ${resourceTitle}.`,
        recipientRole: "patient",
      }),
      relatedId: plan.id,
    });
  } catch (err) {
    console.warn("[notification] notifyTherapyResourceAdded failed:", err.message);
  }
}

async function notifySessionReminder(appointment) {
  try {
    const ctx = await buildAppointmentContext(appointment);
    const reminderMsg = (role) =>
      `Reminder: appointment with ${role === "doctor" ? ctx.patientName : `Dr. ${ctx.doctorName}`} on ${ctx.when} (${ctx.mode}).${ctx.meetingLink ? ` Join: ${ctx.meetingLink}.` : ctx.location ? ` Location: ${ctx.location}.` : ""}`;

    if (ctx.patientUser?.id) {
      await deliverNotification({
        userId: ctx.patientUser.id,
        user: ctx.patientUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Reminder",
        message: reminderMsg("patient"),
        emailSubject: "Appointment Reminder — Life Ways Rehab",
        emailHtml: await buildReminderEmailHtml(ctx, "patient", "appointment"),
        relatedId: appointment.id,
      });
    }

    if (ctx.doctorUser?.id) {
      await deliverNotification({
        userId: ctx.doctorUser.id,
        user: ctx.doctorUser,
        category: "appointment",
        type: "APPOINTMENT",
        title: "Appointment Reminder",
        message: reminderMsg("doctor"),
        emailSubject: "Appointment Reminder — Life Ways Rehab",
        emailHtml: await buildReminderEmailHtml(ctx, "doctor", "appointment"),
        relatedId: appointment.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifySessionReminder failed:", err.message);
  }
}

function buildTherapySessionContext(session) {
  const plan = session.therapy_plans;
  const patientUser = plan?.patients?.users;
  const doctorUser = plan?.doctors?.users;
  const sessionDate = session.session_date
    ? new Date(session.session_date).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "tomorrow";
  const sessionTime =
    session.duration != null ? `${session.duration} minutes` : "As scheduled";
  const sessionTitle =
    String(session.chief_complaint ?? "").trim() ||
    String(session.exercises_discussed ?? "").trim() ||
    "Therapy Session";
  const sessionType = String(session.session_type ?? plan?.therapy_type ?? "Therapy").trim();

  return {
    patientName: patientUser?.name?.trim() || "Patient",
    doctorName: doctorUser?.name?.trim() || "Therapist",
    date: sessionDate,
    time: sessionTime,
    sessionTitle,
    sessionType,
    therapyType: plan?.therapy_type || "therapy",
    patientUser,
    doctorUser,
  };
}

async function notifyTherapySessionReminder(session) {
  try {
    const ctx = buildTherapySessionContext(session);
    const hospital = await getHospitalBranding();
    const patientMessage = `Reminder: ${ctx.sessionTitle} (${ctx.sessionType}) with ${ctx.doctorName} on ${ctx.date} at ${ctx.time}.`;
    const doctorMessage = `Reminder: therapy session "${ctx.sessionTitle}" with ${ctx.patientName} on ${ctx.date} at ${ctx.time}.`;

    if (ctx.patientUser?.id) {
      await deliverNotification({
        userId: ctx.patientUser.id,
        user: ctx.patientUser,
        category: "session",
        type: "APPOINTMENT",
        title: "Therapy Session Reminder",
        message: patientMessage,
        emailSubject: "Therapy Session Reminder — Life Ways Rehab",
        emailHtml: buildTherapyReminderEmail(ctx, hospital),
        relatedId: session.id,
      });
    }

    if (ctx.doctorUser?.id) {
      await deliverNotification({
        userId: ctx.doctorUser.id,
        user: ctx.doctorUser,
        category: "session",
        type: "APPOINTMENT",
        title: "Therapy Session Reminder",
        message: doctorMessage,
        emailSubject: "Therapy Session Reminder — Life Ways Rehab",
        emailHtml: buildTherapyReminderEmail(
          { ...ctx, patientName: ctx.patientName, doctorName: ctx.doctorName },
          hospital,
        ),
        relatedId: session.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifyTherapySessionReminder failed:", err.message);
  }
}

/** SRS-175/176 — Payment notification to patient. */
async function notifyPaymentEvent(payment, kind = "invoice") {
  try {
    const patientUser = await getPatientUserFromPayment(payment);
    if (!patientUser?.id) return;

    const invoiceNumber = buildInvoiceNumber(payment);
    const amount = formatMoney(payment.amount);
    const referenceNumber = payment.reference_number || invoiceNumber;
    const paymentDate = formatPaymentDate(payment.updated_at ?? payment.created_at);
    const status = String(payment.status ?? "PENDING");

    const titles = {
      success: "Payment Received",
      verified: "Payment Verified",
      invoice: "Invoice Generated",
      pending: "Payment Pending",
      overdue: "Payment Overdue",
    };
    const title = titles[kind] || "Payment Notification";
    const messages = {
      success: `Payment of ${amount} received successfully. Reference: ${referenceNumber}. Invoice: ${invoiceNumber}.`,
      verified: `Payment of ${amount} has been verified. Reference: ${referenceNumber}. Invoice: ${invoiceNumber}.`,
      invoice: `Invoice ${invoiceNumber} generated for ${amount}. Payment is due${payment.due_date ? ` by ${formatPaymentDate(payment.due_date)}` : ""}.`,
      pending: `Pending payment of ${amount} is due${payment.due_date ? ` on ${formatPaymentDate(payment.due_date)}` : ""}. Reference: ${referenceNumber}.`,
      overdue: `Payment of ${amount} is overdue. Invoice: ${invoiceNumber}. Please settle immediately.`,
    };
    const message = messages[kind] || messages.invoice;
    const hospital = await getHospitalBranding();

    await deliverNotification({
      userId: patientUser.id,
      user: patientUser,
      category: "payment",
      type: "PAYMENT",
      title,
      message,
      emailSubject: `${title} — Life Ways Rehab`,
      emailHtml: buildPaymentEmail({
        patientName: patientUser.name || "Patient",
        amount,
        referenceNumber,
        paymentDate,
        status,
        invoiceNumber,
        kind: kind === "success" ? "verified" : kind,
      }, hospital),
      relatedId: payment.id,
    });
  } catch (err) {
    console.error("[notification] notifyPaymentEvent failed:", err.message);
  }
}

async function milestoneAlreadySent({ userId, planId, threshold }) {
  const title = `${threshold} Sessions Completed`;
  const existing = await prisma.notifications.findFirst({
    where: {
      user_id: String(userId),
      related_id: String(planId),
      title,
      type: "MILESTONE",
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/** SRS-178/179/180 — Therapy session milestone to patient and doctor. */
async function notifyTherapyMilestone({ plan, completedCount, totalSessions = 0 }) {
  try {
    const patientUser = plan.patients?.users;
    const doctorUser = plan.doctors?.users;
    const patientName = patientUser?.name?.trim() || "Patient";
    const therapyType = plan.therapy_type || "therapy";
    const progressPercent =
      totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : null;
    const progressNote =
      progressPercent != null ? ` You have reached ${progressPercent}% of your scheduled sessions.` : "";
    const milestoneTitle = `${completedCount} Sessions Completed`;
    const patientMessage = `Congratulations! You have completed ${completedCount} ${therapyType} sessions.${progressNote} Keep up your recovery progress — every session counts toward your healing journey.`;
    const doctorMessage = `${patientName} has completed ${completedCount} ${therapyType} sessions.${progressPercent != null ? ` Progress: ${progressPercent}%.` : ""} Review their treatment plan and celebrate this milestone.`;
    const hospital = await getHospitalBranding();

    if (patientUser?.id && !(await milestoneAlreadySent({ userId: patientUser.id, planId: plan.id, threshold: completedCount }))) {
      await deliverNotification({
        userId: patientUser.id,
        user: patientUser,
        category: "recovery",
        type: "MILESTONE",
        title: milestoneTitle,
        message: patientMessage,
        emailSubject: `Recovery Milestone — ${completedCount} Sessions — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: patientName,
          patientName,
          milestoneTitle,
          milestoneMessage: patientMessage,
          recipientRole: "patient",
          progressPercent,
        }, hospital),
        relatedId: plan.id,
      });
    }

    if (doctorUser?.id && !(await milestoneAlreadySent({ userId: doctorUser.id, planId: plan.id, threshold: completedCount }))) {
      await deliverNotification({
        userId: doctorUser.id,
        user: doctorUser,
        category: "recovery",
        type: "MILESTONE",
        title: "Patient Milestone Achieved",
        message: doctorMessage,
        emailSubject: `Patient Milestone — ${patientName} — Life Ways Rehab`,
        emailHtml: buildMilestoneEmail({
          recipientName: doctorUser.name || "Doctor",
          patientName,
          milestoneTitle: "Patient Milestone Achieved",
          milestoneMessage: doctorMessage,
          recipientRole: "doctor",
          progressPercent,
        }, hospital),
        relatedId: plan.id,
      });
    }
  } catch (err) {
    console.error("[notification] notifyTherapyMilestone failed:", err.message);
  }
}

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

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** SRS-177 — Cron processor for payment notifications. */
async function processPaymentNotifications() {
  try {
    const today = startOfDay(new Date());
    const reminderDate = startOfDay(addDays(today, PENDING_REMINDER_DAYS_BEFORE));

    const payments = await prisma.payments.findMany({
      where: {
        OR: [
          { invoice_notified: false, status: "PENDING" },
          { success_notified: false, status: "SUCCESS" },
          { overdue_notified: false, status: "OVERDUE" },
          {
            status: "PENDING",
            reminder_before_due_sent: false,
            due_date: { gte: reminderDate, lte: reminderDate },
          },
          {
            status: "PENDING",
            reminder_on_due_sent: false,
            due_date: { gte: today, lte: today },
          },
          { status: "PENDING", due_date: { lt: today } },
        ],
      },
      include: {
        patients: { include: { users: true } },
      },
    });

    for (const payment of payments) {
      const dueDate = payment.due_date ? startOfDay(payment.due_date) : null;

      if (!payment.invoice_notified && payment.status === "PENDING") {
        await notifyPaymentEvent(payment, "invoice");
        await prisma.payments.update({
          where: { id: payment.id },
          data: { invoice_notified: true },
        });
      }

      if (!payment.success_notified && payment.status === "SUCCESS") {
        await notifyPaymentEvent(payment, "verified");
        await prisma.payments.update({
          where: { id: payment.id },
          data: { success_notified: true },
        });
      }

      if (payment.status === "PENDING" && dueDate) {
        if (dueDate < today) {
          await prisma.payments.update({
            where: { id: payment.id },
            data: { status: "OVERDUE" },
          });
          payment.status = "OVERDUE";
        } else if (isSameDay(dueDate, reminderDate) && !payment.reminder_before_due_sent) {
          await notifyPaymentEvent(payment, "pending");
          await prisma.payments.update({
            where: { id: payment.id },
            data: { reminder_before_due_sent: true },
          });
        } else if (isSameDay(dueDate, today) && !payment.reminder_on_due_sent) {
          await notifyPaymentEvent(payment, "pending");
          await prisma.payments.update({
            where: { id: payment.id },
            data: { reminder_on_due_sent: true },
          });
        }
      }

      if (payment.status === "OVERDUE" && !payment.overdue_notified) {
        await notifyPaymentEvent(payment, "overdue");
        await prisma.payments.update({
          where: { id: payment.id },
          data: { overdue_notified: true },
        });
      }
    }
  } catch (err) {
    console.warn("[notification] processPaymentNotifications skipped:", err.message);
  }
}

/** SRS-178 — Cron processor for therapy session milestones. */
async function processTherapyMilestones() {
  const plans = await prisma.therapy_plans.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      patients: { include: { users: true } },
      doctors: { include: { users: true } },
      therapy_sessions: {
        select: { id: true, status: true },
      },
    },
  });

  for (const plan of plans) {
    const completedCount = plan.therapy_sessions.filter((s) => s.status === "COMPLETED").length;
    const totalSessions = plan.therapy_sessions.length;
    if (!completedCount) continue;

    for (const threshold of THERAPY_MILESTONE_THRESHOLDS) {
      if (completedCount >= threshold) {
        await notifyTherapyMilestone({ plan, completedCount: threshold, totalSessions });
      }
    }
  }
}

/** SRS-181 — Cron processor for welcome emails on new accounts. */
async function processWelcomeEmails() {
  const since = addDays(new Date(), -7);

  const users = await prisma.users.findMany({
    where: {
      is_active: true,
      created_at: { gte: since },
    },
    select: { id: true, name: true, email: true, role: true, created_at: true },
  });

  for (const user of users) {
    await notifyWelcomeNewAccount(user);
  }
}

async function notifyInternStatusUpdate(internUser, status, { reason = "" } = {}) {
  try {
    if (!internUser?.id) return;
    const label = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated";
    const message = `Your internship application has been ${label}.${reason ? ` Reason: ${reason}` : ""}`;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: `Internship Application ${label.charAt(0).toUpperCase() + label.slice(1)}`,
      message,
      emailSubject: `Internship Application ${label.charAt(0).toUpperCase() + label.slice(1)} — Life Ways Rehab`,
      emailHtml: buildWelcomeEmail({
        userName: internUser.name || "Intern",
        roleLabel: "intern",
        loginUrl: `${getFrontendUrl()}/intern/login`,
        extraMessage: message,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyInternStatusUpdate failed:", err.message);
  }
}

async function sendInternCredentialsEmail(user, { password, generated = true } = {}) {
  const loginUrl = `${getFrontendUrl()}/intern/login`;
  const credNote = generated
    ? `Temporary password: ${password}. Please change your password after first login.`
    : "";
  const html = buildWelcomeEmail({
    userName: user.name || "Intern",
    roleLabel: "intern",
    loginUrl,
    extraMessage: `Your internship account has been created. Email: ${user.email}. ${credNote}`,
  });
  return sendEmailIfConfigured(user.email, "Intern Account Created — Life Ways Rehab", html);
}

async function notifyInternAdded(internUser, internProfile) {
  try {
    if (!internUser?.id) return;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: "Welcome to the Internship Program",
      message: `Welcome ${internProfile?.name ?? internUser.name}! Your internship in ${internProfile?.department ?? "the program"} has started.`,
      emailSubject: "Welcome — Life Ways Rehab Internship",
      emailHtml: buildWelcomeEmail({
        userName: internUser.name || "Intern",
        roleLabel: "intern",
        loginUrl: `${getFrontendUrl()}/intern/login`,
        extraMessage: `Welcome to the Life Ways internship program (${internProfile?.department ?? ""}).`,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyInternAdded failed:", err.message);
  }
}

async function notifyMentorAssigned({ mentorUser, internName, department, assignmentDate }) {
  try {
    if (!mentorUser?.id) return;
    const message = `You have been assigned as mentor for ${internName} (${department}). Assignment date: ${assignmentDate}.`;
    await deliverNotification({
      userId: mentorUser.id,
      user: mentorUser,
      category: "general",
      type: "SYSTEM",
      title: "New Intern Assigned",
      message,
      emailSubject: "Mentor Assignment — Life Ways Rehab",
      emailHtml: buildWelcomeEmail({
        userName: mentorUser.name ?? "Doctor",
        roleLabel: "doctor",
        loginUrl: `${getFrontendUrl()}${getRoleLoginPath("DOCTOR")}`,
        extraMessage: message,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyMentorAssigned failed:", err.message);
  }
}

async function notifyInternMentorChanged(internUser, { mentorName, department }) {
  try {
    if (!internUser?.id) return;
    const message = `${mentorName} has been assigned as your clinical mentor (${department}).`;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: "Mentor Assigned",
      message,
      emailSubject: "Mentor Assigned — Life Ways Rehab",
      emailHtml: buildWelcomeEmail({
        userName: internUser.name || "Intern",
        roleLabel: "intern",
        loginUrl: `${getFrontendUrl()}/intern/login`,
        extraMessage: message,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyInternMentorChanged failed:", err.message);
  }
}

async function notifyTrainingLogSubmitted({ internId, internName, logDate, hours }) {
  try {
    const intern = await prisma.internees.findUnique({
      where: { id: String(internId) },
      include: {
        doctors: { include: { users: { select: { id: true, name: true, email: true } } } },
      },
    });
    const mentorUser = intern?.doctors?.users;
    if (mentorUser?.id) {
      await deliverNotification({
        userId: mentorUser.id,
        user: mentorUser,
        category: "general",
        type: "SYSTEM",
        title: "Training Log Submitted",
        message: `${internName} submitted a training log for ${logDate} (${hours}h).`,
        emailSubject: "Intern Training Log — Life Ways Rehab",
        emailHtml: buildWelcomeEmail({
          userName: mentorUser.name || "Mentor",
          roleLabel: "doctor",
          loginUrl: `${getFrontendUrl()}${getRoleLoginPath("DOCTOR")}`,
          extraMessage: `${internName} submitted a training log for ${logDate} (${hours} hours).`,
        }),
      });
    }
  } catch (err) {
    console.warn("[notification] notifyTrainingLogSubmitted failed:", err.message);
  }
}

async function notifyTrainingLogReviewed(internUser, { logDate }) {
  try {
    if (!internUser?.id) return;
    const message = `Your mentor reviewed your training log for ${logDate}.`;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: "Training Log Reviewed",
      message,
      emailSubject: "Training Log Reviewed — Life Ways Rehab",
      emailHtml: buildWelcomeEmail({
        userName: internUser.name || "Intern",
        roleLabel: "intern",
        loginUrl: `${getFrontendUrl()}/intern/login`,
        extraMessage: message,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyTrainingLogReviewed failed:", err.message);
  }
}

async function notifyAttendanceSubmitted({ internId, recordDate, status }) {
  try {
    const intern = await prisma.internees.findUnique({
      where: { id: String(internId) },
      include: {
        users: { select: { id: true, name: true } },
        doctors: { include: { users: { select: { id: true, name: true, email: true } } } },
      },
    });
    const mentorUser = intern?.doctors?.users;
    if (mentorUser?.id) {
      const message = `${intern.users?.name ?? "Intern"} submitted attendance for ${recordDate} (${status}).`;
      await deliverNotification({
        userId: mentorUser.id,
        user: mentorUser,
        category: "general",
        type: "SYSTEM",
        title: "Attendance Submitted",
        message,
        emailSubject: "Intern Attendance Submitted — Life Ways Rehab",
        emailHtml: buildWelcomeEmail({
          userName: mentorUser.name || "Mentor",
          roleLabel: "doctor",
          loginUrl: `${getFrontendUrl()}${getRoleLoginPath("DOCTOR")}`,
          extraMessage: message,
        }),
      });
    }
  } catch (err) {
    console.warn("[notification] notifyAttendanceSubmitted failed:", err.message);
  }
}

async function notifyAttendanceApproved(internUser, { date, status }) {
  try {
    if (!internUser?.id) return;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: "Attendance Approved",
      message: `Your attendance for ${date} (${status}) has been approved.`,
      emailSubject: "Attendance Approved — Life Ways Rehab",
      emailHtml: buildWelcomeEmail({
        userName: internUser.name || "Intern",
        roleLabel: "intern",
        loginUrl: `${getFrontendUrl()}/intern/login`,
        extraMessage: `Your attendance for ${date} has been approved.`,
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyAttendanceApproved failed:", err.message);
  }
}

async function notifyEvaluationCompleted(internUser, { rating, mentorName }) {
  try {
    if (!internUser?.id) return;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "MILESTONE",
      title: "Evaluation Completed",
      message: `${mentorName} completed your performance evaluation (rating: ${rating}/5).`,
      emailSubject: "Internship Evaluation — Life Ways Rehab",
      emailHtml: buildMilestoneEmail({
        recipientName: internUser.name || "Intern",
        patientName: internUser.name || "Intern",
        milestoneTitle: "Evaluation Completed",
        milestoneMessage: `Your mentor ${mentorName} completed your evaluation with a rating of ${rating}/5.`,
        recipientRole: "patient",
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyEvaluationCompleted failed:", err.message);
  }
}

async function notifyInternshipCompleted(internUser, internProfile) {
  try {
    if (!internUser?.id) return;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "MILESTONE",
      title: "Internship Completed",
      message: `Congratulations! Your internship in ${internProfile?.department ?? "the program"} is complete.`,
      emailSubject: "Internship Completed — Life Ways Rehab",
      emailHtml: buildMilestoneEmail({
        recipientName: internUser.name || "Intern",
        patientName: internUser.name || "Intern",
        milestoneTitle: "Internship Completed",
        milestoneMessage: "Congratulations on completing your internship at Life Ways Rehab.",
        recipientRole: "patient",
      }),
    });
  } catch (err) {
    console.warn("[notification] notifyInternshipCompleted failed:", err.message);
  }
}

async function notifyInternReactivated(internUser) {
  try {
    if (!internUser?.id) return;
    await deliverNotification({
      userId: internUser.id,
      user: internUser,
      category: "general",
      type: "SYSTEM",
      title: "Account Reactivated",
      message: "Your internship account has been reactivated. You may log in again.",
    });
  } catch (err) {
    console.warn("[notification] notifyInternReactivated failed:", err.message);
  }
}

async function notifyHighRiskScreening({ screening, patientName, conditionName }) {
  try {
    const admins = await prisma.users.findMany({
      where: { role: "ADMIN", is_active: true },
      select: { id: true, name: true, email: true },
    });
    const msg = `High-risk screening (${conditionName}) for ${patientName || "anonymous patient"}. Score: ${screening.score ?? "—"}.`;
    for (const admin of admins) {
      await deliverNotification({
        userId: admin.id,
        user: admin,
        category: "screening",
        type: "SYSTEM",
        title: "High-Risk Screening Alert",
        message: msg,
        emailSubject: "High-Risk Screening Alert — Life Ways Rehab",
        emailHtml: buildWelcomeEmail({
          userName: admin.name || "Admin",
          roleLabel: "administrator",
          loginUrl: `${getFrontendUrl()}${getRoleLoginPath("ADMIN")}`,
          extraMessage: `${msg} Please review the screening in the admin dashboard.`,
        }),
      });
    }
  } catch (err) {
    console.warn("[notification] notifyHighRiskScreening failed:", err.message);
  }
}

async function notifyPatientScreeningResult({ patientUser, conditionName, riskLevel, screeningId }) {
  try {
    if (!patientUser?.id) return;
    const riskLabel = riskLevel ? String(riskLevel).toLowerCase() : "completed";
    const message = `Your ${conditionName} screening result is ready (${riskLabel} risk). View your results in Screening.`;
    await deliverNotification({
      userId: patientUser.id,
      user: patientUser,
      category: "recovery",
      type: "MILESTONE",
      title: "Screening Result Ready",
      message,
      emailSubject: "Screening Result — Life Ways Rehab",
      emailHtml: buildMilestoneEmail({
        recipientName: patientUser.name ?? "Patient",
        patientName: patientUser.name ?? "Patient",
        milestoneTitle: "Screening Result Ready",
        milestoneMessage: `${message} Reference: ${String(screeningId).slice(0, 8)}`,
        recipientRole: "patient",
      }),
      relatedId: screeningId,
    });
  } catch (err) {
    console.error("[notification] notifyPatientScreeningResult failed:", err.message);
  }
}

async function notifyPatientDoctorAssigned({ patientUser, doctorName, context = "care" }) {
  try {
    if (!patientUser?.id) return;
    const message =
      context === "screening"
        ? `Dr. ${doctorName} has been assigned to follow up on your screening results.`
        : `Dr. ${doctorName} has been assigned to your care team.`;
    await deliverNotification({
      userId: patientUser.id,
      user: patientUser,
      category: "patient_update",
      type: "SYSTEM",
      title: "Doctor Assigned",
      message,
      emailSubject: "Doctor Assigned — Life Ways Rehab",
      emailHtml: buildWelcomeEmail({
        userName: patientUser.name ?? "Patient",
        roleLabel: "patient",
        loginUrl: `${getFrontendUrl()}${getRoleLoginPath("PATIENT")}`,
        extraMessage: message,
      }),
    });
  } catch (err) {
    console.error("[notification] notifyPatientDoctorAssigned failed:", err.message);
  }
}

/** SRS-181 — Hook for account creation (call from auth/admin modules when permitted). */
async function onAccountCreated(user, options = {}) {
  return notifyWelcomeNewAccount(user, options);
}

module.exports = {
  createUserNotification,
  notifyDoctorPatientAssignment,
  persistAndNotifyReport,
  notifyProgressReport,
  sendWelcomeEmail,
  notifyWelcomeNewAccount,
  onAccountCreated,
  notifyAppointmentBooked,
  notifyAppointmentCancelled,
  notifyAppointmentUpdated,
  notifyAppointmentApproved,
  notifyTherapyPlanAssigned,
  notifyTherapyResourceAdded,
  notifySessionReminder,
  notifyTherapySessionReminder,
  notifyPaymentEvent,
  notifyTherapyMilestone,
  processPaymentNotifications,
  processTherapyMilestones,
  processWelcomeEmails,
  notifyInternStatusUpdate,
  notifyHighRiskScreening,
  notifyPatientScreeningResult,
  notifyPatientDoctorAssigned,
  sendInternCredentialsEmail,
  notifyInternAdded,
  notifyMentorAssigned,
  notifyInternMentorChanged,
  notifyTrainingLogSubmitted,
  notifyTrainingLogReviewed,
  notifyAttendanceSubmitted,
  notifyAttendanceApproved,
  notifyEvaluationCompleted,
  notifyInternshipCompleted,
  notifyInternReactivated,
  describeAppointmentChanges,
  getNotificationPreferences,
  deliverNotification,
  PENDING_REMINDER_DAYS_BEFORE,
  THERAPY_MILESTONE_THRESHOLDS,
  isEmailConfigured,
};
