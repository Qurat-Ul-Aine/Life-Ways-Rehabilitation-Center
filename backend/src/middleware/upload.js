"use strict";

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../lib/cloudinaryConfig");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const uploadRoot = path.join(__dirname, "..", "..", "uploads");

// ── Patient Documents (local disk — same as before) ──────────────────────────

function patientDocumentsStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      const patientId =
        typeof req.params.patientId === "string"
          ? req.params.patientId
          : typeof req.params.id === "string"
            ? req.params.id
            : "general";
      const dest = path.join(uploadRoot, "documents", patientId);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${stamp}-${safe}`);
    },
  });
}

const patientDocUpload = multer({
  storage: patientDocumentsStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function staffDocumentsStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      const staffId =
        typeof req.params.staffId === "string"
          ? req.params.staffId
          : typeof req.params.id === "string"
            ? req.params.id
            : "general";
      const dest = path.join(uploadRoot, "staff-documents", staffId);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${stamp}-${safe}`);
    },
  });
}

const staffDocUpload = multer({
  storage: staffDocumentsStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function therapyPlanFilesStorage() {
  return multer.diskStorage({
    destination(req, file, cb) {
      const planId =
        typeof req.body?.planId === "string"
          ? req.body.planId
          : typeof req.params?.planId === "string"
            ? req.params.planId
            : "general";
      const dest = path.join(uploadRoot, "therapy", planId);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${stamp}-${safe}`);
    },
  });
}

const THERAPY_PLAN_FILE_MAX_BYTES = 250 * 1024 * 1024; // 250 MB

const therapyPlanFileUpload = multer({
  storage: therapyPlanFilesStorage(),
  limits: { fileSize: THERAPY_PLAN_FILE_MAX_BYTES },
});

function patientAvatarStorage() {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = path.join(uploadRoot, "avatars", "patients");
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const userId = req.user?.id ? String(req.user.id).slice(0, 8) : "user";
      cb(null, `${userId}-${stamp}-${safe}`);
    },
  });
}

const patientImageUpload = multer({
  storage: patientAvatarStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, or WebP images are allowed."), ok);
  },
});

const generalStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dest = path.join(uploadRoot, "general");
    ensureDir(dest);
    cb(null, dest);
  },
  filename(req, file, cb) {
    const stamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${stamp}-${safe}`);
  },
});

const generalUpload = multer({
  storage: generalStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ── Doctor Image (Cloudinary) ─────────────────────────────────────────────────

const doctorImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "lifeways/doctors",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 600, height: 600, crop: "fill", gravity: "face" }],
  },
});

const doctorImageUpload = multer({
  storage: doctorImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

function adminAvatarStorage() {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = path.join(uploadRoot, "avatars", "admins");
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const userId = req.user?.id ? String(req.user.id).slice(0, 8) : "admin";
      cb(null, `${userId}-${stamp}-${safe}`);
    },
  });
}

function hospitalLogoStorage() {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = path.join(uploadRoot, "hospital");
      ensureDir(dest);
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const stamp = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `logo-${stamp}-${safe}`);
    },
  });
}

const imageFileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp|svg\+xml)$/i.test(file.mimetype);
  cb(ok ? null : new Error("Only JPG, PNG, WebP, or SVG images are allowed."), ok);
};

const adminImageUpload = multer({
  storage: adminAvatarStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const hospitalLogoUpload = multer({
  storage: hospitalLogoStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

module.exports = {
  uploadRoot,
  patientDocUpload,
  staffDocUpload,
  therapyPlanFileUpload,
  THERAPY_PLAN_FILE_MAX_BYTES,
  patientImageUpload,
  generalUpload,
  doctorImageUpload,
  adminImageUpload,
  hospitalLogoUpload,
};