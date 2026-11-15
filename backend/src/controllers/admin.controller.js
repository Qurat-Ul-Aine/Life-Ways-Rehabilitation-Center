"use strict";

const prisma = require("../lib/prisma");

const toDateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const localDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const toCalendarDate = (raw) => {
  if (!raw) return null;
  const str = String(raw);
  return str.length === 10 ? new Date(`${str}T12:00:00.000Z`) : new Date(str);
};

const formatTime = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const toFrontendStatus = (raw) => {
  if (raw === "COMPLETED") return "completed";
  if (raw === "CANCELLED") return "cancelled";
  return "scheduled";
};

function mapAppointment(a) {
  return {
    id: a.id,
    patientId: a.patient_id,
    patientName: a.patients?.users?.name ?? "",
    doctorId: a.doctor_id,
    doctorName: a.doctors?.users?.name ?? "",
    date: toDateStr(a.appointment_date),
    startTime: formatTime(a.appointment_time),
    status: toFrontendStatus(a.status),
    type: a.type ?? null,
  };
}

function mapPatientBrief(p) {
  return {
    id: p.id,
    fullName: p.users?.name ?? "",
    name: p.users?.name ?? "",
    email: p.users?.email ?? "",
    condition: p.condition ?? "",
    gender: p.gender ?? "",
    status: p.status ?? "active",
    createdAt: null,
  };
}

function mapScreeningTest(t) {
  return {
    id: t.id,
    patientId: t.patient_id,
    patientName: t.patients?.users?.name ?? "Unknown",
    testType: t.test_type ?? "Screening",
    score: t.score != null ? Number(t.score) : null,
    riskLevel: t.risk_level ?? null,
    testDate: toDateStr(t.test_date),
  };
}

function mapInternee(row) {
  const start = toDateStr(row.internship_start);
  const end = toDateStr(row.internship_end);
  const now = new Date();
  let status = "active";
  if (row.internship_start && new Date(row.internship_start) > now) status = "onboarding";
  else if (row.internship_end) {
    const endDate = new Date(row.internship_end);
    const daysLeft = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 30 && daysLeft >= 0) status = "completing";
    else if (daysLeft < 0) status = "completed";
  }

  return {
    id: row.id,
    name: row.users?.name ?? "Intern",
    email: row.users?.email ?? "",
    specialization: row.department ?? "—",
    supervisor: row.doctors?.users?.name ?? "Unassigned",
    mentorId: row.mentor_id,
    startDate: start,
    endDate: end,
    status,
    degrees: (row.internee_degrees ?? []).map((d) => d.degree_program).filter(Boolean),
    universities: (row.internee_universities ?? []).map((u) => u.university_name).filter(Boolean),
  };
}

