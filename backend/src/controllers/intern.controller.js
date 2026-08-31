const internService = require("../services/intern.service");
const internExtended = require("../services/internExtended.service");
const internReports = require("../services/internReports.service");
const prisma = require("../lib/prisma");
const {
  validateCreateIntern,
  validateUpdateIntern,
  validateTrainingLog,
  validateAttendance,
  validateEvaluation,
} = require("../validations/intern.validation");const { sendSuccess, sendError } = require("../utils/response");

function isAdmin(role) {
  return role === "ADMIN";
}

async function canAccessIntern(req, intern) {
  if (!intern) return false;
  const role = req.user?.role;
  if (isAdmin(role)) return true;
  if (role === "INTERN" && intern.userId === req.user.id) return true;
  if (role === "DOCTOR") {
    return internService.isDoctorMentorOfIntern(req.user.id, intern);
  }
  return false;
}

// POST /intern/signup (public)
async function signup(req, res) {
  try {
    const validation = validateCreateIntern(req.body, { passwordRequired: true });
    if (!validation.valid) {
      return sendError(res, 400, validation.errors.join(" "));
    }

    const intern = await internService.createIntern(
      {
        ...validation.data,
        internship_start: req.body?.internship_start ?? req.body?.internshipStart,
        internship_end: req.body?.internship_end ?? req.body?.internshipEnd,
        university: req.body?.university,
        degree: req.body?.degree,
        gender: req.body?.gender,
        date_of_birth: req.body?.date_of_birth ?? req.body?.dateOfBirth,
        address: req.body?.address,
        cnic: req.body?.cnic,
        semester: req.body?.semester,
        emergency_contact: req.body?.emergency_contact ?? req.body?.emergencyContact,
        skills: req.body?.skills,
        notes: req.body?.notes,
        required_hours: req.body?.required_hours ?? req.body?.requiredHours,
      },
      null,
      { signup: true },
    );

    return sendSuccess(
      res,
      201,
      "Application submitted successfully. You will be notified once an administrator approves your account.",
      intern,
    );
  } catch (e) {
    if (e.code === "DUPLICATE_EMAIL") return sendError(res, 409, e.message);
    if (e.code === "DUPLICATE_PHONE") return sendError(res, 409, e.message);
    return sendError(res, 400, e.message);
  }
}

// POST /intern
async function create(req, res) {
  try {
    const validation = validateCreateIntern(req.body, { passwordRequired: false, requireCnic: true });
    if (!validation.valid) {
      return sendError(res, 400, validation.errors.join(" "));
    }

    const intern = await internService.createIntern(
      {
        ...validation.data,
        internship_start: req.body?.internship_start ?? req.body?.internshipStart,
        internship_end: req.body?.internship_end ?? req.body?.internshipEnd,
      },
      req.user?.id
    );

    return sendSuccess(res, 201, "Intern profile created successfully.", intern);
  } catch (e) {
    if (e.code === "DUPLICATE_EMAIL") return sendError(res, 409, e.message);
    if (e.code === "DUPLICATE_PHONE") return sendError(res, 409, e.message);
    return sendError(res, 400, e.message);
  }
}

// GET /intern
async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize) || 10);
    const search = req.query.search ? String(req.query.search) : undefined;
    if (!isAdmin(req.user?.role)) {
      return sendError(res, 403, "Only admin can list interns.");
    }

    const includeInactive = req.query.includeInactive === "true";
    const result = await internService.listInterns({
      search,
      page,
      pageSize,
      includeInactive,
      status: req.query.status,
      department: req.query.department,
      mentorId: req.query.mentorId ?? req.query.mentor_id,
      dateFrom: req.query.dateFrom ?? req.query.from,
      dateTo: req.query.dateTo ?? req.query.to,
    });

    return res.json(result);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// GET /intern/me/dashboard
