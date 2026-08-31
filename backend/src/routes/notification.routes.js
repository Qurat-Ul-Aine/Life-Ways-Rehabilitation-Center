const express = require("express");
const ctrl = require("../controllers/notification.controller");
const { requireRoles } = require("../middleware/auth");

const router = express.Router();
router.get("/me", ctrl.mine);
router.get("/me/unread-count", ctrl.unreadCount);
router.patch("/me/read-all", ctrl.markAllRead);
router.patch("/read-all", requireRoles("ADMIN"), ctrl.markAllReadAdmin);
router.get("/", requireRoles("ADMIN"), ctrl.listAll);
router.get("/admin/stats", requireRoles("ADMIN"), ctrl.adminStats);
router.get("/admin/history", requireRoles("ADMIN"), ctrl.adminHistory);
router.post("/", requireRoles("ADMIN"), ctrl.create);
router.patch("/:id/read", ctrl.markRead);
router.delete("/:id", ctrl.deleteOne);

module.exports.notificationRoutes = router;