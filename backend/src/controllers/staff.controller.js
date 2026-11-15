const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const path = require("path");
const prisma = require("../lib/prisma");
const {
  loadStaffDetailExtras,
  loadStaffDocuments,
  addStaffDocument,
  deleteStaffDocument,
  resolveStaffDocumentPath,
  addAttendance,
  addTask,
  updateTaskStatus,
  addNote,
  assertStaffExists,
  emptyTaskSummary,
  computeTenureSummary,
} = require("../services/staffExtended.service");
const { buildStaffProfilePdf } = require("../services/pdfExport.service");

const parseId = (raw) => String(raw);

const VALID_STAFF_ROLES = new Set([
  "receptionist",
  "ward_attendant",
  "pharmacist",
  "lab_technician",
  "cleaner",
  "security_guard",
]);

const LEGACY_STAFF_ROLE_MAP = {
  ward_boy: "ward_attendant",
  attendant: "ward_attendant",
  housekeeping: "cleaner",
  security: "security_guard",
};

function normalizeStaffRole(raw) {
  const key = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_STAFF_ROLES.has(key)) return key;
  return LEGACY_STAFF_ROLE_MAP[key] ?? null;
}

const STAFF_INCLUDE = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      user_phones: { select: { phone: true } },
    },
  },
};

function mapStaff(s, extras = null) {
  const attendance = extras?.attendance ?? [];
  const summary = extras?.attendanceSummary ?? {
    presentDays: 0,
    totalDays: 0,
    percentage: 0,
  };

  return {
    id: s.id,
    userId: s.user_id,
    name: s.users?.name ?? "",
    fullName: s.users?.name ?? "",
    email: s.users?.email ?? "",
    phone: s.users?.user_phones?.[0]?.phone ?? s.phone ?? "",
    role: normalizeStaffRole(s.staff_role) ?? "receptionist",
    department: s.department ?? "",
    position: s.position ?? "",
    specialty: s.department ?? "",
    qualifications: s.position ?? "",
    joinedAt: s.joined_at ? s.joined_at.toISOString().slice(0, 10) : null,
    joinedOn: s.joined_at ? s.joined_at.toISOString().slice(0, 10) : null,
    status: s.status ?? "active",
    baseSalary: s.base_salary ? Number(s.base_salary) : 0,
    currency: s.currency ?? "PKR",
    shiftType: s.shift_type ?? null,
    shiftTiming: s.shift_timing ?? null,
    is_active: s.users?.is_active ?? true,
    attendance,
    attendanceSummary: summary,
    tasks: extras?.tasks ?? [],
    taskSummary: extras?.taskSummary ?? emptyTaskSummary(),
    tenureSummary: computeTenureSummary(s.joined_at),
    notes: extras?.notes ?? [],
    documents: extras?.documents ?? [],
  };
}

function actorFromRequest(req) {
  return {
    id: req.user?.id ?? null,
    name: req.user?.name ?? "Admin",
    role: req.user?.role ?? "ADMIN",
  };
}

