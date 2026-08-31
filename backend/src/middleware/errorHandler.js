const { sendError } = require("../utils/response");

/**
 * @typedef {object} HttpErrorLike
 * @property {number} [statusCode]
 */

/**
 * Express error-handler middleware (4 arguments).
 */
module.exports.errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  console.error("[API Error]", err);

  /** @type {number} */
  let status =
    typeof err === "object" && err !== null && "statusCode" in err && typeof err.statusCode === "number"
      ? err.statusCode
      : typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof /** @type {{ status:number }} */ (err).status === "number"
        ? /** @type {{ status:number }} */ (err).status
        : 500;

  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Internal server error.";

  if (typeof status !== "number" || status < 400 || status > 599) status = 500;

  const exposure = status >= 500 && process.env.NODE_ENV !== "development" ? "Internal server error." : rawMessage;

  sendError(res, status, exposure, process.env.NODE_ENV === "development" ? err : undefined);
}
