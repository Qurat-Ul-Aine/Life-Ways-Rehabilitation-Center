"use strict";

const BRAND = {
  name: "Life Ways Rehabilitation Center",
  shortName: "Life Ways Rehab",
  primary: "#0f766e",
  accent: "#0369a1",
  warning: "#b45309",
  success: "#059669",
  muted: "#64748b",
  background: "#f4f4f5",
};

const DEFAULT_HOSPITAL = {
  hospital_name: BRAND.name,
  logo_url: null,
  contact_email: "info@lifewaysrehab.com",
  contact_phone: "+92 300 0000000",
  address: "Life Ways Rehabilitation Center, Pakistan",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveHospital(hospital) {
  const h = { ...DEFAULT_HOSPITAL, ...(hospital || {}) };
  return {
    name: h.hospital_name || BRAND.name,
    shortName: BRAND.shortName,
    logoUrl: h.logo_url || null,
    email: h.contact_email || DEFAULT_HOSPITAL.contact_email,
    phone: h.contact_phone || DEFAULT_HOSPITAL.contact_phone,
    address: h.address || DEFAULT_HOSPITAL.address,
  };
}

function wrapEmailLayout({ title, bodyHtml, preheader = "", hospital }) {
  const h = resolveHospital(hospital);
  const logoBlock = h.logoUrl
    ? `<img src="${escapeHtml(h.logoUrl)}" alt="${escapeHtml(h.shortName)}" style="max-height:48px;max-width:180px;margin-bottom:8px;" />`
    : `<p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(h.shortName)}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:Arial,Helvetica,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${BRAND.primary};padding:20px 24px;text-align:center;">
              ${logoBlock}
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">${escapeHtml(h.name)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;color:#111827;line-height:1.6;font-size:15px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;">${escapeHtml(h.name)}</p>
              <p style="margin:0 0 4px;font-size:12px;color:${BRAND.muted};">${escapeHtml(h.address)}</p>
              <p style="margin:0 0 4px;font-size:12px;color:${BRAND.muted};">
                Phone: <a href="tel:${escapeHtml(h.phone)}" style="color:${BRAND.primary};text-decoration:none;">${escapeHtml(h.phone)}</a>
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:${BRAND.muted};">
                Email: <a href="mailto:${escapeHtml(h.email)}" style="color:${BRAND.primary};text-decoration:none;">${escapeHtml(h.email)}</a>
              </p>
              <p style="margin:0;font-size:11px;color:${BRAND.muted};">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailTable(rows) {
  const items = rows
    .filter((row) => row?.value != null && String(row.value).trim() !== "")
    .map(
      (row) => `<tr>
        <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:40%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  if (!items) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">${items}</table>`;
}

function ctaButton(label, href) {
  return `<p style="margin:24px 0;text-align:center;">
    <a href="${escapeHtml(href)}" style="background:${BRAND.primary};color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
      ${escapeHtml(label)}
    </a>
  </p>`;
}

function buildAppointmentConfirmationEmail(ctx, recipientRole, hospital) {
  const greeting =
    recipientRole === "doctor"
      ? `Dear Dr. ${escapeHtml(ctx.doctorName)},`
      : `Dear ${escapeHtml(ctx.patientName)},`;

  const intro =
    recipientRole === "doctor"
      ? `<p><strong>${escapeHtml(ctx.patientName)}</strong> has successfully booked an appointment with you.</p>`
      : `<p>Your appointment has been <strong>confirmed</strong>.</p>`;

  const meetingRow =
    ctx.mode === "Online" && ctx.meetingLink
      ? `<p style="margin:16px 0;text-align:center;"><a href="${escapeHtml(ctx.meetingLink)}" style="color:${BRAND.primary};font-weight:700;">Join online meeting</a></p>`
      : "";

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.primary};font-size:22px;">Appointment Confirmation</h2>
    <p>${greeting}</p>
    ${intro}
    ${detailTable([
      { label: "Patient", value: ctx.patientName },
      { label: "Doctor", value: ctx.doctorName },
      { label: "Date", value: ctx.date },
      { label: "Time", value: ctx.time },
      { label: "Visit Mode", value: ctx.mode },
      { label: "Type", value: ctx.appointmentType },
      { label: "Status", value: ctx.statusLabel },
      { label: "Location", value: ctx.location },
      { label: "Meeting Link", value: ctx.meetingLink },
      { label: "Reason", value: ctx.reason },
    ])}
    ${meetingRow}
    <p>Please arrive on time or join online as scheduled. Contact the clinic if you need to reschedule.</p>
  `;

  return wrapEmailLayout({
    title: "Appointment Confirmation",
    preheader: `Appointment confirmed on ${ctx.date} at ${ctx.time}`,
    bodyHtml,
    hospital,
  });
}

function buildAppointmentCancellationEmail(ctx, recipientRole, hospital) {
  const greeting =
    recipientRole === "doctor"
      ? `Dear Dr. ${escapeHtml(ctx.doctorName)},`
      : `Dear ${escapeHtml(ctx.patientName)},`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.warning};font-size:22px;">Appointment Cancelled</h2>
    <p>${greeting}</p>
    <p>The following appointment has been <strong>cancelled</strong>:</p>
    ${detailTable([
      { label: "Patient", value: ctx.patientName },
      { label: "Doctor", value: ctx.doctorName },
      { label: "Cancelled Date", value: ctx.date },
      { label: "Cancelled Time", value: ctx.time },
      { label: "Visit Mode", value: ctx.mode },
      { label: "Status", value: "Cancelled" },
      { label: "Reason", value: ctx.reason },
    ])}
  `;

  return wrapEmailLayout({
    title: "Appointment Cancelled",
    preheader: `Appointment on ${ctx.date} was cancelled`,
    bodyHtml,
    hospital,
  });
}

