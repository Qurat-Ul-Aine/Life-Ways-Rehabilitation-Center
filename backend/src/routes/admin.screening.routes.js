"use strict";

const express = require("express");
const ctrl = require("../controllers/admin.screening.controller");
const { authenticate, requireRoles } = require("../middleware/auth");
const { asyncHandler, validateScreeningIdParam } = require("../validations/screening.validation");

const router = express.Router();

router.use(authenticate({ required: true }));
router.use(requireRoles("ADMIN", "STAFF"));

router.get("/stats", asyncHandler(ctrl.getStats));
router.get("/analytics", asyncHandler(ctrl.getAnalytics));
router.get("/", asyncHandler(ctrl.listScreenings));
router.get("/:id", validateScreeningIdParam, asyncHandler(ctrl.getDetail));
router.post("/assign-doctor", asyncHandler(ctrl.assignDoctor));

module.exports = router;
