import {
  emptyBlock,
  escapeHtml,
  openPrintReport,
  reportHeader,
  summaryBadges,
  tableRows,
} from "@/lib/exportReportHtml";
import type { StaffMember } from "../staff.types";
import { staffRoleLabel } from "../staff.types";
import { formatShiftTimingDisplay } from "./shiftTiming";

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

const shiftTypeLabel = (type?: string | null) => {
  if (!type) return "—";
  const t = type.toLowerCase();
  if (t === "morning") return "Morning";
  if (t === "evening") return "Evening";
  return type;
};

/** Print-ready staff report → browser Save as PDF. */
export const exportStaffReport = (staff: StaffMember) => {
  const name = staff.fullName ?? staff.name ?? "Staff Member";
  const role = staffRoleLabel(staff.role);
  const department = staff.department ?? staff.specialty ?? "—";
  const att = staff.attendanceSummary ?? { presentDays: 0, totalDays: 0, percentage: 0 };
  const tasks = staff.taskSummary ?? { completed: 0, pending: 0, total: 0 };
  const salary = staff.baseSalary
    ? `${staff.currency ?? "PKR"} ${Number(staff.baseSalary).toLocaleString()}`
    : "—";

  const body = `
    ${reportHeader(name, `Staff Report • ${escapeHtml(staff.id)} • ${escapeHtml(role)} • ${escapeHtml(String(staff.status ?? "active").toUpperCase())} • Generated ${escapeHtml(fmtDateTime(new Date().toISOString()))}`)}
    ${summaryBadges([
      {
        label: "Attendance",
        value: att.totalDays === 0 ? "—" : `${att.percentage}% (${att.presentDays}/${att.totalDays})`,
      },
      {
        label: "Tasks",
        value: tasks.total === 0 ? "—" : `${tasks.completed} done / ${tasks.pending} pending`,
      },
      { label: "Tenure", value: staff.tenureSummary?.displayValue ?? "—" },
      { label: "Department", value: department },
    ])}

    <h2>Contact & Employment</h2>
    <table>
      <tr><th>Email</th><td>${escapeHtml(staff.email ?? "—")}</td><th>Phone</th><td>${escapeHtml(staff.phone ?? "—")}</td></tr>
      <tr><th>Department</th><td>${escapeHtml(department)}</td><th>Joining Date</th><td>${escapeHtml(fmtDate(staff.joinedAt ?? staff.joinedOn))}</td></tr>
      <tr><th>Shift Type</th><td>${escapeHtml(shiftTypeLabel(staff.shiftType))}</td><th>Shift Timing</th><td>${escapeHtml(formatShiftTimingDisplay(staff.shiftTiming))}</td></tr>
      <tr><th>Base Salary</th><td colspan="3">${escapeHtml(salary)}</td></tr>
    </table>

    <h2>Attendance History (${staff.attendance?.length ?? 0})</h2>
    ${
      !(staff.attendance?.length)
        ? emptyBlock("No records.")
        : `<table><thead><tr><th>Date</th><th>Status</th><th>Check-in</th><th>Check-out</th></tr></thead><tbody>` +
          tableRows(
            staff.attendance.map((a) => [
              escapeHtml(fmtDate(a.date)),
              escapeHtml(a.status),
              escapeHtml(a.checkIn ?? "—"),
              escapeHtml(a.checkOut ?? "—"),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Tasks (${staff.tasks?.length ?? 0})</h2>
    ${
      !(staff.tasks?.length)
        ? emptyBlock("No tasks.")
        : `<table><thead><tr><th>Date</th><th>Task</th><th>Assigned By</th><th>Status</th></tr></thead><tbody>` +
          tableRows(
            staff.tasks.map((t) => [
              escapeHtml(fmtDate(t.date)),
              escapeHtml(t.taskDescription),
              escapeHtml(t.assignedBy),
              escapeHtml(t.status),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Internal Notes (${staff.notes?.length ?? 0})</h2>
    ${
      !(staff.notes?.length)
        ? emptyBlock("No notes.")
        : `<table><thead><tr><th>Date</th><th>Note</th><th>Added By</th></tr></thead><tbody>` +
          tableRows(
            staff.notes.map((n) => [
              escapeHtml(fmtDate(n.date)),
              escapeHtml(n.noteText),
              escapeHtml(n.addedBy),
            ]),
          ) +
          `</tbody></table>`
    }

    <h2>Documents (${staff.documents?.length ?? 0})</h2>
    ${
      !(staff.documents?.length)
        ? emptyBlock("No documents.")
        : `<table><thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Uploaded</th></tr></thead><tbody>` +
          tableRows(
            staff.documents.map((d) => [
              escapeHtml(d.title),
              escapeHtml(d.category.replace(/_/g, " ")),
              escapeHtml(d.fileType),
              escapeHtml(fmtDateTime(d.uploadedAt)),
            ]),
          ) +
          `</tbody></table>`
    }
  `;

  openPrintReport(`Staff Report - ${name}`, body);
};
