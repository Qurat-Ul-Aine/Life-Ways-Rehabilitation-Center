const express = require("express");
const ctrl = require("../controllers/email.controller");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/status", ctrl.emailStatus);
router.post("/send", requireRoles("ADMIN"), ctrl.sendTestEmail);

module.exports = { emailRoutes: router };
