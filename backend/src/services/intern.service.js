const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { INTERN_INCLUDE, mapIntern, mapTrainingLog } = require("../models/intern.mapper");
const {
  generateSecurePassword,
  getProgressMetrics,
} = require("./internExtended.service");

const parseId = (raw) => String(raw);

async function findPhoneConflict(phone, excludeUserId = null) {
  const normalized = String(phone).trim();
  const existing = await prisma.user_phones.findFirst({
    where: {
      phone: normalized,
      ...(excludeUserId ? { user_id: { not: excludeUserId } } : {}),
    },
  });
  return existing;
}

async function writeAudit(tx, { internId, action, changedBy, previousData, newData }) {
  await tx.intern_audit_logs.create({
    data: {
      intern_id: internId,
      action,
      changed_by: changedBy ?? null,
      previous_data: previousData ?? null,
      new_data: newData ?? null,
      timestamp: new Date(),
    },
  });
}

async function createNotification(tx, { userId, title, message }) {
  if (!userId) return;
  await tx.notifications.create({
    data: {
      user_id: userId,
      title: title ?? null,
      message,
      type: "SYSTEM",
      is_read: false,
      status: "unread",
      sent_date: new Date(),
      created_at: new Date(),
    },
  });
}

async function notifyMentor(tx, { mentorUserId, internName }) {
  await createNotification(tx, {
    userId: mentorUserId,
    title: "New Intern Assigned",
    message: `You have been assigned as mentor for intern ${internName}.`,
  });
}

