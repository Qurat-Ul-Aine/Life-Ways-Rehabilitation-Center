import {
  emptyBlock,
  escapeHtml,
  openPrintReport,
  reportHeader,
  summaryBadges,
  tableRows,
} from "@/lib/exportReportHtml";
import type {
  TherapyPlan,
  TherapyReportSummary,
  TherapySessionRecord,
} from "../therapy.types";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const planStatus = (status?: string) => {
  const s = String(status ?? "active").toLowerCase();
  if (s === "active") return "Active";
  if (s === "completed") return "Completed";
  if (s === "paused" || s === "on_hold") return "On Hold";
  if (s === "cancelled") return "Cancelled";
  return s;
};

const sessionStatus = (s: TherapySessionRecord) => {
  const st = String(s.status ?? "").toUpperCase();
  if (st === "COMPLETED") return "Completed";
  if (st === "CANCELLED") return "Missed";
  if (st === "SCHEDULED") return "Scheduled";
  return s.status ?? "—";
};

const outcomeLabel = (outcome?: string) => {
  if (!outcome || outcome === "n/a") return "—";
  if (outcome === "improved") return "Improved";
  if (outcome === "no-change") return "Stable";
  if (outcome === "regressed") return "Regressed";
  return outcome;
};

/** Print-ready therapy plan report → browser Save as PDF. */
export function exportTherapyReport(plan: TherapyPlan, summary: TherapyReportSummary) {
  const patientName = plan.patientName ?? plan.patients?.users?.name ?? "—";
  const therapistName = plan.therapistName ?? plan.doctors?.users?.name ?? "—";
  const therapyType = plan.therapy_type ?? plan.title ?? "Therapy Plan";
  const diagnosis = plan.diagnosis?.trim() || "—";
  const description = plan.description?.trim() || "—";
  const goals = plan.goals ?? [];
  const exercises = plan.therapy_exercises ?? plan.exercises ?? [];
  const files = plan.files ?? plan.therapy_plan_files ?? [];
  const sessions = [...(plan.therapy_sessions ?? [])].sort((a, b) => {
    const da = a.session_date ?? a.date ?? "";
    const db = b.session_date ?? b.date ?? "";
    return db.localeCompare(da);
  });

  const completedSessions = sessions.filter(
    (s) => String(s.status ?? "").toUpperCase() === "COMPLETED",
  ).length;
  const progressPct =
    sessions.length > 0 ? Math.round((completedSessions / sessions.length) * 100) : 0;
  const freq = plan.frequencyPerWeek ?? plan.frequency_per_week ?? 0;
  const startDate = plan.start_date ?? plan.startDate ?? null;
  const endDate = plan.end_date ?? plan.endDate ?? null;

  const goalsHtml =
    goals.length === 0
      ? emptyBlock("No goals defined.")
      : `<ul>${goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>`;

  const summaryItems = [
    { label: "Patient", value: patientName },
    { label: "Therapist", value: therapistName },
    { label: "Status", value: planStatus(plan.status) },
    { label: "Sessions", value: `${completedSessions}/${sessions.length} (${progressPct}%)` },
    { label: "Improved", value: String(summary.improvedCount) },
  ];
  if (summary.averagePainLevel != null) {
    summaryItems.push({
      label: "Avg pain",
      value: `${summary.averagePainLevel.toFixed(1)}/10`,
    });
  }

  const body = `
    ${reportHeader(therapyType, `Therapy Plan Report • Generated ${fmtDateTime(summary.generatedAt)}`)}
    ${summaryBadges(summaryItems)}

    <h2>Plan Overview</h2>
    <table>
      <tr><th>Plan ID</th><td>${escapeHtml(plan.id)}</td><th>Diagnosis</th><td>${escapeHtml(diagnosis)}</td></tr>
      <tr><th>Start Date</th><td>${escapeHtml(fmtDate(startDate))}</td><th>End Date</th><td>${escapeHtml(fmtDate(endDate))}</td></tr>
      <tr><th>Frequency</th><td>${escapeHtml(freq > 0 ? `${freq} sessions / week` : "—")}</td>
          <th>Resources</th><td>${escapeHtml(`${exercises.length} exercise(s), ${files.length} file(s)`)}</td></tr>
      <tr><th>Description</th><td colspan="3">${escapeHtml(description)}</td></tr>
    </table>

    <h2>Treatment Goals (${goals.length})</h2>
    ${goalsHtml}

    <h2>Prescribed Exercises (${exercises.length})</h2>
    ${
      exercises.length === 0
        ? emptyBlock("No text exercises assigned.")
        : `<table><thead><tr><th>Title</th><th>Instructions</th></tr></thead><tbody>` +
          tableRows(
            exercises.map((ex) => [
              escapeHtml(ex.title ?? ex.name ?? "Exercise"),
              escapeHtml(ex.description ?? "—").replace(/\n/g, "<br/>"),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Uploaded Resources (${files.length})</h2>
    ${
      files.length === 0
        ? emptyBlock("No video or document files.")
        : `<table><thead><tr><th>Title</th><th>Type</th><th>Uploaded By</th><th>Date</th></tr></thead><tbody>` +
          tableRows(
            files.map((f) => [
              escapeHtml(f.title ?? f.fileName),
              escapeHtml(f.fileType),
              escapeHtml(f.uploadedBy),
              escapeHtml(fmtDate(f.uploadedAt)),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Session History (${sessions.length})</h2>
    ${
      sessions.length === 0
        ? emptyBlock("No sessions recorded.")
        : `<table><thead><tr><th>Date</th><th>Duration</th><th>Status</th><th>Outcome</th><th>Pain</th><th>Notes</th></tr></thead><tbody>` +
          tableRows(
            sessions.map((s) => [
              escapeHtml(fmtDate(s.session_date ?? s.date)),
              escapeHtml(s.duration ?? s.durationMinutes ? `${s.duration ?? s.durationMinutes} min` : "—"),
              escapeHtml(sessionStatus(s)),
              escapeHtml(outcomeLabel(s.outcome)),
              escapeHtml(s.painLevel ?? s.pain_level != null ? String(s.painLevel ?? s.pain_level) : "—"),
              escapeHtml(s.progress_notes ?? s.notes ?? "—").replace(/\n/g, "<br/>"),
            ]),
          ) +
          `</tbody></table>`
    }
  `;

  openPrintReport(`Therapy Report - ${therapyType}`, body);
}