function buildAppointmentUpdateEmail(ctx, changeSummary, recipientRole, hospital) {
  const greeting =
    recipientRole === "doctor"
      ? `Dear Dr. ${escapeHtml(ctx.doctorName)},`
      : `Dear ${escapeHtml(ctx.patientName)},`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.accent};font-size:22px;">Appointment Updated</h2>
    <p>${greeting}</p>
    <p>An appointment has been <strong>updated</strong>:</p>
    <p style="background:#f0f9ff;padding:12px;border-radius:8px;"><strong>${escapeHtml(changeSummary)}</strong></p>
    ${detailTable([
      { label: "Patient", value: ctx.patientName },
      { label: "Doctor", value: ctx.doctorName },
      { label: "Date", value: ctx.date },
      { label: "Time", value: ctx.time },
      { label: "Visit Mode", value: ctx.mode },
      { label: "Type", value: ctx.appointmentType },
      { label: "Location", value: ctx.location },
      { label: "Meeting Link", value: ctx.meetingLink },
    ])}
  `;

  return wrapEmailLayout({
    title: "Appointment Updated",
    preheader: changeSummary,
    bodyHtml,
    hospital,
  });
}

function buildReminderEmail(ctx, recipientRole, kind = "appointment", hospital) {
  const label = kind === "therapy" ? "Therapy Session Reminder" : "Appointment Reminder";
  const greeting =
    recipientRole === "doctor"
      ? `Dear Dr. ${escapeHtml(ctx.doctorName)},`
      : `Dear ${escapeHtml(ctx.patientName)},`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.primary};font-size:22px;">${label}</h2>
    <p>${greeting}</p>
    <p>This is a reminder for your upcoming ${kind === "therapy" ? "therapy session" : "appointment"}:</p>
    ${detailTable([
      { label: "Patient", value: ctx.patientName },
      { label: "Doctor", value: ctx.doctorName },
      { label: "Date", value: ctx.date },
      { label: "Time", value: ctx.time },
      { label: "Visit Mode", value: ctx.mode },
      { label: "Location", value: ctx.location },
      { label: "Meeting Link", value: ctx.meetingLink },
    ])}
  `;

  return wrapEmailLayout({
    title: label,
    preheader: `Reminder: ${ctx.date} at ${ctx.time}`,
    bodyHtml,
    hospital,
  });
}