async function notifyAdmins(tx, { title, message }) {
  const admins = await tx.users.findMany({
    where: { role: "ADMIN", is_active: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification(tx, { userId: admin.id, title, message });
  }
}

async function listInterns({
  search,
  page = 1,
  pageSize = 10,
  includeInactive = false,
  status,
  department,
  mentorId,
  dateFrom,
  dateTo,
}) {
  const where = {};
  if (!includeInactive && !status) where.is_active = true;

  if (status) {
    const s = String(status).toUpperCase();
    if (s === "ACTIVE") {
      where.is_active = true;
      where.application_status = { in: ["ACTIVE", null] };
    } else if (s === "COMPLETED") {
      where.application_status = "COMPLETED";
    } else if (s === "SUSPENDED" || s === "INACTIVE") {
      where.is_active = false;
      where.application_status = { not: "REJECTED" };
    } else if (s === "PENDING") {
      where.application_status = "PENDING";
    } else if (s === "REJECTED") {
      where.application_status = "REJECTED";
    }
  }

  if (department) where.department = { equals: String(department) };
  if (mentorId) where.mentor_id = String(mentorId);
  if (dateFrom || dateTo) {
    where.internship_start = {};
    if (dateFrom) where.internship_start.gte = new Date(dateFrom);
    if (dateTo) where.internship_start.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { users: { name: { contains: search } } },
      { users: { email: { contains: search } } },
      { department: { contains: search } },
      { users: { user_phones: { some: { phone: { contains: search } } } } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.internees.findMany({
      where,
      include: INTERN_INCLUDE,
      orderBy: { internship_start: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.internees.count({ where }),
  ]);

  return { items: rows.map(mapIntern), total, page, pageSize };
}

async function getInternById(id) {
  const row = await prisma.internees.findUnique({
    where: { id: parseId(id) },
    include: INTERN_INCLUDE,
  });
  if (!row) return null;
  return mapIntern(row);
}

async function getInternByUserId(userId) {
  const row = await prisma.internees.findFirst({
    where: { user_id: userId },
    include: INTERN_INCLUDE,
  });
  if (!row) return null;
  return mapIntern(row);
}

async function createIntern(payload, changedBy, options = {}) {
  const isSignup = options.signup === true;
  const {
    name, email, phone, education, department,
    internship_start, internship_end,
    university, degree, gender, date_of_birth, dateOfBirth,
    address, cnic, semester, emergency_contact, emergencyContact,
    skills, notes, required_hours, requiredHours,
  } = payload;

  let password = String(payload.password ?? "").trim();
  const generatedPassword = !password;
  if (!password) password = generateSecurePassword();

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingEmail = await prisma.users.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) throw Object.assign(new Error("Email already exists."), { code: "DUPLICATE_EMAIL" });

  const phoneConflict = await findPhoneConflict(phone);
  if (phoneConflict) throw Object.assign(new Error("Phone number already exists."), { code: "DUPLICATE_PHONE" });

  const hash = await bcrypt.hash(String(password), 10);
  const degreeProgram = String(degree ?? education ?? "").trim();
  const universityName = university ? String(university).trim() : "";
  const dob = date_of_birth ?? dateOfBirth;

  const row = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hash,
        role: "INTERN",
        is_active: isSignup ? false : true,
      },
    });

    await tx.user_phones.create({
      data: { user_id: user.id, phone: String(phone).trim() },
    });

    const intern = await tx.internees.create({
      data: {
        users: { connect: { id: user.id } },
        department: String(department).trim(),
        internship_start: internship_start ? new Date(internship_start) : null,
        internship_end: internship_end ? new Date(internship_end) : null,
        is_active: true,
        application_status: isSignup ? "PENDING" : "ACTIVE",
        gender: gender ? String(gender).trim() : null,
        date_of_birth: dob ? new Date(dob) : null,
        address: address ? String(address).trim() : null,
        cnic: cnic ? String(cnic).trim() : null,
        semester: semester ? String(semester).trim() : null,
        emergency_contact: (emergency_contact ?? emergencyContact)
          ? String(emergency_contact ?? emergencyContact).trim()
          : null,
        skills: skills ? String(skills).trim() : null,
        notes: notes ? String(notes).trim() : null,
        required_hours: required_hours ?? requiredHours ?? 480,
      },
      include: INTERN_INCLUDE,
    });

    if (degreeProgram) {
      await tx.internee_degrees.create({
        data: { internee_id: intern.id, degree_program: degreeProgram },
      });
    }

    if (universityName) {
      await tx.internee_universities.create({
        data: { internee_id: intern.id, university_name: universityName },
      });
    }

    const full = await tx.internees.findUnique({
      where: { id: intern.id },
      include: INTERN_INCLUDE,
    });

    await writeAudit(tx, {
      internId: intern.id,
      action: "CREATE",
      changedBy,
      previousData: null,
      newData: mapIntern(full),
    });

    if (isSignup) {
      await notifyAdmins(tx, {
        title: "Intern Application Pending",
        message: `${full.users?.name ?? "An applicant"} (${full.users?.email ?? ""}) submitted an internship application awaiting approval.`,
      });
    } else {
      await notifyAdmins(tx, {
        title: "New Intern Registered",
        message: `${full.users?.name ?? "An intern"} (${full.users?.email ?? ""}) has joined the internship program.`,
      });
    }

    return { full, user, generatedPassword, plainPassword: password, isSignup };
  });

  const internUser = row.user;
  if (internUser && !row.isSignup) {
    try {
      const { sendInternCredentialsEmail, notifyInternAdded } = require("./notification.service");
      await notifyInternAdded(internUser, mapIntern(row.full));
      if (row.generatedPassword) {
        await sendInternCredentialsEmail(internUser, {
          password: row.plainPassword,
          generated: true,
        });
      }
    } catch (emailErr) {
      console.error("[intern] welcome email failed:", emailErr.message);
    }
  }

  return mapIntern(row.full);
}

