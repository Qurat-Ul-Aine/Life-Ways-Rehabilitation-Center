"use strict";

/** @typedef {{ success?: boolean; message?: string }} JsonBody */

/**
 * Standard JSON success envelope (matches frontend auth ApiResponse patterns).
 * @template T
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {T | undefined} [data]
 */
module.exports.sendSuccess = function sendSuccess(res, status, message, data) {
  /** @type {JsonBody & { data?: unknown }} */
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 * @param {unknown} [details]
 */
module.exports.sendError = function sendError(res, status, message, details) {
  /** @type {JsonBody & { details?: unknown }} */
  const body = { success: false, message };
  if (details !== undefined && process.env.NODE_ENV === "development") {
    body.details = details;
  }
  return res.status(status).json(body);
}

/** @typedef {{ patientId?: string }} Query */

