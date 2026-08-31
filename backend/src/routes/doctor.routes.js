const express = require("express");
const ctrl = require("../controllers/doctor.controller");
const { authenticate, requireRoles } = require("../middleware/auth");
const { doctorImageUpload } = require("../middleware/upload");

const router = express.Router();

// Public routes — optional auth so admin can list pending doctors
router.get("/", authenticate({ required: false }), ctrl.list);

// Authenticated doctor — MUST be before /:id
router.get(
  "/me",
  authenticate({ required: true }),
  requireRoles("DOCTOR"),
  ctrl.getMe,
);
router.get(
  "/me/dashboard-summary",
  authenticate({ required: true }),
  requireRoles("DOCTOR"),
  ctrl.getDashboardSummary,
);
router.patch(
  "/me",
  authenticate({ required: true }),
  requireRoles("DOCTOR"),
  ctrl.patchMe,
);
router.post(
  "/me/profile-image",
  authenticate({ required: true }),
  requireRoles("DOCTOR"),
  doctorImageUpload.single("image"),
  ctrl.uploadProfileImage,
);

router.get("/:id", authenticate({ required: false }), ctrl.getById);

// Protected routes — admin only
router.post("/", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.create);
router.patch("/:id/approve", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.approveDoctor);
router.patch("/:id/toggle-active", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.toggleActive);
router.patch("/:id/services", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.patchServices);
router.patch("/:id", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.patch);
router.delete("/:id", authenticate({ required: true }), requireRoles("ADMIN"), ctrl.remove);

module.exports = { doctorRoutes: router };