async function updateIntern(id, body, changedBy) {
  const internId = parseId(id);
  const existing = await prisma.internees.findUnique({
    where: { id: internId },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);
  const {
    name, email, phone, education, degree, university, department, password,
    internship_start, internship_end, internshipStart, internshipEnd,
    gender, date_of_birth, dateOfBirth, address, cnic, semester,
    emergency_contact, emergencyContact, skills, notes,
    required_hours, requiredHours, application_status, applicationStatus,
  } = body ?? {};

  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailTaken = await prisma.users.findFirst({
      where: { email: normalizedEmail, id: { not: existing.user_id } },
    });
    if (emailTaken) throw Object.assign(new Error("Email already exists."), { code: "DUPLICATE_EMAIL" });
  }

  if (phone) {
    const phoneTaken = await findPhoneConflict(phone, existing.user_id);
    if (phoneTaken) throw Object.assign(new Error("Phone number already exists."), { code: "DUPLICATE_PHONE" });
  }

  const startDate = internship_start ?? internshipStart;
  const endDate = internship_end ?? internshipEnd;

  const row = await prisma.$transaction(async (tx) => {
    if (existing.user_id && (name || email || password)) {
      const userUpdate = {};
      if (name) userUpdate.name = String(name).trim();
      if (email) userUpdate.email = String(email).trim().toLowerCase();
      if (password) userUpdate.password = await bcrypt.hash(String(password), 10);
      await tx.users.update({ where: { id: existing.user_id }, data: userUpdate });
    }

    if (phone && existing.user_id) {
      const existingPhone = await tx.user_phones.findFirst({ where: { user_id: existing.user_id } });
      if (existingPhone) {
        await tx.user_phones.update({ where: { id: existingPhone.id }, data: { phone: String(phone).trim() } });
      } else {
        await tx.user_phones.create({ data: { user_id: existing.user_id, phone: String(phone).trim() } });
      }
    }

    if (education || degree) {
      const degreeProgram = String(degree ?? education).trim();
      const degreeRow = await tx.internee_degrees.findFirst({ where: { internee_id: internId } });
      if (degreeRow) {
        await tx.internee_degrees.update({
          where: { id: degreeRow.id },
          data: { degree_program: degreeProgram },
        });
      } else {
        await tx.internee_degrees.create({
          data: { internee_id: internId, degree_program: degreeProgram },
        });
      }
    }

    if (university !== undefined) {
      const uniRow = await tx.internee_universities.findFirst({ where: { internee_id: internId } });
      const uniName = university ? String(university).trim() : "";
      if (uniRow) {
        await tx.internee_universities.update({
          where: { id: uniRow.id },
          data: { university_name: uniName || null },
        });
      } else if (uniName) {
        await tx.internee_universities.create({
          data: { internee_id: internId, university_name: uniName },
        });
      }
    }

    const dob = date_of_birth ?? dateOfBirth;
    const appStatus = application_status ?? applicationStatus;

    await tx.internees.update({
      where: { id: internId },
      data: {
        ...(department !== undefined && { department: department ? String(department).trim() : null }),
        ...(startDate !== undefined && { internship_start: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { internship_end: endDate ? new Date(endDate) : null }),
        ...(gender !== undefined && { gender: gender ? String(gender).trim() : null }),
        ...(dob !== undefined && { date_of_birth: dob ? new Date(dob) : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(cnic !== undefined && { cnic: cnic ? String(cnic).trim() : null }),
        ...(semester !== undefined && { semester: semester ? String(semester).trim() : null }),
        ...(emergency_contact !== undefined || emergencyContact !== undefined
          ? {
              emergency_contact: (emergency_contact ?? emergencyContact)
                ? String(emergency_contact ?? emergencyContact).trim()
                : null,
            }
          : {}),
        ...(skills !== undefined && { skills: skills ? String(skills).trim() : null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(required_hours !== undefined || requiredHours !== undefined
          ? { required_hours: required_hours ?? requiredHours ?? 480 }
          : {}),
        ...(appStatus !== undefined && { application_status: String(appStatus).toUpperCase() }),
      },
    });

    const full = await tx.internees.findUnique({
      where: { id: internId },
      include: INTERN_INCLUDE,
    });

    await writeAudit(tx, {
      internId,
      action: "UPDATE",
      changedBy,
      previousData,
      newData: mapIntern(full),
    });

    return full;
  });

  return mapIntern(row);
}

async function deactivateIntern(id, changedBy) {
  const internId = parseId(id);
  const existing = await prisma.internees.findUnique({
    where: { id: internId },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);

  await prisma.$transaction(async (tx) => {
    await tx.internees.update({
      where: { id: internId },
      data: { is_active: false, application_status: "SUSPENDED" },
    });
    if (existing.user_id) {
      await tx.users.update({
        where: { id: existing.user_id },
        data: { is_active: false },
      });
    }
    await writeAudit(tx, {
      internId,
      action: "DEACTIVATE",
      changedBy,
      previousData,
      newData: { ...previousData, isActive: false },
    });
  });

  return { success: true, message: "Intern deactivated successfully." };
}

async function listMentors() {
  const doctors = await prisma.doctors.findMany({
    where: { is_approved: true, users: { is_active: true } },
    select: {
      id: true,
      specialization: true,
      users: { select: { id: true, name: true, email: true } },
    },
    orderBy: { users: { name: "asc" } },
  });

  return doctors.map((d) => ({
    id: d.id,
    userId: d.users?.id ?? null,
    name: d.users?.name ?? "",
    email: d.users?.email ?? "",
    specialization: d.specialization ?? "",
  }));
}

async function assignMentor(internId, mentorId, changedBy) {
  const intern = await prisma.internees.findUnique({
    where: { id: parseId(internId) },
    include: INTERN_INCLUDE,
  });
  if (!intern) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const doctor = await prisma.doctors.findUnique({
    where: { id: parseId(mentorId) },
    include: { users: { select: { id: true, name: true, email: true, is_active: true } } },
  });
  if (!doctor) throw Object.assign(new Error("Mentor not found."), { code: "MENTOR_NOT_FOUND" });
  if (!doctor.is_approved || !doctor.users?.is_active) {
    throw Object.assign(new Error("Selected doctor is not active or approved."), {
      code: "INVALID_MENTOR",
    });
  }

  const previousData = mapIntern(intern);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.internees.update({
      where: { id: intern.id },
      data: { mentor_id: doctor.id },
      include: INTERN_INCLUDE,
    });

    await writeAudit(tx, {
      internId: intern.id,
      action: "ASSIGN_MENTOR",
      changedBy,
      previousData,
      newData: mapIntern(row),
    });

    return row;
  });

  try {
    const { notifyMentorAssigned, notifyInternMentorChanged } = require("./notification.service");
    await notifyMentorAssigned({
      mentorUser: doctor.users,
      internName: intern.users?.name ?? "Intern",
      department: intern.department ?? "",
      assignmentDate: new Date().toISOString().slice(0, 10),
    });
    if (intern.user_id && intern.users) {
      await notifyInternMentorChanged(intern.users, {
        mentorName: doctor.users?.name ?? "Mentor",
        department: intern.department ?? "",
      });
    }
  } catch (err) {
    console.error("[intern] mentor notification failed:", err.message);
  }

  return mapIntern(updated);
}

async function addTrainingLog(internId, body, createdBy) {
  const intern = await prisma.internees.findUnique({
    where: { id: parseId(internId) },
    include: {
      users: { select: { name: true } },
      doctors: { include: { users: { select: { id: true } } } },
    },
  });
  if (!intern || !intern.is_active) {
    throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });
  }

  const logDate = body.log_date ?? body.logDate ?? new Date().toISOString().slice(0, 10);
  const hours = Number(body.hours_worked ?? body.hoursWorked ?? 0);

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.intern_training_logs.create({
      data: {
        intern_id: intern.id,
        hours_worked: hours,
        tasks_completed: String(body.tasks_completed ?? body.tasksCompleted ?? "").trim() || null,
        learning_notes: String(body.learning_notes ?? body.learningNotes ?? "").trim() || null,
        skills_learned: String(body.skills_learned ?? body.skillsLearned ?? "").trim() || null,
        challenges: String(body.challenges ?? "").trim() || null,
        log_type: String(body.log_type ?? body.logType ?? "daily").toLowerCase(),
        log_date: new Date(logDate),
        created_by: createdBy ?? null,
      },
    });

    return created;
  });

  try {
    const { notifyTrainingLogSubmitted } = require("./notification.service");
    await notifyTrainingLogSubmitted({
      internId: intern.id,
      internName: intern.users?.name ?? "Intern",
      logDate,
      hours,
    });
  } catch (err) {
    console.error("[intern] log notification failed:", err.message);
  }

  return mapTrainingLog(log);
}

