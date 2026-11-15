"use strict";

const prisma = require("../lib/prisma");
const { findServiceByIdOrSlug } = require("./rehabAssignment.service");
const { analyzeClinicalProfile, generateRecoveryJourney } = require("./decisionSupport.service");
const { rankDoctors, applyGenderPreferenceRanking } = require("./doctorRanking.service");

const DOCTOR_INCLUDE = {
  users: { select: { id: true, name: true, email: true, is_active: true } },
  doctor_service: {
    include: {
      rehabilitation_services: { select: { id: true, slug: true, title: true } },
    },
  },
};

const FACTOR_LABELS = {
  specialization_match: "Specialization matches your clinical needs",
  qualification_match: "Qualifications align with your condition",
  service_match: "Offers relevant rehabilitation services",
  success_rate: "Strong patient success rate",
  rating: "Highly rated by patients",
  experience: "Extensive clinical experience",
  workload_adjusted: "Availability adjusted for current caseload",
  gender_preference_match: "Matches your preferred doctor gender",
  gender_fallback: "Recommended as the best clinical match for your condition",
};

function mapDoctorSummary(d) {
  return {
    id: d.id,
    name: d.users?.name ?? "",
    email: d.users?.email ?? "",
    specialization: d.specialization ?? "",
    qualification: d.qualification ?? "",
    experience: d.experience_years ?? 0,
    successRate: d.success_rate ? Number(d.success_rate) : 0,
    patientsTreated: d.patients_treated ?? 0,
    rating: d.rating ? Number(d.rating) : null,
    availability: d.availability ?? "UNAVAILABLE",
    imageUrl: d.image_url ?? null,
    gender: d.gender ?? null,
    services: (d.doctor_service ?? []).map((ds) => ({
      id: ds.rehabilitation_services?.id ?? ds.service_id,
      slug: ds.rehabilitation_services?.slug ?? "",
      title: ds.rehabilitation_services?.title ?? "",
    })),
  };
}

function mapRecommendation(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    score: row.score ?? 0,
    reason: row.reason ?? "",
    createdAt: row.created_at,
    doctor: row.doctors ? mapDoctorSummary(row.doctors) : null,
  };
}

function mapAnalysis(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    symptoms: row.symptoms,
    detectedIssue: row.detected_issue,
    medicalHistorySummary: row.medical_history_summary ?? null,
    confidenceScore: row.confidence_score,
    selectedDoctorId: row.selected_doctor_id ?? null,
    selectedDoctor: row.selected_doctor ? mapDoctorSummary(row.selected_doctor) : null,
    createdAt: row.created_at,
  };
}

/**
 * Build prisma.ai_analysis.create() payload using only fields defined on ai_analysis.
 * Schema fields: patient_id, symptoms, detected_issue, medical_history_summary?,
 * confidence_score, selected_doctor_id? (recovery_progress is NOT on this model).
 */
function buildAssessmentDataSnapshot(opts) {
  const snapshot = {};

  if (opts.symptoms != null && String(opts.symptoms).trim()) {
    snapshot.symptoms = opts.symptoms;
  }
  if (opts.medicalHistory != null && String(opts.medicalHistory).trim()) {
    snapshot.medicalHistory = opts.medicalHistory;
  }

  const meds = opts.currentMedications ?? opts.medications;
  if (meds != null && String(meds).trim()) {
    snapshot.currentMedications = meds;
  }
  if (opts.allergies != null && String(opts.allergies).trim()) {
    snapshot.allergies = opts.allergies;
  }
  if (opts.consultationMode != null && String(opts.consultationMode).trim()) {
    snapshot.consultationMode = opts.consultationMode;
  }
  if (opts.preferredDoctorGender != null && String(opts.preferredDoctorGender).trim()) {
    snapshot.preferredDoctorGender = opts.preferredDoctorGender;
  }
  if (opts.preferredLanguage != null && String(opts.preferredLanguage).trim()) {
    snapshot.preferredLanguage = opts.preferredLanguage;
  }
  if (opts.location != null && String(opts.location).trim()) {
    snapshot.location = opts.location;
  }
  if (opts.age != null) snapshot.age = Number(opts.age);
  if (opts.gender != null && String(opts.gender).trim()) {
    snapshot.gender = opts.gender;
  }

  return Object.keys(snapshot).length ? snapshot : null;
}

function parseSymptomsBlob(symptomsText) {
  const text = String(symptomsText ?? "");
  if (!text.trim()) {
    return {
      symptoms: null,
      medicalHistory: null,
      medications: null,
      allergies: null,
      consultationMode: null,
    };
  }

  const extract = (label) => {
    const re = new RegExp(`${label}:\\s*([^\\.]+(?:\\.\\s+[^A-Z][^\\.]+)*)`, "i");
    const match = text.match(re);
    return match ? match[1].trim() : null;
  };

  const labeledPrefixes = [
    "Medical history:",
    "Current medications:",
    "Allergies:",
    "Location:",
    "Preferred consultation:",
    "Preferred doctor gender:",
    "Preferred language:",
  ];

  let symptoms = text;
  for (const prefix of labeledPrefixes) {
    const index = symptoms.indexOf(prefix);
    if (index > 0) {
      symptoms = symptoms.slice(0, index).trim().replace(/\.\s*$/, "");
      break;
    }
    if (index === 0) {
      symptoms = null;
      break;
    }
  }

  return {
    symptoms: symptoms || null,
    medicalHistory: extract("Medical history"),
    medications: extract("Current medications"),
    allergies: extract("Allergies"),
    consultationMode: extract("Preferred consultation"),
  };
}

function resolveAssessmentPatientAge(analysisRow, patientRow) {
  const stored = readAssessmentData(analysisRow);
  if (stored.age != null && !Number.isNaN(Number(stored.age))) {
    return Number(stored.age);
  }
  return patientRow?.age ?? null;
}

function resolveAssessmentPatientGender(analysisRow, patientRow) {
  const stored = readAssessmentData(analysisRow);
  if (stored.gender != null && String(stored.gender).trim()) {
    return stored.gender;
  }
  return patientRow?.gender ?? null;
}

function deriveSeverityFromConfidence(score) {
  const value = Number(score ?? 0);
  if (value >= 0.8) return "HIGH";
  if (value >= 0.65) return "MEDIUM";
  return "LOW";
}

function readAssessmentData(analysisRow) {
  return analysisRow?.assessment_data && typeof analysisRow.assessment_data === "object"
    ? analysisRow.assessment_data
    : {};
}

function mapAssessmentClinicalExtras(analysisRow) {
  const stored = readAssessmentData(analysisRow);

  return {
    severityLevel: stored.severityLevel ?? deriveSeverityFromConfidence(analysisRow?.confidence_score),
    urgentFlag: Boolean(stored.urgentFlag),
    analysisSource: stored.analysisSource ?? "dss",
    location: stored.location ?? null,
    preferredLanguage: stored.preferredLanguage ?? null,
    preferredDoctorGender: stored.preferredDoctorGender ?? null,
    estimatedDuration: stored.estimatedDuration ?? null,
    symptomCount: stored.symptomCount ?? null,
    recoveryJourney: stored.recoveryJourney ?? null,
    confidenceScore: analysisRow?.confidence_score ?? null,
  };
}

