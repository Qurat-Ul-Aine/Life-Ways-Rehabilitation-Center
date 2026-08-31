const express = require("express");

const ctrl = require("../controllers/patient.controller");
const { patientDocUpload, patientImageUpload } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireRoles("ADMIN", "DOCTOR"), ctrl.list);

router.get("/me", requireRoles("PATIENT", "FAMILY"), ctrl.getMe);
router.patch("/me", requireRoles("PATIENT"), ctrl.patchMe);
router.post(
  "/me/profile-image",
  requireRoles("PATIENT"),
  patientImageUpload.single("image"),
  ctrl.uploadProfileImage,
);
router.get("/me/dashboard-summary", requireRoles("PATIENT", "FAMILY"), ctrl.getDashboardSummary);
router.get("/me/recovery-summary", requireRoles("PATIENT", "FAMILY"), ctrl.getRecoverySummary);
router.get("/me/documents", requireRoles("PATIENT", "FAMILY"), ctrl.getMyDocuments);
router.get(
  "/me/documents/:source/:docId/download",
  requireRoles("PATIENT", "FAMILY"),
  ctrl.downloadMyDocument,
);
router.get(
  "/me/documents/:source/:docId",
  requireRoles("PATIENT", "FAMILY"),
  ctrl.viewMyDocument,
);

router.get("/:id", requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY"), ctrl.getById);
router.post("/", requireRoles("ADMIN"), ctrl.create);
router.put("/:id", requireRoles("ADMIN"), ctrl.updatePut);
router.patch("/:id", requireRoles("ADMIN"), ctrl.updatePatch);
router.delete("/:id", requireRoles("ADMIN"), ctrl.remove);
router.patch("/:id/assign-doctor", requireRoles("ADMIN"), ctrl.assignDoctor);
router.patch("/:id/toggle-active", requireRoles("ADMIN"), ctrl.toggleAccountStatus);
router.post("/:id/medical-records", requireRoles("DOCTOR"), ctrl.addMedicalRecord);
router.patch("/:id/medical-records/:recordId", requireRoles("DOCTOR"), ctrl.updateMedicalRecord);
router.patch("/:id/diagnosis", requireRoles("DOCTOR"), ctrl.updateDiagnosis);
router.get("/:id/audit-log", requireRoles("ADMIN", "DOCTOR"), ctrl.getAuditLog);
// DEPRECATED: legacy session entry — prefer POST /therapy-plans/:planId/sessions
router.post("/:id/therapy-sessions", requireRoles("DOCTOR"), ctrl.addTherapySession);
router.post("/:id/recovery-points", requireRoles("DOCTOR"), ctrl.addRecoveryPoint);
router.post("/:id/confidential-notes", requireRoles("DOCTOR"), ctrl.addConfidentialNote);
router.get("/:id/report", requireRoles("ADMIN", "DOCTOR"), ctrl.reportPdf);
router.get("/:id/documents", requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY"), ctrl.documentsList);
router.post(
  "/:id/documents",
  requireRoles("ADMIN", "DOCTOR"),
  patientDocUpload.single("file"),
  ctrl.documentsUpload,
);
router.get(
  "/:id/documents/serve/:filename",
  requireRoles("ADMIN", "DOCTOR", "PATIENT", "FAMILY"),
  ctrl.documentsServe,
);

module.exports = router;
