"use strict";

const crypto = require("crypto");
const prisma = require("../lib/prisma");
const {
  INTERN_INCLUDE,
  mapIntern,
  mapTrainingLog,
  mapAttendance,
  mapEvaluation,
  mapAuditLog,
} = require("../models/intern.mapper");

function generateSecurePassword() {
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
}

async function listAuditLogs(internId) {
  const rows = await prisma.intern_audit_logs.findMany({
    where: { intern_id: String(internId) },
    orderBy: { timestamp: "desc" },
    take: 100,
  });
  return rows.map(mapAuditLog);
}

async function reactivateIntern(id, changedBy) {
  const internId = String(id);
  const existing = await prisma.internees.findUnique({
    where: { id: internId },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.internees.update({
      where: { id: internId },
      data: { is_active: true, application_status: "ACTIVE" },
      include: INTERN_INCLUDE,
    });
    if (updated.user_id) {
      await tx.users.update({
        where: { id: updated.user_id },
        data: { is_active: true },
      });
    }
    await tx.intern_audit_logs.create({
      data: {
        intern_id: internId,
        action: "REACTIVATE",
        changed_by: changedBy ?? null,
        previous_data: previousData,
        new_data: mapIntern(updated),
        timestamp: new Date(),
      },
    });
    return updated;
  });

  const { notifyInternReactivated } = require("./notification.service");
  if (row.users) await notifyInternReactivated(row.users);
  return mapIntern(row);
}

async function removeMentor(internId, changedBy) {
  const id = String(internId);
  const existing = await prisma.internees.findUnique({
    where: { id },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);
  const formerMentorUser = existing.doctors?.users ?? null;
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.internees.update({
      where: { id },
      data: { mentor_id: null },
      include: INTERN_INCLUDE,
    });
    await tx.intern_audit_logs.create({
      data: {
        intern_id: id,
        action: "REMOVE_MENTOR",
        changed_by: changedBy ?? null,
        previous_data: previousData,
        new_data: mapIntern(updated),
        timestamp: new Date(),
      },
    });
    return updated;
  });

  try {
    const { notifyInternMentorChanged } = require("./notification.service");
    if (row.users) {
      await notifyInternMentorChanged(row.users, {
        mentorName: "Unassigned",
        department: row.department ?? "",
      });
    }
    if (formerMentorUser?.id) {
      await prisma.notifications.create({
        data: {
          user_id: formerMentorUser.id,
          title: "Mentor Assignment Removed",
          message: `You are no longer assigned as mentor for ${existing.users?.name ?? "an intern"}.`,
          type: "SYSTEM",
          is_read: false,
          status: "unread",
          sent_date: new Date(),
          created_at: new Date(),
        },
      });
    }
  } catch (err) {
    console.error("[intern] mentor removal notification failed:", err.message);
  }

  return mapIntern(row);
}

async function completeInternship(internId, changedBy) {
  const id = String(internId);
  const existing = await prisma.internees.findUnique({
    where: { id },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.internees.update({
      where: { id },
      data: { application_status: "COMPLETED", is_active: false },
      include: INTERN_INCLUDE,
    });
    if (updated.user_id) {
      await tx.users.update({
        where: { id: updated.user_id },
        data: { is_active: false },
      });
    }
    await tx.intern_audit_logs.create({
      data: {
        intern_id: id,
        action: "COMPLETE",
        changed_by: changedBy ?? null,
        previous_data: previousData,
        new_data: mapIntern(updated),
        timestamp: new Date(),
      },
    });
    return updated;
  });

  const { notifyInternshipCompleted } = require("./notification.service");
  if (row.users) await notifyInternshipCompleted(row.users, mapIntern(row));
  return mapIntern(row);
}

