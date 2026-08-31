const express = require("express");
const ctrl = require("../controllers/message.controller");

const router = express.Router();

router.get("/threads", ctrl.listThreads);
router.get("/contacts", ctrl.listContacts);
router.post("/threads", ctrl.ensureThread);
router.get("/threads/:threadId", ctrl.getThreadMessages);
router.post("/threads/:threadId/messages", ctrl.sendMessage);
router.patch("/threads/:threadId/read", ctrl.markThreadRead);

module.exports.messageRoutes = router;
