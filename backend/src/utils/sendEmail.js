const {
  sendEmail: sendEmailCentral,
  isEmailConfigured,
} = require("../services/email.service");

/** @deprecated Prefer require("../services/email.service") directly. */
const sendEmail = async (to, subject, html) => {
  if (!isEmailConfigured()) {
    const err = new Error("Email service is not configured.");
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const result = await sendEmailCentral({ to, subject, html });
  if (!result.sent) {
    const err = new Error(result.reason ?? "Email delivery failed.");
    if (result.reason === "email_not_configured") err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }
};

module.exports = sendEmail;
module.exports.isEmailConfigured = isEmailConfigured;