async function dashboard(req, res) {
  try {
    if (req.user?.role !== "INTERN") {
      return sendError(res, 403, "Only interns can access this dashboard.");
    }
    const data = await internService.getDashboardData(req.user.id);
    if (!data) return sendError(res, 404, "Intern profile not found.");
    return sendSuccess(res, 200, "OK", data);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// GET /interns/me/mentees — doctor mentor: assigned interns only
async function myMentees(req, res) {
  try {
    if (req.user?.role !== "DOCTOR") {
      return sendError(res, 403, "Only doctors can view assigned interns.");
    }
    const data = await internService.listMenteeInterns(req.user.id);
    return sendSuccess(res, 200, "OK", data);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// GET /intern/me
async function me(req, res) {
  try {
    if (req.user?.role !== "INTERN") {
      return sendError(res, 403, "Only interns can access this profile.");
    }
    const intern = await internService.getInternByUserId(req.user.id);
    if (!intern) return sendError(res, 404, "Intern profile not found.");
    return sendSuccess(res, 200, "OK", intern);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// GET /intern/:id
async function getById(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");
    if (!(await canAccessIntern(req, intern))) {
      return sendError(res, 403, "Insufficient permissions.");
    }
    return sendSuccess(res, 200, "OK", intern);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// PUT /intern/:id
async function update(req, res) {
  try {
    const validation = validateUpdateIntern(req.body);
    if (!validation.valid) {
      return sendError(res, 400, validation.errors.join(" "));
    }

    const existing = await internService.getInternById(req.params.id);
    if (!existing) return sendError(res, 404, "Intern not found.");
    if (!isAdmin(req.user?.role)) {
      return sendError(res, 403, "Only admin can update intern profiles.");
    }

    const intern = await internService.updateIntern(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, 200, "Intern profile updated successfully.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    if (e.code === "DUPLICATE_EMAIL") return sendError(res, 409, e.message);
    if (e.code === "DUPLICATE_PHONE") return sendError(res, 409, e.message);
    return sendError(res, 400, e.message);
  }
}

// DELETE /intern/:id
async function remove(req, res) {
  try {
    if (!isAdmin(req.user?.role)) {
      return sendError(res, 403, "Only admin can deactivate interns.");
    }
    const result = await internService.deactivateIntern(req.params.id, req.user?.id);
    return sendSuccess(res, 200, result.message);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 500, e.message);
  }
}

// PUT /intern/:id/assign-mentor
async function assignMentor(req, res) {
  try {
    if (req.user?.role !== "ADMIN") {
      return sendError(res, 403, "Only admin can assign mentors.");
    }
    const mentorId = req.body?.mentor_id ?? req.body?.mentorId;
    if (!mentorId) return sendError(res, 400, "mentor_id is required.");

    const intern = await internService.assignMentor(req.params.id, mentorId, req.user?.id);
    return sendSuccess(res, 200, "Mentor assigned successfully.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND" || e.code === "MENTOR_NOT_FOUND" || e.code === "INVALID_MENTOR") {
      return sendError(res, 404, e.message);
    }
    return sendError(res, 400, e.message);
  }
}

// POST /intern/:id/logs
async function addLog(req, res) {
  try {
    const validation = validateTrainingLog(req.body);
    if (!validation.valid) {
      return sendError(res, 400, validation.errors.join(" "));
    }

    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const isInternSelf = role === "INTERN" && intern.userId === req.user.id;
    const isMentor =
      role === "DOCTOR" &&
      (await internService.getDoctorProfileId(req.user.id)) === intern.mentorId;
    if (!isInternSelf && !isAdmin(role) && !isMentor) {
      return sendError(res, 403, "Insufficient permissions to add logs.");
    }

    const log = await internService.addTrainingLog(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, 201, "Training log added successfully.", log);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

// GET /intern/:id/logs
async function getLogs(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const isInternSelf = role === "INTERN" && intern.userId === req.user.id;
    const isMentor =
      role === "DOCTOR" &&
      (await internService.getDoctorProfileId(req.user.id)) === intern.mentorId;
    if (!isAdmin(role) && !isInternSelf && !isMentor) {
      return sendError(res, 403, "Insufficient permissions to view logs.");
    }

    const result = await internService.listTrainingLogs(req.params.id, {
      fromDate: req.query.fromDate ?? req.query.from,
      toDate: req.query.toDate ?? req.query.to,
    });

    return sendSuccess(res, 200, "OK", result);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

// POST /intern/:id/approve
async function approve(req, res) {
  try {
    if (!isAdmin(req.user?.role)) return sendError(res, 403, "Only admin can approve interns.");
    const intern = await internService.approveIntern(req.params.id, req.user?.id);
    return sendSuccess(res, 200, "Intern application approved.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

// POST /intern/:id/reject
async function reject(req, res) {
  try {
    if (!isAdmin(req.user?.role)) return sendError(res, 403, "Only admin can reject interns.");
    const reason = req.body?.reason ? String(req.body.reason) : "";
    const intern = await internService.rejectIntern(req.params.id, req.user?.id, reason);
    return sendSuccess(res, 200, "Intern application rejected.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

// GET /mentors
async function mentors(req, res) {
  try {
    const items = await internService.listMentors();
    return sendSuccess(res, 200, "OK", { items });
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

async function reactivate(req, res) {
  try {
    if (!isAdmin(req.user?.role)) return sendError(res, 403, "Only admin can reactivate interns.");
    const intern = await internExtended.reactivateIntern(req.params.id, req.user?.id);
    return sendSuccess(res, 200, "Intern reactivated.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

async function removeMentor(req, res) {
  try {
    if (!isAdmin(req.user?.role)) return sendError(res, 403, "Only admin can remove mentors.");
    const intern = await internExtended.removeMentor(req.params.id, req.user?.id);
    return sendSuccess(res, 200, "Mentor removed.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

async function complete(req, res) {
  try {
    if (!isAdmin(req.user?.role)) return sendError(res, 403, "Only admin can complete internships.");
    const intern = await internExtended.completeInternship(req.params.id, req.user?.id);
    return sendSuccess(res, 200, "Internship marked complete.", intern);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

async function auditLogs(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");
    if (!(await canAccessIntern(req, intern))) return sendError(res, 403, "Forbidden.");
    const items = await internExtended.listAuditLogs(req.params.id);
    return sendSuccess(res, 200, "OK", { items });
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

async function addAttendance(req, res) {
  try {
    const validation = validateAttendance(req.body);
    if (!validation.valid) return sendError(res, 400, validation.errors.join(" "));

    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const isInternSelf = role === "INTERN" && intern.userId === req.user.id;
    const isMentor =
      role === "DOCTOR" &&
      (await internService.getDoctorProfileId(req.user.id)) === intern.mentorId;
    if (!isInternSelf && !isAdmin(role) && !isMentor) {
      return sendError(res, 403, "Insufficient permissions.");
    }

    const record = await internExtended.addAttendance(req.params.id, req.body, req.user?.id);
    return sendSuccess(res, 201, "Attendance recorded.", record);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    if (e.code === "DUPLICATE") return sendError(res, 409, e.message);
    return sendError(res, 400, e.message);
  }
}

async function getAttendance(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");
    if (!(await canAccessIntern(req, intern))) return sendError(res, 403, "Forbidden.");

    const result = await internExtended.listAttendance(req.params.id, {
      fromDate: req.query.fromDate ?? req.query.from,
      toDate: req.query.toDate ?? req.query.to,
      status: req.query.status,
    });
    return sendSuccess(res, 200, "OK", result);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

async function approveAttendance(req, res) {
  try {
    const role = req.user?.role;
    if (role !== "ADMIN" && role !== "DOCTOR") {
      return sendError(res, 403, "Only mentors or admin can approve attendance.");
    }

    const existing = await prisma.intern_attendance.findUnique({
      where: { id: req.params.attendanceId },
    });
    if (!existing) return sendError(res, 404, "Attendance record not found.");

    const intern = await internService.getInternById(existing.intern_id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    if (!isAdmin(role)) {
      const isMentor = await internService.isDoctorMentorOfIntern(req.user.id, intern);
      if (!isMentor) {
        return sendError(res, 403, "Only the assigned mentor can approve this attendance.");
      }
    }

    const record = await internExtended.approveAttendance(req.params.attendanceId, req.user?.id);
    return sendSuccess(res, 200, "Attendance approved.", record);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

async function updateAttendance(req, res) {
  try {
    const validation = validateAttendance(req.body);
    if (!validation.valid) return sendError(res, 400, validation.errors.join(" "));

    const existing = await prisma.intern_attendance.findUnique({
      where: { id: req.params.attendanceId },
    });
    if (!existing) return sendError(res, 404, "Attendance record not found.");

    const intern = await internService.getInternById(existing.intern_id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const isInternSelf = role === "INTERN" && intern.userId === req.user.id;
    if (!isInternSelf && !isAdmin(role)) {
      return sendError(res, 403, "Only the intern can edit their attendance records.");
    }

    const record = await internExtended.updateAttendance(
      req.params.attendanceId,
      req.body,
      req.user?.id,
    );
    return sendSuccess(res, 200, "Attendance updated.", record);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    if (e.code === "LOCKED") return sendError(res, 403, e.message);
    return sendError(res, 400, e.message);
  }
}

async function reviewLog(req, res) {
  try {
    const role = req.user?.role;
    if (role !== "ADMIN" && role !== "DOCTOR") {
      return sendError(res, 403, "Only mentors or admin can review logs.");
    }

    const existing = await prisma.intern_training_logs.findUnique({
      where: { id: req.params.logId },
    });
    if (!existing) return sendError(res, 404, "Training log not found.");

    const intern = await internService.getInternById(existing.intern_id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    if (!isAdmin(role)) {
      const isMentor = await internService.isDoctorMentorOfIntern(req.user.id, intern);
      if (!isMentor) {
        return sendError(res, 403, "Only the assigned mentor can review this log.");
      }
    }

    const log = await internExtended.reviewTrainingLog(req.params.logId, req.body, req.user?.id);
    return sendSuccess(res, 200, "Log reviewed.", log);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    return sendError(res, 400, e.message);
  }
}

async function updateLog(req, res) {
  try {
    const validation = validateTrainingLog(req.body);
    if (!validation.valid) return sendError(res, 400, validation.errors.join(" "));

    const existing = await prisma.intern_training_logs.findUnique({
      where: { id: req.params.logId },
    });
    if (!existing) return sendError(res, 404, "Training log not found.");

    const intern = await internService.getInternById(existing.intern_id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const isInternSelf = role === "INTERN" && intern.userId === req.user.id;
    if (!isInternSelf && !isAdmin(role)) {
      return sendError(res, 403, "Only the intern can edit their training logs.");
    }

    const log = await internService.updateTrainingLog(req.params.logId, req.body, req.user?.id);
    return sendSuccess(res, 200, "Training log updated.", log);
  } catch (e) {
    if (e.code === "NOT_FOUND") return sendError(res, 404, e.message);
    if (e.code === "LOCKED") return sendError(res, 403, e.message);
    return sendError(res, 400, e.message);
  }
}

async function addEvaluation(req, res) {
  try {
    const validation = validateEvaluation(req.body);
    if (!validation.valid) return sendError(res, 400, validation.errors.join(" "));

    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");

    const role = req.user?.role;
    const doctorId = role === "DOCTOR" ? await internService.getDoctorProfileId(req.user.id) : null;
    const isMentor = doctorId && String(doctorId) === String(intern.mentorId);
    if (!isAdmin(role) && !isMentor) {
      return sendError(res, 403, "Only assigned mentor or admin can evaluate.");
    }

    const evaluation = await internExtended.addEvaluation(
      req.params.id,
      req.body,
      req.user?.id,
      doctorId,
    );
    return sendSuccess(res, 201, "Evaluation saved.", evaluation);
  } catch (e) {
    if (e.code === "NOT_FOUND" || e.code === "VALIDATION") return sendError(res, 400, e.message);
    return sendError(res, 400, e.message);
  }
}

async function getEvaluations(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");
    if (!(await canAccessIntern(req, intern))) return sendError(res, 403, "Forbidden.");
    const result = await internExtended.listEvaluations(req.params.id);
    return sendSuccess(res, 200, "OK", result);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

async function getProgress(req, res) {
  try {
    const intern = await internService.getInternById(req.params.id);
    if (!intern) return sendError(res, 404, "Intern not found.");
    if (!(await canAccessIntern(req, intern))) return sendError(res, 403, "Forbidden.");
    const row = await prisma.internees.findUnique({ where: { id: req.params.id } });
    const progress = await internExtended.getProgressMetrics(row);
    return sendSuccess(res, 200, "OK", progress);
  } catch (e) {
    return sendError(res, 500, e.message);
  }
}

async function exportReport(req, res) {
  try {
    const type = String(req.query.type ?? "intern-attendance");
    const params = {
      internId: req.query.internId ?? req.params.id,
      mentorId: req.query.mentorId ?? req.query.mentor_id,
      fromDate: req.query.fromDate ?? req.query.from,
      toDate: req.query.toDate ?? req.query.to,
    };
    const format = String(req.query.format ?? "json").toLowerCase();
    const role = req.user?.role;

    if (role === "DOCTOR") {
      const doctorId = await internService.getDoctorProfileId(req.user.id);
      if (!doctorId) return sendError(res, 403, "Doctor profile not found.");
      params.mentorId = doctorId;
      if (params.internId) {
        const intern = await prisma.internees.findUnique({ where: { id: String(params.internId) } });
        if (!intern || intern.mentor_id !== doctorId) {
          return sendError(res, 403, "You can only export reports for your assigned interns.");
        }
      }
    }

    if (format === "excel" || format === "csv") {
      const csv = await internReports.exportInternExcel(type, params);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}.csv"`);
      return res.send(csv);
    }

    const data = await internReports.collectInternReportData(type, params);
    return sendSuccess(res, 200, "OK", data);
  } catch (e) {
    return sendError(res, 400, e.message);
  }
}

module.exports = {
  signup,
  create,
  list,
  dashboard,
  myMentees,
  me,
  getById,
  update,
  remove,
  assignMentor,
  addLog,
  getLogs,
  mentors,
  approve,
  reject,
  reactivate,
  removeMentor,
  complete,
  auditLogs,
  addAttendance,
  getAttendance,
  updateAttendance,
  approveAttendance,
  reviewLog,
  updateLog,
  addEvaluation,
  getEvaluations,
  getProgress,
  exportReport,
};
