"use strict";

const crypto = require("crypto");

const JITSI_BASE_URL = String(process.env.JITSI_BASE_URL || "https://meet.jit.si").replace(/\/$/, "");

function buildMeetingRoom(appointmentId) {
  const hash = crypto.createHash("sha256").update(String(appointmentId)).digest("hex").slice(0, 12);
  return `lifeways-appt-${hash}`;
}

function buildMeetingLink(roomName) {
  return `${JITSI_BASE_URL}/${roomName}`;
}

function issueMeetingCredentials(appointmentId) {
  const meetingRoom = buildMeetingRoom(appointmentId);
  return {
    meetingRoom,
    meetingLink: buildMeetingLink(meetingRoom),
  };
}

module.exports = {
  JITSI_BASE_URL,
  buildMeetingRoom,
  buildMeetingLink,
  issueMeetingCredentials,
};
