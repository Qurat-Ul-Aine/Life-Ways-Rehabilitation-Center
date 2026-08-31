"use strict";

const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { buildProfessionalPdf, normalizeType, buildExportFilename } = require("../utils/pdfGenerator");
const { buildProfessionalExcel } = require("../utils/excelGenerator");

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toNumber(val) {
  if (val == null) return 0;
  return Number(val);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function classifySession(session) {
  const status = String(session.status || "").toUpperCase();
  const attendance = String(session.attendance || "").toLowerCase();
  const today = startOfDay(new Date());
  const sessionDate = session.session_date ? startOfDay(new Date(session.session_date)) : null;

  if (status === "CANCELLED") return "cancelled";
  if (attendance === "absent" || attendance === "missed") return "missed";
  if (status === "COMPLETED" || attendance === "present") return "completed";

  if (status === "SCHEDULED" && sessionDate && sessionDate < today) return "missed";
  return "scheduled";
}

function sessionStats(sessions) {
  let completed = 0;
  let missed = 0;
  let cancelled = 0;
  let scheduled = 0;

  for (const s of sessions) {
    const kind = classifySession(s);
    if (kind === "completed") completed += 1;
    else if (kind === "missed") missed += 1;
    else if (kind === "cancelled") cancelled += 1;
    else scheduled += 1;
  }

  const total = sessions.length;
  const attendanceDenom = completed + missed;
  const attendanceRate =
    attendanceDenom > 0 ? round2((completed / attendanceDenom) * 100) : 0;

  return { total, completed, missed, cancelled, scheduled, attendanceRate };
}

function parseGoals(goals) {
  if (!goals) return [];
  if (Array.isArray(goals)) return goals.map(String);
  if (typeof goals === "object" && goals.items) return goals.items.map(String);
  return [];
}

function calcProgressPercent(sessions, goals) {
  const { completed, total } = sessionStats(sessions);
  if (total > 0) return round2((completed / total) * 100);
  const goalList = parseGoals(goals);
  if (goalList.length > 0 && completed > 0) {
    return round2(Math.min(100, (completed / goalList.length) * 100));
  }
  return 0;
}

function milestonesFromPlan(plan, sessions) {
  const goals = parseGoals(plan?.goals);
  const { completed } = sessionStats(sessions);
  const achieved = goals.slice(0, Math.min(completed, goals.length));
  return {
    total: goals.length,
    achieved: achieved.length,
    items: achieved,
  };
}

async function resolveUserContext(user) {
  const role = String(user.role || "").toUpperCase();
  let doctorId = null;
  let patientId = null;

  if (role === "DOCTOR") {
    const doc = await prisma.doctors.findFirst({ where: { user_id: user.id } });
    doctorId = doc?.id ?? null;
  } else if (role === "PATIENT") {
    const pat = await prisma.patients.findFirst({ where: { user_id: user.id } });
    patientId = pat?.id ?? null;
  }

  return { role, doctorId, patientId, userId: user.id };
}

function buildPlanFilter(ctx, filters) {
  const planWhere = {};
  const { doctorId, patientId } = filters;

  if (ctx.role === "DOCTOR") {
    if (!ctx.doctorId) return { denied: true };
    planWhere.doctor_id = ctx.doctorId;
  } else if (ctx.role === "PATIENT") {
    if (!ctx.patientId) return { denied: true };
    planWhere.patient_id = ctx.patientId;
  } else if (ctx.role === "ADMIN") {
    if (doctorId) planWhere.doctor_id = doctorId;
    if (patientId) planWhere.patient_id = patientId;
  } else {
    return { denied: true };
  }

  return { planWhere };
}

function buildSessionDateFilter(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  const fromD = parseDate(from);
  const toD = parseDate(to);
  if (fromD) range.gte = startOfDay(fromD);
  if (toD) range.lte = endOfDay(toD);
  return range;
}

async function fetchSessions(ctx, filters) {
  const built = buildPlanFilter(ctx, filters);
  if (built.denied) return { denied: true };

  const dateFilter = buildSessionDateFilter(filters.from, filters.to);

  const sessions = await prisma.therapy_sessions.findMany({
    where: {
      ...(dateFilter ? { session_date: dateFilter } : {}),
      therapy_plans: built.planWhere,
    },
    include: {
      therapy_plans: {
        include: {
          patients: { include: { users: { select: { name: true } } } },
          doctors: { include: { users: { select: { name: true } } } },
        },
      },
    },
    orderBy: { session_date: "asc" },
  });

  return sessions;
}

function groupByKey(sessions, keyFn) {
  const map = new Map();
  for (const s of sessions) {
    const key = keyFn(s);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return map;
}

function patientNameFromSession(s) {
  return (
    s.therapy_plans?.patients?.users?.name ||
    s.therapy_plans?.patients?.id?.slice(0, 8) ||
    "Unknown"
  );
}

// ─── Therapy Reports ───────────────────────────────────────────────────────────

async function getTherapyDaily(ctx, filters) {
  try {
    const sessionsResult = await fetchSessions(ctx, filters);
    if (sessionsResult?.denied) return { denied: true };
    const sessions = sessionsResult;
    const summary = sessionStats(sessions);

    const byDay = groupByKey(sessions, (s) => {
      if (!s.session_date) return null;
      return startOfDay(new Date(s.session_date)).toISOString().slice(0, 10);
    });

    const daily = [...byDay.entries()].map(([date, list]) => ({
      date,
      ...sessionStats(list),
    }));

    const byPatient = groupByKey(sessions, (s) => s.therapy_plans?.patient_id);
    const patientBreakdown = [...byPatient.entries()].map(([patientId, list]) => {
      const plan = list[0]?.therapy_plans;
      const stats = sessionStats(list);
      return {
        patientId,
        patientName: patientNameFromSession(list[0]),
        doctorName: plan?.doctors?.users?.name ?? null,
        progressPercent: calcProgressPercent(list, plan?.goals),
        ...stats,
      };
    });

    return {
      summary: { ...summary, progressPercent: calcProgressPercent(sessions) },
      daily,
      patientBreakdown,
      filters: { from: filters.from ?? null, to: filters.to ?? null },
    };
  } catch (error) {
    console.error("[Reports Service] Error in getTherapyDaily:", error);
    return { error: "Failed to fetch therapy daily data: " + error.message };
  }
}

async function getTherapyMonthly(ctx, filters) {
  try {
    const sessionsResult = await fetchSessions(ctx, filters);
    if (sessionsResult?.denied) return { denied: true };
    const sessions = sessionsResult;
    const summary = sessionStats(sessions);

    const byMonth = groupByKey(sessions, (s) => {
      if (!s.session_date) return null;
      const d = new Date(s.session_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const monthly = [...byMonth.entries()].map(([month, list]) => ({
      month,
      ...sessionStats(list),
      progressPercent: calcProgressPercent(list),
    }));

    const byPatient = groupByKey(sessions, (s) => s.therapy_plans?.patient_id);
    const patientBreakdown = [...byPatient.entries()].map(([patientId, list]) => {
      const plan = list[0]?.therapy_plans;
      const stats = sessionStats(list);
      return {
        patientId,
        patientName: patientNameFromSession(list[0]),
        doctorName: plan?.doctors?.users?.name ?? null,
        progressPercent: calcProgressPercent(list, plan?.goals),
        ...stats,
      };
    });

    return {
      summary: { ...summary, progressPercent: calcProgressPercent(sessions) },
      monthly,
      patientBreakdown,
      filters: { from: filters.from ?? null, to: filters.to ?? null },
    };
  } catch (error) {
    console.error("[Reports Service] Error in getTherapyMonthly:", error);
    return { error: "Failed to fetch therapy monthly data: " + error.message };
  }
}

// ─── Doctor Performance ──────────────────────────────────────────────────────────

async function getDoctorPerformance(ctx, filters) {
  try {
    if (ctx.role === "PATIENT") return { denied: true };

    let targetDoctorId = filters.doctorId ?? null;

    if (ctx.role === "DOCTOR") {
      if (!ctx.doctorId) return { denied: true };
      targetDoctorId = ctx.doctorId;
    }

    const dateFilter = buildSessionDateFilter(filters.from, filters.to);
    const planWhere = targetDoctorId ? { doctor_id: targetDoctorId } : {};

    const sessions = await prisma.therapy_sessions.findMany({
      where: {
        ...(dateFilter ? { session_date: dateFilter } : {}),
        therapy_plans: planWhere,
      },
    include: {
      therapy_plans: {
        include: {
          doctors: { include: { users: { select: { name: true } } } },
        },
      },
    },
  });

  const feedbackWhere = targetDoctorId ? { doctor_id: targetDoctorId } : {};
  const feedbackDate = buildSessionDateFilter(filters.from, filters.to);
  const feedbackRows = await prisma.feedback.findMany({
    where: {
      ...feedbackWhere,
      ...(feedbackDate ? { feedback_date: feedbackDate } : {}),
    },
  });

  const doctors = await prisma.doctors.findMany({
    where: targetDoctorId ? { id: targetDoctorId } : {},
    include: { users: { select: { name: true } } },
  });

  const doctorStats = doctors.map((doc) => {
    const docSessions = sessions.filter((s) => s.therapy_plans?.doctor_id === doc.id);
    const stats = sessionStats(docSessions);
    const docFeedback = feedbackRows.filter((f) => f.doctor_id === doc.id);
    const ratings = docFeedback.map((f) => f.rating).filter((r) => r != null);
    const avgRating =
      ratings.length > 0
        ? round2(ratings.reduce((a, b) => a + b, 0) / ratings.length)
        : toNumber(doc.rating);

    return {
      doctorId: doc.id,
      doctorName: doc.users?.name ?? "Doctor",
      specialization: doc.specialization,
      totalAssignedSessions: stats.total,
      completedSessions: stats.completed,
      missedSessions: stats.missed,
      cancelledSessions: stats.cancelled,
      attendanceRate: stats.attendanceRate,
      averageFeedbackRating: avgRating,
      feedbackCount: ratings.length,
    };
  });

  doctorStats.sort((a, b) => {
    if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
    return b.completedSessions - a.completedSessions;
  });

  const ranking = doctorStats.map((d, i) => ({ ...d, rank: i + 1 }));

  const aggregate = sessionStats(sessions);
  const allRatings = feedbackRows.map((f) => f.rating).filter((r) => r != null);
  const avgFeedback =
    allRatings.length > 0
      ? round2(allRatings.reduce((a, b) => a + b, 0) / allRatings.length)
      : 0;

  return {
    summary: {
      totalAssignedSessions: aggregate.total,
      completedSessions: aggregate.completed,
      missedSessions: aggregate.missed,
      attendanceRate: aggregate.attendanceRate,
      averageFeedbackRating: avgFeedback,
    },
    doctors: ranking,
    filters: {
      doctorId: targetDoctorId,
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
  };
  } catch (error) {
    console.error("[Reports Service] Error in getDoctorPerformance:", error);
    return { error: "Failed to fetch doctor performance data: " + error.message };
  }
}

// ─── Patient Performance ─────────────────────────────────────────────────────────

async function getPatientPerformance(ctx, filters) {
  try {
    let targetPatientId = filters.patientId ?? null;
    let targetDoctorId = filters.doctorId ?? null;

    if (ctx.role === "PATIENT") {
      if (!ctx.patientId) return { denied: true };
      targetPatientId = ctx.patientId;
      targetDoctorId = null;
      // Patients may only ever see their own data — ignore client filters.
    } else if (ctx.role === "DOCTOR") {
      if (!ctx.doctorId) return { denied: true };
      targetDoctorId = ctx.doctorId;
    }

  const planWhere = {};
  if (targetPatientId) planWhere.patient_id = targetPatientId;
  if (targetDoctorId) planWhere.doctor_id = targetDoctorId;

  const dateFilter = buildSessionDateFilter(filters.from, filters.to);

  const plans = await prisma.therapy_plans.findMany({
    where: planWhere,
    include: {
      patients: { include: { users: { select: { name: true, email: true } } } },
      doctors: { include: { users: { select: { name: true, email: true } } } },
      therapy_sessions: {
        where: dateFilter ? { session_date: dateFilter } : undefined,
        orderBy: { session_date: "desc" },
      },
    },
  });

  const patients = plans.reduce((acc, plan) => {
    const pid = plan.patient_id;
    if (!pid) return acc;
    if (!acc[pid]) {
      acc[pid] = {
        patientId: pid,
        patientName: plan.patients?.users?.name ?? "Patient",
        assignedDoctor: plan.doctors
          ? {
              doctorId: plan.doctor_id,
              name: plan.doctors.users?.name ?? null,
              email: plan.doctors.users?.email ?? null,
              specialization: plan.doctors.specialization ?? null,
            }
          : null,
        sessions: [],
        plans: [],
      };
    }
    acc[pid].sessions.push(...plan.therapy_sessions);
    acc[pid].plans.push(plan);
    if (!acc[pid].assignedDoctor && plan.doctors) {
      acc[pid].assignedDoctor = {
        doctorId: plan.doctor_id,
        name: plan.doctors.users?.name ?? null,
        email: plan.doctors.users?.email ?? null,
        specialization: plan.doctors.specialization ?? null,
      };
    }
    return acc;
  }, /** @type {Record<string, object>} */ ({}));

  const results = Object.values(patients).map((p) => {
    const stats = sessionStats(p.sessions);
    const milestones = p.plans.reduce(
      (m, plan) => {
        const ms = milestonesFromPlan(plan, plan.therapy_sessions);
        return {
          total: m.total + ms.total,
          achieved: m.achieved + ms.achieved,
          items: [...m.items, ...ms.items],
        };
      },
      { total: 0, achieved: 0, items: [] }
    );

    const outcomes = p.sessions
      .filter((s) => s.outcome)
      .map((s) => ({
        date: s.session_date,
        outcome: s.outcome,
        painLevel: s.pain_level,
        notes: s.progress_notes,
      }));

    return {
      patientId: p.patientId,
      patientName: p.patientName,
      progressPercent: calcProgressPercent(p.sessions, p.plans[0]?.goals),
      milestones,
      therapyResultsSummary: outcomes.slice(0, 20),
      sessionHistory: p.sessions.map((s) => ({
        id: s.id,
        date: s.session_date,
        status: s.status,
        attendance: s.attendance,
        duration: s.duration,
        outcome: s.outcome,
        painLevel: s.pain_level,
      })),
      attendanceRate: stats.attendanceRate,
      totalSessions: stats.total,
      completedSessions: stats.completed,
      missedSessions: stats.missed,
      assignedDoctor: p.assignedDoctor,
    };
  });

  const agg = sessionStats(
    plans.flatMap((pl) => pl.therapy_sessions)
  );

  return {
    summary: {
      patientCount: results.length,
      progressPercent:
        results.length > 0
          ? round2(
              results.reduce((a, r) => a + r.progressPercent, 0) / results.length
            )
          : 0,
      attendanceRate: agg.attendanceRate,
      totalSessions: agg.total,
      completedSessions: agg.completed,
    },
    patients: results,
    filters: {
      patientId: targetPatientId,
      doctorId: targetDoctorId,
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
  };
  } catch (error) {
    console.error("[Reports Service] Error in getPatientPerformance:", error);
    return { error: "Failed to fetch patient performance data: " + error.message };
  }
}

// ─── Financial Reports ─────────────────────────────────────────────────────────

function mapPaymentRow(payment) {
  const amount = toNumber(payment.amount);
  const patientName =
    payment.patients?.users?.name ||
    payment.patients?.id?.slice(0, 8) ||
    "Unknown";

  return {
    id: payment.id,
    patientId: payment.patient_id,
    patientName,
    amount,
    status: payment.status,
    referenceNumber: payment.reference_number,
    dueDate: payment.due_date,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  };
}

function sumByStatus(payments, statuses) {
  return round2(
    payments
      .filter((p) => statuses.includes(String(p.status || "").toUpperCase()))
      .reduce((sum, p) => sum + toNumber(p.amount), 0)
  );
}

async function getFinancial(ctx, filters) {
  try {
    if (ctx.role !== "ADMIN") return { denied: true };

    const dateFilter = buildSessionDateFilter(filters.from, filters.to);
    const where = {};
    if (filters.patientId) where.patient_id = String(filters.patientId);
    if (dateFilter) where.created_at = dateFilter;

    const payments = await prisma.payments.findMany({
      where,
      include: {
        patients: { include: { users: { select: { name: true } } } },
      },
      orderBy: { created_at: "desc" },
    });

    const revenue = sumByStatus(payments, ["SUCCESS"]);
    const outstandingPayments = sumByStatus(payments, ["PENDING", "OVERDUE"]);
    const totalInvoiced = round2(payments.reduce((sum, p) => sum + toNumber(p.amount), 0));

    const byMonth = new Map();
    for (const payment of payments) {
      const d = payment.created_at ? new Date(payment.created_at) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth.has(month)) {
        byMonth.set(month, { month, revenue: 0, outstanding: 0, total: 0, paymentCount: 0 });
      }
      const entry = byMonth.get(month);
      const amount = toNumber(payment.amount);
      entry.total = round2(entry.total + amount);
      entry.paymentCount += 1;
      const status = String(payment.status || "").toUpperCase();
      if (status === "SUCCESS") entry.revenue = round2(entry.revenue + amount);
      if (status === "PENDING" || status === "OVERDUE") {
        entry.outstanding = round2(entry.outstanding + amount);
      }
    }

    const monthlyEarnings = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    const paymentHistory = payments.map(mapPaymentRow);
    const invoices = paymentHistory.map((p) => ({
      id: p.id,
      invoiceNumber: p.referenceNumber || `INV-${String(p.id).slice(0, 8).toUpperCase()}`,
      patientId: p.patientId,
      patientName: p.patientName,
      amount: p.amount,
      status: p.status,
      dueDate: p.dueDate,
      issuedAt: p.createdAt,
    }));

    return {
      summary: {
        revenue,
        outstandingPayments,
        totalInvoiced,
        paymentCount: payments.length,
        overdueCount: payments.filter((p) => String(p.status).toUpperCase() === "OVERDUE").length,
        pendingCount: payments.filter((p) => String(p.status).toUpperCase() === "PENDING").length,
        successCount: payments.filter((p) => String(p.status).toUpperCase() === "SUCCESS").length,
      },
      monthlyEarnings,
      paymentHistory,
      invoices,
      filters: {
        from: filters.from ?? null,
        to: filters.to ?? null,
        patientId: filters.patientId ?? null,
      },
    };
  } catch (error) {
    console.error("[Reports Service] Error in getFinancial:", error);
    return { error: "Failed to fetch financial report data: " + error.message };
  }
}

// ─── Export ────────────────────────────────────────────────────────────────────

function resolveLogoPath(logoUrl) {
  if (!logoUrl || typeof logoUrl !== "string") return null;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const backendRoot = path.join(__dirname, "..", "..");
  const relative = trimmed.replace(/^\//, "");
  const candidates = [
    path.join(backendRoot, relative),
    path.join(backendRoot, "uploads", relative.replace(/^uploads\//, "")),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function buildExportMeta(ctx, filters) {
  const meta = {
    generatedAt: new Date(),
    generatedBy: ctx.role || "System",
    generatedByRole: ctx.role || null,
    hospitalName: "Life Ways Rehabilitation Centre",
    logoPath: null,
    address: null,
    contactPhone: null,
    contactEmail: null,
    filterLabels: {},
  };

  const [user, settings, doctor, patient] = await Promise.all([
    ctx.userId
      ? prisma.users.findUnique({
          where: { id: ctx.userId },
          select: { name: true, email: true },
        })
      : null,
    prisma.hospital_settings.findUnique({ where: { id: "default" } }),
    filters.doctorId
      ? prisma.doctors.findUnique({
          where: { id: String(filters.doctorId) },
          include: { users: { select: { name: true } } },
        })
      : null,
    filters.patientId
      ? prisma.patients.findUnique({
          where: { id: String(filters.patientId) },
          include: { users: { select: { name: true } } },
        })
      : null,
  ]);

  if (user?.name || user?.email) {
    meta.generatedBy = user.name || user.email;
  }
  if (settings) {
    if (settings.hospital_name) meta.hospitalName = settings.hospital_name;
    meta.logoPath = resolveLogoPath(settings.logo_url);
    meta.address = settings.address ?? null;
    meta.contactPhone = settings.contact_phone ?? null;
    meta.contactEmail = settings.contact_email ?? null;
  }
  if (doctor) {
    meta.filterLabels.doctor = doctor.users?.name || filters.doctorId;
  }
  if (patient) {
    meta.filterLabels.patient = patient.users?.name || filters.patientId;
  }

  return meta;
}

async function enrichExportData(data, ctx, filters) {
  return {
    ...data,
    exportMeta: await buildExportMeta(ctx, filters),
  };
}

async function collectReportData(type, ctx, filters) {
  const normalized = normalizeType(type);
  switch (normalized) {
    case "therapy-daily":
      return getTherapyDaily(ctx, filters);
    case "therapy-monthly":
      return getTherapyMonthly(ctx, filters);
    case "doctor":
      return getDoctorPerformance(ctx, filters);
    case "patient":
      return getPatientPerformance(ctx, filters);
    case "financial":
      return getFinancial(ctx, filters);
    default:
      return { error: "Invalid report type" };
  }
}

async function buildPdfBuffer(type, data) {
  return buildProfessionalPdf(normalizeType(type), data);
}

async function buildExcelBuffer(type, data) {
  return buildProfessionalExcel(normalizeType(type), data);
}

async function exportReport(format, type, ctx, filters) {
  try {
    const normalizedType = normalizeType(type);
    if (normalizedType === "doctor" && ctx.role === "PATIENT") return { denied: true };
    if (normalizedType === "financial" && ctx.role !== "ADMIN") return { denied: true };

    const raw = await collectReportData(type, ctx, filters);
    if (raw?.denied) return { denied: true };
    if (raw?.error) return { error: raw.error };
    if (!raw) return { error: "Failed to collect report data" };

    const data = await enrichExportData(raw, ctx, filters);

    if (format === "pdf") {
      let timeoutId;
      const buffer = await Promise.race([
        buildPdfBuffer(normalizedType, data),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("PDF generation timeout")), 30000);
        }),
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });

      if (!buffer || buffer.length === 0) {
        return { error: "Failed to generate PDF" };
      }

      return {
        buffer,
        filename: buildExportFilename(normalizedType, "pdf"),
        contentType: "application/pdf",
      };
    }

    const buffer = await buildExcelBuffer(normalizedType, data);
    if (!buffer || buffer.length === 0) {
      return { error: "Failed to generate Excel file" };
    }
    return {
      buffer,
      filename: buildExportFilename(normalizedType, "excel"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  } catch (error) {
    console.error("[Reports Service] Error in exportReport:", error);
    return { error: error.message || "Export failed" };
  }
}

module.exports = {
  resolveUserContext,
  getTherapyDaily,
  getTherapyMonthly,
  getDoctorPerformance,
  getPatientPerformance,
  getFinancial,
  exportReport,
};
