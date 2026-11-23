const express = require("express");
const controller = require("../controllers/gallery.controller");

const router = express.Router();

router.get("/", controller.listPublished);

module.exports = router;
