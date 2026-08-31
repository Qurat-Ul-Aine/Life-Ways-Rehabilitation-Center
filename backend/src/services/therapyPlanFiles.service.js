"use strict";

const fs = require("fs");
const path = require("path");
const prisma = require("../lib/prisma");

const uploadsDirForPlan = (planId) =>
  path.join(__dirname, "..", "..", "uploads", "therapy", String(planId));

function inferFileType(mimeType, originalName) {
  const mime = String(mimeType ?? "").toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  const ext = path.extname(String(originalName)).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) return "video";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return "image";
  return "document";
}

function mapTherapyPlanFile(row) {
  return {
    id: row.id,
    planId: row.therapy_plan_id,
    fileName: row.original_name,
    title: row.title,
    fileType: row.file_type ?? "document",
    url: `/api/therapy-plans/${row.therapy_plan_id}/files/serve/${encodeURIComponent(row.file_name)}`,
    uploadedBy: row.uploaded_by ?? "Unknown",
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
    sizeKb: row.file_size ? Math.round(row.file_size / 1024) : null,
    mimeType: row.mime_type ?? null,
    storedFileName: row.file_name,
  };
}

async function loadTherapyPlanFiles(planId) {
  const rows = await prisma.therapy_plan_files.findMany({
    where: { therapy_plan_id: String(planId) },
    orderBy: { uploaded_at: "desc" },
  });
  return rows.map(mapTherapyPlanFile);
}

async function addTherapyPlanFile(planId, file, meta = {}) {
  if (!file) {
    const err = new Error("No file uploaded.");
    err.status = 400;
    throw err;
  }

  const title = String(meta.title ?? file.originalname ?? "Exercise file").trim();
  const fileType = inferFileType(file.mimetype, file.originalname);

  const record = await prisma.therapy_plan_files.create({
    data: {
      therapy_plan_id: String(planId),
      title,
      file_name: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype ?? null,
      file_size: file.size ?? null,
      file_type: fileType,
      uploaded_by: meta.uploadedBy ?? null,
    },
  });

  return mapTherapyPlanFile(record);
}

async function deleteTherapyPlanFile(planId, fileId) {
  const row = await prisma.therapy_plan_files.findFirst({
    where: { id: String(fileId), therapy_plan_id: String(planId) },
  });
  if (!row) {
    const err = new Error("File not found.");
    err.status = 404;
    throw err;
  }

  const fp = path.join(uploadsDirForPlan(planId), row.file_name);
  if (fs.existsSync(fp)) {
    try {
      fs.unlinkSync(fp);
    } catch {
      // continue
    }
  }

  await prisma.therapy_plan_files.delete({ where: { id: row.id } });
  return { id: row.id };
}

function resolveTherapyPlanFilePath(planId, fileName) {
  const fn = String(fileName ?? "");
  if (fn.includes("..") || fn.includes(path.sep)) return null;
  const fp = path.join(uploadsDirForPlan(planId), fn);
  if (!fs.existsSync(fp)) return null;
  return fp;
}

module.exports = {
  mapTherapyPlanFile,
  loadTherapyPlanFiles,
  addTherapyPlanFile,
  deleteTherapyPlanFile,
  resolveTherapyPlanFilePath,
};
