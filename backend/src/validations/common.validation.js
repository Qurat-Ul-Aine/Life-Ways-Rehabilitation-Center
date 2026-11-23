"use strict";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSON_NAME_PATTERN = /^[\p{L}\p{M} .'\u2019-]+$/u;

function getLocalTodayDate() {
  const today = new Date();
  const year = String(today.getFullYear()).padStart(4, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePersonName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validatePersonName(value) {
  const name = normalizePersonName(value);
  if (!name) return "Name is required.";
  const length = Array.from(name).length;
  if (length < 2 || length > 80) {
    return "Name must be between 2 and 80 characters.";
  }
  if (!PERSON_NAME_PATTERN.test(name) || !/\p{L}/u.test(name)) {
    return "Name can contain letters, spaces, periods, apostrophes, and hyphens only.";
  }
  return null;
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

function normalizePhone(value) {
  return String(value ?? "").trim().replace(/[\s\-()]/g, "");
}

function validatePhone(value) {
  const phone = normalizePhone(value);
  const isPakistanMobile =
    /^03\d{9}$/.test(phone) ||
    /^\+923\d{9}$/.test(phone) ||
    /^923\d{9}$/.test(phone);
  const isInternational = /^\+\d{8,15}$/.test(phone);
  if (!isPakistanMobile && !isInternational) {
    return "Enter a valid Pakistani mobile or international phone number.";
  }
  return null;
}

function validateDateOfBirth(value) {
  if (value == null || String(value).trim() === "") return null;

  const raw = value instanceof Date
    ? `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!match) return "Date of birth must be a valid date.";

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(12, 0, 0, 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return "Date of birth must be a valid date.";
  }

  const birthDate = `${yearText}-${monthText}-${dayText}`;
  const today = getLocalTodayDate();
  if (birthDate > today) return "Date of birth cannot be in the future.";

  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const oldestAllowed = `${String(todayYear - 120).padStart(4, "0")}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
  if (birthDate < oldestAllowed) {
    return "Date of birth cannot be more than 120 years ago.";
  }
  return null;
}

module.exports = {
  getLocalTodayDate,
  normalizePersonName,
  validatePersonName,
  normalizeEmail,
  validateEmail,
  normalizePhone,
  validatePhone,
  validateDateOfBirth,
};