async function addAttendance(internId, body, createdBy) {
  const intern = await prisma.internees.findUnique({ where: { id: String(internId) } });
  if (!intern || !intern.is_active) {
    throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });
  }

  const recordDate = body.record_date ?? body.recordDate ?? new Date().toISOString().slice(0, 10);
  const status = String(body.status ?? "present").toLowerCase();

  const duplicate = await prisma.intern_attendance.findFirst({
    where: {
      intern_id: intern.id,
      record_date: new Date(recordDate),
    },
  });
  if (duplicate) {
    throw Object.assign(new Error("Attendance for this date already exists."), {
      code: "DUPLICATE",
    });
  }

  const record = await prisma.intern_attendance.create({
    data: {
      intern_id: intern.id,
      record_date: new Date(recordDate),
      check_in: body.check_in ?? body.checkIn ?? null,
      check_out: body.check_out ?? body.checkOut ?? null,
      hours_worked: Number(body.hours_worked ?? body.hoursWorked ?? 0),
      status,
      remarks: body.remarks ? String(body.remarks).trim() : null,
      created_by: createdBy ?? null,
    },
  });

  const { notifyAttendanceSubmitted } = require("./notification.service");
  await notifyAttendanceSubmitted({ internId: intern.id, recordDate, status });

  return mapAttendance(record);
}

async function listAttendance(internId, { fromDate, toDate, status } = {}) {
  const where = { intern_id: String(internId) };
  if (fromDate || toDate) {
    where.record_date = {};
    if (fromDate) where.record_date.gte = new Date(fromDate);
    if (toDate) where.record_date.lte = new Date(toDate);
  }
  if (status) where.status = String(status).toLowerCase();

  const rows = await prisma.intern_attendance.findMany({
    where,
    orderBy: [{ record_date: "desc" }, { created_at: "desc" }],
  });

  const present = rows.filter((r) => r.status === "present").length;
  const total = rows.length || 1;

  return {
    items: rows.map(mapAttendance),
    total: rows.length,
    attendancePercentage: Math.min(100, Math.round((present / total) * 100)),
  };
}

function isAttendanceLocked(record) {
  return Boolean(record.approved_by || record.approved_at);
}

async function updateAttendance(attendanceId, body, changedBy) {
  const existing = await prisma.intern_attendance.findUnique({
    where: { id: String(attendanceId) },
  });
  if (!existing) {
    throw Object.assign(new Error("Attendance record not found."), { code: "NOT_FOUND" });
  }
  if (isAttendanceLocked(existing)) {
    throw Object.assign(
      new Error("This record has already been reviewed and can no longer be edited."),
      { code: "LOCKED" },
    );
  }

  const recordDate = body.record_date ?? body.recordDate ?? existing.record_date;
  const status = String(body.status ?? existing.status ?? "present").toLowerCase();
  const previousData = mapAttendance(existing);

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.intern_attendance.update({
      where: { id: existing.id },
      data: {
        record_date: recordDate ? new Date(recordDate) : existing.record_date,
        check_in: body.check_in ?? body.checkIn ?? existing.check_in,
        check_out: body.check_out ?? body.checkOut ?? existing.check_out,
        hours_worked: Number(
          body.hours_worked ?? body.hoursWorked ?? existing.hours_worked ?? 0,
        ),
        status,
        remarks:
          body.remarks !== undefined
            ? body.remarks
              ? String(body.remarks).trim()
              : null
            : existing.remarks,
        updated_at: new Date(),
      },
    });

    await tx.intern_audit_logs.create({
      data: {
        intern_id: existing.intern_id,
        action: "UPDATE_ATTENDANCE",
        changed_by: changedBy ?? null,
        previous_data: previousData,
        new_data: mapAttendance(updated),
        timestamp: new Date(),
      },
    });

    return updated;
  });

  return mapAttendance(record);
}

async function approveAttendance(attendanceId, approvedBy) {
  const existing = await prisma.intern_attendance.findUnique({
    where: { id: String(attendanceId) },
    include: { internees: { include: { users: true } } },
  });
  if (!existing) throw Object.assign(new Error("Attendance record not found."), { code: "NOT_FOUND" });

  const record = await prisma.intern_attendance.update({
    where: { id: existing.id },
    data: { approved_by: approvedBy, approved_at: new Date() },
  });

  const { notifyAttendanceApproved } = require("./notification.service");
  const internUser = existing.internees?.users;
  if (internUser) {
    await notifyAttendanceApproved(internUser, {
      date: existing.record_date?.toISOString().slice(0, 10),
      status: existing.status,
    });
  }

  return mapAttendance(record);
}

