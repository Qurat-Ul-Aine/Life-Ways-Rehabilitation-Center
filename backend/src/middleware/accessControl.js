const { hasPermission } = require("../policies/accessPolicy");

/**
 * Express middleware — deny unless the authenticated user has the permission (SRS-22).
 * @param {string} permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
}

module.exports = { requirePermission };
