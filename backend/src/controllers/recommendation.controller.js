"use strict";

const { sendSuccess, sendError } = require("../utils/response");
const recommendationService = require("../services/recommendation.service");

// POST /recommendations/generate
async function generate(req, res) {
  try {
    const body = req.body ?? {};
    const {
      patientId,
      patient_id: patientIdSnake,
      serviceId,
      service_id: serviceIdSnake,
      serviceSlug,
      service_slug: serviceSlugSnake,
      condition,
      primaryCondition,
      symptoms,
      medicalHistory,
      currentMedications,
      allergies,
      location,
      consultationMode,
      preferredDoctorGender,
      preferredLanguage,
      age,
      gender,
      limit,
      persist,
    } = body;

    let resolvedPatientId = patientId ?? patientIdSnake;

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      const patient = await recommendationService.resolvePatientForUser(req.user.id);
      if (!patient) {
        return sendError(res, 404, "Patient profile not found");
      }
      resolvedPatientId = patient.id;
    }

    if (!resolvedPatientId) {
      return sendError(res, 400, "patientId is required");
    }

    if (["PATIENT", "FAMILY", "ADMIN"].includes(req.user?.role)) {
      await recommendationService.assertPatientAccess(req, resolvedPatientId);
    }

    const result = await recommendationService.generateRecommendations({
      patientId: resolvedPatientId,
      serviceId: serviceId ?? serviceIdSnake,
      serviceSlug: serviceSlug ?? serviceSlugSnake,
      condition,
      primaryCondition,
      symptoms,
      medicalHistory,
      currentMedications,
      medications: body.medications ?? currentMedications,
      allergies,
      location,
      consultationMode,
      preferredDoctorGender,
      preferredLanguage,
      age,
      gender,
      limit: limit ? Number(limit) : 5,
      persist: persist !== false,
    });

    return sendSuccess(res, 200, "Doctor recommendations generated", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/me/dashboard
async function getDashboard(req, res) {
  try {
    const patient = await recommendationService.resolvePatientForUser(req.user?.id);
    if (!patient) {
      return sendError(res, 404, "Patient profile not found");
    }

    const result = await recommendationService.getPatientDashboard(patient.id);
    return sendSuccess(res, 200, "Recommendation dashboard loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/me
async function listMine(req, res) {
  try {
    const patient = await recommendationService.resolvePatientForUser(req.user?.id);
    if (!patient) {
      return sendError(res, 404, "Patient profile not found");
    }

    const result = await recommendationService.listForPatient(patient.id);
    return sendSuccess(res, 200, "Recommendations loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/patient/:patientId
async function listByPatient(req, res) {
  try {
    const { patientId } = req.params;
    await recommendationService.assertPatientAccess(req, patientId);

    const result = await recommendationService.listForPatient(patientId);
    return sendSuccess(res, 200, "Recommendations loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/:id
async function getById(req, res) {
  try {
    const row = await recommendationService.getById(req.params.id);

    if (req.user?.role === "PATIENT" || req.user?.role === "FAMILY") {
      await recommendationService.assertPatientAccess(req, row.patientId);
    }

    return sendSuccess(res, 200, "Recommendation loaded", row);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/doctor/matches
async function getDoctorMatches(req, res) {
  try {
    const doctor = await recommendationService.resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return sendError(res, 404, "Doctor profile not found");
    }

    const result = await recommendationService.getDoctorAiMatches(doctor.id);
    return sendSuccess(res, 200, "AI matches loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/doctor/matches/:recommendationId
async function getDoctorMatchDetail(req, res) {
  try {
    const doctor = await recommendationService.resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return sendError(res, 404, "Doctor profile not found");
    }

    const result = await recommendationService.getDoctorMatchDetail(
      doctor.id,
      req.params.recommendationId,
    );
    return sendSuccess(res, 200, "AI match detail loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// PUT /recommendations/doctor/matches/:recommendationId/notes
async function updateDoctorMatchNotes(req, res) {
  try {
    const doctor = await recommendationService.resolveDoctorForUser(req.user?.id);
    if (!doctor) {
      return sendError(res, 404, "Doctor profile not found");
    }

    const body = req.body ?? {};
    const result = await recommendationService.upsertDoctorMatchNotes(
      doctor.id,
      req.params.recommendationId,
      {
        assessmentNotes: body.assessmentNotes ?? body.assessment_notes,
        treatmentNotes: body.treatmentNotes ?? body.treatment_notes,
        progressNotes: body.progressNotes ?? body.progress_notes,
      },
    );
    return sendSuccess(res, 200, "Doctor notes saved", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// GET /recommendations/admin/management
async function getAdminManagement(req, res) {
  try {
    const query = req.query ?? {};
    const result = await recommendationService.getAdminRecommendationManagement({
      search: query.search,
      condition: query.condition,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
    return sendSuccess(res, 200, "AI recommendation management loaded", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

// POST /recommendations/assess — public guest assessment
async function assess(req, res) {
  try {
    const body = req.body ?? {};
    const result = await recommendationService.assessFromForm({
      age: body.age,
      gender: body.gender,
      location: body.location,
      primaryCondition: body.primaryCondition ?? body.condition,
      symptoms: body.symptoms,
      medicalHistory: body.medicalHistory,
      currentMedications: body.currentMedications ?? body.medications,
      allergies: body.allergies,
      consultationMode: body.consultationMode,
      preferredDoctorGender: body.preferredDoctorGender,
      preferredLanguage: body.preferredLanguage,
      serviceId: body.serviceId,
      serviceSlug: body.serviceSlug,
      limit: body.limit ? Number(body.limit) : 5,
    });

    return sendSuccess(res, 200, "Doctor recommendations generated", result);
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message);
  }
}

module.exports = {
  assess,
  generate,
  getDashboard,
  listMine,
  listByPatient,
  getAdminManagement,
  getDoctorMatches,
  getDoctorMatchDetail,
  updateDoctorMatchNotes,
  getById,
};
