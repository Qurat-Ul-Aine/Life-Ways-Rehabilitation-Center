const { verifyToken } = require("../utils/jwt");
const prisma = require("../lib/prisma");

const SUSPENDED_MESSAGE =
  "Your account has been suspended. Please contact the administrator.";

module.exports.SUSPENDED_MESSAGE = SUSPENDED_MESSAGE;

/**
 * @typedef {object} AuthedUser
 * @property {string} id
 * @property {string} email
 * @property {string} role
 */

/**
 * @param {object} opts
 * @param {boolean} [opts.required]
 */
module.exports.authenticate = ({ required = true } = {}) => {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return (req, res, next) => {
    const header = req.headers.authorization;
    let token = null;
    if (header && typeof header === "string" && header.startsWith("Bearer ")) {
      token = header.slice(7).trim();
    }

    if (!token) {
      if (required) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      next();
      return;
    }

    try {
      const decoded = verifyToken(token);
      const userIdRaw = decoded.sub ?? decoded.userId ?? decoded.id;
      const uid = String(userIdRaw);
      if (!uid || uid === "undefined") throw new Error("Invalid token payload");

      /** @type {AuthedUser} */
      req.user = {
        id: uid,
        email: String(decoded.email || ""),
        // ✅ FIXED: role uppercase store karo — DB enum PATIENT/DOCTOR/ADMIN se match kare
        role: String(decoded.role || "").toUpperCase(),
      };

      next();
    } catch {
      res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
  };
};

/**
 * @param {...string} allowed
 */
module.exports.requireRoles = (...allowed) => {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return (req, res, next) => {
    if (!req.user) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    // ✅ FIXED: "user" → "patient" replace hata diya — DB mein "user" role exist nahi karta
    // Ab sirf uppercase comparison — consistent with DB enum
    const userRole = req.user.role.toUpperCase();
    const ok = allowed.some((r) => r.toUpperCase() === userRole);

    if (!ok) {
      res.status(403).json({ success: false, message: "Insufficient permissions." });
      return;
    }

    next();
  };
};

/**
 * Blocks API access for suspended/disabled user accounts (SRS-26, SRS-27).
 */
module.exports.ensureActiveUser = async (req, res, next) => {
  if (!req.user?.id) {
    next();
    return;
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { is_active: true },
    });

    if (!user || user.is_active === false) {
      res.status(403).json({
        success: false,
        message: SUSPENDED_MESSAGE,
        code: "ACCOUNT_SUSPENDED",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ success: false, message: "Unable to verify account status." });
  }
};