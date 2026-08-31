"use strict";

const prisma = require("../lib/prisma");
const { INTERN_INCLUDE, mapIntern } = require("../models/intern.mapper");
const internService = require("./intern.service");
const internExtended = require("./internExtended.service");

async function collectInternReportData(type, { internId, mentorId, fromDate, toDate } = {}) {
  switch (type) {
    case "intern-attendance": {
      if (!internId) throw new Error("internId is required.");
      const intern = await prisma.internees.findUnique({
        where: { id: String(internId) },
        include: INTERN_INCLUDE,
      });
      if (!intern) throw new Error("Intern not found.");
      const attendance = await internExtended.listAttendance(internId, { fromDate, toDate });
      return {
        title: "Intern Attendance Report",
        intern: mapIntern(intern),
        rows: attendance.items,
        summary: {
          total: attendance.total,
          attendancePercentage: attendance.attendancePercentage,
        },
      };
    }
    case "intern-training-logs": {
      if (!internId) throw new Error("internId is required.");
      const intern = await prisma.internees.findUnique({
        where: { id: String(internId) },
        include: INTERN_INCLUDE,
      });
      if (!intern) throw new Error("Intern not found.");
      const logs = await internService.listTrainingLogs(internId, { fromDate, toDate });
      return {
        title: "Training Log Report",
        intern: mapIntern(intern),
        rows: logs.items,
        summary: { total: logs.total, totalHours: logs.totalHours },
      };
    }
    case "intern-progress": {
      if (!internId) throw new Error("internId is required.");
      const intern = await prisma.internees.findUnique({
        where: { id: String(internId) },
        include: INTERN_INCLUDE,
      });
      if (!intern) throw new Error("Intern not found.");
      const progress = await internExtended.getProgressMetrics(intern);
      return {
        title: "Intern Progress Report",
        intern: mapIntern(intern),
        progress,
      };
    }
    case "mentor-performance": {
      const where = mentorId ? { mentor_id: String(mentorId), is_active: true } : { is_active: true };
      const interns = await prisma.internees.findMany({
        where,
        include: INTERN_INCLUDE,
      });
      const items = [];
      for (const row of interns) {
        const progress = await internExtended.getProgressMetrics(row);
        items.push({ intern: mapIntern(row), progress });
      }
      return {
        title: "Mentor Performance Report",
        mentorId: mentorId ?? null,
        items,
        summary: { menteeCount: items.length },
      };
    }
    case "intern-completion": {
      const interns = await prisma.internees.findMany({
        where: { application_status: "COMPLETED" },
        include: INTERN_INCLUDE,
        orderBy: { internship_end: "desc" },
      });
      return {
        title: "Internship Completion Report",
        rows: interns.map(mapIntern),
        summary: { total: interns.length },
      };
    }
    default:
      throw new Error(`Unknown intern report type: ${type}`);
  }
}

function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = c.get(row);
          const str = val == null ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

async function exportInternExcel(type, params) {
  const data = await collectInternReportData(type, params);
  if (type === "intern-attendance") {
    return toCsv(data.rows, [
      { label: "Date", get: (r) => r.recordDate },
      { label: "Check In", get: (r) => r.checkIn },
      { label: "Check Out", get: (r) => r.checkOut },
      { label: "Hours", get: (r) => r.hoursWorked },
      { label: "Status", get: (r) => r.status },
      { label: "Remarks", get: (r) => r.remarks },
    ]);
  }
  if (type === "intern-training-logs") {
    return toCsv(data.rows, [
      { label: "Date", get: (r) => r.logDate },
      { label: "Hours", get: (r) => r.hoursWorked },
      { label: "Tasks", get: (r) => r.tasksCompleted },
      { label: "Notes", get: (r) => r.learningNotes },
      { label: "Skills", get: (r) => r.skillsLearned },
    ]);
  }
  if (type === "intern-completion") {
    return toCsv(data.rows, [
      { label: "Name", get: (r) => r.name },
      { label: "Department", get: (r) => r.department },
      { label: "Start", get: (r) => r.internshipStart },
      { label: "End", get: (r) => r.internshipEnd },
      { label: "Mentor", get: (r) => r.mentor?.name ?? "" },
    ]);
  }
  return JSON.stringify(data, null, 2);
}

module.exports = {
  collectInternReportData,
  exportInternExcel,
};
