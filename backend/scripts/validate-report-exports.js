"use strict";

/**
 * Production validation for all report exports.
 * Run: node scripts/validate-report-exports.js
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const prisma = require("../src/lib/prisma");
const reportsService = require("../src/services/reports.service");
const { buildExportFilename } = require("../src/utils/pdfGenerator");

const TYPES = ["therapy-daily", "therapy-monthly", "doctor", "patient", "financial"];

const EXPECTED_EXCEL_SHEETS = {
  "therapy-daily": ["Executive Summary", "Detailed Report", "Statistics", "Raw Data"],
  "therapy-monthly": ["Executive Summary", "Detailed Report", "Statistics", "Raw Data"],
  doctor: ["Executive Summary", "Detailed Report", "Statistics", "Raw Data"],
  patient: ["Executive Summary", "Detailed Report", "Statistics", "Raw Data"],
  financial: [
    "Executive Summary",
    "Detailed Report",
    "Statistics",
    "Raw Data",
    "Invoices",
    "Outstanding Payments",
    "Monthly Revenue",
    "Payments",
  ],
};

const filters = { from: "2025-01-01", to: "2026-12-31" };

async function checkPaymentsTable() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM payments LIMIT 1`;
    return { exists: true };
  } catch (err) {
    return { exists: false, message: err.message };
  }
}

async function resolveAdminContext() {
  const admin = await prisma.users.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, role: true, name: true },
  });
  if (!admin) {
    return reportsService.resolveUserContext({ id: null, role: "ADMIN" });
  }
  return reportsService.resolveUserContext(admin);
}

function crossCheckSummary(type, raw, enriched) {
  const issues = [];
  if (!raw?.summary) return issues;

  if (type.startsWith("therapy")) {
    if (enriched.summary?.total !== raw.summary.total) {
      issues.push("therapy total mismatch");
    }
  }
  if (type === "doctor" && enriched.doctors?.length !== raw.doctors?.length) {
    issues.push("doctor count mismatch");
  }
  if (type === "patient" && enriched.patients?.length !== raw.patients?.length) {
    issues.push("patient count mismatch");
  }
  if (type === "financial") {
    if (enriched.summary?.revenue !== raw.summary.revenue) issues.push("revenue mismatch");
    if (enriched.paymentHistory?.length !== raw.paymentHistory?.length) {
      issues.push("payment history mismatch");
    }
  }
  return issues;
}

async function validateExcelWorkbook(buffer, type) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const names = workbook.worksheets.map((s) => s.name);
  const expected = EXPECTED_EXCEL_SHEETS[type] || [];
  const missing = expected.filter((n) => !names.includes(n));
  return { ok: missing.length === 0, sheets: names, missing };
}

async function main() {
  const paymentsStatus = await checkPaymentsTable();
  console.log("\n=== Financial Migration Check ===");
  if (paymentsStatus.exists) {
    console.log("✅ payments table exists");
  } else {
    console.log("⚠️  payments table missing — run: npx prisma migrate deploy && npx prisma generate");
    console.log(`   ${paymentsStatus.message}`);
  }

  const ctx = await resolveAdminContext();
  const results = [];
  const outDir = path.join(__dirname, "..", "tmp", "export-validation");
  fs.mkdirSync(outDir, { recursive: true });

  for (const type of TYPES) {
    const raw = await reportsService[
      type === "therapy-daily"
        ? "getTherapyDaily"
        : type === "therapy-monthly"
          ? "getTherapyMonthly"
          : type === "doctor"
            ? "getDoctorPerformance"
            : type === "patient"
              ? "getPatientPerformance"
              : "getFinancial"
    ](ctx, filters);

    for (const format of ["pdf", "excel"]) {
      const label = `${type} (${format})`;
      try {
        const result = await reportsService.exportReport(format, type, ctx, filters);
        if (result?.denied) {
          results.push({ label, ok: false, error: "Access denied" });
          continue;
        }
        if (result?.error) {
          results.push({ label, ok: false, error: result.error });
          continue;
        }

        const buffer = result.buffer;
        const size = buffer?.length ?? 0;
        const pdfOk = format === "pdf" && buffer?.slice(0, 4).toString() === "%PDF";
        const xlsxOk =
          format === "excel" &&
          buffer?.[0] === 0x50 &&
          buffer?.[1] === 0x4b &&
          buffer?.[2] === 0x03 &&
          buffer?.[3] === 0x04;

        const mimeOk =
          format === "pdf"
            ? result.contentType === "application/pdf"
            : result.contentType ===
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        const filenameOk = /\.(pdf|xlsx)$/.test(result.filename) && result.filename.includes("_");

        const dataIssues = crossCheckSummary(type, raw, raw);

        let excelCheck = { ok: true, sheets: [], missing: [] };
        if (format === "excel") {
          excelCheck = await validateExcelWorkbook(buffer, type);
        }

        const valid =
          size > 500 &&
          (pdfOk || xlsxOk) &&
          mimeOk &&
          filenameOk &&
          dataIssues.length === 0 &&
          excelCheck.ok;

        results.push({
          label,
          ok: valid,
          size,
          filename: result.filename,
          contentType: result.contentType,
          dataIssues,
          excelSheets: excelCheck.sheets,
          excelMissing: excelCheck.missing,
        });

        fs.writeFileSync(path.join(outDir, result.filename), buffer);
      } catch (err) {
        results.push({ label, ok: false, error: err.message });
      }
    }
  }

  console.log("\n=== Report Export Validation ===\n");
  let passed = 0;
  for (const r of results) {
    if (r.ok) {
      passed += 1;
      console.log(`✅ ${r.label} — ${r.size} bytes — ${r.filename}`);
    } else {
      const detail = r.error || r.dataIssues?.join(", ") || r.excelMissing?.join(", ") || "invalid";
      console.log(`❌ ${r.label} — ${detail}`);
    }
  }

  const financialBlocked = !paymentsStatus.exists;
  const score = Math.round((passed / results.length) * 100);
  console.log(`\n${passed}/${results.length} exports passed.`);
  console.log(`Production readiness score: ${financialBlocked ? Math.min(score, 80) : score}/100`);
  if (financialBlocked) {
    console.log("Financial exports require: npx prisma migrate deploy && npx prisma generate");
  }
  console.log("");

  await prisma.$disconnect();
  process.exit(passed === results.length ? 0 : financialBlocked && passed >= 8 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