async function listTrainingLogs(internId, { fromDate, toDate } = {}) {
  const where = { intern_id: parseId(internId) };
  if (fromDate || toDate) {
    where.log_date = {};
    if (fromDate) where.log_date.gte = new Date(fromDate);
    if (toDate) where.log_date.lte = new Date(toDate);
  }

  const logs = await prisma.intern_training_logs.findMany({
    where,
    orderBy: [{ log_date: "desc" }, { created_at: "desc" }],
  });

  const totalHours = logs.reduce((sum, l) => sum + Number(l.hours_worked ?? 0), 0);

  return {
    items: logs.map(mapTrainingLog),
    total: logs.length,
    totalHours,
  };
}

function isTrainingLogLocked(log) {
  return Boolean(
    log.reviewed_by || log.reviewed_at || String(log.status ?? "").toLowerCase() === "reviewed",
  );
}

async function updateTrainingLog(logId, body, changedBy) {
  const existing = await prisma.intern_training_logs.findUnique({
    where: { id: parseId(logId) },
  });
  if (!existing) {
    throw Object.assign(new Error("Training log not found."), { code: "NOT_FOUND" });
  }
  if (isTrainingLogLocked(existing)) {
    throw Object.assign(
      new Error("This record has already been reviewed and can no longer be edited."),
      { code: "LOCKED" },
    );
  }

  const logDate = body.log_date ?? body.logDate ?? existing.log_date;
  const hours = Number(body.hours_worked ?? body.hoursWorked ?? existing.hours_worked ?? 0);
  const previousData = mapTrainingLog(existing);

  const log = await prisma.$transaction(async (tx) => {
    const updated = await tx.intern_training_logs.update({
      where: { id: existing.id },
      data: {
        hours_worked: hours,
        tasks_completed:
          body.tasks_completed !== undefined || body.tasksCompleted !== undefined
            ? String(body.tasks_completed ?? body.tasksCompleted ?? "").trim() || null
            : existing.tasks_completed,
        learning_notes:
          body.learning_notes !== undefined || body.learningNotes !== undefined
            ? String(body.learning_notes ?? body.learningNotes ?? "").trim() || null
            : existing.learning_notes,
        skills_learned:
          body.skills_learned !== undefined || body.skillsLearned !== undefined
            ? String(body.skills_learned ?? body.skillsLearned ?? "").trim() || null
            : existing.skills_learned,
        challenges:
          body.challenges !== undefined
            ? String(body.challenges ?? "").trim() || null
            : existing.challenges,
        log_type:
          body.log_type ?? body.logType
            ? String(body.log_type ?? body.logType).toLowerCase()
            : existing.log_type,
        log_date: logDate ? new Date(logDate) : existing.log_date,
        updated_at: new Date(),
      },
    });

    await writeAudit(tx, {
      internId: existing.intern_id,
      action: "UPDATE_TRAINING_LOG",
      changedBy,
      previousData,
      newData: mapTrainingLog(updated),
    });

    return updated;
  });

  return mapTrainingLog(log);
}

function countWeekdaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function resolveInternshipStatus(intern) {
  if (!intern.is_active) return "Inactive";
  const now = new Date();
  if (intern.internship_end && new Date(intern.internship_end) < now) return "Completed";
  if (intern.internship_start && new Date(intern.internship_start) > now) return "Pending";
  return "Active";
}

async function getAttendanceData(intern) {
  const { listAttendance } = require("./internExtended.service");
  const result = await listAttendance(intern.id);

  const rangeStart = intern.internship_start ? new Date(intern.internship_start) : new Date();
  const rangeEnd =
    intern.internship_end && new Date(intern.internship_end) < new Date()
      ? new Date(intern.internship_end)
      : new Date();

  const expectedDays = Math.max(1, countWeekdaysBetween(rangeStart, rangeEnd));
  const presentDays = result.items.filter((r) => r.status === "present").length;

  const history = result.items.map((record) => ({
    id: record.id,
    date: record.recordDate ?? "",
    recordDate: record.recordDate,
    status: record.status,
    hours: record.hoursWorked,
    hoursWorked: record.hoursWorked,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    remarks: record.remarks,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }));

  return {
    attendancePercentage: result.attendancePercentage,
    presentDays,
    expectedDays,
    history,
    items: result.items,
    total: result.total,
  };
}

