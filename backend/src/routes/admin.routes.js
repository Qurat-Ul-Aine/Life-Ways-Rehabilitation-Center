const express = require("express");
const ctrl = require("../controllers/admin.controller");
const settingsCtrl = require("../controllers/admin.settings.controller");
const galleryCtrl = require("../controllers/gallery.controller");
const { requireRoles } = require("../middleware/auth");
const {
  adminImageUpload,
  galleryImageUpload,
  hospitalLogoUpload,
} = require("../middleware/upload");

const router = express.Router();

router.use(requireRoles("ADMIN"));

function handleGalleryUpload(req, res, next) {
  galleryImageUpload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ success: false, message: "Image must be 5 MB or smaller." });
      return;
    }
    if (error.code === "INVALID_IMAGE_TYPE" || error.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({
        success: false,
        message: error.message || "Only JPEG, PNG, or WebP images are allowed.",
      });
      return;
    }

    console.error("[gallery] Cloudinary upload failed:", { code: error.code });
    res.status(502).json({ success: false, message: "Image upload failed. Please try again." });
  });
}

router.get("/gallery", galleryCtrl.listAdmin);
router.post("/gallery", handleGalleryUpload, galleryCtrl.create);
router.put("/gallery/:id", handleGalleryUpload, galleryCtrl.update);
router.delete("/gallery/:id", galleryCtrl.remove);

router.get("/dashboard-summary", ctrl.getDashboardSummary);
router.get("/search", ctrl.globalSearch);
router.get("/screening-tests", ctrl.listScreeningTests);
router.get("/internees", ctrl.listInternees);
router.get("/reports-summary", ctrl.getReportsSummary);

// Admin settings
router.get("/settings/profile", settingsCtrl.getProfile);
router.patch("/settings/profile", settingsCtrl.updateProfile);
router.post(
  "/settings/profile-image",
  adminImageUpload.single("image"),
  settingsCtrl.uploadProfileImage,
);
router.get("/settings/hospital", settingsCtrl.getHospital);
router.patch("/settings/hospital", settingsCtrl.updateHospital);
router.post(
  "/settings/hospital-logo",
  hospitalLogoUpload.single("logo"),
  settingsCtrl.uploadHospitalLogo,
);
router.get("/settings/system", settingsCtrl.getSystemPreferences);
router.patch("/settings/system", settingsCtrl.updateSystemPreferences);

module.exports = { adminRoutes: router };
