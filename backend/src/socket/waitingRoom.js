"use strict";

const { verifyToken } = require("../utils/jwt");
const { canJoinTelehealthSession } = require("../utils/appointmentTime");

const CLINICAL_ROLES = new Set(["DOCTOR", "ADMIN", "PATIENT", "FAMILY"]);

function parseUserId(decoded) {
  const raw = decoded.sub ?? decoded.userId ?? decoded.id;
  const uid = String(raw ?? "");
  return uid && uid !== "undefined" ? uid : null;
}

async function resolveActor(prisma, userId, role) {
  const roleNorm = String(role ?? "").toUpperCase();

  if (roleNorm === "DOCTOR") {
    const doctor = await prisma.doctors.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    return { role: "DOCTOR", doctorId: doctor?.id ?? null, patientId: null };
  }

  if (roleNorm === "PATIENT" || roleNorm === "FAMILY") {
    if (roleNorm === "FAMILY") {
      const link = await prisma.family_members.findUnique({
        where: { user_id: userId },
        select: { patient_id: true },
      });
      return { role: roleNorm, doctorId: null, patientId: link?.patient_id ?? null };
    }

    const patient = await prisma.patients.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    return { role: roleNorm, doctorId: null, patientId: patient?.id ?? null };
  }

  if (roleNorm === "ADMIN") {
    return { role: "ADMIN", doctorId: null, patientId: null };
  }

  return { role: roleNorm, doctorId: null, patientId: null };
}

async function loadAppointment(prisma, appointmentId) {
  return prisma.appointments.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patient_id: true,
      doctor_id: true,
      appointment_date: true,
      appointment_time: true,
      status: true,
      type: true,
    },
  });
}

function deny(socket, event, message) {
  const text = typeof message === "string" ? message : message?.message ?? "Action denied";
  socket.emit(event, { message: text });
}

function registerWaitingRoom(waitingNamespace) {
  waitingNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = verifyToken(token);
      const userId = parseUserId(decoded);
      const role = String(decoded.role ?? "").toUpperCase();

      if (!userId || !CLINICAL_ROLES.has(role)) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = { id: userId, role };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  waitingNamespace.on("connection", (socket) => {
    console.log("Client connected to /waiting namespace:", socket.id, socket.data.user?.role);

    socket.on("join-waiting-room", async ({ appointmentId, role: clientRole }) => {
      const prisma = require("../lib/prisma");
      const roomName = `waiting-${appointmentId}`;
      const user = socket.data.user;

      if (!user?.id || !appointmentId) {
        deny(socket, "join-denied", { message: "Invalid join request" });
        return;
      }

      try {
        const actor = await resolveActor(prisma, user.id, user.role);
        const appt = await loadAppointment(prisma, appointmentId);

        if (!appt) {
          deny(socket, "join-denied", { message: "Appointment not found" });
          return;
        }

        const effectiveRole = String(clientRole ?? user.role).toUpperCase();

        if (effectiveRole === "PATIENT" || effectiveRole === "FAMILY") {
          if (!actor.patientId || String(appt.patient_id) !== String(actor.patientId)) {
            deny(socket, "join-denied", { message: "You are not authorized for this session" });
            return;
          }

          if (
            !canJoinTelehealthSession({
              appointmentDate: appt.appointment_date,
              appointmentTime: appt.appointment_time,
              status: appt.status,
              mode: appt.type === "ONLINE" ? "online" : "in-person",
            })
          ) {
            deny(socket, "join-denied", {
              message:
                "You can join telehealth from 5 minutes before your scheduled appointment time.",
            });
            return;
          }
        } else if (effectiveRole === "DOCTOR") {
          if (!actor.doctorId || String(appt.doctor_id) !== String(actor.doctorId)) {
            deny(socket, "join-denied", { message: "You are not the assigned doctor for this appointment" });
            return;
          }
        } else if (effectiveRole !== "ADMIN") {
          deny(socket, "join-denied", { message: "Insufficient permissions" });
          return;
        }

        socket.join(roomName);
        console.log(`${effectiveRole} ${user.id} joined waiting room for appointment ${appointmentId}`);

        if (effectiveRole === "PATIENT" || effectiveRole === "FAMILY") {
          socket.to(roomName).emit("patient-waiting", { appointmentId, userId: user.id });
        }
      } catch (error) {
        console.error("[waiting] join validation failed:", error.message);
        deny(socket, "join-denied", { message: "Unable to verify appointment join window" });
      }
    });

    socket.on("admit-patient", async ({ appointmentId }) => {
      const prisma = require("../lib/prisma");
      const user = socket.data.user;
      const roomName = `waiting-${appointmentId}`;

      if (!user?.id || !appointmentId) return;

      try {
        const actor = await resolveActor(prisma, user.id, user.role);
        const appt = await loadAppointment(prisma, appointmentId);

        if (!appt) return;

        const isDoctor =
          actor.role === "DOCTOR"
          && actor.doctorId
          && String(appt.doctor_id) === String(actor.doctorId);
        const isAdmin = actor.role === "ADMIN";

        if (!isDoctor && !isAdmin) {
          deny(socket, "action-denied", { message: "Only the assigned doctor can admit patients" });
          return;
        }

        console.log("admit-patient authorized for appointment:", appointmentId);
        waitingNamespace.to(roomName).emit("patient-admitted", { appointmentId });
      } catch (error) {
        console.error("[waiting] admit-patient failed:", error.message);
        deny(socket, "action-denied", { message: "Unable to admit patient" });
      }
    });

    socket.on("session-ended", async ({ appointmentId }) => {
      const prisma = require("../lib/prisma");
      const user = socket.data.user;
      const roomName = `waiting-${appointmentId}`;

      if (!user?.id || !appointmentId) return;

      try {
        const actor = await resolveActor(prisma, user.id, user.role);
        const appt = await loadAppointment(prisma, appointmentId);

        if (!appt) return;

        const isDoctor =
          actor.role === "DOCTOR"
          && actor.doctorId
          && String(appt.doctor_id) === String(actor.doctorId);
        const isAdmin = actor.role === "ADMIN";

        if (!isDoctor && !isAdmin) {
          deny(socket, "action-denied", { message: "Only the assigned doctor can end the session" });
          return;
        }

        console.log("session-ended authorized for appointment:", appointmentId);
        waitingNamespace.to(roomName).emit("session-ended", { appointmentId });

        await prisma.appointments.update({
          where: { id: appointmentId },
          data: { status: "COMPLETED" },
        });

        const existing = await prisma.telehealth_sessions.findFirst({
          where: { appointment_id: appointmentId },
        });
        const now = new Date();
        if (existing) {
          await prisma.telehealth_sessions.update({
            where: { id: existing.id },
            data: { status: "completed", end_time: now },
          });
        }
      } catch (error) {
        console.error("[waiting] session-ended failed:", error.message);
        deny(socket, "action-denied", { message: "Unable to end session" });
      }
    });

    socket.on("leave-waiting-room", ({ appointmentId }) => {
      const roomName = `waiting-${appointmentId}`;
      socket.leave(roomName);
      console.log(`Client left waiting room for appointment ${appointmentId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from /waiting namespace:", socket.id);
    });
  });
}

module.exports = { registerWaitingRoom };
