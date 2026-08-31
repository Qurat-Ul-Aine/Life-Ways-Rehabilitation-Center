"use strict";

const { sendSuccess, sendError } = require("../utils/response");
const screeningService = require("../services/screening.service");

function handleServiceError(res, error) {
  if (error instanceof screeningService.HttpError) {
    return sendError(res, error.statusCode, error.message);
  }
  throw error;
}

async function listScreenings(req, res) {
  try {
    const data = await screeningService.listAdminScreenings(req.query);
    return res.json({ success: true, ...data });
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getStats(req, res) {
  try {
    const data = await screeningService.getAdminStats();
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getAnalytics(req, res) {
  try {
    const data = await screeningService.getAdminAnalytics();
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function getDetail(req, res) {
  try {
    const data = await screeningService.getAdminDetail(req.params.id);
    return sendSuccess(res, 200, "OK", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

async function assignDoctor(req, res) {
  try {
    const { screeningId, doctorId, flagPatient, followUpDate, status } = req.body ?? {};
    if (!screeningId || !doctorId) {
      return sendError(res, 400, "screeningId and doctorId are required.");
    }
    const data = await screeningService.assignDoctor({
      screeningId: String(screeningId),
      doctorId: String(doctorId),
      flagPatient,
      followUpDate,
      status,
    });
    return sendSuccess(res, 200, "Doctor assigned successfully.", data);
  } catch (error) {
    return handleServiceError(res, error);
  }
}

module.exports = {
  listScreenings,
  getStats,
  getAnalytics,
  getDetail,
  assignDoctor,
};
