"use strict";

const fs = require("fs");
const path = require("path");
const prisma = require("../lib/prisma");

const VALID_STAFF_DOC_CATEGORIES = new Set(["certificate", "id_proof", "other"]);

function toDateStr(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeAttendanceStatus(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "present") return "present";
  if (s === "absent") return "absent";
  return null;
}

function normalizeTaskStatus(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "completed" || s === "done") return "completed";
  return "pending";
}

function mapAttendance(row) {
  return {
    id: row.id,
    date: toDateStr(row.date),
    status: normalizeAttendanceStatus(row.status) ?? row.status,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
  };
}

function mapTask(row) {
  return {
    id: row.id,
    taskDescription: row.task_description,
    assignedBy: row.assigned_by,
    assignedById: row.assigned_by_id ?? null,
    status: normalizeTaskStatus(row.status),
    date: row.date ? new Date(row.date).toISOString() : null,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    noteText: row.note_text,
    addedBy: row.added_by,
    addedById: row.added_by_id ?? null,
    addedByRole: row.added_by_role ?? null,
    date: row.date ? new Date(row.date).toISOString() : null,
  };
}

function emptyTaskSummary() {
  return {
    total: 0,
    completed: 0,
    pending: 0,
    completedValue: "—",
    completedHint: "No tasks yet",
    pendingValue: "—",
    pendingHint: "No pending tasks",
  };
}

function computeTaskSummary(tasks) {
  const list = tasks ?? [];
  const total = list.length;
  if (total === 0) return emptyTaskSummary();

  const completed = list.filter((t) => normalizeTaskStatus(t.status) === "completed").length;
  const pending = total - completed;

  return {
    total,
    completed,
    pending,
    completedValue: `${completed}/${total}`,
    completedHint:
      pending === 0
        ? "All caught up"
        : `${pending} task${pending === 1 ? "" : "s"} pending`,
    pendingValue: String(pending),
    pendingHint: pending === 0 ? "No pending tasks" : "Needs attention",
  };
}

