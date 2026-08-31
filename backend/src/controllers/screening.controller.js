"use strict";

const { sendSuccess, sendError } = require("../utils/response");
const screeningService = require("../services/screening.service");

function handleServiceError(res, error) {
  if (error instanceof screeningService.HttpError) {
    return sendError(res, error.statusCode, error.message);
  }
  throw error;
}

async function getConfig(req, res) {
  try {
    const data = await screeningService.getIntroConfig();
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getConditions(req, res) {
  try {
    const data = await screeningService.getConditions();
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getQuestions(req, res) {
  try {
    const data = await screeningService.getQuestions(req.params.conditionId);
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function submitScreening(req, res) {
  try {
    const userContext = req.user
      ? { role: req.user.role, userId: req.user.id }
      : null;
    const data = await screeningService.submitScreening(req.body ?? {}, userContext);
    return sendSuccess(res, 201, "Screening submitted successfully.", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getResult(req, res) {
  try {
    const userContext = req.user
      ? { role: req.user.role, userId: req.user.id }
      : null;
    const data = await screeningService.getResult(req.params.id, userContext);
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getMyHistory(req, res) {
  try {
    const data = await screeningService.getMyHistory(req.user.id);
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getDoctorAssignments(req, res) {
  try {
    const query = req.query ?? {};
    const data = await screeningService.listDoctorAssignments(req.user.id, query);
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function deleteScreening(req, res) {
  try {
    await screeningService.deleteScreening(req.params.id);
    return sendSuccess(res, 200, "Screening deleted.");
  } catch (error) {
    return handleServiceError(res, error);
  }
}

module.exports = {
  getConfig,
  getConditions,
  getQuestions,
  submitScreening,
  getResult,
  getMyHistory,
  getDoctorAssignments,
  deleteScreening,
};