async function reviewTrainingLog(logId, body, reviewerId) {
  const log = await prisma.intern_training_logs.findUnique({
    where: { id: String(logId) },
    include: { internees: { include: { users: true } } },
  });
  if (!log) throw Object.assign(new Error("Training log not found."), { code: "NOT_FOUND" });

  const updated = await prisma.intern_training_logs.update({
    where: { id: log.id },
    data: {
      mentor_remarks: body.mentor_remarks ?? body.mentorRemarks ?? log.mentor_remarks,
      status: "reviewed",
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
    },
  });

  const internUser = log.internees?.users;
  if (internUser) {
    const { notifyTrainingLogReviewed } = require("./notification.service");
    await notifyTrainingLogReviewed(internUser, {
      logDate: log.log_date?.toISOString().slice(0, 10),
    });
  }

  return mapTrainingLog(updated);
}

async function addEvaluation(internId, body, createdBy, mentorDoctorId) {
  const intern = await prisma.internees.findUnique({
    where: { id: String(internId) },
    include: { users: true },
  });
  if (!intern) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const rating = Number(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error("Rating must be between 1 and 5."), { code: "VALIDATION" });
  }

  const row = await prisma.intern_evaluations.create({
    data: {
      intern_id: intern.id,
      mentor_id: mentorDoctorId ?? intern.mentor_id,
      rating,
      comments: body.comments ? String(body.comments).trim() : null,
      criteria: body.criteria ?? null,
      created_by: createdBy ?? null,
      evaluated_at: new Date(),
    },
    include: {
      doctors: {
        select: {
          id: true,
          specialization: true,
          users: { select: { name: true } },
        },
      },
    },
  });

  const { notifyEvaluationCompleted } = require("./notification.service");
  if (intern.users) {
    await notifyEvaluationCompleted(intern.users, {
      rating,
      mentorName: row.doctors?.users?.name ?? "Mentor",
    });
  }

  return mapEvaluation(row);
}

async function listEvaluations(internId) {
  const rows = await prisma.intern_evaluations.findMany({
    where: { intern_id: String(internId) },
    orderBy: { evaluated_at: "desc" },
    include: {
      doctors: {
        select: {
          id: true,
          specialization: true,
          users: { select: { name: true } },
        },
      },
    },
  });
  return { items: rows.map(mapEvaluation), total: rows.length };
}

async function getProgressMetrics(internRow) {
  const internId = internRow.id;
  const requiredHours = Number(internRow.required_hours ?? 480);

  const [logs, attendanceRows, evaluations] = await Promise.all([
    prisma.intern_training_logs.findMany({
      where: { intern_id: internId },
      select: { hours_worked: true, tasks_completed: true, status: true },
    }),
    prisma.intern_attendance.findMany({
      where: { intern_id: internId },
      select: { status: true },
    }),
    prisma.intern_evaluations.count({ where: { intern_id: internId } }),
  ]);

  const completedHours = logs.reduce((sum, l) => sum + Number(l.hours_worked ?? 0), 0);
  const remainingHours = Math.max(0, requiredHours - completedHours);
  const tasksCompleted = logs.filter((l) => String(l.tasks_completed ?? "").trim()).length;

  let attendancePercentage = 0;
  if (attendanceRows.length > 0) {
    const present = attendanceRows.filter((r) => r.status === "present").length;
    attendancePercentage = Math.round((present / attendanceRows.length) * 100);
  }

  let timelineProgress = 0;
  if (internRow.internship_start && internRow.internship_end) {
    const start = new Date(internRow.internship_start).getTime();
    const end = new Date(internRow.internship_end).getTime();
    const now = Date.now();
    if (end > start) {
      timelineProgress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    }
  }

  const hoursProgress = requiredHours > 0
    ? Math.min(100, Math.round((completedHours / requiredHours) * 100))
    : 0;

  const trainingProgress = Math.round((hoursProgress + attendancePercentage) / 2);
  const completionPercentage = Math.round(
    (timelineProgress * 0.3 + hoursProgress * 0.4 + attendancePercentage * 0.3)
  );

  return {
    completedHours,
    remainingHours,
    requiredHours,
    attendancePercentage,
    tasksCompleted,
    trainingProgress,
    completionPercentage,
    timelineProgress,
    hoursProgress,
    evaluationCount: evaluations,
  };
}

module.exports = {
  generateSecurePassword,
  listAuditLogs,
  reactivateIntern,
  removeMentor,
  completeInternship,
  addAttendance,
  listAttendance,
  updateAttendance,
  approveAttendance,
  reviewTrainingLog,
  addEvaluation,
  listEvaluations,
  getProgressMetrics,
};