async function getDashboardSummary(req, res) {
  try {
    const todayStr = localToday();
    const fromDate = localDateDaysAgo(6);

    const [
      totalPatients,
      totalDoctors,
      pendingDoctors,
      totalStaff,
      totalAppointments,
      todayAppointments,
      recentPatientsRaw,
      recentAppointmentsRaw,
      weeklyAppointmentsRaw,
      therapyPlanCount,
      prescriptionCount,
      screeningCount,
      interneeCount,
    ] = await Promise.all([
      prisma.patients.count(),
      prisma.doctors.count({ where: { is_approved: true, users: { is_active: true } } }),
      prisma.doctors.count({ where: { is_approved: false } }),
      prisma.staff.count(),
      prisma.appointments.count(),
      prisma.appointments.count({
        where: { appointment_date: toCalendarDate(todayStr) },
      }),
      prisma.patients.findMany({
        take: 5,
        orderBy: { id: "desc" },
        include: { users: { select: { name: true, email: true } } },
      }),
      prisma.appointments.findMany({
        take: 5,
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
        include: {
          patients: { include: { users: { select: { name: true } } } },
          doctors: { include: { users: { select: { name: true } } } },
        },
      }),
      prisma.appointments.findMany({
        where: {
          appointment_date: {
            gte: toCalendarDate(fromDate),
            lte: toCalendarDate(todayStr),
          },
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
          doctors: { include: { users: { select: { name: true } } } },
        },
      }),
      prisma.therapy_plans.count(),
      prisma.prescriptions.count(),
      prisma.screening_tests.count(),
      prisma.internees.count(),
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalDoctors,
          totalStaff,
          totalAppointments,
          todayAppointments,
          pendingDoctors,
          therapyPlans: therapyPlanCount,
          prescriptions: prescriptionCount,
          screeningTests: screeningCount,
          internees: interneeCount,
        },
        recentPatients: recentPatientsRaw.map(mapPatientBrief),
        recentAppointments: recentAppointmentsRaw.map(mapAppointment),
        weeklyAppointments: weeklyAppointmentsRaw.map(mapAppointment),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function listScreeningTests(req, res) {
  try {
    const tests = await prisma.screening_tests.findMany({
      orderBy: [{ test_date: "desc" }, { id: "desc" }],
      take: 200,
      include: {
        patients: { include: { users: { select: { name: true } } } },
      },
    });
    return res.json({
      success: true,
      items: tests.map(mapScreeningTest),
      total: tests.length,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function listInternees(req, res) {
  try {
    const rows = await prisma.internees.findMany({
      orderBy: { internship_start: "desc" },
      include: {
        users: { select: { name: true, email: true } },
        doctors: {
          select: {
            id: true,
            specialization: true,
            users: { select: { name: true } },
          },
        },
        internee_degrees: true,
        internee_universities: true,
      },
    });
    const items = rows.map(mapInternee);
    const active = items.filter((i) => i.status === "active").length;
    const onboarding = items.filter((i) => i.status === "onboarding").length;
    const completing = items.filter((i) => i.status === "completing").length;
    const thisMonth = new Date().toISOString().slice(0, 7);
    const joinedThisMonth = items.filter((i) => i.startDate?.startsWith(thisMonth)).length;

    return res.json({
      success: true,
      items,
      total: items.length,
      stats: {
        total: items.length,
        active,
        onboarding,
        completingSoon: completing,
        joinedThisMonth,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getReportsSummary(req, res) {
  try {
    const [patients, doctors, appointments, therapyPlans, prescriptions, screenings] =
      await Promise.all([
        prisma.patients.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.doctors.groupBy({ by: ["specialization"], _count: { id: true } }),
        prisma.appointments.groupBy({ by: ["status"], _count: { id: true } }),
        prisma.therapy_plans.count(),
        prisma.prescriptions.count({ where: { is_invalid: false, deleted_at: null } }),
        prisma.screening_tests.groupBy({ by: ["risk_level"], _count: { id: true } }),
      ]);

    return res.json({
      success: true,
      data: {
        patientsByStatus: patients.map((p) => ({
          status: p.status ?? "unknown",
          count: p._count.id,
        })),
        doctorsBySpecialization: doctors
          .filter((d) => d.specialization)
          .map((d) => ({ specialization: d.specialization, count: d._count.id })),
        appointmentsByStatus: appointments.map((a) => ({
          status: toFrontendStatus(a.status),
          count: a._count.id,
        })),
        therapyPlans,
        activePrescriptions: prescriptions,
        screeningsByRisk: screenings.map((s) => ({
          riskLevel: s.risk_level ?? "unknown",
          count: s._count.id,
        })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /admin/search?q=
async function globalSearch(req, res) {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { patients: [], doctors: [], staff: [], appointments: [] },
      });
    }

    const contains = { contains: q };

    const [patients, doctors, staff, appointments] = await Promise.all([
      prisma.patients.findMany({
        where: {
          users: {
            OR: [{ name: contains }, { email: contains }],
          },
        },
        include: {
          users: { select: { name: true, email: true } },
        },
        take: 5,
        orderBy: { id: "desc" },
      }),
      prisma.doctors.findMany({
        where: {
          OR: [
            { specialization: contains },
            { users: { OR: [{ name: contains }, { email: contains }] } },
          ],
        },
        include: {
          users: { select: { name: true, email: true } },
        },
        take: 5,
        orderBy: { id: "desc" },
      }),
      prisma.staff.findMany({
        where: {
          OR: [
            { department: contains },
            { position: contains },
            { staff_role: contains },
            { users: { OR: [{ name: contains }, { email: contains }] } },
          ],
        },
        include: {
          users: { select: { name: true, email: true } },
        },
        take: 5,
        orderBy: { id: "desc" },
      }),
      prisma.appointments.findMany({
        where: {
          OR: [
            { patients: { users: { name: contains } } },
            { doctors: { users: { name: contains } } },
            { reason: contains },
            { notes: contains },
          ],
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
          doctors: { include: { users: { select: { name: true } } } },
        },
        take: 5,
        orderBy: { appointment_date: "desc" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        patients: patients.map((p) => ({
          id: p.id,
          name: p.users?.name ?? "",
          email: p.users?.email ?? "",
          subtitle: p.condition ?? "",
        })),
        doctors: doctors.map((d) => ({
          id: d.id,
          name: d.users?.name ?? "",
          email: d.users?.email ?? "",
          subtitle: d.specialization ?? "",
        })),
        staff: staff.map((s) => ({
          id: s.id,
          name: s.users?.name ?? "",
          email: s.users?.email ?? "",
          subtitle: s.staff_role ?? s.position ?? "",
        })),
        appointments: appointments.map((a) => ({
          id: a.id,
          patientName: a.patients?.users?.name ?? "",
          doctorName: a.doctors?.users?.name ?? "",
          date: toDateStr(a.appointment_date),
          startTime: formatTime(a.appointment_time),
          status: toFrontendStatus(a.status),
        })),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getDashboardSummary,
  listScreeningTests,
  listInternees,
  getReportsSummary,
  globalSearch,
};
