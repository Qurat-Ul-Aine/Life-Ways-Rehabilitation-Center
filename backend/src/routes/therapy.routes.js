const express = require("express");
const ctrl = require("../controllers/therapy.controller");
const { therapyPlanFileUpload, THERAPY_PLAN_FILE_MAX_BYTES } = require("../middleware/upload");

const router = express.Router();

// Alias for patient dashboard
router.get("/therapy", ctrl.listTherapyAlias);

// Therapy Plans
router.get("/therapy-plans", ctrl.listPlans);
router.get("/therapy-plans/by-patient/:patientId", (req, res, next) => {
  req.query = { ...req.query, patientId: req.params.patientId };
  Promise.resolve(ctrl.listPlans(req, res)).catch(next);
});
router.post("/therapy-plans", ctrl.createPlan);
router.get("/therapy-plans/:planId/files/serve/:filename", ctrl.serveFile);
router.get("/therapy-plans/:id", ctrl.getPlan);
router.put("/therapy-plans/:id", ctrl.updatePlan);
router.patch("/therapy-plans/:id", ctrl.updatePlan);
router.delete("/therapy-plans/:id", ctrl.deletePlan);

// Sessions — nested under plans
router.get("/therapy-plans/:planId/sessions", ctrl.listSessions);
router.post("/therapy-plans/:planId/sessions", ctrl.createSession);
router.put("/therapy-plans/:planId/sessions/:sessionId", ctrl.updateSession);
// Sessions — doctor may delete own plan sessions from IC workflow
router.delete("/therapy-plans/:planId/sessions/:sessionId", ctrl.deleteSession);

// Legacy session routes
router.get("/therapy-sessions/plan/:planId", ctrl.listSessions);
router.post("/therapy-sessions", ctrl.createSession);

// Therapy file uploads & exercises
router.post(
  "/therapy-files",
  (req, res, next) => {
    therapyPlanFileUpload.single("file")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        const maxMb = Math.round(THERAPY_PLAN_FILE_MAX_BYTES / (1024 * 1024));
        return res.status(413).json({
          message: `File is too large. Maximum allowed size is ${maxMb} MB.`,
          code: "LIMIT_FILE_SIZE",
          maxBytes: THERAPY_PLAN_FILE_MAX_BYTES,
        });
      }
      return res.status(400).json({ message: err.message || "Upload failed." });
    });
  },
  ctrl.uploadFile,
);
router.get("/therapy-files/:planId", ctrl.listFiles);
router.delete("/therapy-files/:planId/:fileId", ctrl.deleteFile);

router.post("/therapy-plans/:planId/exercises", ctrl.createExercise);
router.put("/therapy-plans/:planId/exercises/:exerciseId", ctrl.updateExercise);
router.delete("/therapy-plans/:planId/exercises/:exerciseId", ctrl.deleteExercise);

module.exports.therapyRoutes = router;
