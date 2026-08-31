"use strict";

const prisma = require("../lib/prisma");

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const { INTRO_CONFIG } = require("../../prisma/seed-screening");

function mergeIntroConfig(dbValue) {
  const base = INTRO_CONFIG;
  if (!dbValue || typeof dbValue !== "object") return base;
  return {
    ...base,
    ...dbValue,
    purpose: dbValue.purpose ?? base.purpose,
    confidentialityNote: dbValue.confidentialityNote ?? base.confidentialityNote,
    instructions:
      Array.isArray(dbValue.instructions) && dbValue.instructions.length > 0
        ? dbValue.instructions
        : base.instructions,
    scoringExplanation: dbValue.scoringExplanation ?? base.scoringExplanation,
    bulletPoints:
      Array.isArray(dbValue.bulletPoints) && dbValue.bulletPoints.length > 0
        ? dbValue.bulletPoints
        : base.bulletPoints,
    stats:
      Array.isArray(dbValue.stats) && dbValue.stats.length > 0 ? dbValue.stats : base.stats,
  };
}

function toRiskKey(score, thresholds) {
  if (score >= thresholds.high) return "HIGH";
  if (score >= thresholds.medium) return "MEDIUM";
  return "LOW";
}

function mapRiskDisplay(level) {
  if (!level) return null;
  const map = { LOW: "low", MEDIUM: "moderate", HIGH: "high" };
  return map[level] ?? String(level).toLowerCase();
}

function mapCondition(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

function mapQuestion(row) {
  return {
    id: row.id,
    conditionId: row.condition_id,
    sectionTitle: row.section_title,
    text: row.question_text,
    type: row.question_type,
    options: row.options,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
    scoringWeight: Number(row.scoring_weight ?? 1),
    skipLogic: row.skip_logic,
  };
}

async function resolveCondition(conditionId) {
  const key = String(conditionId).trim();
  const byId = await prisma.screening_conditions.findUnique({ where: { id: key } });
  if (byId) return byId;
  return prisma.screening_conditions.findUnique({ where: { slug: key.toLowerCase() } });
}

async function getIntroConfig() {
  const row = await prisma.screening_config.findUnique({ where: { key: "intro" } });
  if (row?.value) return mergeIntroConfig(row.value);
  if (!row) {
    const { ensureScreeningBootstrap } = require("../bootstrap/screening.bootstrap");
    await ensureScreeningBootstrap();
    const refreshed = await prisma.screening_config.findUnique({ where: { key: "intro" } });
    if (refreshed?.value) return mergeIntroConfig(refreshed.value);
  }
  return INTRO_CONFIG;
}

async function getConditions() {
  const rows = await prisma.screening_conditions.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });
  if (rows.length === 0) {
    const { ensureScreeningBootstrap } = require("../bootstrap/screening.bootstrap");
    await ensureScreeningBootstrap();
    const refreshed = await prisma.screening_conditions.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
    });
    return refreshed.map(mapCondition);
  }
  return rows.map(mapCondition);
}

async function getQuestions(conditionId) {
  const condition = await resolveCondition(conditionId);
  if (!condition || !condition.is_active) {
    throw new HttpError(404, "Condition not found.");
  }

  const questions = await prisma.screening_questions.findMany({
    where: { condition_id: condition.id },
    orderBy: { sort_order: "asc" },
  });

  return {
    condition: mapCondition(condition),
    questions: questions.map(mapQuestion),
  };
}

function scoreAnswer(question, answerValue) {
  const options = Array.isArray(question.options) ? question.options : [];
  const match = options.find(
    (o) => String(o.label).toLowerCase() === String(answerValue).toLowerCase()
  );
  if (!match) {
    throw new HttpError(400, `Invalid answer "${answerValue}" for question ${question.id}.`);
  }
  const weight = Number(question.scoring_weight ?? 1);
  return Number(match.score ?? 0) * weight;
}

function normalizeAnswerValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesSkipValues(answer, expected) {
  const normalized = normalizeAnswerValue(answer);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((item) => normalizeAnswerValue(item) === normalized);
}

/** Returns true when a question should be skipped based on prior answers. */
function isQuestionSkipped(question, answerByQuestionId) {
  const logic = question.skip_logic;
  if (!logic || typeof logic !== "object") return false;

  const depId =
    logic.dependsOn ?? logic.depends_on ?? logic.question_id ?? logic.questionId;
  if (!depId) return false;

  const depAnswer = answerByQuestionId.get(String(depId));
  if (depAnswer == null || depAnswer === "") return true;

  if (logic.showWhen != null || logic.show_when != null) {
    return !matchesSkipValues(depAnswer, logic.showWhen ?? logic.show_when);
  }
  if (logic.hideWhen != null || logic.hide_when != null) {
    return matchesSkipValues(depAnswer, logic.hideWhen ?? logic.hide_when);
  }
  if (logic.requiredAnswer != null || logic.required_answer != null) {
    return !matchesSkipValues(depAnswer, logic.requiredAnswer ?? logic.required_answer);
  }

  return false;
}

async function buildResultPayload(record) {
  const condition = record.conditions
    ? mapCondition(record.conditions)
    : record.test_type
      ? { slug: record.test_type, name: record.test_type }
      : null;

  const guidance = record.condition_id
    ? await prisma.screening_risk_guidance.findUnique({
        where: {
          condition_id_risk_level: {
            condition_id: record.condition_id,
            risk_level: record.risk_level,
          },
        },
      })
    : null;

  const answerRows = [...(record.answers ?? [])].sort(
    (a, b) => (a.questions?.sort_order ?? 0) - (b.questions?.sort_order ?? 0)
  );
  const answers = answerRows.map((a) => ({
    questionId: a.question_id,
    questionText: a.questions?.question_text ?? null,
    sectionTitle: a.questions?.section_title ?? null,
    answerValue: a.answer_value,
    score: a.score != null ? Number(a.score) : null,
  }));

  const recommendations = record.recommendations
    ?? guidance?.recommendations
    ?? [];

  return {
    id: record.id,
    patientId: record.patient_id,
    condition,
    assessmentType: record.assessment_type,
    age: record.age,
    gender: record.gender,
    score: record.score != null ? Number(record.score) : null,
    riskLevel: mapRiskDisplay(record.risk_level),
    risk_level: record.risk_level,
    status: record.status,
    explanation: record.explanation ?? guidance?.explanation ?? guidance?.description ?? null,
    title: guidance?.title ?? null,
    description: guidance?.description ?? null,
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    answers,
    testDate: record.test_date,
    assignedDoctorId: record.assigned_doctor_id,
    flagged: Boolean(record.flagged),
    followUpDate: record.follow_up_date,
  };
}

