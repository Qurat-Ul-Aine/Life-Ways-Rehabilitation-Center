const express = require("express");
const ctrl = require("../controllers/recommendation.controller");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/generate",
  requireRoles("PATIENT", "FAMILY", "ADMIN"),
  ctrl.generate,
);

router.get(
  "/me/dashboard",
  requireRoles("PATIENT", "FAMILY"),
  ctrl.getDashboard,
);

router.get(
  "/me",
  requireRoles("PATIENT", "FAMILY"),
  ctrl.listMine,
);

router.get(
  "/patient/:patientId",
  requireRoles("ADMIN", "DOCTOR"),
  ctrl.listByPatient,
);

router.get(
  "/admin/management",
  requireRoles("ADMIN"),
  ctrl.getAdminManagement,
);

router.get(
  "/doctor/matches",
  requireRoles("DOCTOR"),
  ctrl.getDoctorMatches,
);

router.get(
  "/doctor/matches/:recommendationId",
  requireRoles("DOCTOR"),
  ctrl.getDoctorMatchDetail,
);

router.put(
  "/doctor/matches/:recommendationId/notes",
  requireRoles("DOCTOR"),
  ctrl.updateDoctorMatchNotes,
);

router.get(
  "/:id",
  requireRoles("PATIENT", "ADMIN", "DOCTOR"),
  ctrl.getById,
);

module.exports = { recommendationRoutes: router };
