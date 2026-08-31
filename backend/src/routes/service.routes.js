const express = require("express");
const ctrl = require("../controllers/service.controller");

const router = express.Router();

router.get("/", ctrl.list);
router.get("/:slugOrId", ctrl.getBySlugOrId);

module.exports = { serviceRoutes: router };