async function submitScreening(payload, userContext = null) {
  const conditionKey =
    payload.conditionId ?? payload.condition_id ?? payload.condition ?? payload.test_type;
  if (!conditionKey) throw new HttpError(400, "conditionId is required.");

  const condition = await resolveCondition(conditionKey);
  if (!condition) throw new HttpError(404, "Condition not found.");

  const rawAnswers = payload.answers;
  if (!rawAnswers) throw new HttpError(400, "answers are required.");

  const answerList = Array.isArray(rawAnswers)
    ? rawAnswers.map((a) => ({
        questionId: a.questionId ?? a.question_id,
        value: a.value ?? a.answer_value ?? a.answer,
      }))
    : Object.entries(rawAnswers).map(([questionId, value]) => ({ questionId, value }));

  if (answerList.length === 0) {
    throw new HttpError(400, "At least one answer is required.");
  }

  const questions = await prisma.screening_questions.findMany({
    where: { condition_id: condition.id },
    orderBy: { sort_order: "asc" },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const answerByQuestionId = new Map(
    answerList.map((a) => [String(a.questionId), a.value]),
  );

  const skippedIds = new Set(
    questions
      .filter((q) => isQuestionSkipped(q, answerByQuestionId))
      .map((q) => q.id),
  );

  const requiredIds = questions
    .filter((q) => q.is_required && !skippedIds.has(q.id))
    .map((q) => q.id);
  const answeredIds = new Set(answerList.map((a) => String(a.questionId)));
  const missing = requiredIds.filter((id) => !answeredIds.has(id));
  if (missing.length > 0) {
    throw new HttpError(400, "All required questions must be answered.");
  }

  let totalScore = 0;
  const scoredAnswers = [];

  for (const item of answerList) {
    const question = questionMap.get(String(item.questionId));
    if (!question) throw new HttpError(400, `Unknown question: ${item.questionId}`);
    if (skippedIds.has(question.id)) continue;
    const pts = scoreAnswer(question, item.value);
    totalScore += pts;
    scoredAnswers.push({ question, value: String(item.value), pts });
  }

  const thresholds = {
    medium: condition.risk_threshold_medium ?? 20,
    high: condition.risk_threshold_high ?? 40,
  };
  const risk_level = toRiskKey(totalScore, thresholds);

  const guidance = await prisma.screening_risk_guidance.findUnique({
    where: {
      condition_id_risk_level: { condition_id: condition.id, risk_level },
    },
  });

  let patient_id = payload.patientId ?? payload.patient_id ?? null;
  if (!patient_id && userContext?.role === "PATIENT" && userContext.userId) {
    const patient = await prisma.patients.findFirst({
      where: { user_id: userContext.userId },
      select: { id: true },
    });
    patient_id = patient?.id ?? null;
  }
  if (patient_id) {
    const patient = await prisma.patients.findUnique({ where: { id: String(patient_id) } });
    if (!patient) throw new HttpError(404, "Patient not found.");
  }

  const assessment_type = String(
    payload.assessmentType ?? payload.assessment_type ?? payload.mode ?? "self"
  ).toLowerCase();

  const age = payload.age != null && payload.age !== "" ? Number(payload.age) : null;
  if (age != null && (Number.isNaN(age) || age < 1 || age > 120)) {
    throw new HttpError(400, "age must be between 1 and 120.");
  }

  const gender = payload.gender ? String(payload.gender).trim() : null;

  const record = await prisma.$transaction(async (tx) => {
    const screening = await tx.screening_tests.create({
      data: {
        patient_id: patient_id ? String(patient_id) : null,
        condition_id: condition.id,
        test_type: condition.slug,
        assessment_type,
        age,
        gender,
        score: totalScore,
        risk_level,
        status: "completed",
        flagged: risk_level === "HIGH",
        explanation: guidance?.explanation ?? guidance?.description ?? null,
        recommendations: guidance?.recommendations ?? [],
        test_date: new Date(),
      },
    });

    for (const ans of scoredAnswers) {
      await tx.screening_answers.create({
        data: {
          screening_id: screening.id,
          question_id: ans.question.id,
          answer_value: ans.value,
          score: ans.pts,
        },
      });
    }

    return tx.screening_tests.findUnique({
      where: { id: screening.id },
      include: {
        conditions: true,
        answers: { include: { questions: true } },
      },
    });
  });

  if (risk_level === "HIGH") {
    const { notifyHighRiskScreening } = require("./notification.service");
    const patientName = patient_id
      ? (await prisma.patients.findUnique({
          where: { id: patient_id },
          include: { users: { select: { name: true } } },
        }))?.users?.name
      : null;
    await notifyHighRiskScreening({
      screening: record,
      patientName,
      conditionName: condition.name,
    });
  }

  if (patient_id) {
    const patient = await prisma.patients.findUnique({
      where: { id: patient_id },
      include: { users: { select: { id: true, name: true, email: true } } },
    });
    if (patient?.users?.id) {
      const { notifyPatientScreeningResult } = require("./notification.service");
      await notifyPatientScreeningResult({
        patientUser: patient.users,
        conditionName: condition.name,
        riskLevel: risk_level,
        screeningId: record.id,
      });
    }
  }

  return buildResultPayload(record);
}

async function getResult(id, userContext = null) {
  const record = await prisma.screening_tests.findUnique({
    where: { id },
    include: {
      conditions: true,
      answers: { include: { questions: true } },
      patients: { select: { user_id: true } },
      assigned_doctor: { select: { user_id: true } },
    },
  });
  if (!record) throw new HttpError(404, "Screening result not found.");

  if (record.patient_id && userContext) {
    const role = String(userContext.role || "").toUpperCase();
    if (role === "ADMIN" || role === "STAFF") {
      // allowed
    } else if (role === "PATIENT") {
      const patient = await prisma.patients.findFirst({
        where: { user_id: userContext.userId },
        select: { id: true },
      });
      if (!patient || patient.id !== record.patient_id) {
        throw new HttpError(403, "You do not have access to this screening result.");
      }
    } else if (role === "DOCTOR") {
      const doctor = await prisma.doctors.findFirst({
        where: { user_id: userContext.userId },
        select: { id: true },
      });
      if (!doctor || record.assigned_doctor_id !== doctor.id) {
        throw new HttpError(403, "You do not have access to this screening result.");
      }
    } else {
      throw new HttpError(403, "You do not have access to this screening result.");
    }
  } else if (record.patient_id && !userContext) {
    throw new HttpError(403, "Authentication required to view this screening result.");
  }

  const payloadRecord = await prisma.screening_tests.findUnique({
    where: { id },
    include: {
      conditions: true,
      answers: { include: { questions: true } },
    },
  });
  return buildResultPayload(payloadRecord);
}

function buildAdminListWhere(filters = {}) {
  const where = { AND: [] };

  if (filters.riskLevel) {
    const level = String(filters.riskLevel).toUpperCase();
    const map = { HIGH: "HIGH", LOW: "LOW", MODERATE: "MEDIUM", MEDIUM: "MEDIUM" };
    where.AND.push({ risk_level: map[level] ?? level });
  }
  if (filters.condition) {
    where.AND.push({
      OR: [
        { test_type: { equals: String(filters.condition).toLowerCase(), mode: "insensitive" } },
        { conditions: { slug: { equals: String(filters.condition).toLowerCase(), mode: "insensitive" } } },
      ],
    });
  }
  if (filters.status) where.AND.push({ status: String(filters.status).toLowerCase() });
  if (filters.fromDate || filters.toDate) {
    const testDate = {};
    if (filters.fromDate) testDate.gte = new Date(filters.fromDate);
    if (filters.toDate) testDate.lte = new Date(filters.toDate);
    where.AND.push({ test_date: testDate });
  }
  if (filters.search) {
    const s = String(filters.search).trim();
    where.AND.push({
      OR: [
        { test_type: { contains: s, mode: "insensitive" } },
        { patients: { users: { name: { contains: s, mode: "insensitive" } } } },
        { patients: { users: { email: { contains: s, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.assignedDoctorId) {
    where.AND.push({ assigned_doctor_id: String(filters.assignedDoctorId) });
  }

  return where.AND.length > 0 ? where : {};
}

async function listAdminScreenings(filters = {}) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const pageSize = Math.min(100, parseInt(filters.pageSize) || 20);
  const where = buildAdminListWhere(filters);

  const orderBy = { test_date: "desc" };
  if (filters.sort === "score") orderBy.score = filters.order === "asc" ? "asc" : "desc";
  if (filters.sort === "risk") orderBy.risk_level = filters.order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    prisma.screening_tests.findMany({
      where,
      include: {
        conditions: true,
        patients: { include: { users: { select: { id: true, name: true, email: true } } } },
        assigned_doctor: { include: { users: { select: { name: true } } } },
      },
      orderBy: [orderBy, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.screening_tests.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patients?.users?.name ?? "Anonymous",
      patientEmail: r.patients?.users?.email ?? null,
      condition: r.conditions?.name ?? r.test_type,
      conditionSlug: r.conditions?.slug ?? r.test_type,
      score: r.score != null ? Number(r.score) : null,
      riskLevel: mapRiskDisplay(r.risk_level),
      risk_level: r.risk_level,
      assessmentType: r.assessment_type,
      age: r.age,
      gender: r.gender,
      status: r.status,
      flagged: r.flagged,
      testDate: r.test_date,
      assignedDoctor: r.assigned_doctor?.users?.name ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

async function getAdminStats() {
  const [total, completed, pending, highRisk, byCondition, byRisk] = await Promise.all([
    prisma.screening_tests.count(),
    prisma.screening_tests.count({ where: { status: "completed" } }),
    prisma.screening_tests.count({ where: { status: "pending" } }),
    prisma.screening_tests.count({ where: { risk_level: "HIGH" } }),
    prisma.screening_tests.groupBy({
      by: ["test_type"],
      _count: { _all: true },
      orderBy: { _count: { test_type: "desc" } },
    }),
    prisma.screening_tests.groupBy({
      by: ["risk_level"],
      _count: { _all: true },
    }),
  ]);

  return {
    totalScreenings: total,
    completedScreenings: completed,
    pendingScreenings: pending,
    highRiskCount: highRisk,
    conditionDistribution: byCondition.map((c) => ({
      condition: c.test_type ?? "unknown",
      count: c._count._all,
    })),
    riskDistribution: byRisk.map((r) => ({
      riskLevel: mapRiskDisplay(r.risk_level),
      count: r._count._all,
    })),
  };
}

async function getAdminAnalytics() {
  const rows = await prisma.screening_tests.findMany({
    select: {
      test_date: true,
      test_type: true,
      risk_level: true,
      score: true,
    },
    orderBy: { test_date: "asc" },
  });

  const trendsMap = new Map();
  const conditionScores = new Map();

  for (const row of rows) {
    const dateKey = row.test_date
      ? row.test_date.toISOString().slice(0, 10)
      : "unknown";
    if (!trendsMap.has(dateKey)) {
      trendsMap.set(dateKey, { date: dateKey, count: 0, highRisk: 0 });
    }
    const t = trendsMap.get(dateKey);
    t.count += 1;
    if (row.risk_level === "HIGH") t.highRisk += 1;

    const cond = row.test_type ?? "unknown";
    if (!conditionScores.has(cond)) {
      conditionScores.set(cond, { total: 0, count: 0 });
    }
    const cs = conditionScores.get(cond);
    cs.total += row.score != null ? Number(row.score) : 0;
    cs.count += 1;
  }

  return {
    trends: Array.from(trendsMap.values()),
    averageScoreByCondition: Array.from(conditionScores.entries()).map(([condition, v]) => ({
      condition,
      averageScore: v.count ? Number((v.total / v.count).toFixed(2)) : 0,
      count: v.count,
    })),
    riskTrend: rows.reduce(
      (acc, r) => {
        const key = mapRiskDisplay(r.risk_level) ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    ),
  };
}

async function getAdminDetail(id) {
  const record = await prisma.screening_tests.findUnique({
    where: { id },
    include: {
      conditions: true,
      patients: { include: { users: { select: { id: true, name: true, email: true } } } },
      assigned_doctor: { include: { users: { select: { id: true, name: true, email: true } } } },
      answers: { include: { questions: true } },
    },
  });
  if (!record) throw new HttpError(404, "Screening not found.");

  const result = await buildResultPayload(record);
  return {
    ...result,
    patient: record.patients
      ? {
          id: record.patients.id,
          name: record.patients.users?.name,
          email: record.patients.users?.email,
          age: record.patients.age ?? record.age,
          gender: record.patients.gender ?? record.gender,
        }
      : { id: null, name: "Anonymous", email: null, age: record.age, gender: record.gender },
    assignedDoctor: record.assigned_doctor
      ? {
          id: record.assigned_doctor.id,
          name: record.assigned_doctor.users?.name,
          email: record.assigned_doctor.users?.email,
        }
      : null,
    scoringBreakdown: record.answers.map((a) => ({
      questionId: a.question_id,
      questionText: a.questions?.question_text,
      sectionTitle: a.questions?.section_title,
      answerValue: a.answer_value,
      score: a.score != null ? Number(a.score) : 0,
      weight: a.questions?.scoring_weight != null ? Number(a.questions.scoring_weight) : 1,
    })),
  };
}

async function assignDoctor({ screeningId, doctorId, flagPatient, followUpDate, status }) {
  const screening = await prisma.screening_tests.findUnique({ where: { id: screeningId } });
  if (!screening) throw new HttpError(404, "Screening not found.");

  const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new HttpError(404, "Doctor not found.");

  const updated = await prisma.screening_tests.update({
    where: { id: screeningId },
    data: {
      assigned_doctor_id: doctorId,
      flagged: flagPatient !== undefined ? Boolean(flagPatient) : screening.flagged,
      follow_up_date: followUpDate ? new Date(followUpDate) : screening.follow_up_date,
      status: status ?? screening.status ?? "completed",
    },
    include: {
      conditions: true,
      assigned_doctor: { include: { users: true } },
      patients: { include: { users: true } },
    },
  });

  if (screening.patient_id) {
    await prisma.doctor_patient.upsert({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: screening.patient_id,
        },
      },
      update: {},
      create: { doctor_id: doctorId, patient_id: screening.patient_id },
    });
  }

  if (updated.patients?.users?.id) {
    const { notifyPatientDoctorAssigned } = require("./notification.service");
    await notifyPatientDoctorAssigned({
      patientUser: updated.patients.users,
      doctorName: updated.assigned_doctor?.users?.name ?? "Your doctor",
      context: "screening",
    });
  }

  return {
    id: updated.id,
    assignedDoctorId: updated.assigned_doctor_id,
    assignedDoctorName: updated.assigned_doctor?.users?.name ?? null,
    flagged: updated.flagged,
    followUpDate: updated.follow_up_date,
    status: updated.status,
  };
}

async function getMyHistory(userId) {
  const patient = await prisma.patients.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!patient) return [];

  const rows = await prisma.screening_tests.findMany({
    where: { patient_id: patient.id },
    include: { conditions: true },
    orderBy: [{ test_date: "desc" }, { id: "desc" }],
    take: 20,
  });

  return rows.map((r) => ({
    id: r.id,
    condition: r.conditions?.name ?? r.test_type,
    score: r.score != null ? Number(r.score) : null,
    riskLevel: mapRiskDisplay(r.risk_level),
    assessmentType: r.assessment_type,
    testDate: r.test_date,
    status: r.status,
    flagged: Boolean(r.flagged),
    followUpDate: r.follow_up_date ? new Date(r.follow_up_date).toISOString().slice(0, 10) : null,
  }));
}

async function deleteScreening(id) {
  try {
    await prisma.screening_tests.delete({ where: { id } });
  } catch (err) {
    if (err?.code === "P2025") throw new HttpError(404, "Screening result not found.");
    throw err;
  }
}

async function listDoctorAssignments(userId, filters = {}) {
  const doctor = await prisma.doctors.findFirst({
    where: { user_id: String(userId) },
    select: { id: true },
  });
  if (!doctor) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }
  return listAdminScreenings({
    ...filters,
    assignedDoctorId: doctor.id,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
  });
}

module.exports = {
  HttpError,
  getIntroConfig,
  getConditions,
  getQuestions,
  submitScreening,
  getResult,
  listAdminScreenings,
  getAdminStats,
  getAdminAnalytics,
  getAdminDetail,
  assignDoctor,
  getMyHistory,
  deleteScreening,
  listDoctorAssignments,
};
