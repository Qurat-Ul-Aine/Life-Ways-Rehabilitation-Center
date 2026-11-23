const { sendError } = require("../utils/response");
const {
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  validateDateOfBirth,
  validateEmail,
  validatePersonName,
  validatePhone,
} = require("./common.validation");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function validateCreateIntern(body, { passwordRequired = false, requireCnic = false } = {}) {
  const errors = [];
  const name = normalizePersonName(body?.name);
  const email = normalizeEmail(body?.email);
  const phone = normalizePhone(body?.phone);
  const education = String(body?.education ?? body?.degree ?? "").trim();
  const department = String(body?.department ?? "").trim();
  const password = String(body?.password ?? "");

  const nameError = validatePersonName(body?.name);
  if (nameError) errors.push(nameError);
  const emailError = validateEmail(body?.email);
  if (emailError) errors.push(emailError);
  const phoneError = validatePhone(body?.phone);
  if (phoneError) errors.push(phoneError);
  if (!education) errors.push("Education/degree is required.");
  if (!department) errors.push("Department is required.");
  if (requireCnic && !String(body?.cnic ?? "").trim()) {
    errors.push("CNIC is required.");
  }
  if (passwordRequired && (!password || password.length < 8)) {
    errors.push("Password must be at least 8 characters.");
  }
  if (password && password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  const dateOfBirth = body?.date_of_birth ?? body?.dateOfBirth;
  const dateOfBirthError = validateDateOfBirth(dateOfBirth);
  if (dateOfBirthError) errors.push(dateOfBirthError);

  if (body?.internship_start && isNaN(Date.parse(body.internship_start))) {
    errors.push("Invalid internship start date.");
  }
  if (body?.internship_end && isNaN(Date.parse(body.internship_end))) {
    errors.push("Invalid internship end date.");
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      email,
      phone,
      education,
      department,
      password: password || undefined,
      university: body?.university ? String(body.university).trim() : undefined,
      degree: body?.degree ? String(body.degree).trim() : education,
      gender: body?.gender,
      date_of_birth: dateOfBirth,
      address: body?.address,
      cnic: body?.cnic,
      semester: body?.semester,
      emergency_contact: body?.emergency_contact ?? body?.emergencyContact,
      skills: body?.skills,
      notes: body?.notes,
      required_hours: body?.required_hours ?? body?.requiredHours,
    },
  };
}

function validateUpdateIntern(body) {
  const errors = [];
  body = body ?? {};
  if (body?.name !== undefined) {
    const error = validatePersonName(body.name);
    if (error) errors.push(error);
    else body.name = normalizePersonName(body.name);
  }
  if (body?.email !== undefined) {
    const error = validateEmail(body.email);
    if (error) errors.push(error);
    else body.email = normalizeEmail(body.email);
  }
  if (body?.phone !== undefined) {
    const error = validatePhone(body.phone);
    if (error) errors.push(error);
    else body.phone = normalizePhone(body.phone);
  }
  const dateOfBirth = body?.date_of_birth ?? body?.dateOfBirth;
  if (dateOfBirth != null && String(dateOfBirth).trim()) {
    const error = validateDateOfBirth(dateOfBirth);
    if (error) errors.push(error);
  }
  if (body?.password && String(body.password).length < 8) {
    errors.push("Password must be at least 8 characters.");
  }
  return { valid: errors.length === 0, errors };
}

function validateTrainingLog(body) {
  const errors = [];
  const hours = Number(body?.hours_worked ?? body?.hoursWorked);
  if (isNaN(hours) || hours < 0 || hours > 24) {
    errors.push("Hours worked must be between 0 and 24.");
  }
  const logDate = body?.log_date ?? body?.logDate;
  if (logDate && isNaN(Date.parse(logDate))) {
    errors.push("Invalid log date.");
  }
  return { valid: errors.length === 0, errors, hours };
}

function validateAttendance(body) {
  const errors = [];
  const recordDate = body?.record_date ?? body?.recordDate;
  if (!recordDate || isNaN(Date.parse(recordDate))) {
    errors.push("Valid attendance date is required.");
  }
  const status = String(body?.status ?? "present").toLowerCase();
  if (!["present", "absent", "leave"].includes(status)) {
    errors.push("Status must be present, absent, or leave.");
  }
  return { valid: errors.length === 0, errors };
}

function validateEvaluation(body) {
  const errors = [];
  const rating = Number(body?.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.push("Rating must be between 1 and 5.");
  }
  return { valid: errors.length === 0, errors };
}

function validateUuidParam(req, res, next) {
  if (!isUuid(req.params.id)) {
    return sendError(res, 400, "Invalid intern ID.");
  }
  return next();
}

function validateAttendanceIdParam(req, res, next) {
  if (!isUuid(req.params.attendanceId)) {
    return sendError(res, 400, "Invalid attendance ID.");
  }
  return next();
}

function validateLogIdParam(req, res, next) {
  if (!isUuid(req.params.logId)) {
    return sendError(res, 400, "Invalid log ID.");
  }
  return next();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = {
  isUuid,
  validateCreateIntern,
  validateUpdateIntern,
  validateTrainingLog,
  validateAttendance,
  validateEvaluation,
  validateUuidParam,
  validateAttendanceIdParam,
  validateLogIdParam,
  asyncHandler,
};