function buildTherapyReminderEmail(ctx, hospital) {
  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.primary};font-size:22px;">Therapy Session Reminder</h2>
    <p>Dear ${escapeHtml(ctx.patientName)},</p>
    <p>This is a reminder for your upcoming therapy session:</p>
    ${detailTable([
      { label: "Session Title", value: ctx.sessionTitle },
      { label: "Session Type", value: ctx.sessionType },
      { label: "Therapy Date", value: ctx.date },
      { label: "Therapy Time", value: ctx.time },
      { label: "Therapist", value: ctx.doctorName },
      { label: "Therapy Plan", value: ctx.therapyType },
    ])}
    <p style="background:#ecfdf5;padding:14px;border-radius:8px;">Please attend your session as scheduled. Consistent therapy is key to your recovery.</p>
  `;

  return wrapEmailLayout({
    title: "Therapy Session Reminder",
    preheader: `Therapy session on ${ctx.date} at ${ctx.time}`,
    bodyHtml,
    hospital,
  });
}

function buildPaymentEmail({ patientName, amount, referenceNumber, paymentDate, status, invoiceNumber, kind }, hospital) {
  const titles = {
    success: "Payment Received",
    verified: "Payment Verified",
    invoice: "Invoice Generated",
    pending: "Payment Pending",
    overdue: "Payment Overdue",
  };
  const title = titles[kind] || "Payment Notification";
  const color = kind === "overdue" ? BRAND.warning : kind === "success" || kind === "verified" ? BRAND.success : BRAND.primary;

  const intro =
    kind === "success" || kind === "verified"
      ? "Thank you — your payment has been received and verified successfully."
      : kind === "invoice"
        ? "A new invoice has been generated for your account."
        : kind === "overdue"
          ? "Your payment is now overdue. Please settle the outstanding balance at your earliest convenience."
          : "You have a pending payment on your account.";

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${color};font-size:22px;">${title}</h2>
    <p>Dear ${escapeHtml(patientName)},</p>
    <p>${intro}</p>
    ${detailTable([
      { label: "Amount", value: amount },
      { label: "Invoice Number", value: invoiceNumber },
      { label: "Reference Number", value: referenceNumber },
      { label: "Payment Date", value: paymentDate },
      { label: "Payment Status", value: status },
    ])}
    <p>If you have questions about this payment, please contact our billing team.</p>
  `;

  return wrapEmailLayout({
    title,
    preheader: `${title} — ${amount}`,
    bodyHtml,
    hospital,
  });
}

function buildMilestoneEmail({ recipientName, patientName, milestoneTitle, milestoneMessage, recipientRole, progressPercent }, hospital) {
  const greeting =
    recipientRole === "doctor"
      ? `Dear Dr. ${escapeHtml(recipientName)},`
      : `Dear ${escapeHtml(recipientName)},`;

  const progressLine =
    progressPercent != null
      ? `<p><strong>Progress:</strong> ${escapeHtml(String(progressPercent))}% of scheduled sessions completed.</p>`
      : "";

  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.success};font-size:22px;">${escapeHtml(milestoneTitle)}</h2>
    <p>${greeting}</p>
    <p>${escapeHtml(milestoneMessage)}</p>
    ${progressLine}
    ${
      recipientRole === "doctor"
        ? `<p>Patient: <strong>${escapeHtml(patientName)}</strong></p>`
        : `<p style="background:#ecfdf5;padding:14px;border-radius:8px;">Keep up the excellent work — every session brings you closer to your recovery goals. Your dedication makes a real difference.</p>`
    }
  `;

  return wrapEmailLayout({
    title: milestoneTitle,
    preheader: milestoneMessage,
    bodyHtml,
    hospital,
  });
}

function buildWelcomeEmail({ userName, roleLabel, loginUrl, extraMessage }, hospital) {
  const bodyHtml = `
    <h2 style="margin:0 0 12px;color:${BRAND.primary};font-size:22px;">Welcome to ${BRAND.shortName}</h2>
    <p>Dear ${escapeHtml(userName)},</p>
    <p>Your <strong>${escapeHtml(roleLabel)}</strong> account has been created successfully.</p>
    ${extraMessage ? `<p>${escapeHtml(extraMessage)}</p>` : ""}
    ${loginUrl ? ctaButton("Sign in to your account", loginUrl) : ""}
    <p>We are committed to supporting your rehabilitation journey with compassionate, professional care.</p>
  `;

  return wrapEmailLayout({
    title: `Welcome to ${BRAND.shortName}`,
    preheader: `Your ${roleLabel} account is ready`,
    bodyHtml,
    hospital,
  });
}

module.exports = {
  BRAND,
  DEFAULT_HOSPITAL,
  wrapEmailLayout,
  buildAppointmentConfirmationEmail,
  buildAppointmentCancellationEmail,
  buildAppointmentUpdateEmail,
  buildReminderEmail,
  buildTherapyReminderEmail,
  buildPaymentEmail,
  buildMilestoneEmail,
  buildWelcomeEmail,
};
