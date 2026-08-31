"use strict";

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const BRAND = {
  name: "Life Ways Rehabilitation Centre",
  tagline: "Rehabilitation & Recovery Management",
  navy: "#0f2744",
  teal: "#0d9488",
  tealLight: "#ecfdf5",
  primary: "#0f2744",
  primaryDark: "#0a1f33",
  text: "#111827",
  muted: "#64748b",
  border: "#e2e8f0",
  rowAlt: "#f8fafc",
  headerBg: "#ecfeff",
  accent: "#0d9488",
};

const MARGIN = 50;
const FOOTER_H = 42;

function normalizeType(type) {
  const t = String(type || "").toLowerCase();
  if (t === "doctors") return "doctor";
  if (t === "patients" || t === "patient-performance") return "patient";
  return t;
}

function titleForType(type) {
  switch (normalizeType(type)) {
    case "therapy-daily":
      return "Therapy Daily Report";
    case "therapy-monthly":
      return "Therapy Monthly Report";
    case "doctor":
      return "Doctor Performance Report";
    case "patient":
      return "Patient Performance Report";
    case "financial":
      return "Financial Report";
    default:
      return "Clinical Report";
  }
}

function buildExportFilename(type, format) {
  const normalized = normalizeType(type);
  const date = new Date().toISOString().slice(0, 10);
  const stamp = Date.now().toString().slice(-6);
  const names = {
    "therapy-daily": "Therapy_Report_Daily",
    "therapy-monthly": "Therapy_Report_Monthly",
    doctor: "Doctor_Performance_Report",
    patient: "Patient_Performance_Report",
    financial: "Financial_Report",
  };
  const base = names[normalized] || "Clinical_Report";
  const ext = format === "pdf" ? "pdf" : "xlsx";
  return `${base}_${date}_${stamp}.${ext}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function buildPDF(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function createReportDocument(reportTitle) {
  return new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: reportTitle,
      Author: BRAND.name,
      Subject: "Reports & Analytics",
      Keywords: "Healthcare, Rehabilitation, Reports",
      Creator: "LWRC Management System",
    },
  });
}

function drawPageWatermark(doc, hospitalName) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  doc.save();
  doc.opacity(0.07);
  doc.fillColor("#94a3b8");
  doc.fontSize(52);
  doc.rotate(-32, { origin: [pageW / 2, pageH / 2] });
  doc.text("CONFIDENTIAL", pageW / 2 - 180, pageH / 2 - 20, { width: 360, align: "center" });
  doc.fontSize(18);
  doc.text(hospitalName || BRAND.name, pageW / 2 - 180, pageH / 2 + 28, { width: 360, align: "center" });
  doc.restore();
  doc.opacity(1);
}

function hospitalNameFrom(data) {
  return data?.exportMeta?.hospitalName || BRAND.name;
}

function finalizeReport(doc, data) {
  const hospitalName = hospitalNameFrom(data);
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    drawPageWatermark(doc, hospitalName);
    drawPageFooter(doc, i + 1, range.count, hospitalName);
  }
}

function drawPageFooter(doc, pageNum, totalPages, hospitalName) {
  const y = doc.page.height - MARGIN + 6;
  const pageW = doc.page.width - MARGIN * 2;

  doc
    .strokeColor(BRAND.border)
    .moveTo(MARGIN, y - 10)
    .lineTo(doc.page.width - MARGIN, y - 10)
    .stroke();

  doc.fontSize(7.5).fillColor(BRAND.muted);
  doc.text(hospitalName || BRAND.name, MARGIN, y, {
    width: pageW,
    align: "center",
  });
  doc.text("Confidential Report  |  Generated Automatically", MARGIN, y + 10, {
    width: pageW,
    align: "center",
  });
  doc.text(`Page ${pageNum} of ${totalPages}`, MARGIN, y + 20, {
    width: pageW,
    align: "center",
  });
}

function finalizePdfPages(doc, hospitalName) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    drawPageFooter(doc, i + 1, range.count, hospitalName);
  }
}

function ensureSpace(doc, needed, state) {
  const bottom = doc.page.height - MARGIN - FOOTER_H;
  if (doc.y + needed > bottom) {
    doc.addPage();
    state.page += 1;
    doc.y = MARGIN;
  }
}

function filterLines(filters, meta) {
  const lines = [];
  if (filters?.from || filters?.to) {
    lines.push(`Date Range: ${formatDate(filters.from)} — ${formatDate(filters.to)}`);
  }
  if (meta?.filterLabels?.doctor) {
    lines.push(`Doctor: ${meta.filterLabels.doctor}`);
  } else if (filters?.doctorId) {
    lines.push(`Doctor ID: ${filters.doctorId}`);
  }
  if (meta?.filterLabels?.patient) {
    lines.push(`Patient: ${meta.filterLabels.patient}`);
  } else if (filters?.patientId) {
    lines.push(`Patient ID: ${filters.patientId}`);
  }
  return lines;
}

function drawContactBlock(doc, meta, pageW) {
  const lines = [];
  if (meta.address) lines.push(meta.address);
  if (meta.contactPhone) lines.push(`Phone: ${meta.contactPhone}`);
  if (meta.contactEmail) lines.push(`Email: ${meta.contactEmail}`);
  if (!lines.length) return;

  doc.fontSize(8).fillColor(BRAND.muted);
  lines.forEach((line) => {
    doc.text(line, MARGIN, doc.y, { width: pageW });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.35);
}

function drawReportHeader(doc, reportTitle, type, data, state) {
  const meta = data?.exportMeta || {};
  const filters = data?.filters || {};
  const pageW = doc.page.width - MARGIN * 2;
  const headerH = 88;
  const y0 = doc.y;
  const hasLogo = Boolean(meta.logoPath);

  doc.rect(MARGIN, y0, pageW, headerH).fill(BRAND.primary);

  let textX = MARGIN + 16;
  if (hasLogo) {
    try {
      doc.image(meta.logoPath, MARGIN + 12, y0 + 14, { fit: [48, 48] });
      textX = MARGIN + 72;
    } catch {
      /* logo unavailable — layout shifts left automatically */
    }
  }

  doc
    .fontSize(hasLogo ? 16 : 17)
    .fillColor("#ffffff")
    .text(meta.hospitalName || BRAND.name, textX, y0 + (hasLogo ? 16 : 20), {
      width: pageW - (textX - MARGIN) - 16,
    });
  doc
    .fontSize(10)
    .fillColor("#dbeafe")
    .text(BRAND.tagline, textX, y0 + (hasLogo ? 38 : 42), { width: pageW - (textX - MARGIN) - 16 });

  doc.y = y0 + headerH + 12;
  drawContactBlock(doc, meta, pageW);

  doc.fontSize(16).fillColor(BRAND.text).text(reportTitle, MARGIN, doc.y);
  doc.moveDown(0.35);

  const generatedAt = meta.generatedAt ? new Date(meta.generatedAt) : new Date();
  doc.fontSize(9).fillColor(BRAND.muted);
  doc.text(`Generated: ${formatDateTime(generatedAt)}`, MARGIN);
  doc.text(`Generated By: ${meta.generatedBy || "System"}`, MARGIN);
  doc.text(`Report Type: ${titleForType(type)}`, MARGIN);

  const lines = filterLines(filters, meta);
  if (lines.length) {
    doc.moveDown(0.15);
    lines.forEach((line) => doc.text(line, MARGIN));
  }

  doc.moveDown(0.8);
  state.page = 1;
}

function drawSignatureSection(doc, data, state) {
  ensureSpace(doc, 130, state);
  drawSectionTitle(doc, "Official Approval", state);

  const pageW = doc.page.width - MARGIN * 2;
  const boxH = 72;
  const gap = 16;
  const boxW = (pageW - gap) / 2;
  const y = doc.y;
  const preparedBy = data?.exportMeta?.generatedBy || "—";
  const approvalDate = formatDate(new Date());

  const drawBox = (x, label, value) => {
    doc.roundedRect(x, y, boxW, boxH, 4).stroke(BRAND.border);
    doc.fontSize(9).fillColor(BRAND.muted).text(label, x + 10, y + 10, { width: boxW - 20 });
    doc
      .strokeColor(BRAND.border)
      .moveTo(x + 10, y + boxH - 22)
      .lineTo(x + boxW - 10, y + boxH - 22)
      .stroke();
    doc.fontSize(9).fillColor(BRAND.text).text(value, x + 10, y + boxH - 18, { width: boxW - 20 });
  };

  drawBox(MARGIN, "Prepared By", preparedBy);
  drawBox(MARGIN + boxW + gap, "Authorized By", "________________________");

  doc.y = y + boxH + 14;
  doc.fontSize(9).fillColor(BRAND.muted).text(`Date: ${approvalDate}`, MARGIN);
  doc.moveDown(0.8);
}

function drawSectionTitle(doc, title, state) {
  ensureSpace(doc, 44, state);
  const pageW = doc.page.width - MARGIN * 2;
  const y = doc.y;
  doc.rect(MARGIN, y, pageW, 24).fill(BRAND.tealLight);
  doc.rect(MARGIN, y, 4, 24).fill(BRAND.teal);
  doc.fontSize(11).fillColor(BRAND.primaryDark).text(title, MARGIN + 12, y + 7);
  doc.y = y + 32;
}

function drawSummaryCards(doc, items, state) {
  if (!items.length) return;
  const pageW = doc.page.width - MARGIN * 2;
  const cols = Math.min(items.length, 4);
  const gap = 10;
  const cardW = (pageW - gap * (cols - 1)) / cols;
  const cardH = 52;
  const rows = Math.ceil(items.length / cols);
  ensureSpace(doc, rows * (cardH + 8) + 8, state);

  const startY = doc.y;
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + gap);
    const y = startY + row * (cardH + 8);

    doc.roundedRect(x, y, cardW, cardH, 4).fillAndStroke(BRAND.headerBg, BRAND.border);
    doc.fontSize(8).fillColor(BRAND.muted).text(item.label, x + 8, y + 8, { width: cardW - 16 });
    doc.fontSize(13).fillColor(BRAND.text).text(String(item.value), x + 8, y + 24, { width: cardW - 16 });
  });

  doc.y = startY + rows * (cardH + 8) + 6;
}

function drawTable(doc, columns, rows, state) {
  const pageW = doc.page.width - MARGIN * 2;
  const colWidths = columns.map((c) => c.width || pageW / columns.length);
  const rowH = 22;
  const headerH = 26;

  const drawHeader = () => {
    ensureSpace(doc, headerH + rowH, state);
    let x = MARGIN;
    const y = doc.y;
    doc.rect(MARGIN, y, pageW, headerH).fill(BRAND.primary);
    columns.forEach((col, i) => {
      doc
        .fontSize(8.5)
        .fillColor("#ffffff")
        .text(col.label, x + 6, y + 8, { width: colWidths[i] - 12, align: col.align || "left" });
      if (i > 0) {
        doc.strokeColor("#1e3a5f").moveTo(x, y).lineTo(x, y + headerH).stroke();
      }
      x += colWidths[i];
    });
    doc.y = y + headerH;
  };

  if (!rows.length) {
    drawHeader();
    ensureSpace(doc, rowH, state);
    doc.fontSize(9).fillColor(BRAND.muted).text("No records for the selected period.", MARGIN + 6, doc.y + 6);
    doc.y += rowH;
    doc.moveDown(0.5);
    return;
  }

  drawHeader();

  rows.forEach((row, idx) => {
    if (doc.y + rowH > doc.page.height - MARGIN - FOOTER_H) {
      doc.addPage();
      state.page += 1;
      doc.y = MARGIN;
      drawHeader();
    }

    const y = doc.y;
    const bg = idx % 2 === 0 ? "#ffffff" : BRAND.rowAlt;
    doc.rect(MARGIN, y, pageW, rowH).fill(bg);
    doc.strokeColor(BRAND.border).rect(MARGIN, y, pageW, rowH).stroke();

    let x = MARGIN;
    columns.forEach((col, i) => {
      if (i > 0) {
        doc.strokeColor(BRAND.border).moveTo(x, y).lineTo(x, y + rowH).stroke();
      }
      const val = row[col.key] ?? "—";
      doc
        .fontSize(8.5)
        .fillColor(BRAND.text)
        .text(String(val), x + 6, y + 6, {
          width: colWidths[i] - 12,
          height: rowH - 8,
          align: col.align || "left",
          ellipsis: true,
        });
      x += colWidths[i];
    });
    doc.y = y + rowH;
  });

  doc.moveDown(0.6);
}

function drawBarChart(doc, title, points, state, options = {}) {
  if (!points.length) return;

  const pageW = doc.page.width - MARGIN * 2;
  const chartH = 132;
  ensureSpace(doc, chartH + 8, state);
  drawSectionTitle(doc, title, state);

  const labelKey = options.labelKey || "label";
  const valueKey = options.valueKey || "value";
  const formatValue = options.formatValue || ((v) => String(v));
  const maxBars = options.maxBars || 12;
  const slice = points.slice(-maxBars);
  const maxVal = Math.max(...slice.map((p) => Number(p[valueKey]) || 0), 1);
  const barAreaH = 82;
  const baseY = doc.y + barAreaH;

  doc.strokeColor(BRAND.border).moveTo(MARGIN, baseY).lineTo(MARGIN + pageW, baseY).stroke();

  const barW = Math.min(30, (pageW - 20) / slice.length - 8);
  const gap = (pageW - barW * slice.length) / (slice.length + 1);

  slice.forEach((pt, i) => {
    const val = Number(pt[valueKey]) || 0;
    const h = Math.max(2, (val / maxVal) * (barAreaH - 18));
    const x = MARGIN + gap + i * (barW + gap);
    const y = baseY - h;
    doc.roundedRect(x, y, barW, h, 2).fill(BRAND.teal);
    doc.fontSize(6.5).fillColor(BRAND.text).text(formatValue(val), x, y - 11, { width: barW, align: "center" });
    doc
      .fontSize(6.5)
      .fillColor(BRAND.muted)
      .text(String(pt[labelKey] ?? "").slice(-8), x, baseY + 5, { width: barW, align: "center" });
  });

  doc.y = baseY + 22;
}

function therapySummaryCards(summary) {
  const s = summary || {};
  return [
    { label: "Total Sessions", value: s.total ?? 0 },
    { label: "Completed Sessions", value: s.completed ?? 0 },
    { label: "Missed Sessions", value: s.missed ?? 0 },
    { label: "Cancelled Sessions", value: s.cancelled ?? 0 },
    { label: "Attendance Rate", value: formatPercent(s.attendanceRate) },
    { label: "Progress", value: formatPercent(s.progressPercent) },
  ];
}

function buildTherapyPdf(data, type) {
  const reportTitle = titleForType(type);
  const doc = createReportDocument(reportTitle);
  const state = { page: 1 };
  const s = data.summary || {};
  const isDaily = normalizeType(type) === "therapy-daily";
  const periodRows = isDaily ? data.daily || [] : data.monthly || [];

  drawReportHeader(doc, reportTitle, type, data, state);

  drawSectionTitle(doc, "Executive Summary", state);
  drawSummaryCards(doc, therapySummaryCards(s), state);

  const chartPoints = periodRows.map((r) => ({
    label: isDaily ? formatDate(r.date) : r.month,
    value: r.completed ?? 0,
  }));
  if (chartPoints.length) {
    drawBarChart(doc, isDaily ? "Daily Completed Sessions Trend" : "Monthly Completed Sessions Trend", chartPoints, state, {
      labelKey: "label",
      valueKey: "value",
    });
  }

  drawSectionTitle(doc, isDaily ? "Daily Breakdown" : "Monthly Breakdown", state);
  drawTable(
    doc,
    [
      { label: isDaily ? "Date" : "Month", key: isDaily ? "date" : "month", width: 95 },
      { label: "Total", key: "total", width: 55, align: "right" },
      { label: "Completed", key: "completed", width: 68, align: "right" },
      { label: "Missed", key: "missed", width: 55, align: "right" },
      { label: "Cancelled", key: "cancelled", width: 68, align: "right" },
      { label: "Attendance", key: "attendanceRate", width: 78, align: "right" },
      { label: "Progress", key: "progressPercent", width: 68, align: "right" },
    ],
    periodRows.map((r) => ({
      ...(isDaily ? { date: formatDate(r.date) } : { month: r.month }),
      total: r.total ?? 0,
      completed: r.completed ?? 0,
      missed: r.missed ?? 0,
      cancelled: r.cancelled ?? 0,
      attendanceRate: formatPercent(r.attendanceRate),
      progressPercent: formatPercent(r.progressPercent),
    })),
    state
  );

  drawSectionTitle(doc, "Patient-wise Breakdown", state);
  drawTable(
    doc,
    [
      { label: "Patient", key: "patientName", width: 120 },
      { label: "Doctor", key: "doctorName", width: 105 },
      { label: "Total", key: "total", width: 50, align: "right" },
      { label: "Completed", key: "completed", width: 65, align: "right" },
      { label: "Missed", key: "missed", width: 50, align: "right" },
      { label: "Cancelled", key: "cancelled", width: 60, align: "right" },
      { label: "Progress", key: "progressPercent", width: 62, align: "right" },
      { label: "Attendance", key: "attendanceRate", width: 72, align: "right" },
    ],
    (data.patientBreakdown || []).map((p) => ({
      patientName: p.patientName ?? "—",
      doctorName: p.doctorName ?? "—",
      total: p.total ?? 0,
      completed: p.completed ?? 0,
      missed: p.missed ?? 0,
      cancelled: p.cancelled ?? 0,
      progressPercent: formatPercent(p.progressPercent),
      attendanceRate: formatPercent(p.attendanceRate),
    })),
    state
  );

  drawSignatureSection(doc, data, state);
  finalizeReport(doc, data);
  return buildPDF(doc);
}

function buildDoctorPdf(data) {
  const reportTitle = titleForType("doctor");
  const doc = createReportDocument(reportTitle);
  const state = { page: 1 };
  const s = data.summary || {};
  const doctors = data.doctors || [];

  drawReportHeader(doc, reportTitle, "doctor", data, state);

  drawSectionTitle(doc, "Executive Summary", state);
  drawSummaryCards(
    doc,
    [
      { label: "Average Rating", value: (s.averageFeedbackRating ?? 0).toFixed(1) },
      { label: "Attendance Rate", value: formatPercent(s.attendanceRate) },
      { label: "Assigned Sessions", value: s.totalAssignedSessions ?? 0 },
      { label: "Completed Sessions", value: s.completedSessions ?? 0 },
      { label: "Doctors Assessed", value: doctors.length },
      { label: "Missed Sessions", value: s.missedSessions ?? 0 },
    ],
    state
  );

  if (doctors.length) {
    drawBarChart(
      doc,
      "Attendance Rate by Doctor",
      doctors.map((d) => ({ label: d.doctorName, value: d.attendanceRate ?? 0 })),
      state,
      { formatValue: (v) => `${Number(v).toFixed(1)}%` }
    );
  }

  drawSectionTitle(doc, "Doctor Performance Ranking", state);
  drawTable(
    doc,
    [
      { label: "Rank", key: "rank", width: 42, align: "center" },
      { label: "Doctor", key: "doctorName", width: 115 },
      { label: "Specialization", key: "specialization", width: 95 },
      { label: "Sessions", key: "totalAssignedSessions", width: 58, align: "right" },
      { label: "Completed", key: "completedSessions", width: 65, align: "right" },
      { label: "Missed", key: "missedSessions", width: 52, align: "right" },
      { label: "Attendance", key: "attendanceRate", width: 72, align: "right" },
      { label: "Rating", key: "averageFeedbackRating", width: 52, align: "right" },
    ],
    doctors.map((d) => ({
      rank: d.rank ?? "—",
      doctorName: d.doctorName ?? "—",
      specialization: d.specialization ?? "—",
      totalAssignedSessions: d.totalAssignedSessions ?? 0,
      completedSessions: d.completedSessions ?? 0,
      missedSessions: d.missedSessions ?? 0,
      attendanceRate: formatPercent(d.attendanceRate),
      averageFeedbackRating: (d.averageFeedbackRating ?? 0).toFixed(1),
    })),
    state
  );

  drawSignatureSection(doc, data, state);
  finalizeReport(doc, data);
  return buildPDF(doc);
}

function buildPatientPdf(data) {
  const reportTitle = titleForType("patient");
  const doc = createReportDocument(reportTitle);
  const state = { page: 1 };
  const s = data.summary || {};
  const patients = data.patients || [];
  const totalMilestones = patients.reduce((n, p) => n + (p.milestones?.total ?? 0), 0);
  const achievedMilestones = patients.reduce((n, p) => n + (p.milestones?.achieved ?? 0), 0);

  drawReportHeader(doc, reportTitle, "patient", data, state);

  drawSectionTitle(doc, "Executive Summary", state);
  drawSummaryCards(
    doc,
    [
      { label: "Average Progress", value: formatPercent(s.progressPercent) },
      { label: "Milestones", value: `${achievedMilestones}/${totalMilestones}` },
      { label: "Attendance Rate", value: formatPercent(s.attendanceRate) },
      { label: "Session Count", value: s.totalSessions ?? 0 },
      { label: "Completed Sessions", value: s.completedSessions ?? 0 },
      { label: "Total Patients", value: s.patientCount ?? patients.length },
    ],
    state
  );

  if (patients.length) {
    drawBarChart(
      doc,
      "Patient Progress Overview",
      patients.map((p) => ({ label: p.patientName, value: p.progressPercent ?? 0 })),
      state,
      { formatValue: (v) => `${Number(v).toFixed(1)}%`, maxBars: 10 }
    );
  }

  drawSectionTitle(doc, "Patient Overview", state);
  drawTable(
    doc,
    [
      { label: "Patient", key: "patientName", width: 115 },
      { label: "Doctor", key: "doctorName", width: 100 },
      { label: "Progress", key: "progressPercent", width: 62, align: "right" },
      { label: "Attendance", key: "attendanceRate", width: 72, align: "right" },
      { label: "Sessions", key: "totalSessions", width: 58, align: "right" },
      { label: "Completed", key: "completedSessions", width: 65, align: "right" },
      { label: "Milestones", key: "milestones", width: 62, align: "center" },
    ],
    patients.map((p) => ({
      patientName: p.patientName,
      doctorName: p.assignedDoctor?.name ?? "—",
      progressPercent: formatPercent(p.progressPercent),
      attendanceRate: formatPercent(p.attendanceRate),
      totalSessions: p.totalSessions ?? 0,
      completedSessions: p.completedSessions ?? 0,
      milestones: `${p.milestones?.achieved ?? 0}/${p.milestones?.total ?? 0}`,
    })),
    state
  );

  for (const p of patients) {
    drawSectionTitle(doc, `Session History — ${p.patientName}`, state);
    if (p.assignedDoctor?.name) {
      ensureSpace(doc, 16, state);
      doc.fontSize(8.5).fillColor(BRAND.muted).text(`Assigned Doctor: ${p.assignedDoctor.name}`, MARGIN);
      doc.moveDown(0.35);
    }
    drawTable(
      doc,
      [
        { label: "Date", key: "date", width: 88 },
        { label: "Status", key: "status", width: 72 },
        { label: "Attendance", key: "attendance", width: 72 },
        { label: "Outcome", key: "outcome", width: 95 },
        { label: "Pain", key: "painLevel", width: 42, align: "right" },
        { label: "Duration (min)", key: "duration", width: 78, align: "right" },
      ],
      (p.sessionHistory || []).map((sess) => ({
        date: formatDate(sess.date),
        status: sess.status ?? "—",
        attendance: sess.attendance ?? "—",
        outcome: sess.outcome ?? "—",
        painLevel: sess.painLevel ?? "—",
        duration: sess.duration ?? "—",
      })),
      state
    );
  }

  drawSignatureSection(doc, data, state);
  finalizeReport(doc, data);
  return buildPDF(doc);
}

function buildFinancialPdf(data) {
  const reportTitle = titleForType("financial");
  const doc = createReportDocument(reportTitle);
  const state = { page: 1 };
  const s = data.summary || {};
  const invoiceCount = (data.invoices || []).length;

  drawReportHeader(doc, reportTitle, "financial", data, state);

  drawSectionTitle(doc, "Executive Summary", state);
  drawSummaryCards(
    doc,
    [
      { label: "Revenue", value: formatCurrency(s.revenue) },
      { label: "Outstanding", value: formatCurrency(s.outstandingPayments) },
      { label: "Paid", value: formatCurrency(s.revenue) },
      { label: "Unpaid", value: formatCurrency(s.outstandingPayments) },
      { label: "Invoice Count", value: invoiceCount },
      { label: "Payment Records", value: s.paymentCount ?? 0 },
    ],
    state
  );

  const monthly = data.monthlyEarnings || [];
  if (monthly.length) {
    drawBarChart(
      doc,
      "Monthly Revenue Trend",
      monthly.map((row) => ({ label: row.month, value: row.revenue ?? 0 })),
      state,
      { formatValue: (v) => formatCurrency(v) }
    );
  }

  drawSectionTitle(doc, "Monthly Earnings", state);
  drawTable(
    doc,
    [
      { label: "Month", key: "month", width: 85 },
      { label: "Revenue", key: "revenue", width: 88, align: "right" },
      { label: "Outstanding", key: "outstanding", width: 88, align: "right" },
      { label: "Total", key: "total", width: 88, align: "right" },
      { label: "Payments", key: "paymentCount", width: 58, align: "right" },
    ],
    monthly.map((row) => ({
      month: row.month,
      revenue: formatCurrency(row.revenue),
      outstanding: formatCurrency(row.outstanding),
      total: formatCurrency(row.total),
      paymentCount: row.paymentCount ?? 0,
    })),
    state
  );

  const outstanding = (data.paymentHistory || []).filter((p) =>
    ["PENDING", "OVERDUE"].includes(String(p.status || "").toUpperCase())
  );

  drawSectionTitle(doc, "Outstanding Payments", state);
  drawTable(
    doc,
    [
      { label: "Patient", key: "patientName", width: 115 },
      { label: "Amount", key: "amount", width: 82, align: "right" },
      { label: "Status", key: "status", width: 68 },
      { label: "Reference", key: "referenceNumber", width: 88 },
      { label: "Due Date", key: "dueDate", width: 72 },
    ],
    outstanding.map((p) => ({
      patientName: p.patientName,
      amount: formatCurrency(p.amount),
      status: p.status ?? "—",
      referenceNumber: p.referenceNumber ?? "—",
      dueDate: formatDate(p.dueDate),
    })),
    state
  );

  drawSectionTitle(doc, "Payment History", state);
  drawTable(
    doc,
    [
      { label: "Patient", key: "patientName", width: 105 },
      { label: "Amount", key: "amount", width: 78, align: "right" },
      { label: "Status", key: "status", width: 65 },
      { label: "Reference", key: "referenceNumber", width: 85 },
      { label: "Due", key: "dueDate", width: 68 },
      { label: "Created", key: "createdAt", width: 72 },
    ],
    (data.paymentHistory || []).map((p) => ({
      patientName: p.patientName,
      amount: formatCurrency(p.amount),
      status: p.status ?? "—",
      referenceNumber: p.referenceNumber ?? "—",
      dueDate: formatDate(p.dueDate),
      createdAt: formatDate(p.createdAt),
    })),
    state
  );

  drawSectionTitle(doc, "Invoices", state);
  drawTable(
    doc,
    [
      { label: "Invoice #", key: "invoiceNumber", width: 95 },
      { label: "Patient", key: "patientName", width: 110 },
      { label: "Amount", key: "amount", width: 78, align: "right" },
      { label: "Status", key: "status", width: 65 },
      { label: "Due", key: "dueDate", width: 68 },
      { label: "Issued", key: "issuedAt", width: 72 },
    ],
    (data.invoices || []).map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.patientName,
      amount: formatCurrency(inv.amount),
      status: inv.status ?? "—",
      dueDate: formatDate(inv.dueDate),
      issuedAt: formatDate(inv.issuedAt),
    })),
    state
  );

  drawSignatureSection(doc, data, state);
  finalizeReport(doc, data);
  return buildPDF(doc);
}

async function buildProfessionalPdf(type, data) {
  if (!data || data.error) {
    throw new Error(data?.error || "Report data is unavailable.");
  }

  const normalized = normalizeType(type);

  switch (normalized) {
    case "therapy-daily":
    case "therapy-monthly":
      return buildTherapyPdf(data, normalized);
    case "doctor":
      return buildDoctorPdf(data);
    case "patient":
      return buildPatientPdf(data);
    case "financial":
      return buildFinancialPdf(data);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

async function buildPatientDocumentPdf({
  title,
  subtitle,
  generatedDate,
  summaryRows = [],
  detailRows = [],
}) {
  const doc = createReportDocument(title || "Patient Document");
  const state = { page: 1 };

  drawReportHeader(
    doc,
    title || "Patient Document",
    "patient",
    { exportMeta: { generatedAt: generatedDate || new Date(), generatedBy: "System" } },
    state
  );

  if (subtitle) {
    doc.fontSize(10).fillColor(BRAND.muted).text(subtitle, MARGIN);
    doc.moveDown(0.6);
  }

  if (generatedDate) {
    doc.fontSize(9).fillColor(BRAND.muted).text(`Document date: ${formatDate(generatedDate)}`, MARGIN);
    doc.moveDown(0.8);
  }

  if (summaryRows.length) {
    drawSectionTitle(doc, "Summary", state);
    drawTable(
      doc,
      [
        { key: "field", label: "Field", width: 180 },
        { key: "value", label: "Value", width: 300 },
      ],
      summaryRows.map((row) => ({ field: row.label, value: row.value ?? "—" })),
      state
    );
  }

  if (detailRows.length) {
    drawSectionTitle(doc, "Details", state);
    drawTable(
      doc,
      [
        { key: "field", label: "Field", width: 180 },
        { key: "value", label: "Value", width: 300 },
      ],
      detailRows.map((row) => ({ field: row.label, value: row.value ?? "—" })),
      state
    );
  }

  finalizeReport(doc, { exportMeta: { hospitalName: BRAND.name } });
  return buildPDF(doc);
}

module.exports = {
  buildProfessionalPdf,
  buildPatientDocumentPdf,
  normalizeType,
  titleForType,
  buildExportFilename,
  BRAND,
  MARGIN,
  FOOTER_H,
  formatDate,
  formatDateTime,
  formatCurrency,
  buildPDF,
  drawSectionTitle,
  drawSummaryCards,
  drawTable,
  addPageFooter: drawPageFooter,
  finalizePdfPages,
  ensureSpace,
};
