"use strict";

const { Router } = require("express");
const { requireRoles } = require("../middleware/auth");
const ctrl = require("../controllers/reports.controller");

const router = Router();

router.get(
  "/therapy/daily",
  requireRoles("ADMIN", "DOCTOR", "PATIENT"),
  ctrl.therapyDaily
);

router.get(
  "/therapy/monthly",
  requireRoles("ADMIN", "DOCTOR", "PATIENT"),
  ctrl.therapyMonthly
);

router.get(
  "/doctors/performance",
  requireRoles("ADMIN", "DOCTOR"),
  ctrl.doctorPerformance
);

router.get(
  "/patients/performance",
  requireRoles("ADMIN", "DOCTOR", "PATIENT"),
  ctrl.patientPerformance
);

router.get(
  "/financial",
  requireRoles("ADMIN"),
  ctrl.financial
);

router.get(
  "/export/pdf",
  requireRoles("ADMIN", "DOCTOR", "PATIENT"),
  ctrl.exportPdf
);

router.get(
  "/export/excel",
  requireRoles("ADMIN", "DOCTOR", "PATIENT"),
  ctrl.exportExcel
);

router.patch("/:id", requireRoles("ADMIN", "DOCTOR"), ctrl.updateReport);
router.post("/:id/finalize", requireRoles("ADMIN", "DOCTOR"), ctrl.finalizeReport);

module.exports = { reportsRoutes: router };
