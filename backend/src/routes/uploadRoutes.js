const express = require("express");
const router = express.Router();
const { doctorImageUpload } = require("../middleware/upload");
const { authenticate } = require("../middleware/auth");

// POST /upload/doctor-image
router.post("/doctor-image", authenticate({ required: true }), doctorImageUpload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    return res.json({
      success: true,
      url: req.file.path, // Cloudinary URL
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;