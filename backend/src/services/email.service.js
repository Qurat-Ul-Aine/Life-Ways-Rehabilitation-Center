const nodemailer = require("nodemailer");

let transporter = null;

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/** Visible sender address — never hardcode; set EMAIL_FROM in .env. */
function getFromEmail() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER || null;
}

/** Display name shown in the recipient's inbox (not an email address). */
function getFromName() {
  return process.env.EMAIL_FROM_NAME || "Life Ways Rehab";
}

function formatFromAddress() {
  const email = getFromEmail();
  if (!email) return null;
  return `"${getFromName()}" <${email}>`;
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

/**
 * Centralized email helper — all modules must use this.
 * @param {{ to: string; subject: string; html: string; text?: string }} params
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    return { sent: false, reason: "missing_recipient" };
  }

  const transport = getTransporter();
  if (!transport) {
    return { sent: false, reason: "email_not_configured" };
  }

  const from = formatFromAddress();
  if (!from) {
    return { sent: false, reason: "missing_sender" };
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] delivery failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

function getEmailConfigSummary() {
  const fromEmail = getFromEmail();
  return {
    configured: isEmailConfigured(),
    provider: `nodemailer/${process.env.EMAIL_SERVICE || "gmail"}`,
    smtpUser: process.env.EMAIL_USER || null,
    fromEmail,
    fromName: getFromName(),
  };
}

module.exports = {
  sendEmail,
  isEmailConfigured,
  getFromEmail,
  getFromName,
  formatFromAddress,
  getEmailConfigSummary,
};
