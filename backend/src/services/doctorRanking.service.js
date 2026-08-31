"use strict";

const prisma = require("../lib/prisma");

/**
 * @param {string|null|undefined} text
 * @param {string[]} keywords
 */
function textMatchesKeywords(text, keywords) {
  const haystack = String(text ?? "").toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

/**
 * Build keyword list from condition type and service title.
 * @param {{ conditionType?: string; serviceTitle?: string; serviceSlug?: string }} ctx
 */
function buildMatchKeywords(ctx) {
  const keywords = [];
  const blob = `${ctx.conditionType ?? ""} ${ctx.serviceTitle ?? ""} ${ctx.serviceSlug ?? ""}`.toLowerCase();

  if (/psychotic|psychiatric|mental/.test(blob)) {
    keywords.push("psychiat", "mental", "psychotic");
  }
  if (/addiction|drug|alcohol|substance|rehab/.test(blob)) {
    keywords.push("addiction", "substance", "rehab", "drug");
  }
  if (/neurodiver|autism|adhd|little|child|speech|aba/.test(blob)) {
    keywords.push("neuro", "autism", "adhd", "child", "pediatric");
  }
  if (/physio|physical|mobility/.test(blob)) {
    keywords.push("physio", "physical", "rehabilitation");
  }

  if (keywords.length === 0) {
    keywords.push("rehab", "therapy", "clinical");
  }

  return [...new Set(keywords)];
}

/**
 * Score a single doctor against clinical context.
 * @param {object} doctor - Prisma doctor row with users + doctor_service
 * @param {{ conditionType?: string; serviceTitle?: string; serviceSlug?: string; workload?: Map<string, number> }} ctx
 */
function scoreDoctor(doctor, ctx) {
  const keywords = buildMatchKeywords(ctx);
  const specialization = doctor.specialization ?? "";
  const qualification = doctor.qualification ?? "";
  const services = (doctor.doctor_service ?? [])
    .map((ds) => ds.rehabilitation_services?.title ?? "")
    .join(" ");

  let score = 40;
  const factors = [];

  if (textMatchesKeywords(specialization, keywords)) {
    score += 25;
    factors.push("specialization_match");
  }
  if (textMatchesKeywords(qualification, keywords)) {
    score += 10;
    factors.push("qualification_match");
  }
  if (textMatchesKeywords(services, keywords)) {
    score += 15;
    factors.push("service_match");
  }

  const successRate = doctor.success_rate ? Number(doctor.success_rate) : 0;
  if (successRate > 0) {
    const bonus = Math.min(20, Math.round(successRate / 5));
    score += bonus;
    factors.push("success_rate");
  }

  const rating = doctor.rating ? Number(doctor.rating) : 0;
  if (rating > 0) {
    score += Math.min(10, Math.round(rating * 2));
    factors.push("rating");
  }

  const workload = ctx.workload?.get(doctor.id) ?? 0;
  const workloadPenalty = Math.min(15, workload);
  score -= workloadPenalty;
  if (workloadPenalty > 0) factors.push("workload_adjusted");

  if (doctor.experience_years && doctor.experience_years >= 5) {
    score += 5;
    factors.push("experience");
  }

  return {
    doctorId: doctor.id,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    factors,
  };
}

function normalizeDoctorGender(gender) {
  const value = String(gender ?? "").trim().toLowerCase();
  if (value === "male" || value === "m") return "male";
  if (value === "female" || value === "f") return "female";
  return null;
}

function doctorMatchesPreferredGender(doctor, preferredGender) {
  if (preferredGender !== "male" && preferredGender !== "female") return false;
  const docGender = normalizeDoctorGender(doctor?.gender);
  if (!docGender) return false;
  return docGender === preferredGender;
}

const CLINICAL_MATCH_FACTORS = new Set([
  "specialization_match",
  "qualification_match",
  "service_match",
]);

function canTreatCondition(rankedItem) {
  const factors = rankedItem.factors ?? [];
  const hasClinicalMatch = factors.some((factor) => CLINICAL_MATCH_FACTORS.has(factor));
  return hasClinicalMatch || rankedItem.matchScore >= 55;
}

function formatDoctorGenderLabel(gender) {
  const normalized = normalizeDoctorGender(gender);
  if (normalized === "male") return "male";
  if (normalized === "female") return "female";
  return String(gender ?? "doctor").trim() || "doctor";
}

function buildGenderFallbackNote(preferredGender, doctor, conditionType) {
  const preferredLabel = preferredGender === "female" ? "female" : "male";
  const doctorGender = formatDoctorGenderLabel(doctor?.gender);
  const doctorName = doctor?.users?.name ?? "This specialist";
  const condition = conditionType ?? "your condition";

  return `You preferred a ${preferredLabel} doctor, but no ${preferredLabel} specialist is available who can treat ${condition}. ${doctorName} (${doctorGender}) is recommended because they can treat ${condition}.`;
}

/**
 * Order recommendations by preferred doctor gender, with clinical fallback.
 * @param {Array<{ doctorId: string; matchScore: number; factors: string[]; doctor: object }>} ranked
 * @param {"male"|"female"|"no_preference"|string|null|undefined} preferredDoctorGender
 * @param {{ conditionType?: string; limit?: number }} [options]
 */
function applyGenderPreferenceRanking(ranked, preferredDoctorGender, options = {}) {
  const { conditionType, limit = 5 } = options;
  const preference =
    preferredDoctorGender === "male" || preferredDoctorGender === "female"
      ? preferredDoctorGender
      : null;

  if (!preference) {
    return ranked.slice(0, limit);
  }

  const preferred = [];
  const fallback = [];
  const remainder = [];

  for (const item of ranked) {
    const treats = canTreatCondition(item);
    const matchesPreference = doctorMatchesPreferredGender(item.doctor, preference);

    if (matchesPreference && treats) {
      const factors = item.factors.includes("gender_preference_match")
        ? item.factors
        : [...item.factors, "gender_preference_match"];
      preferred.push({ ...item, factors });
      continue;
    }

    if (!matchesPreference && treats) {
      fallback.push({
        ...item,
        factors: [...item.factors, "gender_fallback"],
        genderFallbackNote: buildGenderFallbackNote(preference, item.doctor, conditionType),
      });
      continue;
    }

    remainder.push(item);
  }

  const ordered = [...preferred, ...fallback];
  if (ordered.length >= limit) {
    return ordered.slice(0, limit);
  }

  const usedIds = new Set(ordered.map((item) => item.doctorId));
  for (const item of remainder) {
    if (ordered.length >= limit) break;
    if (!usedIds.has(item.doctorId)) {
      ordered.push(item);
      usedIds.add(item.doctorId);
    }
  }

  return ordered.slice(0, limit);
}

/**
 * Rank doctors for a rehabilitation recommendation.
 * @param {object[]} doctors
 * @param {{ conditionType?: string; serviceTitle?: string; serviceSlug?: string }} context
 */
async function rankDoctors(doctors, context) {
  if (!doctors.length) return [];

  const doctorIds = doctors.map((d) => d.id);
  const workloadRows = await prisma.appointments.groupBy({
    by: ["doctor_id"],
    where: {
      doctor_id: { in: doctorIds },
      status: { not: "CANCELLED" },
    },
    _count: { doctor_id: true },
  });

  const workload = new Map(workloadRows.map((r) => [r.doctor_id, r._count.doctor_id]));

  return doctors
    .map((doctor) => {
      const ranked = scoreDoctor(doctor, { ...context, workload });
      return {
        ...ranked,
        doctor,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = {
  rankDoctors,
  scoreDoctor,
  buildMatchKeywords,
  applyGenderPreferenceRanking,
  doctorMatchesPreferredGender,
  canTreatCondition,
};
