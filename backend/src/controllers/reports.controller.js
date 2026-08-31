"use strict";

const prisma = require("../lib/prisma");
const { sendSuccess, sendError } = require("../utils/response");
const reportsService = require("../services/reports.service");
const {
  notifyProgressReport,
  persistAndNotifyReport,
} = require("../services/notification.service");

function parseFilters(req) {
  const q = req.query ?? {};
  return {
    from: q.from ?? q.startDate ?? null,
    to: q.to ?? q.endDate ?? null,
    doctorId: q.doctorId ?? q.doctor_id ?? null,
    patientId: q.patientId ?? q.patient_id ?? null,
  };
}

async function loadPatientContext(patientId) {
  if (!patientId) return null;
  return prisma.patients.findUnique({
    where: { id: String(patientId) },
    include: {
      users: true,
      therapy_plans: {
        take: 1,
        orderBy: { start_date: "desc" },
        include: { doctors: { include: { users: true } } },
      },
    },
  });
}

async function notifyPatientReportEvent({
  patientId,
  generatedBy,
  reportType,
  reportData,
  status,
  event,
}) {
  const patient = await loadPatientContext(patientId);
  if (!patient?.users) return;

  await persistAndNotifyReport({
    patientId: patient.id,
    generatedBy,
    reportType,
    reportData,
    status,
    event,
    patientUser: patient.users,
    doctorUser: patient.therapy_plans?.[0]?.doctors?.users,
  });
}

async function withContext(req, res, handler, { notifyOnGenerate = false, reportType = null } = {}) {
  try {
    const ctx = await reportsService.resolveUserContext(req.user);
    const filters = parseFilters(req);
    const result = await handler(ctx, filters);

    if (result?.denied) {
      return sendError(res, 403, "You do not have access to this report.");
    }
    if (result?.error) {
      return sendError(res, 400, result.error);
    }

    if (notifyOnGenerate && reportType) {
      const patientId = filters.patientId ?? ctx.patientId;
      if (patientId) {
        try {
          await notifyPatientReportEvent({
            patientId,
            generatedBy: req.user?.id,
            reportType,
            reportData: result,
            status: "generated",
            event: "generated",
          });
        } catch (notifyErr) {
          console.error("[reports] generated notification failed:", notifyErr.message);
        }
      }
    }

    return sendSuccess(res, 200, "Report generated.", result);
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to generate report.");
  }
}

async function therapyDaily(req, res) {
  return withContext(req, res, reportsService.getTherapyDaily);
}

async function therapyMonthly(req, res) {
  return withContext(req, res, reportsService.getTherapyMonthly);
}

async function doctorPerformance(req, res) {
  return withContext(req, res, reportsService.getDoctorPerformance);
}

async function patientPerformance(req, res) {
  const shouldNotify = String(req.query?.notify ?? req.query?.save ?? "false").toLowerCase() === "true";
  return withContext(req, res, reportsService.getPatientPerformance, {
    notifyOnGenerate: shouldNotify,
    reportType: "Patient Performance",
  });
}

async function financial(req, res) {
  return withContext(req, res, reportsService.getFinancial);
}

async function exportPdf(req, res) {
  return exportFile(req, res, "pdf");
}

async function exportExcel(req, res) {
  return exportFile(req, res, "excel");
}

async function exportFile(req, res, format) {
  try {
    const type = req.query?.type ?? req.query?.reportType ?? "therapy-monthly";
    const ctx = await reportsService.resolveUserContext(req.user);
    const filters = parseFilters(req);

    const result = await reportsService.exportReport(format, type, ctx, filters);

    if (result?.denied) {
      return sendError(res, 403, "You do not have access to export this report.");
    }
    if (result?.error) {
      return sendError(res, 400, result.error);
    }

    if (["patient", "patients", "patient-performance"].includes(String(type).toLowerCase())) {
      try {
        const patientId = filters.patientId ?? ctx.patientId;
        if (patientId) {
          await notifyPatientReportEvent({
            patientId,
            generatedBy: req.user?.id,
            reportType: "Patient Performance",
            reportData: { type, format },
            status: "exported",
            event: "exported",
          });
        }
      } catch (notifyErr) {
        console.error("[reports] export notification failed:", notifyErr.message);
      }
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  } catch (err) {
    console.error("[reports] export error:", err);
    return sendError(res, 500, err.message || "Export failed.");
  }
}

function normalizeExportType(type) {
  const t = String(type || "").toLowerCase();
  if (t === "doctors") return "doctor";
  if (t === "patients" || t === "patient-performance") return "patient";
  return t;
}

async function canModifyReport(user, report) {
  if (!user || !report) return false;
  const role = String(user.role || "").toUpperCase();
  if (role === "ADMIN") return true;
  if (role !== "DOCTOR") return false;

  const doctor = await prisma.doctors.findFirst({ where: { user_id: user.id } });
  if (!doctor) return false;
  if (report.generated_by === user.id) return true;
  if (!report.patient_id) return false;

  const link = await prisma.doctor_patient.findFirst({
    where: { doctor_id: doctor.id, patient_id: report.patient_id },
  });
  if (link) return true;

  const plan = await prisma.therapy_plans.findFirst({
    where: { doctor_id: doctor.id, patient_id: report.patient_id },
  });
  return !!plan;
}

async function updateReport(req, res) {
  try {
    const report = await prisma.reports.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!report) return sendError(res, 404, "Report not found");

    const allowed = await canModifyReport(req.user, report);
    if (!allowed) return sendError(res, 403, "You do not have permission to update this report.");

    const { reportData, status } = req.body ?? {};
    let nextReportData = report.report_data;

    if (reportData !== undefined) {
      nextReportData =
        typeof reportData === "string" ? reportData : JSON.stringify(reportData);
    } else if (status !== undefined) {
      let parsed = {};
      try {
        parsed = report.report_data ? JSON.parse(report.report_data) : {};
      } catch {
        parsed = { raw: report.report_data };
      }
      parsed.status = String(status);
      nextReportData = JSON.stringify(parsed);
    }

    const updated = await prisma.reports.update({
      where: { id: report.id },
      data: {
        report_data: nextReportData,
        generated_date: new Date(),
      },
    });

    if (report.patient_id && status === "finalized") {
      const patient = await loadPatientContext(report.patient_id);
      if (patient?.users) {
        try {
          await notifyProgressReport({
            patientUser: patient.users,
            doctorUser: patient.therapy_plans?.[0]?.doctors?.users,
            reportType: updated.report_type ?? "Progress",
            progressId: updated.id,
            event: "finalized",
          });
        } catch (notifyErr) {
          console.error("[reports] finalize notification failed:", notifyErr.message);
        }
      }
    }

    return sendSuccess(res, 200, "Report updated.", updated);
  } catch (err) {
    return sendError(res, 500, err.message || "Failed to update report.");
  }
}

async function finalizeReport(req, res) {
  req.body = { ...(req.body ?? {}), status: "finalized" };
  return updateReport(req, res);
}

module.exports = {
  therapyDaily,
  therapyMonthly,
  doctorPerformance,
  patientPerformance,
  financial,
  exportPdf,
  exportExcel,
  updateReport,
  finalizeReport,
};
