const express = require("express");
const ctrl = require("../controllers/appointment.controller");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

const clinicalRoles = requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY");

router.get("/", clinicalRoles, ctrl.list);
router.get("/slots", clinicalRoles, ctrl.getSlots);
router.get("/:id", clinicalRoles, ctrl.getById);
router.post("/", clinicalRoles, ctrl.create);
router.patch("/:id", requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY"), ctrl.update);
router.put("/:id", requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY"), ctrl.update);
router.delete("/:id", requireRoles("ADMIN", "DOCTOR"), ctrl.remove);

router.post("/:id/cancel", clinicalRoles, ctrl.cancel);
router.post("/:id/confirm", requireRoles("ADMIN", "DOCTOR"), ctrl.confirm);
router.post("/:id/reschedule", clinicalRoles, ctrl.reschedule);

// Telehealth session notes
router.get("/:id/telehealth/notes", clinicalRoles, ctrl.getTelehealthNotes);
router.put("/:id/telehealth/notes", requireRoles("ADMIN", "DOCTOR"), ctrl.updateTelehealthNotes);

// Session feedback
router.post("/:id/feedback", clinicalRoles, ctrl.saveFeedback);
router.get("/:id/feedback", clinicalRoles, ctrl.getFeedback);

module.exports.appointmentRoutes = router;