async function getMentorAssignedAt(internId) {
  const assignment = await prisma.intern_audit_logs.findFirst({
    where: { intern_id: internId, action: "ASSIGN_MENTOR" },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
  return assignment?.timestamp ? assignment.timestamp.toISOString().slice(0, 10) : null;
}

async function getDashboardData(userId) {
  const intern = await prisma.internees.findFirst({
    where: { user_id: userId },
    include: INTERN_INCLUDE,
  });
  if (!intern) return null;

  const logs = await prisma.intern_training_logs.findMany({
    where: { intern_id: intern.id },
    orderBy: [{ log_date: "desc" }, { created_at: "desc" }],
    take: 5,
  });

  const allLogs = await prisma.intern_training_logs.findMany({
    where: { intern_id: intern.id },
    select: { hours_worked: true, tasks_completed: true },
  });

  const totalHours = allLogs.reduce((sum, l) => sum + Number(l.hours_worked ?? 0), 0);
  const totalLogs = allLogs.length;

  const [attendance, mentorAssignedAt, progressMetrics] = await Promise.all([
    getAttendanceData(intern),
    getMentorAssignedAt(intern.id),
    getProgressMetrics(intern),
  ]);

  return {
    intern: mapIntern(intern),
    stats: {
      totalLogs,
      totalHours,
      progress: progressMetrics.completionPercentage,
      attendancePercentage: progressMetrics.attendancePercentage || attendance.attendancePercentage,
      tasksCompleted: progressMetrics.tasksCompleted,
      internshipStatus: resolveInternshipStatus(intern),
      completedHours: progressMetrics.completedHours,
      remainingHours: progressMetrics.remainingHours,
      requiredHours: progressMetrics.requiredHours,
      trainingProgress: progressMetrics.trainingProgress,
      completionPercentage: progressMetrics.completionPercentage,
    },
    progress: progressMetrics,
    attendance,
    mentorAssignedAt,
    recentLogs: logs.map(mapTrainingLog),
  };
}

async function getDoctorProfileId(userId) {
  const doctor = await prisma.doctors.findFirst({ where: { user_id: userId } });
  return doctor?.id ?? null;
}

/** Interns assigned to the logged-in doctor (mentor) — SRS doctor mentor scope. */
async function listMenteeInterns(doctorUserId) {
  const doctorId = await getDoctorProfileId(doctorUserId);
  if (!doctorId) {
    return {
      items: [],
      total: 0,
      stats: { assigned: 0, activeAssigned: 0, totalSupervisedHours: 0 },
    };
  }

  const rows = await prisma.internees.findMany({
    where: { mentor_id: doctorId, is_active: true },
    include: INTERN_INCLUDE,
    orderBy: { internship_start: "desc" },
  });

  let totalSupervisedHours = 0;
  const items = [];

  for (const row of rows) {
    const intern = mapIntern(row);
    const logs = await listTrainingLogs(intern.id);
    const attendance = await getAttendanceData(row);
    totalSupervisedHours += logs.totalHours;

    let progress = 0;
    if (row.internship_start && row.internship_end) {
      const start = new Date(row.internship_start).getTime();
      const end = new Date(row.internship_end).getTime();
      const now = Date.now();
      if (end > start) {
        progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
      }
    }

    items.push({
      ...intern,
      totalHours: logs.totalHours,
      logCount: logs.total,
      attendancePercentage: attendance.attendancePercentage,
      progress,
      internshipStatus: resolveInternshipStatus(row),
    });
  }

  return {
    items,
    total: items.length,
    stats: {
      assigned: items.length,
      activeAssigned: items.filter((i) => i.internshipStatus === "Active").length,
      totalSupervisedHours,
    },
  };
}

async function isDoctorMentorOfIntern(doctorUserId, intern) {
  if (!intern?.mentorId) return false;
  const doctorId = await getDoctorProfileId(doctorUserId);
  return Boolean(doctorId && String(doctorId) === String(intern.mentorId));
}

async function approveIntern(id, changedBy) {
  const internId = parseId(id);
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
    await writeAudit(tx, {
      internId,
      action: "APPROVE",
      changedBy,
      previousData,
      newData: mapIntern(updated),
    });
    return updated;
  });

  const { notifyInternStatusUpdate, notifyInternAdded } = require("./notification.service");
  if (row.users) {
    await notifyInternStatusUpdate(row.users, "approved");
    if (previousData.applicationStatus === "PENDING") {
      try {
        await notifyInternAdded(row.users, mapIntern(row));
      } catch (err) {
        console.error("[intern] approval welcome notification failed:", err.message);
      }
    }
  }
  return mapIntern(row);
}

async function rejectIntern(id, changedBy, reason = "") {
  const internId = parseId(id);
  const existing = await prisma.internees.findUnique({
    where: { id: internId },
    include: INTERN_INCLUDE,
  });
  if (!existing) throw Object.assign(new Error("Intern not found."), { code: "NOT_FOUND" });

  const previousData = mapIntern(existing);
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.internees.update({
      where: { id: internId },
      data: { is_active: false, application_status: "REJECTED" },
      include: INTERN_INCLUDE,
    });
    if (updated.user_id) {
      await tx.users.update({
        where: { id: updated.user_id },
        data: { is_active: false },
      });
    }
    await writeAudit(tx, {
      internId,
      action: "REJECT",
      changedBy,
      previousData,
      newData: mapIntern(updated),
    });
    return updated;
  });

  const { notifyInternStatusUpdate } = require("./notification.service");
  if (row.users) {
    await notifyInternStatusUpdate(row.users, "rejected", { reason });
  }
  return mapIntern(row);
}

module.exports = {
  listInterns,
  getInternById,
  getInternByUserId,
  createIntern,
  updateIntern,
  deactivateIntern,
  approveIntern,
  rejectIntern,
  listMentors,
  assignMentor,
  addTrainingLog,
  listTrainingLogs,
  updateTrainingLog,
  getDashboardData,
  getDoctorProfileId,
  listMenteeInterns,
  isDoctorMentorOfIntern,
  getAttendanceData,
};
