const crypto = require("crypto");
const { sendEmail } = require("../services/email.service");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { sendDoctorAccountCreatedEmail, isDevelopment } = require("../utils/passwordReset");
const { generateTemporaryPassword, validatePassword } = require("../utils/passwordPolicy");
const {
  findServiceByIdOrSlug,
  setDoctorServices,
} = require("../services/rehabAssignment.service");
const { isPublicDoctorVisible } = require("../utils/doctorApproval");
const { markMissedAppointments } = require("../services/appointmentMissed.service");
const {
  ACTIVE_REMINDER_STATUSES,
  isAppointmentPast,
  buildLocalDateTime,
} = require("../utils/appointmentTime");

const parseId = (raw) => String(raw);

const DOCTOR_INCLUDE = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      user_phones: { select: { phone: true } },
    },
  },
  doctor_service: {
    include: {
      rehabilitation_services: {
        select: { id: true, slug: true, title: true },
      },
    },
  },
};

function mapDoctor(d) {
  return {
    id: d.id,
    userId: d.user_id,
    name: d.users?.name ?? "",
    email: d.users?.email ?? "",
    phone: d.users?.user_phones?.[0]?.phone ?? "",
    license_no: d.license_no ?? "",
    specialization: d.specialization ?? "",
    qualification: d.qualification ?? "",
    experience: d.experience_years ?? 0,
    consultationFee: d.consultation_fee ? Number(d.consultation_fee) : null,
    rating: d.rating ? Number(d.rating) : null,
    image: d.image_url ?? "",
    about: d.about ?? "",
    role: d.doctor_role ?? "Doctor",
    availability: d.availability_schedule ?? [],
    availability_status: d.availability ?? "AVAILABLE",
    is_approved: d.is_approved ?? false,
    is_active: d.users?.is_active ?? true,
    patientsTreated: d.patients_treated ?? 0,
    successRate: d.success_rate ? Number(d.success_rate) : 0,
    gender: d.gender ?? null,
    services: (d.doctor_service ?? []).map((ds) => ({
      id: ds.rehabilitation_services?.id ?? ds.service_id,
      slug: ds.rehabilitation_services?.slug ?? "",
      title: ds.rehabilitation_services?.title ?? "",
    })),
  };
}

function mapDoctorProfile(d) {
  const base = mapDoctor(d);
  return {
    id: base.id,
    name: base.name,
    email: base.email,
    specialization: base.specialization,
    role: base.role,
    phone: base.phone,
    license_no: base.license_no,
    qualification: base.qualification,
    experience: base.experience,
    consultationFee: base.consultationFee,
    patientsTreated: base.patientsTreated,
    successRate: base.successRate,
    about: base.about,
    image: base.image,
    gender: base.gender,
    availability: base.availability,
    availability_status: base.availability_status,
    services: base.services,
    is_active: base.is_active,
    is_approved: base.is_approved,
  };
}

async function resolveDoctorForUser(userId) {
  if (!userId) return null;
  return prisma.doctors.findFirst({
    where: { user_id: String(userId) },
    include: DOCTOR_INCLUDE,
  });
}

const toDateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Local calendar day as noon UTC — matches @db.Date storage used by appointments */
const localCalendarDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${day}T12:00:00.000Z`);
};

const monthStartDate = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0));
};

const isDischargedStatus = (status, admissions = []) => {
  if (/discharg|inactive|closed/i.test(String(status ?? ""))) return true;
  return Boolean(admissions?.[0]?.discharge_date);
};

const programBucket = (patient) => {
  const slug = patient?.patient_services?.rehabilitation_services?.slug ?? "";
  const title =
    patient?.patient_services?.rehabilitation_services?.title
    ?? patient?.condition
    ?? "";
  const haystack = `${slug} ${title}`.toLowerCase();
  if (haystack.includes("psychotic")) return "psychotic";
  if (haystack.includes("addiction") || haystack.includes("drug")) return "drug";
  if (
    haystack.includes("neurodiversity")
    || haystack.includes("little")
    || haystack.includes("autism")
    || haystack.includes("adhd")
  ) {
    return "littleSoul";
  }
  return "other";
};

const formatApptTime = (timeVal) => {
  if (!timeVal) return "—";
  const d = new Date(timeVal);
  if (Number.isNaN(d.getTime())) return "—";
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

const isWithinSessionWindow = (appointmentDate, appointmentTime, now = new Date()) => {
  const startAt = buildLocalDateTime(appointmentDate, appointmentTime);
  if (!startAt) return false;
  return Math.abs(startAt.getTime() - now.getTime()) <= 30 * 60 * 1000;
};

/** Map DB appointment row → doctor home schedule display status */
const mapTodayScheduleStatus = (appt, now = new Date()) => {
  if (!appt.appointment_time) return "NeedsReview";
  if (appt.status === "COMPLETED") return "Done";
  if (appt.status === "MISSED") return "Missed";
  if (
    (appt.status === "BOOKED" || appt.status === "CONFIRMED")
    && isWithinSessionWindow(appt.appointment_date, appt.appointment_time, now)
  ) {
    return "Now";
  }
  if (appt.status === "CONFIRMED") return "Confirmed";
  if (
    (appt.status === "BOOKED" || appt.status === "CONFIRMED")
    && isAppointmentPast(appt.appointment_date, appt.appointment_time, now)
  ) {
    return "Missed";
  }
  return "Pending";
};

// GET /doctors/me
async function getMe(req, res) {
  try {
    const doctor = await resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }
    return res.json({ success: true, data: mapDoctorProfile(doctor) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /doctors/me/dashboard-summary
async function getDashboardSummary(req, res) {
  try {
    const doctor = await resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const doctorId = doctor.id;
    const todayDate = localCalendarDate();
    const monthStart = monthStartDate();
    const weekAgo = localCalendarDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    await markMissedAppointments({ doctor_id: doctorId });

    const patientInclude = {
      users: { select: { name: true } },
      patient_services: {
        include: {
          rehabilitation_services: { select: { title: true, slug: true } },
        },
      },
      patient_admissions: {
        select: { discharge_date: true },
        orderBy: { discharge_date: "desc" },
        take: 1,
      },
      screening_tests: { select: { id: true }, take: 1 },
    };

    const [
      patientLinks,
      todayAppointments,
      allTherapyPlans,
      missedAppointments,
      needsReviewAppointments,
      recentCompletedAppts,
      recentNotedSessions,
    ] = await Promise.all([
      prisma.doctor_patient.findMany({
        where: { doctor_id: doctorId },
        include: { patients: { include: patientInclude } },
      }),
      prisma.appointments.findMany({
        where: {
          doctor_id: doctorId,
          appointment_date: todayDate,
          status: { not: "CANCELLED" },
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
          rehabilitation_services: { select: { title: true, slug: true } },
          telehealth_sessions: { select: { meeting_link: true }, take: 1 },
        },
        orderBy: { appointment_time: "asc" },
      }),
      prisma.therapy_plans.findMany({
        where: { doctor_id: doctorId, status: "ACTIVE" },
        include: {
          patients: { include: { users: { select: { name: true } } } },
          therapy_sessions: {
            select: {
              id: true,
              status: true,
              progress_notes: true,
              session_date: true,
              outcome: true,
            },
          },
        },
      }),
      prisma.appointments.findMany({
        where: {
          doctor_id: doctorId,
          OR: [
            {
              status: "MISSED",
              appointment_date: { lte: todayDate },
            },
            {
              status: { in: ACTIVE_REMINDER_STATUSES },
              appointment_date: { lt: todayDate },
            },
          ],
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
        take: 15,
      }),
      prisma.appointments.findMany({
        where: {
          doctor_id: doctorId,
          appointment_time: null,
          appointment_date: { lte: todayDate },
          status: { in: ACTIVE_REMINDER_STATUSES },
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
        },
        orderBy: { appointment_date: "desc" },
        take: 10,
      }),
      prisma.appointments.findMany({
        where: {
          doctor_id: doctorId,
          status: "COMPLETED",
          appointment_date: { gte: weekAgo },
        },
        include: {
          patients: { include: { users: { select: { name: true } } } },
          rehabilitation_services: { select: { title: true } },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
        take: 8,
      }),
      prisma.therapy_sessions.findMany({
        where: {
          therapy_plans: { doctor_id: doctorId },
          status: "COMPLETED",
          progress_notes: { not: null },
          NOT: { progress_notes: "" },
        },
        include: {
          therapy_plans: {
            include: {
              patients: { include: { users: { select: { name: true } } } },
            },
          },
        },
        orderBy: { session_date: "desc" },
        take: 8,
      }),
    ]);

    const patientIds = new Set(patientLinks.map((l) => l.patient_id));
    const therapyPlans = allTherapyPlans.filter((plan) => patientIds.has(plan.patient_id));

    const upcomingAppointments = patientIds.size
      ? await prisma.appointments.findMany({
          where: {
            doctor_id: doctorId,
            patient_id: { in: [...patientIds] },
            appointment_date: { gte: todayDate },
            status: { notIn: ["CANCELLED", "COMPLETED"] },
          },
          orderBy: [{ appointment_date: "asc" }, { appointment_time: "asc" }],
          select: { patient_id: true, appointment_date: true },
        })
      : [];

    const nextApptByPatient = new Map();
    upcomingAppointments.forEach((appt) => {
      if (!appt.patient_id || nextApptByPatient.has(appt.patient_id)) return;
      nextApptByPatient.set(appt.patient_id, toDateStr(appt.appointment_date));
    });

    const lastSessionByPatient = new Map();
    therapyPlans.forEach((plan) => {
      const sessions = (plan.therapy_sessions ?? []).filter(
        (s) => s.status === "COMPLETED" && s.session_date,
      );
      if (sessions.length === 0) return;
      const latest = sessions.reduce((best, s) => {
        const current = new Date(s.session_date).getTime();
        return current > best ? current : best;
      }, 0);
      lastSessionByPatient.set(plan.patient_id, toDateStr(new Date(latest)));
    });

    const weekAppointments = await prisma.appointments.findMany({
      where: {
        doctor_id: doctorId,
        patient_id: { in: [...patientIds] },
        appointment_date: { gte: weekAgo },
        status: { not: "CANCELLED" },
      },
      select: { patient_id: true },
    });
    const newThisWeek = new Set(weekAppointments.map((a) => a.patient_id)).size;

    let activePatients = 0;
    let dischargedCount = 0;
    let newThisMonth = 0;

    const programDistribution = { psychotic: 0, drug: 0, littleSoul: 0 };

    patientLinks.forEach((link) => {
      const patient = link.patients;
      if (!patient) return;

      const discharged = isDischargedStatus(patient.status, patient.patient_admissions);
      if (discharged) {
        dischargedCount += 1;
      } else {
        activePatients += 1;
      }

      const selectedAt = patient.patient_services?.selected_at;
      if (selectedAt && new Date(selectedAt) >= monthStart) {
        newThisMonth += 1;
      }

      const bucket = programBucket(patient);
      if (bucket in programDistribution) {
        programDistribution[bucket] += 1;
      }
    });

    const completedToday = todayAppointments.filter((a) => a.status === "COMPLETED").length;

    let pendingSessionNotes = 0;
    let pendingTherapyReviews = 0;

    therapyPlans.forEach((plan) => {
      const sessions = plan.therapy_sessions ?? [];
      const openNotes = sessions.filter(
        (s) => s.status === "COMPLETED" && !(s.progress_notes ?? "").trim(),
      ).length;
      pendingSessionNotes += openNotes;
      if (openNotes > 0) pendingTherapyReviews += 1;
    });

    let assessmentsPending = 0;
    patientLinks.forEach((link) => {
      const patient = link.patients;
      if (!patient || isDischargedStatus(patient.status, patient.patient_admissions)) return;
      if (!patient.screening_tests || patient.screening_tests.length === 0) {
        assessmentsPending += 1;
      }
    });

    const todaySchedule = todayAppointments.map((a) => {
      const displayStatus = mapTodayScheduleStatus(a);

      return {
        id: a.id,
        time: formatApptTime(a.appointment_time),
        patientName: a.patients?.users?.name ?? "Patient",
        condition: a.rehabilitation_services?.title ?? a.reason ?? "Visit",
        type: a.type === "ONLINE" ? "Telehealth" : "In-person",
        status: displayStatus,
        needsReview: displayStatus === "NeedsReview",
        patientId: a.patient_id ?? "",
        meetingUrl: a.telehealth_sessions?.[0]?.meeting_link ?? null,
      };
    });

    const planByPatient = new Map(therapyPlans.map((plan) => [plan.patient_id, plan]));

    const patientRecovery = patientLinks.map((link) => {
      const patient = link.patients;
      const name = patient?.users?.name ?? "Patient";
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();

      const plan = planByPatient.get(link.patient_id);
      const sessions = plan?.therapy_sessions ?? [];
      const completed = sessions.filter((s) => s.status === "COMPLETED").length;
      const score =
        sessions.length > 0 ? Math.min(100, Math.round((completed / sessions.length) * 100)) : 0;

      const condition =
        patient?.patient_services?.rehabilitation_services?.title
        ?? patient?.condition
        ?? plan?.therapy_type
        ?? "Rehabilitation";

      return {
        id: link.patient_id,
        initials,
        name,
        condition,
        recoveryScore: score,
      };
    });

    const patients = patientLinks.map((link) => {
      const patient = link.patients;
      const name = patient?.users?.name ?? "Patient";
      const parts = name.trim().split(/\s+/);
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();
      const plan = planByPatient.get(link.patient_id);
      const sessions = plan?.therapy_sessions ?? [];
      const completed = sessions.filter((s) => s.status === "COMPLETED").length;
      const score =
        sessions.length > 0 ? Math.min(100, Math.round((completed / sessions.length) * 100)) : 0;

      return {
        id: link.patient_id,
        initials,
        name,
        program:
          patient?.patient_services?.rehabilitation_services?.title
          ?? patient?.condition
          ?? null,
        therapyType: plan?.therapy_type ?? null,
        status: patient?.status ?? null,
        lastSessionDate: lastSessionByPatient.get(link.patient_id) ?? null,
        nextAppointmentDate: nextApptByPatient.get(link.patient_id) ?? null,
        progressPct: score,
        recoveryScore: score,
      };
    });

    const avgRecovery =
      patientRecovery.length > 0
        ? Math.round(
            patientRecovery.reduce((sum, p) => sum + p.recoveryScore, 0) / patientRecovery.length,
          )
        : 0;

    const patientAlerts = [];

    missedAppointments.forEach((appt) => {
      const dateLabel = toDateStr(appt.appointment_date) ?? "recent date";
      const isToday = toDateStr(appt.appointment_date) === toDateStr(todayDate);
      patientAlerts.push({
        patientId: appt.patient_id ?? "",
        name: appt.patients?.users?.name ?? "Patient",
        message: isToday
          ? `Missed appointment today (${formatApptTime(appt.appointment_time)})`
          : `Missed appointment on ${dateLabel}`,
        type: "missed",
      });
    });

    needsReviewAppointments.forEach((appt) => {
      patientAlerts.push({
        patientId: appt.patient_id ?? "",
        name: appt.patients?.users?.name ?? "Patient",
        message: `Appointment on ${toDateStr(appt.appointment_date) ?? "recent date"} is missing a time — needs review`,
        type: "needs_review",
      });
    });

    therapyPlans.forEach((plan) => {
      const openSessions = (plan.therapy_sessions ?? []).filter(
        (s) => s.status === "COMPLETED" && !(s.progress_notes ?? "").trim(),
      );
      if (openSessions.length === 0) return;
      patientAlerts.push({
        patientId: plan.patient_id ?? "",
        name: plan.patients?.users?.name ?? "Patient",
        message: `${openSessions.length} session note(s) pending documentation`,
        type: "pending_note",
      });
    });

    patientRecovery.forEach((p) => {
      if (p.recoveryScore < 25) {
        patientAlerts.push({
          patientId: p.id,
          name: p.name,
          message: `Recovery score ${p.recoveryScore}% — high risk, requires review`,
          type: "critical",
        });
      } else if (p.recoveryScore < 40) {
        patientAlerts.push({
          patientId: p.id,
          name: p.name,
          message: `Recovery score ${p.recoveryScore}% — low progress`,
          type: "low_progress",
        });
      }
    });

    const recentActivity = [];

    recentCompletedAppts.forEach((appt) => {
      recentActivity.push({
        id: `appt-${appt.id}`,
        type: "session_completed",
        title: "Session completed",
        detail: `${appt.patients?.users?.name ?? "Patient"} — ${appt.rehabilitation_services?.title ?? "Visit"}`,
        timestamp: appt.appointment_date
          ? new Date(appt.appointment_date).toISOString()
          : new Date().toISOString(),
      });
    });

    recentNotedSessions.forEach((session) => {
      const patientName = session.therapy_plans?.patients?.users?.name ?? "Patient";
      recentActivity.push({
        id: `note-${session.id}`,
        type: "note_added",
        title: "Session note added",
        detail: `${patientName} — clinical documentation updated`,
        timestamp: session.session_date
          ? new Date(session.session_date).toISOString()
          : new Date().toISOString(),
      });
    });

    if (patientIds.size > 0) {
      const recentScreenings = await prisma.screening_tests.findMany({
        where: { patient_id: { in: [...patientIds] } },
        orderBy: { test_date: "desc" },
        take: 5,
        include: {
          patients: { include: { users: { select: { name: true } } } },
        },
      });

      recentScreenings.forEach((test) => {
        recentActivity.push({
          id: `screening-${test.id}`,
          type: "assessment_completed",
          title: "Assessment completed",
          detail: `${test.patients?.users?.name ?? "Patient"} — ${test.test_type ?? "Screening"}`,
          timestamp: test.test_date
            ? new Date(test.test_date).toISOString()
            : new Date().toISOString(),
        });
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return res.json({
      success: true,
      data: {
        profile: mapDoctorProfile(doctor),
        stats: {
          totalPatients: patientIds.size,
          activePatients,
          newThisMonth,
          discharged: dischargedCount,
          newThisWeek: Math.min(newThisWeek, patientIds.size),
          sessionsToday: todayAppointments.length,
          sessionsCompleted: completedToday,
          pendingNotes: pendingSessionNotes,
          avgRecovery,
        },
        todaySchedule,
        patientAlerts,
        patientRecovery,
        patients,
        programDistribution,
        pendingDocumentation: {
          sessionNotes: pendingSessionNotes,
          therapyReviews: pendingTherapyReviews,
          assessments: assessmentsPending,
        },
        recentActivity: recentActivity.slice(0, 8),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /doctors/:id/services
async function patchServices(req, res) {
  try {
    const doctorId = parseId(req.params.id);
    const serviceIds = req.body?.serviceIds ?? req.body?.service_ids ?? [];

    if (!Array.isArray(serviceIds)) {
      return res.status(400).json({ success: false, message: "serviceIds must be an array" });
    }

    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const updated = await setDoctorServices(doctorId, serviceIds);
    return res.json({ success: true, data: mapDoctor(updated) });
  } catch (e) {
    return res.status(e.status ?? 500).json({ success: false, message: e.message });
  }
}

// GET /doctors
async function list(req, res) {
  try {
    const where = {};
    const isAdmin = req.user?.role === "ADMIN";
    const bookable = req.query.bookable === "true";
    const approvedParam = req.query.approved;

    if (bookable || approvedParam === "true") {
      where.is_approved = true;
      where.users = { is_active: true };
    } else if (approvedParam === "false") {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      where.is_approved = false;
    } else if (!isAdmin) {
      // Public, patients, doctors: only approved & active doctors
      where.is_approved = true;
      where.users = { is_active: true };
    }

    const serviceId = req.query.serviceId ?? req.query.service_id;
    const serviceSlug = req.query.serviceSlug ?? req.query.service_slug;
    if (serviceId || serviceSlug) {
      const service = await findServiceByIdOrSlug({ serviceId, serviceSlug });
      if (!service) {
        return res.json({ items: [], total: 0, page: 1, limit: 50 });
      }
      where.doctor_service = { some: { service_id: service.id } };
    }

    if (req.query.specialization) {
      where.specialization = {
        contains: req.query.specialization,
        mode: "insensitive",
      };
    }

    if (req.query.search) {
      where.OR = [
        { specialization: { contains: req.query.search, mode: "insensitive" } },
        { users: { name: { contains: req.query.search, mode: "insensitive" } } },
        { users: { email: { contains: req.query.search, mode: "insensitive" } } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      prisma.doctors.findMany({
        where,
        include: DOCTOR_INCLUDE,
        skip,
        take: limit,
        orderBy: { users: { name: "asc" } },
      }),
      prisma.doctors.count({ where }),
    ]);

    return res.json({
      items: doctors.map(mapDoctor),
      total,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /doctors/:id
async function getById(req, res) {
  try {
    const row = await prisma.doctors.findUnique({
      where: { id: parseId(req.params.id) },
      include: DOCTOR_INCLUDE,
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const isAdmin = req.user?.role === "ADMIN";
    if (!isAdmin && !isPublicDoctorVisible(row)) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.json({ success: true, data: mapDoctor(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// POST /doctors
async function create(req, res) {
  try {
    const {
      name, email, license_no, specialization, qualification,
      experience, consultation_fee, phone, image, about,
      role: doctorRole, availability, gender, password,
    } = req.body ?? {};

    if (!license_no) return res.status(400).json({ success: false, message: "License number required." });
    if (!name || !email) return res.status(400).json({ success: false, message: "Name and email required." });
    if (!gender || !String(gender).trim()) {
      return res.status(400).json({ success: false, message: "Gender is required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [existingUser, existingLicense] = await Promise.all([
      prisma.users.findFirst({ where: { email: normalizedEmail } }),
      prisma.doctors.findFirst({ where: { license_no: String(license_no) } }),
    ]);

    if (existingUser) return res.status(400).json({ success: false, message: "Email already exists." });
    if (existingLicense) return res.status(400).json({ success: false, message: "License number already exists." });

    let plainPassword = password ? String(password).trim() : "";
    if (plainPassword) {
      try {
        validatePassword(plainPassword);
      } catch (err) {
        return res.status(err.status ?? 400).json({ success: false, message: err.message });
      }
    } else {
      plainPassword = generateTemporaryPassword();
    }

    const hash = await bcrypt.hash(plainPassword, 10);

    const row = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          password: hash,
          role: "DOCTOR",
          is_active: true,
        },
      });

      if (phone) {
        await tx.user_phones.create({
          data: { user_id: user.id, phone: String(phone).trim() },
        });
      }

      return await tx.doctors.create({
        data: {
          users: { connect: { id: user.id } },
          license_no: String(license_no),
          experience_years: experience ? Number(experience) : null,
          specialization: specialization ?? null,
          qualification: qualification ?? null,
          consultation_fee: req.body.consultationFee ?? req.body.consultation_fee ?? null,
          image_url: image ?? null,
          about: about ?? null,
          doctor_role: doctorRole ?? "Doctor",
          availability_schedule: availability ?? [],
          is_approved: true,
          patients_treated: req.body.patientsTreated ?? null,
          success_rate: req.body.successRate ?? null,
          gender: String(gender).trim(),
        },
        include: DOCTOR_INCLUDE,
      });
    });

    let emailMeta = { welcomeEmailSent: false, devLoginUrl: null };

    try {
      emailMeta = await sendDoctorAccountCreatedEmail(
        { id: row.users.id, email: normalizedEmail, name: String(name).trim() },
        {
          doctorName: String(name).trim(),
          specialization: specialization ?? null,
          temporaryPassword: plainPassword,
        },
      );
    } catch (emailErr) {
      console.error("[doctor-invite] Welcome email failed:", emailErr.message);
    }

    const responseData = {
      ...mapDoctor(row),
      welcomeEmailSent: emailMeta.welcomeEmailSent,
      ...(isDevelopment()
        ? {
            devLoginUrl: emailMeta.devLoginUrl,
            devTemporaryPassword: plainPassword,
          }
        : {}),
    };

    return res.status(201).json({
      success: true,
      message:
        "Doctor created successfully. Login details have been emailed to the doctor.",
      data: responseData,
    });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email or license already exists." });
    }
    return res.status(400).json({ success: false, message: e.message });
  }
}

// PATCH /doctors/me — doctor self-service profile & schedule
async function patchMe(req, res) {
  try {
    const doctor = await resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const body = req.body ?? {};
    const {
      name,
      email,
      phone,
      about,
      image,
      specialization,
      qualification,
      experience,
      consultationFee,
      consultation_fee,
      availability,
      availabilityStatus,
      availability_status,
      gender,
    } = body;

    const hasUserFields = name !== undefined || email !== undefined;
    const hasPhone = phone !== undefined;
    const hasDoctorFields =
      about !== undefined
      || image !== undefined
      || specialization !== undefined
      || qualification !== undefined
      || experience !== undefined
      || consultationFee !== undefined
      || consultation_fee !== undefined
      || availability !== undefined
      || availabilityStatus !== undefined
      || availability_status !== undefined
      || gender !== undefined;

    if (!hasUserFields && !hasPhone && !hasDoctorFields) {
      return res.status(400).json({ success: false, message: "No updatable fields provided." });
    }

    const row = await prisma.$transaction(async (tx) => {
      if (hasUserFields && doctor.user_id) {
        const userUpdate = {};
        if (name !== undefined) userUpdate.name = String(name).trim();
        if (email !== undefined) userUpdate.email = String(email).trim().toLowerCase();
        try {
          await tx.users.update({ where: { id: doctor.user_id }, data: userUpdate });
        } catch (err) {
          if (err.code === "P2002") throw new Error("EMAIL_TAKEN");
          throw err;
        }
      }

      if (hasPhone && doctor.user_id) {
        const trimmed = String(phone).trim();
        const existingPhone = await tx.user_phones.findFirst({
          where: { user_id: doctor.user_id },
        });
        if (existingPhone) {
          await tx.user_phones.update({
            where: { id: existingPhone.id },
            data: { phone: trimmed },
          });
        } else if (trimmed) {
          await tx.user_phones.create({
            data: { user_id: doctor.user_id, phone: trimmed },
          });
        }
      }

      const doctorData = {};
      if (about !== undefined) doctorData.about = String(about).trim() || null;
      if (image !== undefined) doctorData.image_url = String(image).trim() || null;
      if (specialization !== undefined) {
        doctorData.specialization = String(specialization).trim() || null;
      }
      if (qualification !== undefined) {
        doctorData.qualification = String(qualification).trim() || null;
      }
      if (experience !== undefined) {
        doctorData.experience_years = experience === "" || experience == null
          ? null
          : Number(experience);
      }
      if (consultationFee !== undefined || consultation_fee !== undefined) {
        const fee = consultationFee ?? consultation_fee;
        doctorData.consultation_fee = fee === "" || fee == null ? null : Number(fee);
      }
      if (gender !== undefined) {
        doctorData.gender = String(gender).trim() || null;
      }
      if (availability !== undefined) {
        doctorData.availability_schedule = availability;
      }
      const statusRaw = availabilityStatus ?? availability_status;
      if (statusRaw !== undefined) {
        const s = String(statusRaw).toUpperCase();
        if (s === "AVAILABLE" || s === "UNAVAILABLE") {
          doctorData.availability = s;
        }
      }

      if (Object.keys(doctorData).length > 0) {
        return tx.doctors.update({
          where: { id: doctor.id },
          data: doctorData,
          include: DOCTOR_INCLUDE,
        });
      }

      return tx.doctors.findUnique({
        where: { id: doctor.id },
        include: DOCTOR_INCLUDE,
      });
    });

    return res.json({ success: true, data: mapDoctorProfile(row) });
  } catch (e) {
    if (e.message === "EMAIL_TAKEN") {
      return res.status(409).json({ success: false, message: "Email already in use." });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function uploadProfileImage(req, res) {
  try {
    if (req.user?.role !== "DOCTOR") {
      return res.status(403).json({ success: false, message: "Only doctors can upload a profile image." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded." });
    }

    const doctor = await resolveDoctorForUser(req.user.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found." });
    }

    const imageUrl = file.path || file.secure_url || file.url;
    const updated = await prisma.doctors.update({
      where: { id: doctor.id },
      data: { image_url: imageUrl },
      include: DOCTOR_INCLUDE,
    });

    return res.json({
      success: true,
      url: imageUrl,
      data: mapDoctorProfile(updated),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /doctors/:id
async function patch(req, res) {
  try {
    const {
      name, email, experience, specialization, qualification,
      license_no, consultation_fee, phone, image, about,
      role: doctorRole, availability, gender,
    } = req.body ?? {};

    const doctorId = parseId(req.params.id);

    const row = await prisma.$transaction(async (tx) => {
      const doctor = await tx.doctors.findUnique({ where: { id: doctorId } });
      if (!doctor) throw new Error("Doctor not found");

      if (license_no && license_no !== doctor.license_no) {
        const licenseExists = await tx.doctors.findFirst({
          where: { license_no: String(license_no), id: { not: doctorId } },
        });
        if (licenseExists) throw new Error("LICENSE_TAKEN");
      }

      if (name || email) {
        const userUpdate = {};
        if (name) userUpdate.name = String(name).trim();
        if (email) userUpdate.email = String(email).trim().toLowerCase();
        try {
          await tx.users.update({ where: { id: doctor.user_id }, data: userUpdate });
        } catch (err) {
          if (err.code === "P2002") throw new Error("EMAIL_TAKEN");
          throw err;
        }
      }

      if (phone && doctor.user_id) {
        const existingPhone = await tx.user_phones.findFirst({
          where: { user_id: doctor.user_id },
        });
        if (existingPhone) {
          await tx.user_phones.update({
            where: { id: existingPhone.id },
            data: { phone: String(phone).trim() },
          });
        } else {
          await tx.user_phones.create({
            data: { user_id: doctor.user_id, phone: String(phone).trim() },
          });
        }
      }

      return await tx.doctors.update({
        where: { id: doctorId },
        data: {
          ...(license_no && { license_no: String(license_no) }),
          ...(experience !== undefined && { experience_years: Number(experience) }),
          ...(specialization !== undefined && { specialization }),
          ...(qualification !== undefined && { qualification }),
          ...((req.body.consultationFee !== undefined || consultation_fee !== undefined) && { consultation_fee: req.body.consultationFee ?? consultation_fee }),
          ...(image !== undefined && { image_url: image }),
          ...(about !== undefined && { about }),
          ...(doctorRole && { doctor_role: doctorRole }),
          ...(availability !== undefined && { availability_schedule: availability }),
          ...(req.body.patientsTreated !== undefined && { patients_treated: req.body.patientsTreated }),
          ...(req.body.successRate !== undefined && { success_rate: req.body.successRate }),
          ...(gender !== undefined && { gender: String(gender).trim() || null }),
        },
        include: DOCTOR_INCLUDE,
      });
    });

    return res.json({ success: true, data: mapDoctor(row) });
  } catch (e) {
    if (e.message === "EMAIL_TAKEN")
      return res.status(409).json({ success: false, message: "Email already in use." });
    if (e.message === "LICENSE_TAKEN")
      return res.status(409).json({ success: false, message: "License number already in use." });
    if (e.message === "Doctor not found")
      return res.status(404).json({ success: false, message: "Doctor not found" });
    return res.status(500).json({ success: false, message: e.message });
  }
}

// DELETE /doctors/:id
async function remove(req, res) {
  try {
    const doctorId = parseId(req.params.id);
    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    await prisma.$transaction(async (tx) => {
      await tx.doctor_match_notes.deleteMany({ where: { doctor_id: doctorId } });
      await tx.recommendation_log.deleteMany({ where: { doctor_id: doctorId } });
      await tx.doctor_recommendations.deleteMany({ where: { doctor_id: doctorId } });

      await tx.ai_analysis.updateMany({
        where: { selected_doctor_id: doctorId },
        data: { selected_doctor_id: null },
      });

      const appointmentIds = (
        await tx.appointments.findMany({
          where: { doctor_id: doctorId },
          select: { id: true },
        })
      ).map((row) => row.id);

      if (appointmentIds.length > 0) {
        await tx.telehealth_sessions.deleteMany({
          where: { appointment_id: { in: appointmentIds } },
        });
        await tx.appointments.deleteMany({ where: { doctor_id: doctorId } });
      }

      await tx.doctor_patient.deleteMany({ where: { doctor_id: doctorId } });
      await tx.feedback.deleteMany({ where: { doctor_id: doctorId } });
      await tx.internees.updateMany({
        where: { mentor_id: doctorId },
        data: { mentor_id: null },
      });
      await tx.therapy_plans.updateMany({
        where: { doctor_id: doctorId },
        data: { doctor_id: null },
      });
      await tx.doctor_service.deleteMany({ where: { doctor_id: doctorId } });

      await tx.doctors.delete({ where: { id: doctorId } });

      if (doctor.user_id) {
        await tx.notifications.deleteMany({ where: { user_id: doctor.user_id } });
        await tx.reports.updateMany({
          where: { generated_by: doctor.user_id },
          data: { generated_by: null },
        });
        await tx.users.delete({ where: { id: doctor.user_id } });
      }
    });

    return res.status(200).json({ success: true, message: "Doctor deleted successfully." });
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ success: false, message: "Doctor not found" });
    if (e.code === "P2003") {
      return res.status(409).json({
        success: false,
        message:
          "Unable to delete this doctor because related records still exist. Remove linked data and try again.",
      });
    }
    console.error("Doctor delete failed:", e);
    return res.status(500).json({ success: false, message: "Failed to delete doctor. Please try again." });
  }
}

// PATCH /doctors/:id/approve
async function approveDoctor(req, res) {
  try {
    const doctorId = parseId(req.params.id);
    const doctor = await prisma.doctors.findUnique({
      where: { id: doctorId },
      include: DOCTOR_INCLUDE,
    });

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (doctor.is_approved) return res.status(400).json({ success: false, message: "Already approved." });

    const updated = await prisma.doctors.update({
      where: { id: doctorId },
      data: { is_approved: true },
      include: DOCTOR_INCLUDE,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8081";
    if (updated.users?.email) {
      try {
        await sendEmail({
          to: updated.users.email,
          subject: "Your Life Ways Account Has Been Approved",
          html: `
            <h2>Account Approved</h2>
            <p>Dear Dr. ${updated.users.name},</p>
            <p>Your account has been approved. Login at:</p>
            <p><a href="${frontendUrl}/login/admin">${frontendUrl}/login/admin</a></p>
            <p>Regards,<br/>Life Ways Rehabilitation Center</p>
          `,
        });
      } catch (emailErr) {
        console.error("Approval email failed:", emailErr.message);
      }
    }

    return res.json({ success: true, message: "Doctor approved.", data: mapDoctor(updated) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /doctors/:id/toggle-active
async function toggleActive(req, res) {
  try {
    const doctorId = parseId(req.params.id);
    const doctor = await prisma.doctors.findUnique({
      where: { id: doctorId },
      include: { users: true },
    });

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    if (!doctor.user_id) {
      return res.status(400).json({ success: false, message: "Doctor has no linked user account." });
    }
    if (doctor.user_id === req.user?.id) {
      return res.status(400).json({ success: false, message: "You cannot suspend your own account." });
    }

    const newStatus = !doctor.users?.is_active;
    await prisma.users.update({
      where: { id: doctor.user_id },
      data: { is_active: newStatus },
    });

    return res.json({
      success: true,
      message: newStatus ? "Doctor account reactivated." : "Doctor account suspended.",
      is_active: newStatus,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  list,
  getById,
  getMe,
  getDashboardSummary,
  create,
  patchMe,
  uploadProfileImage,
  patch,
  patchServices,
  remove,
  approveDoctor,
  toggleActive,
};