function computeTenureSummary(joinedAt) {
  if (!joinedAt) {
    return {
      displayValue: "—",
      subtitle: "Join date not set",
      joinedDate: null,
      months: 0,
    };
  }

  const start = joinedAt instanceof Date ? joinedAt : new Date(joinedAt);
  if (Number.isNaN(start.getTime())) {
    return {
      displayValue: "—",
      subtitle: "Join date not set",
      joinedDate: null,
      months: 0,
    };
  }

  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;

  let displayValue;
  if (months < 12) {
    if (months === 0) displayValue = "Less than 1 month";
    else if (months === 1) displayValue = "1 month";
    else displayValue = `${months} months`;
  } else {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const yearLabel = years === 1 ? "1 yr" : `${years} yrs`;
    if (rem === 0) displayValue = yearLabel;
    else if (rem === 1) displayValue = `${yearLabel} 1 month`;
    else displayValue = `${yearLabel} ${rem} months`;
  }

  const joinedDate = toDateStr(start);
  const subtitle = `Joined ${start.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return {
    displayValue,
    subtitle,
    joinedDate,
    months,
  };
}

function fileTypeLabel(name, mimeType) {
  if (mimeType) {
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("png")) return "PNG";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "JPG";
    if (mimeType.includes("word")) return "DOC";
  }
  const ext = path.extname(String(name)).replace(".", "").toUpperCase();
  return ext || "FILE";
}

function mapStaffDocument(row) {
  return {
    id: row.id,
    category: VALID_STAFF_DOC_CATEGORIES.has(row.category) ? row.category : "other",
    title: row.title,
    fileType: fileTypeLabel(row.original_name, row.mime_type),
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
    mimeType: row.mime_type ?? null,
    fileName: row.file_name,
    fileSize: row.file_size ?? null,
  };
}

const uploadsDirForStaff = (staffId) =>
  path.join(__dirname, "..", "..", "uploads", "staff-documents", String(staffId));

function assertStaffDocumentsModel() {
  if (!prisma.staff_documents || typeof prisma.staff_documents.create !== "function") {
    const err = new Error(
      "Staff documents module is unavailable. Stop the API server, run: npx prisma generate && npx prisma migrate deploy, then restart.",
    );
    err.status = 503;
    throw err;
  }
}

async function loadStaffDocuments(staffId) {
  assertStaffDocumentsModel();
  const id = String(staffId);
  const rows = await prisma.staff_documents.findMany({
    where: { staff_id: id },
    orderBy: { uploaded_at: "desc" },
  });
  return rows.map(mapStaffDocument);
}

async function addStaffDocument(staffId, file, meta = {}) {
  assertStaffDocumentsModel();
  await assertStaffExists(staffId);
  if (!file) {
    const err = new Error("No file uploaded.");
    err.status = 400;
    throw err;
  }

  const categoryRaw = String(meta.category ?? "").toLowerCase();
  const category = VALID_STAFF_DOC_CATEGORIES.has(categoryRaw) ? categoryRaw : "other";
  const title = String(meta.title ?? file.originalname ?? "Document").trim();

  const record = await prisma.staff_documents.create({
    data: {
      staff_id: String(staffId),
      category,
      title,
      file_name: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype ?? null,
      file_size: file.size ?? null,
    },
  });

  return mapStaffDocument(record);
}

async function deleteStaffDocument(staffId, documentId) {
  assertStaffDocumentsModel();
  await assertStaffExists(staffId);

  const staffKey = String(staffId);
  const docId = String(documentId);

  const record = await prisma.staff_documents.findFirst({
    where: { id: docId, staff_id: staffKey },
  });
  if (!record) {
    const err = new Error("Document not found.");
    err.status = 404;
    throw err;
  }

  const fp = resolveStaffDocumentPath(staffKey, record.file_name);
  if (fp) {
    try {
      fs.unlinkSync(fp);
    } catch {
      // File may already be missing; still remove DB record.
    }
  }

  await prisma.staff_documents.delete({ where: { id: docId } });
  return { id: docId, title: record.title };
}

function resolveStaffDocumentPath(staffId, fileName) {
  const fn = String(fileName ?? "");
  if (fn.includes("..") || fn.includes(path.sep)) return null;
  const fp = path.join(uploadsDirForStaff(staffId), fn);
  if (!fs.existsSync(fp)) return null;
  return fp;
}

async function assertStaffExists(staffId) {
  const staff = await prisma.staff.findUnique({ where: { id: String(staffId) } });
  if (!staff) {
    const err = new Error("Staff member not found.");
    err.status = 404;
    throw err;
  }
  return staff;
}

async function loadStaffDetailExtras(staffId) {
  const id = String(staffId);
  const [attendanceRows, taskRows, noteRows, documents] = await Promise.all([
    prisma.staff_attendance.findMany({
      where: { staff_id: id },
      orderBy: { date: "desc" },
    }),
    prisma.staff_tasks.findMany({
      where: { staff_id: id },
      orderBy: { date: "desc" },
    }),
    prisma.staff_notes.findMany({
      where: { staff_id: id },
      orderBy: { date: "desc" },
    }),
    loadStaffDocuments(id),
  ]);

  const attendance = attendanceRows.map(mapAttendance);
  const presentDays = attendance.filter((a) => a.status === "present").length;
  const totalDays = attendance.length;
  const tasks = taskRows.map(mapTask);

  return {
    attendance,
    tasks,
    notes: noteRows.map(mapNote),
    documents,
    attendanceSummary: {
      presentDays,
      totalDays,
      percentage: totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100),
    },
    taskSummary: computeTaskSummary(tasks),
  };
}

async function addAttendance(staffId, body) {
  await assertStaffExists(staffId);
  const dateStr = toDateStr(body?.date);
  if (!dateStr) {
    const err = new Error("A valid date is required.");
    err.status = 400;
    throw err;
  }

  const status = normalizeAttendanceStatus(body?.status);
  if (!status) {
    const err = new Error("Status must be Present or Absent.");
    err.status = 400;
    throw err;
  }

  const checkIn = body?.checkIn ? String(body.checkIn).trim() : null;
  const checkOut = body?.checkOut ? String(body.checkOut).trim() : null;

  const record = await prisma.staff_attendance.upsert({
    where: {
      staff_id_date: {
        staff_id: String(staffId),
        date: new Date(`${dateStr}T12:00:00`),
      },
    },
    create: {
      staff_id: String(staffId),
      date: new Date(`${dateStr}T12:00:00`),
      status,
      check_in: checkIn,
      check_out: checkOut,
    },
    update: {
      status,
      check_in: checkIn,
      check_out: checkOut,
    },
  });

  return mapAttendance(record);
}

async function resolveActor(actor) {
  const role = actor?.role ? String(actor.role).toUpperCase() : "ADMIN";
  if (!actor?.id) {
    return { id: null, name: actor?.name ?? "Admin", role };
  }
  const user = await prisma.users.findUnique({
    where: { id: String(actor.id) },
    select: { name: true },
  });
  return {
    id: actor.id,
    name: user?.name ?? actor?.name ?? "Admin",
    role,
  };
}

async function addTask(staffId, body, actor) {
  await assertStaffExists(staffId);
  const resolvedActor = await resolveActor(actor);
  const taskDescription = String(body?.taskDescription ?? body?.task_description ?? "").trim();
  if (!taskDescription) {
    const err = new Error("Task description is required.");
    err.status = 400;
    throw err;
  }

  const record = await prisma.staff_tasks.create({
    data: {
      staff_id: String(staffId),
      task_description: taskDescription,
      assigned_by: resolvedActor.name,
      assigned_by_id: resolvedActor.id,
      status: normalizeTaskStatus(body?.status),
    },
  });

  return mapTask(record);
}

async function updateTaskStatus(staffId, taskId, body) {
  await assertStaffExists(staffId);
  const existing = await prisma.staff_tasks.findFirst({
    where: { id: String(taskId), staff_id: String(staffId) },
  });
  if (!existing) {
    const err = new Error("Task not found.");
    err.status = 404;
    throw err;
  }

  const record = await prisma.staff_tasks.update({
    where: { id: existing.id },
    data: { status: normalizeTaskStatus(body?.status) },
  });

  return mapTask(record);
}

async function addNote(staffId, body, actor) {
  await assertStaffExists(staffId);
  const resolvedActor = await resolveActor(actor);
  const noteText = String(body?.noteText ?? body?.note_text ?? "").trim();
  if (!noteText) {
    const err = new Error("Note text is required.");
    err.status = 400;
    throw err;
  }

  const record = await prisma.staff_notes.create({
    data: {
      staff_id: String(staffId),
      note_text: noteText,
      added_by: resolvedActor.name,
      added_by_id: resolvedActor.id,
      added_by_role: resolvedActor.role ? String(resolvedActor.role).toLowerCase() : null,
    },
  });

  return mapNote(record);
}

module.exports = {
  loadStaffDetailExtras,
  loadStaffDocuments,
  addStaffDocument,
  deleteStaffDocument,
  resolveStaffDocumentPath,
  addAttendance,
  addTask,
  updateTaskStatus,
  addNote,
  assertStaffExists,
  computeTaskSummary,
  computeTenureSummary,
  emptyTaskSummary,
  mapAttendance,
  mapTask,
  mapNote,
  mapStaffDocument,
  VALID_STAFF_DOC_CATEGORIES,
};