function mapAssessmentDetails(analysisRow, patientRow) {
  const stored = readAssessmentData(analysisRow);
  const parsed = parseSymptomsBlob(analysisRow?.symptoms);
  const clinical = mapAssessmentClinicalExtras(analysisRow);

  return {
    condition:
      analysisRow?.detected_issue
      ?? patientRow?.condition
      ?? null,
    symptoms:
      stored.symptoms
      ?? parsed.symptoms
      ?? analysisRow?.symptoms
      ?? null,
    medicalHistory:
      stored.medicalHistory
      ?? analysisRow?.medical_history_summary
      ?? parsed.medicalHistory
      ?? null,
    currentMedications:
      stored.currentMedications
      ?? stored.medications
      ?? parsed.medications
      ?? null,
    allergies: stored.allergies ?? parsed.allergies ?? null,
    consultationPreference: stored.consultationMode ?? parsed.consultationMode ?? null,
    ...clinical,
  };
}

function buildAiAnalysisCreateData({
  patientId,
  symptomsText,
  conditionType,
  medicalHistory,
  confidenceScore,
  assessmentData,
}) {
  const data = {
    patient_id: String(patientId),
    symptoms: String(symptomsText ?? ""),
    detected_issue: String(conditionType ?? "General Rehabilitation"),
    confidence_score: Number(confidenceScore ?? 0),
  };

  const historySummary = medicalHistory != null ? String(medicalHistory).trim() : "";
  if (historySummary) {
    data.medical_history_summary = historySummary;
  }

  if (assessmentData) {
    data.assessment_data = assessmentData;
  }

  return data;
}

/**
 * Build prisma.recommendation_log.create() payload using only defined fields.
 */
function buildRecommendationLogCreateData({
  patientId,
  doctorId,
  analysisId,
  score,
  reason,
}) {
  const data = {
    patient_id: String(patientId),
    doctor_id: String(doctorId),
    score: Number(score ?? 0),
    reason: String(reason ?? ""),
  };

  if (analysisId) {
    data.analysis_id = String(analysisId);
  }

  return data;
}

function mapAppointmentStatus(status) {
  const value = String(status ?? "").toUpperCase();
  if (value === "BOOKED") return "Booked";
  if (value === "CONFIRMED") return "Confirmed";
  if (value === "COMPLETED") return "Completed";
  if (value === "CANCELLED") return "Cancelled";
  if (value === "MISSED") return "Missed";
  return "Pending";
}

function isUpcomingAppointmentStatus(status) {
  const value = String(status ?? "").toUpperCase();
  return value === "BOOKED" || value === "CONFIRMED";
}

