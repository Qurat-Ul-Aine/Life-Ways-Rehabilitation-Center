const express = require("express");
const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const { requirePermission } = require("../middleware/accessControl");

const router = express.Router();
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/forgot-password/security-questions", ctrl.getResetSecurityQuestions);
router.post("/verify-security-answers", ctrl.verifySecurityAnswersForReset);
router.get("/security-questions/catalog", ctrl.getSecurityQuestionCatalog);
router.get("/validate-reset-token/:token", ctrl.validateResetToken);
router.post("/reset-password", ctrl.resetPassword);


router.put(
  "/change-password",
  authenticate({ required: true }),
  ctrl.changePassword
);
router.get("/me", authenticate({ required: true }), ctrl.me);
router.get("/preferences", authenticate({ required: true }), require("../controllers/preferences.controller").getMine);
router.patch("/preferences", authenticate({ required: true }), require("../controllers/preferences.controller").updateMine);
router.get("/security-questions/me", authenticate({ required: true }), ctrl.getMySecurityQuestions);
router.put("/security-questions/me", authenticate({ required: true }), ctrl.setMySecurityQuestions);
router.patch(
  "/admin/users/:id/disable",
  authenticate({ required: true }),
  requirePermission("users:suspend"),
  ctrl.disableAccount
);
router.patch(
  "/admin/users/:id/enable",
  authenticate({ required: true }),
  requirePermission("users:suspend"),
  ctrl.enableAccount
);
router.get(
  "/admin/users",
  authenticate({ required: true }),
  requirePermission("users:manage_roles"),
  ctrl.listUsers
);

module.exports.authRoutes = router;