// GET /staff
async function list(req, res) {
  try {
    const where = {};

    if (req.query.search) {
      where.OR = [
        { users: { name: { contains: req.query.search } } },
        { users: { email: { contains: req.query.search } } },
        { department: { contains: req.query.search } },
        { position: { contains: req.query.search } },
        { staff_role: { contains: req.query.search } },
      ];
    }

    if (req.query.status && req.query.status !== "all") {
      where.status = req.query.status;
    }

    if (req.query.role && req.query.role !== "all") {
      where.staff_role = req.query.role;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, parseInt(req.query.pageSize) || 10);
    const skip = (page - 1) * pageSize;

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: STAFF_INCLUDE,
        orderBy: { joined_at: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.staff.count({ where }),
    ]);

    return res.json({ items: staff.map(mapStaff), total, page, pageSize });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /staff/:id
async function getById(req, res) {
  try {
    const row = await prisma.staff.findUnique({
      where: { id: parseId(req.params.id) },
      include: STAFF_INCLUDE,
    });
    if (!row) return res.status(404).json({ success: false, message: "Staff member not found" });
    const extras = await loadStaffDetailExtras(row.id);
    return res.json(mapStaff(row, extras));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// POST /staff
async function create(req, res) {
  try {
    const {
      name, fullName, email, phone,
      department, position, specialty, qualifications,
      joined_at, joinedAt, joinedOn,
      status, base_salary, baseSalary, currency, role,
      shift_type, shiftType, shift_timing, shiftTiming,
    } = req.body ?? {};

    const resolvedName = name ?? fullName;
    if (!resolvedName || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.users.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");
    console.log(`[Staff] Email: ${normalizedEmail} | Temp Password: ${tempPassword}`);
    const hash = await bcrypt.hash(tempPassword, 10);

    const joinDate = joined_at ?? joinedAt ?? joinedOn;
    const resolvedDept = department ?? specialty ?? null;
    const resolvedPosition = position ?? qualifications ?? null;
    const resolvedSalary = base_salary ?? baseSalary ?? null;
    const normalizedRole = normalizeStaffRole(role);
    if (role !== undefined && role !== null && String(role).trim() && !normalizedRole) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role. Choose a supported operational role.",
      });
    }
    const resolvedRole = normalizedRole ?? "receptionist";
    const resolvedShiftType = shift_type ?? shiftType ?? null;
    const resolvedShiftTiming = shift_timing ?? shiftTiming ?? null;

    const row = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: String(resolvedName).trim(),
          email: normalizedEmail,
          password: hash,
          role: "STAFF",
          is_active: true,
        },
      });

      if (phone) {
        await tx.user_phones.create({
          data: { user_id: user.id, phone: String(phone).trim() },
        });
      }

      return await tx.staff.create({
        data: {
          users: { connect: { id: user.id } },
          department: resolvedDept,
          position: resolvedPosition,
          joined_at: joinDate ? new Date(joinDate) : null,
          status: status ?? "active",
          base_salary: resolvedSalary ? Number(resolvedSalary) : null,
          currency: currency ?? "PKR",
          staff_role: resolvedRole,
          shift_type: resolvedShiftType,
          shift_timing: resolvedShiftTiming,
        },
        include: STAFF_INCLUDE,
      });
    });

    return res.status(201).json(mapStaff(row));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email already exists." });
    }
    return res.status(400).json({ success: false, message: e.message });
  }
}

