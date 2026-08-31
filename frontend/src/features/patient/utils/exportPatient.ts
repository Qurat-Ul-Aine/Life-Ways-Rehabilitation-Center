import {
  emptyBlock,
  escapeHtml,
  openPrintReport,
  reportHeader,
  summaryBadges,
  tableRows,
} from "@/lib/exportReportHtml";
import type { Patient } from "../patient.types";

const csvEscape = (value: unknown) => {
  const s = value === undefined || value === null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

const triggerDownload = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

export const exportPatientCsv = (patient: Patient) => {
  const lines = [
    ["Field", "Value"].map(csvEscape).join(","),
    ...Object.entries({
      ID: patient.id,
      "Full Name": patient.fullName,
      Email: patient.email,
      Phone: patient.phone,
      Gender: patient.gender,
      "Date of Birth": patient.dateOfBirth,
      Address: patient.address,
      Status: patient.status,
      "Assigned Doctor": patient.assignedDoctorName ?? "Unassigned",
      "Admission Date": patient.admissionDate,
      "Primary Diagnosis": patient.primaryDiagnosis ?? "",
      "Recovery %": patient.recoveryProgress,
      "Emergency Contact": `${patient.emergencyContactName} (${patient.emergencyContactPhone})`,
    }).map(([k, v]) => [k, v].map(csvEscape).join(",")),
  ];
  triggerDownload(`${patient.id}-${patient.fullName.replace(/\s+/g, "_")}.csv`, lines.join("\n"), "text/csv");
};

/** Print-ready patient report → browser Save as PDF. */
export const exportPatientReport = (patient: Patient) => {
  const body = `
    ${reportHeader(
      patient.fullName,
      `Patient Report • ${escapeHtml(patient.id)} • ${escapeHtml(patient.status.toUpperCase())} • Generated ${escapeHtml(fmtDateTime(new Date().toISOString()))}`,
    )}
    ${summaryBadges([
      { label: "Recovery", value: `${patient.recoveryProgress}%` },
      { label: "Assigned Doctor", value: patient.assignedDoctorName ?? "Unassigned" },
      { label: "Admission", value: fmtDate(patient.admissionDate) },
      { label: "Primary Diagnosis", value: patient.primaryDiagnosis ?? "—" },
    ])}

    <h2>Demographics</h2>
    <table>
      <tr><th>Email</th><td>${escapeHtml(patient.email)}</td><th>Phone</th><td>${escapeHtml(patient.phone)}</td></tr>
      <tr><th>Gender</th><td>${escapeHtml(patient.gender)}</td><th>DOB</th><td>${escapeHtml(patient.dateOfBirth)}</td></tr>
      <tr><th>Address</th><td colspan="3">${escapeHtml(patient.address)}</td></tr>
      <tr><th>Emergency Contact</th><td colspan="3">${escapeHtml(`${patient.emergencyContactName} (${patient.emergencyContactPhone})`)}</td></tr>
    </table>

    <h2>Medical History (${patient.medicalHistory.length})</h2>
    ${
      patient.medicalHistory.length === 0
        ? emptyBlock("No records.")
        : `<table><thead><tr><th>Date</th><th>Type</th><th>Title</th><th>Author</th><th>Details</th></tr></thead><tbody>` +
          tableRows(
            patient.medicalHistory.map((m) => [
              escapeHtml(fmtDate(m.date)),
              escapeHtml(m.type),
              escapeHtml(m.title),
              escapeHtml(m.authorName),
              escapeHtml(m.details),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Therapy Sessions (${patient.therapySessions.length})</h2>
    ${
      patient.therapySessions.length === 0
        ? emptyBlock("No sessions.")
        : `<table><thead><tr><th>Date</th><th>Type</th><th>Therapist</th><th>Status</th><th>Notes</th></tr></thead><tbody>` +
          tableRows(
            patient.therapySessions.map((s) => [
              escapeHtml(fmtDate(s.date)),
              escapeHtml(s.type),
              escapeHtml(s.therapistName),
              escapeHtml(s.status),
              escapeHtml(s.notes ?? ""),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Recovery Timeline</h2>
    ${
      patient.recoveryTimeline.length === 0
        ? emptyBlock("No data.")
        : `<table><thead><tr><th>Date</th><th>Score</th><th>Note</th></tr></thead><tbody>` +
          tableRows(
            patient.recoveryTimeline.map((r) => [
              escapeHtml(fmtDate(r.date)),
              escapeHtml(String(r.score)),
              escapeHtml(r.note ?? ""),
            ]),
          ) +
          `</tbody></table>`
    }
  `;

  openPrintReport(`Patient Report - ${patient.fullName}`, body);
};
