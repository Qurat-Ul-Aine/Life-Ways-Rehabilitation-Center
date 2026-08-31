"use strict";

const { sendError } = require("../utils/response");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function validateSubmit(req, res, next) {
  const body = req.body ?? {};
  const conditionKey =
    body.conditionId ?? body.condition_id ?? body.condition ?? body.test_type;

  if (!conditionKey) {
    return sendError(res, 400, "conditionId (or condition) is required.");
  }

  const answers = body.answers;
  const hasAnswers =
    (Array.isArray(answers) && answers.length > 0) ||
    (answers && typeof answers === "object" && !Array.isArray(answers) && Object.keys(answers).length > 0);

  if (!hasAnswers) {
    return sendError(res, 400, "answers are required.");
  }

  const patientId = body.patientId ?? body.patient_id;
  if (patientId != null && patientId !== "" && !isUuid(String(patientId))) {
    return sendError(res, 400, "patientId must be a valid UUID.");
  }

  if (body.age != null && body.age !== "" && Number.isNaN(Number(body.age))) {
    return sendError(res, 400, "age must be a number.");
  }

  next();
}

function validateScreeningIdParam(req, res, next) {
  if (!isUuid(req.params.id)) {
    return sendError(res, 400, "Screening id must be a valid UUID.");
  }
  next();
}

module.exports = {
  asyncHandler,
  validateSubmit,
  validateScreeningIdParam,
};
