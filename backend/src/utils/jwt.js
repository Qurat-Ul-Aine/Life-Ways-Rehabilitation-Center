"use strict";

const jwt = require("jsonwebtoken");

// ✅ FIXED: No fallback default — if JWT_SECRET missing, server crash karo at startup
// "changeme" default remove kar diya — weak secret se tokens forgeable the
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Exiting.");
  process.exit(1);
}

/**
 * @param {{ id: string; email: string; role: string }} payload
 * @returns {string}
 */
module.exports.signToken = (payload) => {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
};

/**
 * @param {string} token
 */
module.exports.verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};