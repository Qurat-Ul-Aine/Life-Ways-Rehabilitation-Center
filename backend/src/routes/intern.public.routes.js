const express = require("express");
const ctrl = require("../controllers/intern.controller");

const router = express.Router();

/** Public intern self-registration — no auth required */
router.post("/signup", ctrl.signup);

module.exports = { internPublicRoutes: router };