// PATCH /staff/:id
async function patch(req, res) {
  try {
    const {
      name, fullName, email, phone,
      department, position, specialty, qualifications,
      joined_at, joinedAt, joinedOn,
      status, base_salary, baseSalary, currency, role,
      shift_type, shiftType, shift_timing, shiftTiming,
    } = req.body ?? {};

    const staffId = parseId(req.params.id);
    const resolvedName = name ?? fullName;
    const joinDate = joined_at ?? joinedAt ?? joinedOn;
    const resolvedDept = department ?? specialty;
    const resolvedPosition = position ?? qualifications;
    const resolvedSalary = base_salary ?? baseSalary;
    const resolvedShiftType = shift_type ?? shiftType;
    const resolvedShiftTiming = shift_timing ?? shiftTiming;
    let resolvedRolePatch;
    if (role !== undefined) {
      const normalized = normalizeStaffRole(role);
      if (String(role ?? "").trim() && !normalized) {
        return res.status(400).json({
          success: false,
          message: "Invalid staff role. Choose a supported operational role.",
        });
      }
      resolvedRolePatch = normalized ?? undefined;
    }

    const row = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.findUnique({ where: { id: staffId } });
      if (!staff) throw new Error("Staff member not found");

      if (resolvedName || email) {
        const userUpdate = {};
        if (resolvedName) userUpdate.name = String(resolvedName).trim();
        if (email) userUpdate.email = String(email).trim().toLowerCase();
        try {
          await tx.users.update({ where: { id: staff.user_id }, data: userUpdate });
        } catch (err) {
          if (err.code === "P2002") throw new Error("EMAIL_TAKEN");
          throw err;
        }
      }

      if (phone && staff.user_id) {
        const existingPhone = await tx.user_phones.findFirst({
          where: { user_id: staff.user_id },
        });
        if (existingPhone) {
          await tx.user_phones.update({
            where: { id: existingPhone.id },
            data: { phone: String(phone).trim() },
          });
        } else {
          await tx.user_phones.create({
            data: { user_id: staff.user_id, phone: String(phone).trim() },
          });
        }
      }

      return await tx.staff.update({
        where: { id: staffId },
        data: {
          ...(resolvedDept !== undefined && { department: resolvedDept }),
          ...(resolvedPosition !== undefined && { position: resolvedPosition }),
          ...(joinDate !== undefined && { joined_at: joinDate ? new Date(joinDate) : null }),
          ...(status !== undefined && { status }),
          ...(resolvedSalary !== undefined && { base_salary: resolvedSalary ? Number(resolvedSalary) : null }),
          ...(currency !== undefined && { currency }),
          ...(resolvedRolePatch !== undefined && { staff_role: resolvedRolePatch }),
          ...(resolvedShiftType !== undefined && { shift_type: resolvedShiftType }),
          ...(resolvedShiftTiming !== undefined && { shift_timing: resolvedShiftTiming }),
        },
        include: STAFF_INCLUDE,
      });
    });

    return res.json(mapStaff(row));
  } catch (e) {
    if (e.message === "EMAIL_TAKEN")
      return res.status(409).json({ success: false, message: "Email already in use." });
    if (e.message === "Staff member not found" || e.code === "P2025")
      return res.status(404).json({ success: false, message: "Staff member not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// DELETE /staff/:id
async function remove(req, res) {
  try {
    const staffId = parseId(req.params.id);
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    await prisma.$transaction(async (tx) => {
      await tx.staff.delete({ where: { id: staffId } });
      if (staff.user_id) {
        await tx.users.delete({ where: { id: staff.user_id } });
      }
    });

    return res.status(200).json({ success: true, message: "Staff deleted successfully." });
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Staff member not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /staff/:id/toggle-active — admin suspend / reactivate login (SRS-26, SRS-28)
async function toggleAccountStatus(req, res) {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const staffId = parseId(req.params.id);
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { users: true },
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }
    if (!staff.user_id) {
      return res.status(400).json({ success: false, message: "Staff member has no linked user account." });
    }
    if (staff.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot suspend your own account." });
    }

    const newStatus = staff.users?.is_active === false;
    await prisma.users.update({
      where: { id: staff.user_id },
      data: { is_active: newStatus },
    });

    return res.json({
      success: true,
      is_active: newStatus,
      message: newStatus ? "Staff account reactivated." : "Staff account suspended.",
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function reloadStaffResponse(staffId) {
  const row = await prisma.staff.findUnique({
    where: { id: String(staffId) },
    include: STAFF_INCLUDE,
  });
  if (!row) return null;
  const extras = await loadStaffDetailExtras(row.id);
  return mapStaff(row, extras);
}

// POST /staff/:id/attendance
async function postAttendance(req, res) {
  try {
    const item = await addAttendance(parseId(req.params.id), req.body ?? {});
    const payload = await reloadStaffResponse(parseId(req.params.id));
    return res.status(201).json({ item, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// POST /staff/:id/tasks
async function postTask(req, res) {
  try {
    const item = await addTask(parseId(req.params.id), req.body ?? {}, actorFromRequest(req));
    const payload = await reloadStaffResponse(parseId(req.params.id));
    return res.status(201).json({ item, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// PATCH /staff/:id/tasks/:taskId
async function patchTask(req, res) {
  try {
    const item = await updateTaskStatus(
      parseId(req.params.id),
      parseId(req.params.taskId),
      req.body ?? {},
    );
    const payload = await reloadStaffResponse(parseId(req.params.id));
    return res.json({ item, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// POST /staff/:id/notes
async function postNote(req, res) {
  try {
    const item = await addNote(parseId(req.params.id), req.body ?? {}, actorFromRequest(req));
    const payload = await reloadStaffResponse(parseId(req.params.id));
    return res.status(201).json({ item, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsList(req, res) {
  try {
    const staffId = parseId(req.params.id);
    await assertStaffExists(staffId);
    const items = await loadStaffDocuments(staffId);
    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded. Choose a file and try again." });
    }

    const staffId = parseId(req.params.id);
    const item = await addStaffDocument(staffId, req.file, req.body ?? {});
    const payload = await reloadStaffResponse(staffId);
    return res.status(201).json({ item, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsServe(req, res) {
  try {
    const staffId = parseId(req.params.id);
    await assertStaffExists(staffId);
    const fp = resolveStaffDocumentPath(staffId, req.params.filename);
    if (!fp) return res.status(404).send("File not found");
    return res.sendFile(path.resolve(fp));
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

async function documentsDelete(req, res) {
  try {
    const staffId = parseId(req.params.id);
    const documentId = parseId(req.params.documentId);
    await deleteStaffDocument(staffId, documentId);
    const payload = await reloadStaffResponse(staffId);
    return res.json({ success: true, staff: payload });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// GET /staff/:id/export-pdf
async function exportPdf(req, res) {
  try {
    const staffId = parseId(req.params.id);
    const row = await prisma.staff.findUnique({
      where: { id: staffId },
      include: STAFF_INCLUDE,
    });
    if (!row) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const extras = await loadStaffDetailExtras(staffId);
    const data = mapStaff(row, extras);
    const buffer = await buildStaffProfilePdf(data);

    if (!buffer || buffer.length === 0) {
      return res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="staff-${staffId}-report.pdf"`);
    return res.send(buffer);
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

module.exports = {
  list,
  getById,
  create,
  patch,
  remove,
  toggleAccountStatus,
  postAttendance,
  postTask,
  patchTask,
  postNote,
  documentsList,
  documentsUpload,
  documentsServe,
  documentsDelete,
  exportPdf,
};