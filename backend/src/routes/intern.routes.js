const express = require("express");
const { requireRoles } = require("../middleware/auth");
const ctrl = require("../controllers/intern.controller");
const {
  validateUuidParam,
  validateAttendanceIdParam,
  validateLogIdParam,
} = require("../validations/intern.validation");

const router = express.Router();

router.get("/me/dashboard", requireRoles("INTERN"), ctrl.dashboard);
router.get("/me/mentees", requireRoles("DOCTOR"), ctrl.myMentees);
router.get("/me", requireRoles("INTERN"), ctrl.me);
router.get("/reports/export", requireRoles("ADMIN", "DOCTOR"), ctrl.exportReport);

router.get("/", requireRoles("ADMIN"), ctrl.list);
router.get("/mentors", requireRoles("ADMIN"), ctrl.mentors);
router.post("/", requireRoles("ADMIN"), ctrl.create);
router.post("/:id/approve", requireRoles("ADMIN"), validateUuidParam, ctrl.approve);
router.post("/:id/reject", requireRoles("ADMIN"), validateUuidParam, ctrl.reject);
router.post("/:id/reactivate", requireRoles("ADMIN"), validateUuidParam, ctrl.reactivate);
router.post("/:id/complete", requireRoles("ADMIN"), validateUuidParam, ctrl.complete);

router.get("/:id", validateUuidParam, ctrl.getById);
router.put("/:id", requireRoles("ADMIN"), validateUuidParam, ctrl.update);
router.delete("/:id", requireRoles("ADMIN"), validateUuidParam, ctrl.remove);

router.put("/:id/mentor", requireRoles("ADMIN"), validateUuidParam, ctrl.assignMentor);
router.delete("/:id/mentor", requireRoles("ADMIN"), validateUuidParam, ctrl.removeMentor);

router.get("/:id/audit-logs", validateUuidParam, ctrl.auditLogs);
router.get("/:id/progress", validateUuidParam, ctrl.getProgress);

router.post("/:id/attendance", validateUuidParam, ctrl.addAttendance);
router.get("/:id/attendance", validateUuidParam, ctrl.getAttendance);
router.patch(
  "/attendance/:attendanceId/approve",
  requireRoles("ADMIN", "DOCTOR"),
  validateAttendanceIdParam,
  ctrl.approveAttendance,
);
router.put(
  "/attendance/:attendanceId",
  requireRoles("INTERN", "ADMIN"),
  validateAttendanceIdParam,
  ctrl.updateAttendance,
);

router.post("/:id/logs", validateUuidParam, ctrl.addLog);
router.get("/:id/logs", validateUuidParam, ctrl.getLogs);
router.put(
  "/logs/:logId",
  requireRoles("INTERN", "ADMIN"),
  validateLogIdParam,
  ctrl.updateLog,
);
router.patch(
  "/logs/:logId/review",
  requireRoles("ADMIN", "DOCTOR"),
  validateLogIdParam,
  ctrl.reviewLog,
);

router.post("/:id/evaluations", validateUuidParam, ctrl.addEvaluation);
router.get("/:id/evaluations", validateUuidParam, ctrl.getEvaluations);

module.exports = { internRoutes: router };
