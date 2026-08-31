"use strict";

const fs = require("fs");
const path = require("path");
const { uploadRoot } = require("../middleware/upload");

function removePathSafe(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`[secure-delete] Could not remove ${targetPath}:`, err.message);
  }
}

/** Remove uploaded medical documents for a patient (SRS-42). */
function purgePatientDocumentFiles(patientId) {
  const docDir = path.join(uploadRoot, "documents", String(patientId));
  removePathSafe(docDir);
}

module.exports = {
  purgePatientDocumentFiles,
  removePathSafe,
};