function combineAppointmentDateTime(appointment) {
  if (!appointment?.appointment_date) return null;
  const date = new Date(appointment.appointment_date);
  if (appointment.appointment_time) {
    const time = new Date(appointment.appointment_time);
    date.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds(), 0);
  } else {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

function buildPatientAnalysisTimelineMap(analyses) {
  const timeline = new Map();
  for (const row of analyses) {
    if (!timeline.has(row.patient_id)) timeline.set(row.patient_id, []);
    timeline.get(row.patient_id).push(row);
  }
  for (const rows of timeline.values()) {
    rows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return timeline;
}

function buildPatientAppointmentsMap(appointments) {
  const grouped = new Map();
  for (const appointment of appointments) {
    if (!appointment.patient_id) continue;
    if (!grouped.has(appointment.patient_id)) grouped.set(appointment.patient_id, []);
    grouped.get(appointment.patient_id).push(appointment);
  }
  return grouped;
}

function resolveAssessmentAppointmentForLog(log, {
  directByAnalysis,
  patientAppointments,
  patientAnalysisTimeline,
}) {
  if (!log.analysis_id || !log.ai_analysis) return null;

  const direct = directByAnalysis.get(log.analysis_id);
  if (
    direct
    && String(direct.doctor_id) === String(log.doctor_id)
    && direct.status !== "CANCELLED"
  ) {
    return direct;
  }

  const assessmentAt = new Date(log.ai_analysis.created_at);
  const timeline = patientAnalysisTimeline.get(log.patient_id) ?? [];
  const currentIndex = timeline.findIndex((row) => row.id === log.analysis_id);
  const nextAssessmentAt = currentIndex >= 0 && timeline[currentIndex + 1]
    ? new Date(timeline[currentIndex + 1].created_at)
    : null;

  const candidates = (patientAppointments.get(log.patient_id) ?? [])
    .filter((appointment) => {
      if (String(appointment.doctor_id) !== String(log.doctor_id)) return false;
      if (appointment.status === "CANCELLED") return false;
      if (appointment.analysis_id && appointment.analysis_id !== log.analysis_id) return false;

      const appointmentAt = combineAppointmentDateTime(appointment);
      if (!appointmentAt) return false;
      if (appointmentAt.getTime() < assessmentAt.getTime()) return false;
      if (nextAssessmentAt && appointmentAt.getTime() >= nextAssessmentAt.getTime()) return false;
      return true;
    })
    .sort(
      (a, b) => combineAppointmentDateTime(a).getTime() - combineAppointmentDateTime(b).getTime(),
    );

  return candidates[0] ?? null;
}

async function resolveAnalysisIdForBooking(patientId, doctorId, explicitAnalysisId) {
  if (explicitAnalysisId) return String(explicitAnalysisId);

  const latestLog = await prisma.recommendation_log.findFirst({
    where: {
      patient_id: String(patientId),
      doctor_id: String(doctorId),
      analysis_id: { not: null },
    },
    orderBy: { created_at: "desc" },
    select: { analysis_id: true },
  });

  return latestLog?.analysis_id ?? null;
}

function resolveAssessmentAppointmentForAnalysis(analysisRow, recommendations, resolverContext) {
  const direct = resolverContext.directByAnalysis.get(analysisRow.id);
  if (direct && direct.status !== "CANCELLED") return direct;

  const doctorIds = new Set(
    recommendations.map((entry) => entry.doctorId ?? entry.doctor_id).filter(Boolean),
  );
  if (analysisRow.selected_doctor_id) doctorIds.add(analysisRow.selected_doctor_id);

  for (const doctorId of doctorIds) {
    const appointment = resolveAssessmentAppointmentForLog({
      analysis_id: analysisRow.id,
      patient_id: analysisRow.patient_id,
      doctor_id: doctorId,
      ai_analysis: analysisRow,
    }, resolverContext);
    if (appointment) return appointment;
  }

  return null;
}

function resolveJourneyContextForAnalysis({
  analysisRow,
  analysis,
  recommendations,
  resolverContext,
  therapyPlans,
  completedSessionCount,
  isLatestAssessment = false,
}) {
  const doctorIds = recommendations.map((entry) => entry.doctorId).filter(Boolean);
  const selectedId = analysis.selectedDoctorId ?? null;
  const appointment = resolveAssessmentAppointmentForAnalysis(
    analysisRow,
    recommendations,
    resolverContext,
  );

  const resolvedSelectedId = selectedId ?? appointment?.doctor_id ?? null;
  const selectedDoctor =
    analysis.selectedDoctor
    ?? recommendations.find((entry) => entry.doctorId === resolvedSelectedId)?.doctor
    ?? null;

  const activePlan = resolvedSelectedId
    ? therapyPlans.find((plan) => plan.status === "ACTIVE" && plan.doctor_id === resolvedSelectedId)
    : null;

  const hasProgress = Boolean(
    isLatestAssessment
    && completedSessionCount > 0
    && resolvedSelectedId
    && activePlan,
  );

  let status = "Assessment Complete";
  if (resolvedSelectedId && !appointment) status = "Doctor Selected";
  if (appointment) {
    const mapped = mapAppointmentStatus(appointment.status);
    if (mapped === "Completed") status = "Appointment completed";
    else if (mapped === "Missed") status = "Appointment missed";
    else if (mapped === "Booked" || mapped === "Confirmed") status = "Appointment Booked";
    else status = `Appointment ${mapped}`;
  }
  if (isLatestAssessment && activePlan) status = "Treatment Started";
  if (hasProgress) status = "Progress Updated";

  return {
    status,
    selectedDoctorId: resolvedSelectedId,
    selectedDoctor,
    appointmentStatus: appointment ? mapAppointmentStatus(appointment.status) : "Not booked",
    appointmentDate: appointment?.appointment_date ?? null,
    hasActiveTreatment: Boolean(isLatestAssessment && activePlan),
    hasProgress,
  };
}

function resolveJourneyContext({
  analysis,
  recommendations,
  appointments,
  therapyPlans,
  completedSessionCount,
}) {
  const doctorIds = recommendations.map((r) => r.doctorId).filter(Boolean);
  const selectedId = analysis.selectedDoctorId ?? null;

  const appointment = appointments.find((a) => {
    if (!a.doctor_id || a.status === "CANCELLED") return false;
    if (selectedId) return a.doctor_id === selectedId;
    return doctorIds.includes(a.doctor_id);
  });

  const activePlan = therapyPlans.find((p) => {
    if (p.status !== "ACTIVE") return false;
    if (selectedId) return p.doctor_id === selectedId;
    return doctorIds.includes(p.doctor_id);
  });

  const resolvedSelectedId = selectedId ?? appointment?.doctor_id ?? null;
  const selectedDoctor =
    analysis.selectedDoctor
    ?? recommendations.find((r) => r.doctorId === resolvedSelectedId)?.doctor
    ?? null;

  let status = "Assessment Complete";
  if (resolvedSelectedId) status = "Doctor Selected";
  if (appointment) status = "Appointment Booked";
  if (activePlan) status = "Treatment Started";
  if (completedSessionCount > 0) status = "Progress Updated";

  return {
    status,
    selectedDoctorId: resolvedSelectedId,
    selectedDoctor,
    appointmentStatus: appointment ? mapAppointmentStatus(appointment.status) : "Not booked",
    appointmentDate: appointment?.appointment_date ?? null,
    hasActiveTreatment: Boolean(activePlan),
    hasProgress: completedSessionCount > 0,
  };
}

function buildProgressTimeline(journey) {
  const bookedStatuses = new Set(["Booked", "Confirmed", "Completed", "Missed"]);

  return [
    { step: "Assessment", key: "assessment", completed: true },
    {
      step: "Doctor Selected",
      key: "doctor_selected",
      completed: Boolean(journey.selectedDoctorId),
    },
    {
      step: "Appointment Booked",
      key: "appointment_booked",
      completed: bookedStatuses.has(journey.appointmentStatus),
    },
    {
      step: "Treatment Started",
      key: "treatment_started",
      completed: journey.hasActiveTreatment || journey.hasProgress,
    },
    {
      step: "Progress Updated",
      key: "progress_updated",
      completed: journey.hasProgress,
    },
  ];
}

function mapDashboardAnalysisBundle(analysisRow, recommendations, context) {
  const analysis = mapAnalysis(analysisRow);
  const assessmentDisplay = mapAssessmentDetails(analysisRow, null);
  const journey = context.resolverContext
    ? resolveJourneyContextForAnalysis({
      analysisRow,
      analysis,
      recommendations,
      resolverContext: context.resolverContext,
      therapyPlans: context.therapyPlans,
      completedSessionCount: context.completedSessionCount,
      isLatestAssessment: Boolean(context.isLatestAssessment),
    })
    : resolveJourneyContext({
      analysis,
      recommendations,
      appointments: context.appointments,
      therapyPlans: context.therapyPlans,
      completedSessionCount: context.completedSessionCount,
    });

  return {
    analysis: {
      ...analysis,
      symptomsDisplay: assessmentDisplay.symptoms ?? analysis.symptoms,
      medicalHistoryDisplay:
        assessmentDisplay.medicalHistory ?? analysis.medicalHistorySummary,
    },
    recommendations,
    recommendedDoctorsCount: recommendations.length,
    journey,
    timeline: buildProgressTimeline(journey),
    recoveryJourney: Array.isArray(analysisRow?.assessment_data?.recoveryJourney)
      ? analysisRow.assessment_data.recoveryJourney
      : [],
    estimatedDuration: analysisRow?.assessment_data?.estimatedDuration ?? null,
  };
}

async function resolvePatientForUser(userId) {
  if (!userId) return null;

  const user = await prisma.users.findUnique({
    where: { id: String(userId) },
    select: { role: true },
  });

  if (user?.role === "FAMILY") {
    const link = await prisma.family_members.findUnique({
      where: { user_id: String(userId) },
      select: { patient_id: true },
    });
    if (!link) return null;
    return loadPatientById(link.patient_id);
  }

  return prisma.patients.findUnique({
    where: { user_id: String(userId) },
    include: {
      users: { select: { name: true } },
      patient_services: {
        include: { rehabilitation_services: { select: { id: true, slug: true, title: true } } },
      },
      screening_tests: {
        orderBy: { test_date: "desc" },
        take: 3,
      },
    },
  });
}

async function loadPatientById(patientId) {
  return prisma.patients.findUnique({
    where: { id: String(patientId) },
    include: {
      users: { select: { name: true } },
      patient_services: {
        include: { rehabilitation_services: { select: { id: true, slug: true, title: true } } },
      },
      screening_tests: {
        orderBy: { test_date: "desc" },
        take: 3,
      },
    },
  });
}

async function loadDoctorsForRecommendation({ serviceId, serviceSlug }) {
  const service = await findServiceByIdOrSlug({ serviceId, serviceSlug });

  if (service) {
    const doctors = await prisma.doctors.findMany({
      where: {
        is_approved: true,
        users: { is_active: true },
        doctor_service: { some: { service_id: String(service.id) } },
      },
      include: DOCTOR_INCLUDE,
      orderBy: { users: { name: "asc" } },
    });
    return { service, doctors };
  }

  const doctors = await prisma.doctors.findMany({
    where: {
      is_approved: true,
      users: { is_active: true },
    },
    include: DOCTOR_INCLUDE,
    orderBy: { users: { name: "asc" } },
  });

  return { service: null, doctors };
}

function buildSymptomsBlob(opts) {
  const parts = [
    opts.symptoms,
    opts.medicalHistory && `Medical history: ${opts.medicalHistory}`,
    opts.currentMedications && `Current medications: ${opts.currentMedications}`,
    opts.medications && `Current medications: ${opts.medications}`,
    opts.allergies && `Allergies: ${opts.allergies}`,
    opts.location && `Location: ${opts.location}`,
    opts.consultationMode && `Preferred consultation: ${opts.consultationMode}`,
    opts.preferredDoctorGender
      && opts.preferredDoctorGender !== "no_preference"
      && `Preferred doctor gender: ${opts.preferredDoctorGender}`,
    opts.preferredLanguage && `Preferred language: ${opts.preferredLanguage}`,
    opts.screeningNotes,
  ].filter(Boolean);

  return parts.join(". ");
}

function parseFactorsFromReason(reason) {
  const match = String(reason ?? "").match(/^Matched on:\s*(.+)$/i);
  if (!match) return [];
  return match[1].split(",").map((s) => s.trim()).filter(Boolean);
}

function buildRecommendationReason(item, ai) {
  if (item.genderFallbackNote) {
    const clinicalReasons = (item.factors ?? [])
      .filter((factor) => factor !== "gender_fallback")
      .map((factor) => FACTOR_LABELS[factor] ?? factor.replace(/_/g, " "))
      .filter(Boolean);
    const clinical = clinicalReasons.length ? ` ${clinicalReasons.join(". ")}.` : "";
    return `${item.genderFallbackNote}${clinical}`;
  }

  const factorText = (item.factors ?? [])
    .map((factor) => FACTOR_LABELS[factor] ?? factor.replace(/_/g, " "))
    .filter(Boolean);

  if (factorText.length) {
    return factorText.join(". ") + ".";
  }

  return ai.summary ?? `Recommended for ${ai.conditionType} based on your assessment.`;
}

function mapRankedRecommendation(item, ai, patientId = null) {
  return {
    id: null,
    patientId,
    doctorId: item.doctorId,
    score: item.matchScore,
    reason: buildRecommendationReason(item, ai),
    doctor: mapDoctorSummary(item.doctor),
    rankingFactors: item.factors,
  };
}

/**
 * Run AI analysis and doctor ranking from assessment input.
 * @param {object} opts
 */
async function runRecommendationPipeline(opts) {
  const {
    serviceId,
    serviceSlug,
    condition,
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    location,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    patientAge,
    patientGender,
    screeningNotes,
    limit = 5,
    serviceTitleOverride,
  } = opts;

  const { service, doctors } = await loadDoctorsForRecommendation({ serviceId, serviceSlug });

  if (!doctors.length) {
    const err = new Error(
      service
        ? "No approved doctors are assigned to this rehabilitation service"
        : "No approved doctors are available for recommendation",
    );
    err.status = 404;
    throw err;
  }

  const serviceTitle = serviceTitleOverride ?? service?.title ?? null;
  const resolvedCondition = condition ?? "Rehabilitation support";
  const symptomsBlob = buildSymptomsBlob({
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    location,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    screeningNotes,
  });

  const ai = analyzeClinicalProfile({
    condition: resolvedCondition,
    symptoms: symptomsBlob || undefined,
    serviceTitle,
    patientAge: patientAge ?? null,
    patientGender: patientGender ?? null,
    medicalHistory,
    allergies,
    medications: currentMedications ?? medications,
  });

  const ranked = await rankDoctors(doctors, {
    conditionType: ai.conditionType,
    serviceTitle: serviceTitle ?? undefined,
    serviceSlug: service?.slug,
  });

  const top = applyGenderPreferenceRanking(ranked, preferredDoctorGender, {
    conditionType: ai.conditionType,
    limit: Math.max(1, Math.min(limit, 10)),
  });

  const topDoctor = top[0]?.doctor ?? null;
  const recovery = generateRecoveryJourney({
    conditionType: ai.conditionType,
    severityLevel: ai.severityLevel,
    symptoms: symptomsBlob || undefined,
    medicalHistory,
    serviceTitle,
    doctorSpecialization: topDoctor?.specialization ?? null,
    medications: currentMedications ?? medications,
    allergies,
    pathwayKey: ai.pathwayKey,
    urgentFlag: ai.urgentFlag,
    condition: resolvedCondition,
    conditionLabel: ai.conditionLabel,
  });

  return {
    service,
    ai,
    top,
    symptomsText: symptomsBlob || resolvedCondition,
    recoveryJourney: recovery.recoveryJourney,
    estimatedDuration: recovery.estimatedDuration,
    recoveryJourneySource: recovery.source,
  };
}

/**
 * Public guest assessment — no patient record required.
 */
async function assessFromForm(opts) {
  const {
    age,
    gender,
    location,
    primaryCondition,
    condition,
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    serviceId,
    serviceSlug,
    limit = 5,
  } = opts;

  const { service, ai, top, recoveryJourney, estimatedDuration } = await runRecommendationPipeline({
    serviceId,
    serviceSlug,
    condition: primaryCondition ?? condition,
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    location,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    patientAge: age != null ? Number(age) : null,
    patientGender: gender ?? null,
    limit,
  });

  const severityConfidence = { HIGH: 0.85, MEDIUM: 0.7, LOW: 0.55 };
  const confidenceScore = severityConfidence[ai.severityLevel] ?? 0.7;

  return {
    patientId: null,
    patientName: null,
    service: service
      ? { id: service.id, slug: service.slug, title: service.title }
      : null,
    analysis: {
      ...ai,
      confidenceScore,
      persisted: null,
    },
    recommendations: top.map((item) => mapRankedRecommendation(item, ai, null)),
    total: top.length,
    recoveryJourney,
    estimatedDuration,
  };
}

/**
 * Generate and persist ranked doctor recommendations for a patient.
 */
async function generateRecommendations(opts) {
  const {
    patientId,
    serviceId,
    serviceSlug,
    condition,
    primaryCondition,
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    location,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    age,
    gender,
    limit = 5,
    persist = true,
  } = opts;

  const patient = await loadPatientById(patientId);
  if (!patient) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }

  const screeningNotes = (patient.screening_tests ?? [])
    .map((t) => `${t.test_type ?? "screening"}: risk ${t.risk_level ?? "—"}`)
    .join("; ");

  const serviceTitle =
    patient.patient_services?.rehabilitation_services?.title ?? null;

  const resolvedCondition =
    primaryCondition
    ?? condition
    ?? patient.condition
    ?? patient.patient_services?.rehabilitation_services?.title
    ?? "Rehabilitation support";

  const { service, ai, top, symptomsText, recoveryJourney, estimatedDuration } = await runRecommendationPipeline({
    serviceId,
    serviceSlug,
    condition: resolvedCondition,
    symptoms,
    medicalHistory,
    currentMedications,
    medications,
    allergies,
    location,
    consultationMode,
    preferredDoctorGender,
    preferredLanguage,
    patientAge: age != null ? Number(age) : patient.age,
    patientGender: gender ?? patient.gender,
    screeningNotes,
    limit,
    serviceTitleOverride: serviceTitle,
  });

  let saved = [];

  const severityConfidence = { HIGH: 0.85, MEDIUM: 0.7, LOW: 0.55 };
  const confidenceScore = severityConfidence[ai.severityLevel] ?? 0.7;

  let savedAnalysis = null;

  const assessmentData = {
    ...(buildAssessmentDataSnapshot({
      symptoms,
      medicalHistory,
      currentMedications,
      medications,
      allergies,
      consultationMode,
      preferredDoctorGender,
      preferredLanguage,
      location,
      age: age != null ? Number(age) : patient.age,
      gender: gender ?? patient.gender,
    }) ?? {}),
    recoveryJourney,
    estimatedDuration,
    analysisSource: ai.source ?? "dss",
    urgentFlag: Boolean(ai.urgentFlag),
    symptomCount: ai.symptomCount ?? 0,
    severityLevel: ai.severityLevel ?? null,
    conditionLabel: ai.conditionLabel ?? ai.conditionType ?? null,
  };

  if (persist) {
    saved = await prisma.$transaction(async (tx) => {
      savedAnalysis = await tx.ai_analysis.create({
        data: buildAiAnalysisCreateData({
          patientId: patient.id,
          symptomsText,
          conditionType: ai.conditionType,
          medicalHistory,
          confidenceScore,
          assessmentData,
        }),
      });

      const rows = [];
      for (const item of top) {
        const row = await tx.recommendation_log.create({
          data: buildRecommendationLogCreateData({
            patientId: patient.id,
            doctorId: item.doctorId,
            analysisId: savedAnalysis.id,
            score: item.matchScore,
            reason: buildRecommendationReason(item, ai),
          }),
          include: { doctors: { include: DOCTOR_INCLUDE } },
        });
        rows.push(row);
      }
      return rows;
    });
  }

  const recommendations = (persist ? saved : top).map((item, index) => {
    if (persist) {
      const ranked = top[index];
      return {
        ...mapRecommendation(item),
        rankingFactors: ranked?.factors ?? parseFactorsFromReason(item.reason),
      };
    }
    return mapRankedRecommendation(item, ai, patient.id);
  });

  return {
    patientId: patient.id,
    patientName: patient.users?.name ?? "Patient",
    service: service
      ? { id: service.id, slug: service.slug, title: service.title }
      : null,
    analysis: {
      ...ai,
      persisted: savedAnalysis ? mapAnalysis(savedAnalysis) : null,
    },
    recommendations,
    total: recommendations.length,
    recoveryJourney,
    estimatedDuration,
  };
}

async function listForPatient(patientId) {
  const latestAnalysis = await prisma.ai_analysis.findFirst({
    where: { patient_id: String(patientId) },
    orderBy: { created_at: "desc" },
    include: { selected_doctor: { include: DOCTOR_INCLUDE } },
  });

  const rows = latestAnalysis
    ? await prisma.recommendation_log.findMany({
      where: {
        patient_id: String(patientId),
        analysis_id: latestAnalysis.id,
      },
      orderBy: { score: "desc" },
      include: { doctors: { include: DOCTOR_INCLUDE } },
    })
    : await prisma.recommendation_log.findMany({
      where: { patient_id: String(patientId) },
      orderBy: { created_at: "desc" },
      take: 10,
      include: { doctors: { include: DOCTOR_INCLUDE } },
    });

  return {
    items: rows.map(mapRecommendation),
    analysis: latestAnalysis ? mapAnalysis(latestAnalysis) : null,
    total: rows.length,
  };
}

async function getPatientDashboard(patientId) {
  const pid = String(patientId);

  const [analyses, appointments, therapyPlans, completedSessionCount] = await Promise.all([
    prisma.ai_analysis.findMany({
      where: { patient_id: pid },
      orderBy: { created_at: "desc" },
      include: {
        selected_doctor: { include: DOCTOR_INCLUDE },
        recommendation_log: {
          orderBy: { score: "desc" },
          include: { doctors: { include: DOCTOR_INCLUDE } },
        },
      },
    }),
    prisma.appointments.findMany({
      where: { patient_id: pid },
      orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
    }),
    prisma.therapy_plans.findMany({
      where: { patient_id: pid },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_sessions.count({
      where: {
        status: "COMPLETED",
        therapy_plans: { patient_id: pid },
      },
    }),
  ]);

  const context = { appointments, therapyPlans, completedSessionCount };
  const analysisIds = analyses.map((row) => row.id);
  const linkedDirect = analysisIds.length
    ? await prisma.appointments.findMany({
      where: {
        analysis_id: { in: analysisIds },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
    })
    : [];

  const directByAnalysis = new Map();
  for (const appointment of linkedDirect) {
    if (!appointment.analysis_id) continue;
    if (!directByAnalysis.has(appointment.analysis_id)) {
      directByAnalysis.set(appointment.analysis_id, appointment);
    }
  }

  const resolverContext = {
    directByAnalysis,
    patientAppointments: buildPatientAppointmentsMap(appointments),
    patientAnalysisTimeline: buildPatientAnalysisTimelineMap(
      analyses.map((row) => ({
        id: row.id,
        patient_id: row.patient_id,
        created_at: row.created_at,
      })),
    ),
  };

  const history = analyses.map((row, index) => {
    const recommendations = (row.recommendation_log ?? []).map(mapRecommendation);
    const bundle = mapDashboardAnalysisBundle(row, recommendations, {
      ...context,
      resolverContext,
      isLatestAssessment: index === 0,
    });

    return {
      id: row.id,
      date: row.created_at,
      condition: bundle.analysis.detectedIssue,
      recommendedDoctorsCount: recommendations.length,
      selectedDoctor: bundle.journey.selectedDoctor,
      status: bundle.journey.status,
      appointmentStatus: bundle.journey.appointmentStatus,
    };
  });

  const current = analyses.length
    ? mapDashboardAnalysisBundle(
      analyses[0],
      (analyses[0].recommendation_log ?? []).map(mapRecommendation),
      {
        ...context,
        resolverContext,
        isLatestAssessment: true,
      },
    )
    : null;

  return {
    current,
    history,
    totalAssessments: history.length,
  };
}

async function getById(id) {
  const row = await prisma.recommendation_log.findUnique({
    where: { id: String(id) },
    include: {
      doctors: { include: DOCTOR_INCLUDE },
      patients: { include: { users: { select: { name: true } } } },
    },
  });

  if (!row) {
    const err = new Error("Recommendation not found");
    err.status = 404;
    throw err;
  }

  return {
    ...mapRecommendation(row),
    patientName: row.patients?.users?.name ?? "Patient",
  };
}

async function assertPatientAccess(req, patientId) {
  const role = req.user?.role;
  if (role === "ADMIN") return;
  if (role === "DOCTOR") return;

  if (role === "PATIENT" || role === "FAMILY") {
    const patient = await resolvePatientForUser(req.user.id);
    if (!patient || String(patient.id) !== String(patientId)) {
      const err = new Error("You do not have access to this patient's recommendations");
      err.status = 403;
      throw err;
    }
    return;
  }

  const err = new Error("Insufficient permissions");
  err.status = 403;
  throw err;
}

async function resolveDoctorForUser(userId) {
  if (!userId) return null;
  return prisma.doctors.findUnique({
    where: { user_id: String(userId) },
    select: { id: true },
  });
}

async function loadDoctorRecommendationLog(doctorId, recommendationId) {
  const row = await prisma.recommendation_log.findFirst({
    where: {
      id: String(recommendationId),
      doctor_id: String(doctorId),
    },
    include: {
      patients: {
        include: { users: { select: { name: true, email: true } } },
      },
      ai_analysis: true,
    },
  });

  if (!row) {
    const err = new Error("AI match not found");
    err.status = 404;
    throw err;
  }

  return row;
}

async function getDoctorAiMatches(doctorId) {
  const did = String(doctorId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logs = await prisma.recommendation_log.findMany({
    where: { doctor_id: did },
    orderBy: { created_at: "desc" },
    include: {
      patients: {
        include: { users: { select: { name: true } } },
      },
      ai_analysis: true,
    },
  });

  const analysisIds = [...new Set(logs.map((log) => log.analysis_id).filter(Boolean))];
  const patientIds = [...new Set(logs.map((log) => log.patient_id))];

  const [linkedAppointments, patientDoctorAppointments, patientAnalyses] = await Promise.all([
    analysisIds.length
      ? prisma.appointments.findMany({
        where: {
          analysis_id: { in: analysisIds },
          doctor_id: did,
          status: { not: "CANCELLED" },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
      })
      : [],
    patientIds.length
      ? prisma.appointments.findMany({
        where: {
          patient_id: { in: patientIds },
          doctor_id: did,
          status: { not: "CANCELLED" },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
      })
      : [],
    patientIds.length
      ? prisma.ai_analysis.findMany({
        where: { patient_id: { in: patientIds } },
        orderBy: { created_at: "asc" },
        select: { id: true, patient_id: true, created_at: true },
      })
      : [],
  ]);

  const appointmentByAnalysis = new Map();
  for (const appointment of linkedAppointments) {
    if (!appointment.analysis_id) continue;
    if (!appointmentByAnalysis.has(appointment.analysis_id)) {
      appointmentByAnalysis.set(appointment.analysis_id, appointment);
    }
  }

  const patientAppointments = buildPatientAppointmentsMap(patientDoctorAppointments);
  const patientAnalysisTimeline = buildPatientAnalysisTimelineMap(patientAnalyses);
  const resolverContext = {
    directByAnalysis: appointmentByAnalysis,
    patientAppointments,
    patientAnalysisTimeline,
  };

  const acceptedAnalysisIds = new Set();
  for (const log of logs) {
    const appointment = resolveAssessmentAppointmentForLog(log, resolverContext);
    const accepted =
      log.ai_analysis?.selected_doctor_id === did
      || Boolean(appointment);

    if (accepted && log.analysis_id) {
      acceptedAnalysisIds.add(log.analysis_id);
    }
  }

  const items = logs.map((log) => {
    const appointment = resolveAssessmentAppointmentForLog(log, resolverContext);
    const accepted =
      log.ai_analysis?.selected_doctor_id === did
      || Boolean(appointment);

    const clinical = mapAssessmentClinicalExtras(log.ai_analysis);

    return {
      recommendationId: log.id,
      patientId: log.patient_id,
      analysisId: log.analysis_id,
      patientName: log.patients?.users?.name ?? "Patient",
      age: resolveAssessmentPatientAge(log.ai_analysis, log.patients),
      gender: resolveAssessmentPatientGender(log.ai_analysis, log.patients),
      condition: log.ai_analysis?.detected_issue ?? log.patients?.condition ?? "—",
      matchScore: Math.round((log.score ?? 0) * 10) / 10,
      recommendationDate: log.created_at,
      reason: log.reason ?? "",
      appointmentStatus: appointment ? mapAppointmentStatus(appointment.status) : "Not booked",
      appointmentId: appointment?.id ?? null,
      appointmentDate: appointment?.appointment_date ?? null,
      accepted,
      severityLevel: clinical.severityLevel,
      urgentFlag: clinical.urgentFlag,
      analysisSource: clinical.analysisSource,
    };
  });

  const averageMatchScore = logs.length
    ? Math.round((logs.reduce((sum, log) => sum + (log.score ?? 0), 0) / logs.length) * 10) / 10
    : 0;

  const upcomingAppointments = items.filter((item) => {
    if (!item.appointmentId || item.appointmentStatus === "Not booked") return false;
    const status = String(item.appointmentStatus).toLowerCase();
    if (status !== "booked" && status !== "confirmed") return false;
    if (!item.appointmentDate) return false;
    const date = new Date(item.appointmentDate);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  }).length;

  return {
    summary: {
      totalRecommendations: logs.length,
      averageMatchScore,
      acceptedRecommendations: acceptedAnalysisIds.size,
      upcomingAppointments,
    },
    items,
  };
}

async function findDoctorMatchNotesRow({ doctorId, patientId, analysisId }) {
  const did = String(doctorId);
  const pid = String(patientId);
  const aid = String(analysisId);

  if (prisma.doctor_match_notes?.findUnique) {
    return prisma.doctor_match_notes.findUnique({
      where: {
        doctor_id_patient_id_analysis_id: {
          doctor_id: did,
          patient_id: pid,
          analysis_id: aid,
        },
      },
    });
  }

  const rows = await prisma.$queryRaw`
    SELECT id, assessment_notes, treatment_notes, progress_notes, updated_at
    FROM doctor_match_notes
    WHERE doctor_id = ${did}::uuid
      AND patient_id = ${pid}::uuid
      AND analysis_id = ${aid}::uuid
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function saveDoctorMatchNotesRow({
  doctorId,
  patientId,
  analysisId,
  assessmentNotes,
  treatmentNotes,
  progressNotes,
}) {
  const did = String(doctorId);
  const pid = String(patientId);
  const aid = String(analysisId);

  if (prisma.doctor_match_notes?.upsert) {
    const updateData = {};
    if (assessmentNotes !== undefined) updateData.assessment_notes = assessmentNotes;
    if (treatmentNotes !== undefined) updateData.treatment_notes = treatmentNotes;
    if (progressNotes !== undefined) updateData.progress_notes = progressNotes;

    return prisma.doctor_match_notes.upsert({
      where: {
        doctor_id_patient_id_analysis_id: {
          doctor_id: did,
          patient_id: pid,
          analysis_id: aid,
        },
      },
      create: {
        doctor_id: did,
        patient_id: pid,
        analysis_id: aid,
        assessment_notes: assessmentNotes ?? null,
        treatment_notes: treatmentNotes ?? null,
        progress_notes: progressNotes ?? null,
      },
      update: updateData,
    });
  }

  const existing = await findDoctorMatchNotesRow({
    doctorId: did,
    patientId: pid,
    analysisId: aid,
  });

  const nextAssessment = assessmentNotes !== undefined
    ? assessmentNotes
    : (existing?.assessment_notes ?? null);
  const nextTreatment = treatmentNotes !== undefined
    ? treatmentNotes
    : (existing?.treatment_notes ?? null);
  const nextProgress = progressNotes !== undefined
    ? progressNotes
    : (existing?.progress_notes ?? null);

  if (existing) {
    await prisma.$executeRaw`
      UPDATE doctor_match_notes
      SET
        assessment_notes = ${nextAssessment},
        treatment_notes = ${nextTreatment},
        progress_notes = ${nextProgress},
        updated_at = NOW()
      WHERE doctor_id = ${did}::uuid
        AND patient_id = ${pid}::uuid
        AND analysis_id = ${aid}::uuid
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO doctor_match_notes (
        doctor_id,
        patient_id,
        analysis_id,
        assessment_notes,
        treatment_notes,
        progress_notes,
        updated_at
      )
      VALUES (
        ${did}::uuid,
        ${pid}::uuid,
        ${aid}::uuid,
        ${nextAssessment},
        ${nextTreatment},
        ${nextProgress},
        NOW()
      )
    `;
  }

  return findDoctorMatchNotesRow({
    doctorId: did,
    patientId: pid,
    analysisId: aid,
  });
}

async function getDoctorMatchDetail(doctorId, recommendationId) {
  const log = await loadDoctorRecommendationLog(doctorId, recommendationId);
  const did = String(doctorId);

  const [directAppointment, patientDoctorAppointments, patientAnalyses] = await Promise.all([
    log.analysis_id
      ? prisma.appointments.findFirst({
        where: {
          analysis_id: log.analysis_id,
          doctor_id: did,
          status: { not: "CANCELLED" },
        },
        orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
      })
      : Promise.resolve(null),
    prisma.appointments.findMany({
      where: {
        patient_id: log.patient_id,
        doctor_id: did,
        status: { not: "CANCELLED" },
      },
      orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
    }),
    prisma.ai_analysis.findMany({
      where: { patient_id: log.patient_id },
      orderBy: { created_at: "asc" },
      select: { id: true, patient_id: true, created_at: true },
    }),
  ]);

  const directByAnalysis = new Map();
  if (directAppointment?.analysis_id) {
    directByAnalysis.set(directAppointment.analysis_id, directAppointment);
  }

  const appointment = resolveAssessmentAppointmentForLog(log, {
    directByAnalysis,
    patientAppointments: buildPatientAppointmentsMap(patientDoctorAppointments),
    patientAnalysisTimeline: buildPatientAnalysisTimelineMap(patientAnalyses),
  });

  const notes = log.analysis_id
    ? await findDoctorMatchNotesRow({
      doctorId,
      patientId: log.patient_id,
      analysisId: log.analysis_id,
    })
    : null;

  const accepted =
    log.ai_analysis?.selected_doctor_id === String(doctorId)
    || (appointment && appointment.status !== "CANCELLED");

  return {
    recommendationId: log.id,
    patientId: log.patient_id,
    analysisId: log.analysis_id,
    patientName: log.patients?.users?.name ?? "Patient",
    patientEmail: log.patients?.users?.email ?? null,
    age: resolveAssessmentPatientAge(log.ai_analysis, log.patients),
    gender: resolveAssessmentPatientGender(log.ai_analysis, log.patients),
    matchScore: Math.round((log.score ?? 0) * 10) / 10,
    recommendationDate: log.created_at,
    reason: log.reason ?? "",
    accepted,
    appointmentStatus: appointment ? mapAppointmentStatus(appointment.status) : "Not booked",
    appointmentId: appointment?.id ?? null,
    appointmentDate: appointment?.appointment_date ?? null,
    assessment: mapAssessmentDetails(log.ai_analysis, log.patients),
    notes: {
      assessmentNotes: notes?.assessment_notes ?? "",
      treatmentNotes: notes?.treatment_notes ?? "",
      progressNotes: notes?.progress_notes ?? "",
      updatedAt: notes?.updated_at ?? null,
    },
  };
}

async function upsertDoctorMatchNotes(doctorId, recommendationId, payload) {
  const log = await loadDoctorRecommendationLog(doctorId, recommendationId);

  if (!log.analysis_id) {
    const err = new Error("This recommendation has no linked assessment");
    err.status = 400;
    throw err;
  }

  const row = await saveDoctorMatchNotesRow({
    doctorId,
    patientId: log.patient_id,
    analysisId: log.analysis_id,
    assessmentNotes: payload.assessmentNotes !== undefined
      ? (payload.assessmentNotes || null)
      : undefined,
    treatmentNotes: payload.treatmentNotes !== undefined
      ? (payload.treatmentNotes || null)
      : undefined,
    progressNotes: payload.progressNotes !== undefined
      ? (payload.progressNotes || null)
      : undefined,
  });

  return {
    assessmentNotes: row.assessment_notes ?? "",
    treatmentNotes: row.treatment_notes ?? "",
    progressNotes: row.progress_notes ?? "",
    updatedAt: row.updated_at,
  };
}

function isConvertedAppointmentStatus(status) {
  const value = String(status ?? "").toUpperCase();
  return value === "BOOKED" || value === "CONFIRMED" || value === "COMPLETED";
}

function resolveAdminLogStatus(analysis, appointment) {
  if (appointment) {
    const mapped = mapAppointmentStatus(appointment.status);
    if (mapped === "Missed") return "Appointment missed";
    if (mapped === "Completed") return "Appointment completed";
    if (mapped === "Booked" || mapped === "Confirmed") return "Appointment booked";
    return mapped;
  }
  if (analysis?.selected_doctor_id) return "Doctor selected";
  return "Pending";
}

function resolveAdminSelectedDoctorName(analysisRow, appointmentDoctorId, doctorNameMap) {
  if (analysisRow.selected_doctor?.users?.name) {
    return analysisRow.selected_doctor.users.name;
  }
  if (appointmentDoctorId) {
    return doctorNameMap.get(appointmentDoctorId) ?? null;
  }
  return null;
}

function roundPct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

async function buildAdminAnalysisAppointmentIndex(allAnalyses, recDoctorsByAnalysis) {
  if (!allAnalyses.length) {
    return {
      analysisHasAppointment: new Set(),
      analysisHasConvertedAppointment: new Set(),
      analysisStatus: new Map(),
      analysisAppointmentDoctorIds: new Map(),
      analysisAppointments: new Map(),
    };
  }

  const analysisIds = allAnalyses.map((row) => row.id);
  const patientIds = [...new Set(allAnalyses.map((row) => row.patient_id))];

  const [linkedDirect, patientDoctorAppointments] = await Promise.all([
    prisma.appointments.findMany({
      where: {
        analysis_id: { in: analysisIds },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
    }),
    prisma.appointments.findMany({
      where: {
        patient_id: { in: patientIds },
        status: { not: "CANCELLED" },
      },
      orderBy: [{ appointment_date: "desc" }, { appointment_time: "desc" }],
    }),
  ]);

  const directByAnalysis = new Map();
  for (const appointment of linkedDirect) {
    if (!appointment.analysis_id) continue;
    if (!directByAnalysis.has(appointment.analysis_id)) {
      directByAnalysis.set(appointment.analysis_id, appointment);
    }
  }

  const resolverContext = {
    directByAnalysis,
    patientAppointments: buildPatientAppointmentsMap(patientDoctorAppointments),
    patientAnalysisTimeline: buildPatientAnalysisTimelineMap(allAnalyses),
  };

  const analysisHasAppointment = new Set();
  const analysisHasConvertedAppointment = new Set();
  const analysisStatus = new Map();
  const analysisAppointmentDoctorIds = new Map();
  const analysisAppointments = new Map();

  for (const analysis of allAnalyses) {
    let appointment = directByAnalysis.get(analysis.id) ?? null;

    if (!appointment) {
      const doctorIds = new Set(recDoctorsByAnalysis.get(analysis.id) ?? []);
      if (analysis.selected_doctor_id) doctorIds.add(analysis.selected_doctor_id);

      for (const doctorId of doctorIds) {
        appointment = resolveAssessmentAppointmentForLog({
          analysis_id: analysis.id,
          patient_id: analysis.patient_id,
          doctor_id: doctorId,
          ai_analysis: analysis,
        }, resolverContext);
        if (appointment) break;
      }
    }

    if (appointment) {
      analysisHasAppointment.add(analysis.id);
      analysisAppointments.set(analysis.id, appointment);
      if (isConvertedAppointmentStatus(appointment.status)) {
        analysisHasConvertedAppointment.add(analysis.id);
      }
      analysisStatus.set(analysis.id, resolveAdminLogStatus(analysis, appointment));
      if (appointment.doctor_id) {
        analysisAppointmentDoctorIds.set(analysis.id, appointment.doctor_id);
      }
    } else if (analysis.selected_doctor_id) {
      analysisStatus.set(analysis.id, "Doctor selected");
    } else {
      analysisStatus.set(analysis.id, "Pending");
    }
  }

  return {
    analysisHasAppointment,
    analysisHasConvertedAppointment,
    analysisStatus,
    analysisAppointmentDoctorIds,
    analysisAppointments,
  };
}

function buildAdminLogsWhere({
  search,
  condition,
  status,
  analysisIdsWithAppointments,
  analysisIdsWithConvertedAppointments,
}) {
  const where = {};

  if (search) {
    where.patients = {
      users: {
        name: { contains: String(search) },
      },
    };
  }

  if (condition && condition !== "all") {
    where.detected_issue = String(condition);
  }

  const convertedIds = analysisIdsWithConvertedAppointments?.length
    ? analysisIdsWithConvertedAppointments
    : [];
  const anyAppointmentIds = analysisIdsWithAppointments?.length
    ? analysisIdsWithAppointments
    : [];

  if (status === "doctor_selected") {
    where.selected_doctor_id = { not: null };
    if (convertedIds.length) {
      where.NOT = { id: { in: convertedIds } };
    }
  } else if (status === "pending") {
    where.selected_doctor_id = null;
    if (anyAppointmentIds.length) {
      where.NOT = { id: { in: anyAppointmentIds } };
    }
  } else if (status === "appointment_booked") {
    where.id = convertedIds.length
      ? { in: convertedIds }
      : { in: ["00000000-0000-0000-0000-000000000000"] };
  }

  return where;
}

async function getAdminRecommendationManagement(options = {}) {
  const search = String(options.search ?? "").trim();
  const condition = String(options.condition ?? "all");
  const status = String(options.status ?? "all");
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(options.pageSize) || 10));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalRecommendations,
    recommendationsThisMonth,
    totalPatients,
    distinctAiPatients,
    totalAssessments,
    topDoctorGroups,
    conditionGroups,
    logCountByAnalysis,
    recommendationLogsByAnalysis,
    allAnalysesMeta,
  ] = await Promise.all([
    prisma.recommendation_log.count(),
    prisma.recommendation_log.count({
      where: { created_at: { gte: monthStart } },
    }),
    prisma.patients.count(),
    prisma.ai_analysis.findMany({
      select: { patient_id: true },
      distinct: ["patient_id"],
    }),
    prisma.ai_analysis.count(),
    prisma.recommendation_log.groupBy({
      by: ["doctor_id"],
      _count: { id: true },
      _avg: { score: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.ai_analysis.groupBy({
      by: ["detected_issue"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.recommendation_log.groupBy({
      by: ["analysis_id"],
      _count: { id: true },
    }),
    prisma.recommendation_log.findMany({
      select: { analysis_id: true, doctor_id: true },
    }),
    prisma.ai_analysis.findMany({
      select: {
        id: true,
        patient_id: true,
        selected_doctor_id: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    }),
  ]);

  const activePatients = distinctAiPatients.length;
  const aiUsageRate = roundPct(activePatients, totalPatients);

  const doctorIds = topDoctorGroups.map((group) => group.doctor_id);
  const doctors = doctorIds.length
    ? await prisma.doctors.findMany({
      where: { id: { in: doctorIds } },
      include: { users: { select: { name: true } } },
    })
    : [];
  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));

  const topDoctors = topDoctorGroups.map((group) => {
    const doctor = doctorMap.get(group.doctor_id);
    return {
      doctorId: group.doctor_id,
      name: doctor?.users?.name ?? "Unknown",
      specialization: doctor?.specialization ?? "—",
      recommendationCount: group._count.id,
      averageMatchScore: Math.round((group._avg.score ?? 0) * 10) / 10,
    };
  });

  const logCountMap = new Map(
    logCountByAnalysis
      .filter((row) => row.analysis_id)
      .map((row) => [row.analysis_id, row._count.id]),
  );

  const recDoctorsByAnalysis = new Map();
  for (const log of recommendationLogsByAnalysis) {
    if (!log.analysis_id) continue;
    if (!recDoctorsByAnalysis.has(log.analysis_id)) {
      recDoctorsByAnalysis.set(log.analysis_id, new Set());
    }
    recDoctorsByAnalysis.get(log.analysis_id).add(log.doctor_id);
  }

  const {
    analysisHasAppointment,
    analysisHasConvertedAppointment,
    analysisStatus,
    analysisAppointmentDoctorIds,
  } = await buildAdminAnalysisAppointmentIndex(allAnalysesMeta, recDoctorsByAnalysis);

  const analysisIdsWithAppointments = [...analysisHasAppointment];
  const analysisIdsWithConvertedAppointments = [...analysisHasConvertedAppointment];
  const appointmentConversions = analysisHasConvertedAppointment.size;
  const engagedAssessments = allAnalysesMeta.filter(
    (row) => row.selected_doctor_id || analysisHasConvertedAppointment.has(row.id),
  ).length;

  const bookedDoctorIds = [
    ...new Set([...analysisAppointmentDoctorIds.values()].filter(Boolean)),
  ];
  const bookedDoctors = bookedDoctorIds.length
    ? await prisma.doctors.findMany({
      where: { id: { in: bookedDoctorIds } },
      select: { id: true, specialization: true },
    })
    : [];
  const bookedDoctorMap = new Map(
    bookedDoctors.map((doctor) => [doctor.id, doctor]),
  );

  const categorySuccess = new Map();
  for (const [analysisId, doctorId] of analysisAppointmentDoctorIds.entries()) {
    if (!analysisHasConvertedAppointment.has(analysisId)) continue;
    const doctor = bookedDoctorMap.get(doctorId);
    const category = doctor?.specialization ?? "General Rehabilitation";
    categorySuccess.set(category, (categorySuccess.get(category) ?? 0) + 1);
  }

  const logsWhere = buildAdminLogsWhere({
    search,
    condition,
    status,
    analysisIdsWithAppointments,
    analysisIdsWithConvertedAppointments,
  });
  const conditionAssessmentIds = conditionGroups.length
    ? await prisma.ai_analysis.findMany({
      where: {
        detected_issue: {
          in: conditionGroups.map((group) => group.detected_issue),
        },
      },
      select: { id: true, detected_issue: true },
    })
    : [];

  const conditionRecTotals = new Map(
    conditionGroups.map((group) => [
      group.detected_issue,
      {
        condition: group.detected_issue,
        assessmentCount: group._count.id,
        recommendationCount: 0,
      },
    ]),
  );

  for (const analysis of conditionAssessmentIds) {
    const entry = conditionRecTotals.get(analysis.detected_issue);
    if (!entry) continue;
    entry.recommendationCount += logCountMap.get(analysis.id) ?? 0;
  }

  const [logsTotal, logRows, conditionOptionsRows] = await Promise.all([
    prisma.ai_analysis.count({ where: logsWhere }),
    prisma.ai_analysis.findMany({
      where: logsWhere,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        patients: {
          include: { users: { select: { name: true } } },
        },
        selected_doctor: {
          include: { users: { select: { name: true } } },
        },
        recommendation_log: {
          orderBy: { score: "desc" },
          select: { score: true, doctor_id: true },
        },
      },
    }),
    prisma.ai_analysis.findMany({
      distinct: ["detected_issue"],
      select: { detected_issue: true },
      orderBy: { detected_issue: "asc" },
    }),
  ]);

  const conditionOptions = conditionOptionsRows.map((row) => row.detected_issue);

  const logDoctorIds = new Set();
  for (const row of logRows) {
    if (row.selected_doctor_id) logDoctorIds.add(row.selected_doctor_id);
    const appointmentDoctorId = analysisAppointmentDoctorIds.get(row.id);
    if (appointmentDoctorId) logDoctorIds.add(appointmentDoctorId);
  }

  const logDoctors = logDoctorIds.size
    ? await prisma.doctors.findMany({
      where: { id: { in: [...logDoctorIds] } },
      include: { users: { select: { name: true } } },
    })
    : [];
  const logDoctorNameMap = new Map(
    logDoctors.map((doctor) => [doctor.id, doctor.users?.name ?? "Unknown"]),
  );

  return {
    overview: {
      totalRecommendations,
      recommendationsThisMonth,
      activePatients,
      aiUsageRate,
    },
    topDoctors,
    commonConditions: [...conditionRecTotals.values()],
    analytics: {
      recommendationSuccessRate: roundPct(engagedAssessments, totalAssessments),
      appointmentConversionRate: roundPct(appointmentConversions, totalAssessments),
      successfulCategories: [...categorySuccess.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    },
    logs: {
      items: logRows.map((row) => {
        const recommendations = row.recommendation_log ?? [];
        const topScore = recommendations[0]?.score ?? null;
        const selectedEntry = row.selected_doctor_id
          ? recommendations.find((entry) => entry.doctor_id === row.selected_doctor_id)
          : null;
        const resolvedScore = selectedEntry?.score ?? topScore ?? null;

        return {
          id: row.id,
          patientId: row.patient_id,
          patientName: row.patients?.users?.name ?? "Patient",
          condition: row.detected_issue,
          recommendedDoctorsCount: recommendations.length,
          selectedDoctor: resolveAdminSelectedDoctorName(
            row,
            analysisAppointmentDoctorIds.get(row.id),
            logDoctorNameMap,
          ),
          matchScore: resolvedScore != null
            ? Math.round(resolvedScore * 10) / 10
            : null,
          date: row.created_at,
          status: analysisStatus.get(row.id) ?? "Pending",
        };
      }),
      total: logsTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(logsTotal / pageSize)),
    },
    filters: {
      conditions: conditionOptions,
    },
  };
}

module.exports = {
  assessFromForm,
  generateRecommendations,
  listForPatient,
  getPatientDashboard,
  getById,
  resolvePatientForUser,
  resolveDoctorForUser,
  getDoctorAiMatches,
  getDoctorMatchDetail,
  upsertDoctorMatchNotes,
  getAdminRecommendationManagement,
  assertPatientAccess,
  resolveAnalysisIdForBooking,
};
