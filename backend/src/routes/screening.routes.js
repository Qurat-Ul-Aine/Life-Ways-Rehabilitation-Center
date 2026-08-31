"use strict";

const express = require("express");
const ctrl = require("../controllers/screening.controller");
const { authenticate, requireRoles } = require("../middleware/auth");
const {
  asyncHandler,
  validateSubmit,
  validateScreeningIdParam,
} = require("../validations/screening.validation");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, message: "Screening API is running" });
});

/** Public config for intro page */
router.get("/config", asyncHandler(ctrl.getConfig));

/** Public condition list */
router.get("/conditions", asyncHandler(ctrl.getConditions));

/** Dynamic questions by condition id or slug */
router.get("/questions/:conditionId", asyncHandler(ctrl.getQuestions));

/** Submit screening — backend scores (optional auth links patient) */
router.post(
  "/submit",
  authenticate({ required: false }),
  validateSubmit,
  asyncHandler(ctrl.submitScreening)
);

/** Result lookup — public for anonymous; auth required when linked to patient */
router.get(
  "/result/:id",
  authenticate({ required: false }),
  validateScreeningIdParam,
  asyncHandler(ctrl.getResult)
);

/** Patient own history */
router.get(
  "/my-history",
  authenticate({ required: true }),
  requireRoles("PATIENT"),
  asyncHandler(ctrl.getMyHistory)
);

/** Doctor assigned screenings */
router.get(
  "/doctor/assignments",
  authenticate({ required: true }),
  requireRoles("DOCTOR"),
  asyncHandler(ctrl.getDoctorAssignments)
);

/** Admin/staff delete */
router.delete(
  "/:id",
  authenticate({ required: true }),
  requireRoles("ADMIN", "STAFF"),
  validateScreeningIdParam,
  asyncHandler(ctrl.deleteScreening)
);

module.exports = router;
