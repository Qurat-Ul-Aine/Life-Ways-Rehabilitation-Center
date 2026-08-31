"use strict";

const ADMIN_TIMEZONE_VALUES = [
  "Asia/Islamabad",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

const VALID_TIMEZONES = new Set(ADMIN_TIMEZONE_VALUES);

module.exports = { ADMIN_TIMEZONE_VALUES, VALID_TIMEZONES };
