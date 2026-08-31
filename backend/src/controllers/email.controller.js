const { sendSuccess, sendError } = require("../utils/response");
const { sendEmail, isEmailConfigured, getEmailConfigSummary } = require("../services/email.service");

async function sendTestEmail(req, res) {
  try {
    const { to, subject, message } = req.body ?? {};

    if (!to || !subject) {
      return sendError(res, 400, "to and subject are required");
    }

    if (!isEmailConfigured()) {
      return sendError(
        res,
        503,
        "Email service is not configured. Set EMAIL_USER, EMAIL_PASS, and optionally EMAIL_FROM in .env",
      );
    }

    const result = await sendEmail({
      to: String(to),
      subject: String(subject),
      html: message
        ? `<div style="font-family:sans-serif"><p>${String(message)}</p></div>`
        : "<p>Test email from Life Ways Rehab System.</p>",
    });

    if (!result.sent) {
      return sendError(res, 502, "Email delivery failed", result.reason);
    }

    return sendSuccess(res, 200, "Email sent successfully.", { to, subject });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Failed to send email");
  }
}

async function emailStatus(req, res) {
  return sendSuccess(res, 200, "OK", getEmailConfigSummary());
}

module.exports = { sendTestEmail, emailStatus };
