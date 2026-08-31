"use strict";

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const {
  BRAND,
  MARGIN,
  formatDate,
  formatDateTime,
  formatCurrency,
  buildPDF,
  drawSectionTitle,
  drawSummaryCards,
  drawTable,
  addPageFooter,
  ensureSpace,
} = require("../utils/pdfGenerator");

const STAFF_ROLE_LABELS = {
  receptionist: "Receptionist",
  ward_attendant: "Ward Boy/Attendant",
  pharmacist: "Pharmacist",
  lab_technician: "Lab Technician",
  cleaner: "Cleaner/Housekeeping",
  security_guard: "Security Guard",
};

const STATUS_COLORS = {
  active: "#0d9488",
  present: "#0d9488",
  completed: "#0d9488",
  approved: "#0d9488",
  pending: "#d97706",
  absent: "#dc2626",
  inactive: "#64748b",
  "on-leave": "#0f2744",
};

async function loadImageBuffer(photoUrl) {
  const raw = String(photoUrl ?? "").trim();
  if (!raw) return null;

  try {
    if (/^https?:\/\//i.test(raw)) {
      const res = await fetch(raw);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    if (raw.startsWith("/uploads/")) {
      const fp = path.join(__dirname, "..", "..", raw.replace(/^\//, ""));
      if (fs.existsSync(fp)) return fs.readFileSync(fp);
    }
  } catch {
    return null;
  }
  return null;
}

function drawProfileHeader(doc, { title, subtitle, photoBuffer, state }) {
  const pageW = doc.page.width - MARGIN * 2;
  const headerH = 82;
  const y0 = doc.y;

  doc.rect(MARGIN, y0, pageW, headerH).fill(BRAND.navy);
  doc.rect(MARGIN, y0 + headerH - 5, pageW, 5).fill(BRAND.teal);

  const textW = photoBuffer ? pageW - 90 : pageW - 32;
  doc
    .fontSize(20)
    .fillColor("#ffffff")
    .text(BRAND.name, MARGIN + 16, y0 + 14, { width: textW });
  doc
    .fontSize(10)
    .fillColor("#99f6e4")
    .text("Staff Report · Rehabilitation & Recovery", MARGIN + 16, y0 + 38, { width: textW });

  if (photoBuffer) {
    try {
      doc
        .roundedRect(MARGIN + pageW - 68, y0 + 10, 60, 60, 6)
        .strokeColor("#ffffff")
        .lineWidth(1.5)
        .stroke();
      doc.image(photoBuffer, MARGIN + pageW - 64, y0 + 14, { width: 52, height: 52, fit: [52, 52] });
    } catch {
      // skip invalid image
    }
  }

  doc.y = y0 + headerH + 16;
  doc.fontSize(15).fillColor(BRAND.navy).text(title, MARGIN, doc.y);
  doc.moveDown(0.25);
  if (subtitle) {
    doc.fontSize(10).fillColor(BRAND.teal).text(subtitle, MARGIN);
    doc.moveDown(0.35);
  }
  doc.fontSize(9).fillColor(BRAND.muted).text(`Generated: ${formatDateTime(new Date())}`, MARGIN);
  doc.moveDown(0.9);
  state.page = 1;
}

function drawKeyValueSection(doc, title, rows, state) {
  drawSectionTitle(doc, title, state);
  const pageW = doc.page.width - MARGIN * 2;
  drawTable(
    doc,
    [
      { label: "Field", key: "field", width: 170 },
      { label: "Value", key: "value", width: pageW - 170 },
    ],
    rows.map((r) => ({ field: r.label, value: r.value ?? "—" })),
    state,
  );
}

function drawStatusBadge(doc, x, y, label, tone = "active") {
  const text = String(label ?? "—");
  const color = STATUS_COLORS[String(tone).toLowerCase()] ?? BRAND.muted;
  const w = Math.min(90, doc.widthOfString(text) + 14);
  doc.roundedRect(x, y, w, 16, 3).fill(color);
  doc.fontSize(7).fillColor("#ffffff").text(text, x + 7, y + 4, { width: w - 10 });
  return w;
}

function drawKeyValueWithStatus(doc, title, rows, state) {
  drawSectionTitle(doc, title, state);
  rows.forEach((row) => {
    ensureSpace(doc, 22, state);
    const y = doc.y;
    doc.fontSize(9).fillColor(BRAND.muted).text(row.label, MARGIN, y, { width: 140 });
    if (row.statusTone) {
      drawStatusBadge(doc, MARGIN + 145, y - 2, row.value, row.statusTone);
    } else {
      doc.fontSize(10).fillColor(BRAND.text).text(String(row.value ?? "—"), MARGIN + 145, y, {
        width: doc.page.width - MARGIN * 2 - 145,
      });
    }
    doc.y = y + 20;
  });
  doc.moveDown(0.4);
}

/** Generic profile PDF renderer — reusable for future Doctor/Patient exports. */
async function renderProfilePdf({ title, subtitle, photoUrl, sections }) {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const state = { page: 1 };
  const photoBuffer = await loadImageBuffer(photoUrl);

  drawProfileHeader(doc, { title, subtitle, photoBuffer, state });

  for (const section of sections) {
    if (section.type === "cards") {
      drawSectionTitle(doc, section.title, state);
      drawSummaryCards(doc, section.items, state);
    } else if (section.type === "table") {
      drawSectionTitle(doc, section.title, state);
      drawTable(doc, section.columns, section.rows, state);
    } else if (section.type === "status-grid") {
      drawKeyValueWithStatus(doc, section.title, section.rows, state);
    } else {
      drawKeyValueSection(doc, section.title, section.rows, state);
    }
  }

  addPageFooter(doc, state.page);
  return buildPDF(doc);
}

function staffRoleLabel(role) {
  const key = String(role ?? "").trim().toLowerCase();
  return STAFF_ROLE_LABELS[key] ?? role ?? "—";
}

function statusTone(status) {
  const s = String(status ?? "").toLowerCase();
  if (["active", "present", "completed", "approved"].includes(s)) return s;
  if (["pending", "on-leave"].includes(s)) return s;
  if (["absent", "inactive"].includes(s)) return s;
  return "inactive";
}

async function buildStaffProfilePdf(staff) {
  const att = staff.attendanceSummary ?? { presentDays: 0, totalDays: 0, percentage: 0 };
  const tasks = staff.taskSummary ?? { completed: 0, pending: 0, total: 0 };
  const name = staff.fullName ?? staff.name ?? "Staff Member";

  const sections = [
    {
      title: "Basic Information",
      type: "status-grid",
      rows: [
        { label: "Name", value: name },
        { label: "Role", value: staffRoleLabel(staff.role) },
        { label: "Department", value: staff.department ?? staff.specialty ?? "—" },
        { label: "Status", value: staff.status ?? "—", statusTone: statusTone(staff.status) },
      ],
    },
    {
      title: "Contact",
      type: "keyValue",
      rows: [
        { label: "Email", value: staff.email },
        { label: "Phone", value: staff.phone },
      ],
    },
    {
      title: "Employment",
      type: "keyValue",
      rows: [
        { label: "Joining Date", value: formatDate(staff.joinedAt ?? staff.joinedOn) },
        { label: "Shift Type", value: staff.shiftType ? String(staff.shiftType) : "—" },
        { label: "Shift Timing", value: staff.shiftTiming ?? "—" },
        { label: "Base Salary", value: formatCurrency(staff.baseSalary) },
      ],
    },
    {
      title: "Attendance Summary",
      type: "cards",
      items: [
        {
          label: "Present Days",
          value: att.totalDays === 0 ? "—" : `${att.presentDays}/${att.totalDays}`,
        },
        { label: "Attendance %", value: att.totalDays === 0 ? "—" : `${att.percentage}%` },
      ],
    },
    {
      title: "Tasks Summary",
      type: "cards",
      items: [
        { label: "Completed", value: tasks.total === 0 ? "—" : tasks.completed },
        { label: "Pending", value: tasks.total === 0 ? "—" : tasks.pending },
        { label: "Total Tasks", value: tasks.total === 0 ? "—" : tasks.total },
      ],
    },
    {
      title: "Tasks List",
      type: "table",
      columns: [
        { label: "Task", key: "task", width: 200 },
        { label: "Assigned By", key: "by", width: 100 },
        { label: "Status", key: "status", width: 80 },
        { label: "Date", key: "date", width: 90 },
      ],
      rows: (staff.tasks ?? []).map((t) => ({
        task: t.taskDescription ?? "—",
        by: t.assignedBy ?? "—",
        status: t.status ?? "—",
        date: formatDate(t.date),
      })),
    },
    {
      title: "Internal Notes (Admin)",
      type: "table",
      columns: [
        { label: "Note", key: "note", width: 240 },
        { label: "Added By", key: "by", width: 100 },
        { label: "Date", key: "date", width: 90 },
      ],
      rows: (staff.notes ?? []).map((n) => ({
        note: n.noteText ?? "—",
        by: n.addedBy ?? "—",
        date: formatDate(n.date),
      })),
    },
    {
      title: "Documents",
      type: "table",
      columns: [
        { label: "Title", key: "title", width: 160 },
        { label: "Category", key: "category", width: 90 },
        { label: "Type", key: "type", width: 60 },
        { label: "Uploaded", key: "date", width: 90 },
      ],
      rows: (staff.documents ?? []).map((d) => ({
        title: d.title ?? "—",
        category: d.category ?? "—",
        type: d.fileType ?? "—",
        date: formatDate(d.uploadedAt),
      })),
    },
    {
      title: "Attendance History",
      type: "table",
      columns: [
        { label: "Date", key: "date", width: 90 },
        { label: "Status", key: "status", width: 80 },
        { label: "Check-in", key: "in", width: 80 },
        { label: "Check-out", key: "out", width: 80 },
      ],
      rows: (staff.attendance ?? []).slice(0, 40).map((a) => ({
        date: formatDate(a.date),
        status: a.status ?? "—",
        in: a.checkIn ?? "—",
        out: a.checkOut ?? "—",
      })),
    },
  ];

  return renderProfilePdf({
    title: `Staff Report: ${name}`,
    subtitle: `${staffRoleLabel(staff.role)} • ${staff.department ?? "—"}`,
    photoUrl: staff.profileImageUrl ?? staff.photoUrl ?? null,
    sections,
  });
}

module.exports = {
  renderProfilePdf,
  buildStaffProfilePdf,
};
