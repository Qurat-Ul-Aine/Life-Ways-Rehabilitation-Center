const express = require("express");
const ctrl = require("../controllers/staff.controller");
const { staffDocUpload } = require("../middleware/upload");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireRoles("ADMIN", "DOCTOR"), ctrl.list);
router.get("/:id", requireRoles("ADMIN"), ctrl.getById);
router.post("/", requireRoles("ADMIN"), ctrl.create);
router.patch("/:id", requireRoles("ADMIN"), ctrl.patch);
router.put("/:id", requireRoles("ADMIN"), ctrl.patch);
router.patch("/:id/toggle-active", requireRoles("ADMIN"), ctrl.toggleAccountStatus);
router.delete("/:id", requireRoles("ADMIN"), ctrl.remove);

router.get("/:id/export-pdf", requireRoles("ADMIN"), ctrl.exportPdf);

router.get("/:id/documents", requireRoles("ADMIN"), ctrl.documentsList);
router.post(
  "/:id/documents",
  requireRoles("ADMIN"),
  (req, res, next) => {
    staffDocUpload.single("file")(req, res, (err) => {
      if (!err) return next();
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        success: false,
        message: err.message || "File upload failed.",
      });
    });
  },
  ctrl.documentsUpload,
);
router.delete(
  "/:id/documents/:documentId",
  requireRoles("ADMIN"),
  ctrl.documentsDelete,
);
router.get(
  "/:id/documents/serve/:filename",
  requireRoles("ADMIN"),
  ctrl.documentsServe,
);

router.post("/:id/attendance", requireRoles("ADMIN"), ctrl.postAttendance);
router.post("/:id/tasks", requireRoles("ADMIN", "DOCTOR"), ctrl.postTask);
router.patch("/:id/tasks/:taskId", requireRoles("ADMIN", "DOCTOR"), ctrl.patchTask);
router.post("/:id/notes", requireRoles("ADMIN", "DOCTOR"), ctrl.postNote);

module.exports.staffRoutes = router;
