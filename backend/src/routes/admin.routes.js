const express = require("express");
const ctrl = require("../controllers/admin.controller");
const settingsCtrl = require("../controllers/admin.settings.controller");
const { requireRoles } = require("../middleware/auth");
const { adminImageUpload, hospitalLogoUpload } = require("../middleware/upload");

const router = express.Router();

router.use(requireRoles("ADMIN"));

router.get("/dashboard-summary", ctrl.getDashboardSummary);
router.get("/search", ctrl.globalSearch);
router.get("/screening-tests", ctrl.listScreeningTests);
router.get("/internees", ctrl.listInternees);
router.get("/reports-summary", ctrl.getReportsSummary);

// Admin settings
router.get("/settings/profile", settingsCtrl.getProfile);
router.patch("/settings/profile", settingsCtrl.updateProfile);
router.post(
  "/settings/profile-image",
  adminImageUpload.single("image"),
  settingsCtrl.uploadProfileImage,
);
router.get("/settings/hospital", settingsCtrl.getHospital);
router.patch("/settings/hospital", settingsCtrl.updateHospital);
router.post(
  "/settings/hospital-logo",
  hospitalLogoUpload.single("logo"),
  settingsCtrl.uploadHospitalLogo,
);
router.get("/settings/system", settingsCtrl.getSystemPreferences);
router.patch("/settings/system", settingsCtrl.updateSystemPreferences);

module.exports = { adminRoutes: router };
