"use strict";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.";

function validatePassword(password) {
  if (!PASSWORD_REGEX.test(String(password ?? ""))) {
    const err = new Error(PASSWORD_POLICY_MESSAGE);
    err.status = 400;
    throw err;
  }
}

/** Generate a one-time password that satisfies the policy (for admin-created accounts). */
function generateTemporaryPassword() {
  const crypto = require("crypto");
  const suffix = crypto.randomBytes(4).toString("hex");
  return `Life@${suffix}A1`;
}

module.exports = {
  PASSWORD_REGEX,
  PASSWORD_POLICY_MESSAGE,
  validatePassword,
  generateTemporaryPassword,
};
