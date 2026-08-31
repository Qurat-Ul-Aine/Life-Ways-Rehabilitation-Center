const express = require("express");
const ctrl = require("../controllers/prescription.controller");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/audit", requireRoles("ADMIN"), ctrl.listAudit);
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", requireRoles("DOCTOR", "ADMIN"), ctrl.create);
router.put("/:id", requireRoles("DOCTOR", "ADMIN"), ctrl.update);
router.patch("/:id/status", requireRoles("DOCTOR", "ADMIN"), ctrl.setStatus);
router.patch("/:id/stop", requireRoles("DOCTOR", "ADMIN"), ctrl.stopMedication);
router.patch("/:id/invalidate", requireRoles("ADMIN"), ctrl.markInvalid);
router.delete("/:id", requireRoles("ADMIN"), ctrl.softDelete);
router.post("/:id/mark-taken", requireRoles("PATIENT", "FAMILY"), ctrl.markTaken);

module.exports.prescriptionRoutes = router;
