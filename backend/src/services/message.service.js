"use strict";

const prisma = require("../lib/prisma");
const { deliverNotification } = require("./notification.service");

const parseId = (raw) => (raw == null || raw === "" ? null : String(raw));

async function resolveDoctorIdForUser(user) {
  if (!user?.id) return null;
  const doctor = await prisma.doctors.findFirst({
    where: { user_id: user.id },
    select: { id: true },
  });
  return doctor?.id ?? null;
}

async function resolvePatientIdForUser(user) {
  if (!user?.id) return null;
  const role = String(user.role ?? "").toUpperCase();

  if (role === "FAMILY") {
    const link = await prisma.family_members.findFirst({
      where: { user_id: user.id },
      select: { patient_id: true },
    });
    return link?.patient_id ?? null;
  }

  const patient = await prisma.patients.findUnique({
    where: { user_id: user.id },
    select: { id: true },
  });
  return patient?.id ?? null;
}

async function getPatientUserId(patientId) {
  const patient = await prisma.patients.findUnique({
    where: { id: String(patientId) },
    select: { user_id: true },
  });
  return patient?.user_id ?? null;
}

async function getDoctorUserId(doctorId) {
  const doctor = await prisma.doctors.findUnique({
    where: { id: String(doctorId) },
    select: { user_id: true },
  });
  return doctor?.user_id ?? null;
}

async function doctorCanMessagePatient(doctorId, patientId) {
  const did = parseId(doctorId);
  const pid = parseId(patientId);
  if (!did || !pid) return false;

  const assigned = await prisma.doctor_patient.findUnique({
    where: { doctor_id_patient_id: { doctor_id: did, patient_id: pid } },
    select: { doctor_id: true },
  });
  if (assigned) return true;

  const hasAppointment = await prisma.appointments.findFirst({
    where: { doctor_id: did, patient_id: pid },
    select: { id: true },
  });
  if (hasAppointment) return true;

  const hasTherapy = await prisma.therapy_plans.findFirst({
    where: { doctor_id: did, patient_id: pid },
    select: { id: true },
  });
  return Boolean(hasTherapy);
}

async function getOrCreateThread(doctorId, patientId) {
  const did = parseId(doctorId);
  const pid = parseId(patientId);
  if (!did || !pid) throw new Error("doctorId and patientId are required");

  const allowed = await doctorCanMessagePatient(did, pid);
  if (!allowed) throw new Error("Doctor is not linked to this patient");

  return prisma.message_threads.upsert({
    where: { doctor_id_patient_id: { doctor_id: did, patient_id: pid } },
    create: { doctor_id: did, patient_id: pid },
    update: {},
    include: {
      doctors: { include: { users: { select: { id: true, name: true } } } },
      patients: { include: { users: { select: { id: true, name: true } } } },
    },
  });
}

async function userCanAccessThread(user, thread) {
  if (!user?.id || !thread) return false;
  const role = String(user.role ?? "").toUpperCase();

  if (role === "ADMIN") return true;

  if (role === "DOCTOR") {
    const doctorId = await resolveDoctorIdForUser(user);
    return doctorId && String(thread.doctor_id) === String(doctorId);
  }

  const patientId = await resolvePatientIdForUser(user);
  if ((role === "PATIENT" || role === "FAMILY") && patientId) {
    return String(thread.patient_id) === String(patientId);
  }

  return false;
}

function mapMessage(m, currentUserId) {
  return {
    id: m.id,
    threadId: m.thread_id,
    senderUserId: m.sender_user_id,
    body: m.body,
    readAt: m.read_at?.toISOString?.() ?? m.read_at ?? null,
    createdAt: m.created_at?.toISOString?.() ?? m.created_at,
    isMine: String(m.sender_user_id) === String(currentUserId),
    senderName: m.users?.name ?? "",
  };
}

async function mapThreadSummary(thread, currentUserId) {
  const lastMessage = await prisma.messages.findFirst({
    where: { thread_id: thread.id },
    orderBy: { created_at: "desc" },
    include: { users: { select: { name: true } } },
  });

  const unreadCount = await prisma.messages.count({
    where: {
      thread_id: thread.id,
      sender_user_id: { not: String(currentUserId) },
      read_at: null,
    },
  });

  return {
    id: thread.id,
    doctorId: thread.doctor_id,
    patientId: thread.patient_id,
    doctorName: thread.doctors?.users?.name ?? "",
    patientName: thread.patients?.users?.name ?? "",
    updatedAt: thread.updated_at?.toISOString?.() ?? thread.updated_at,
    lastMessage: lastMessage
      ? {
          body: lastMessage.body,
          createdAt: lastMessage.created_at?.toISOString?.() ?? lastMessage.created_at,
          senderName: lastMessage.users?.name ?? "",
          isMine: String(lastMessage.sender_user_id) === String(currentUserId),
        }
      : null,
    unreadCount,
  };
}

async function notifyRecipient({ thread, senderUserId, body }) {
  const patientUserId = thread.patients?.users?.id ?? (await getPatientUserId(thread.patient_id));
  const doctorUserId = thread.doctors?.users?.id ?? (await getDoctorUserId(thread.doctor_id));
  const senderIsDoctor = String(senderUserId) === String(doctorUserId);
  const recipientUserId = senderIsDoctor ? patientUserId : doctorUserId;
  if (!recipientUserId) return;

  let recipientUser = senderIsDoctor ? thread.patients?.users ?? null : thread.doctors?.users ?? null;
  if (!recipientUser?.email) {
    recipientUser = await prisma.users.findUnique({ where: { id: String(recipientUserId) } });
  }
  if (!recipientUser?.id) return;

  const senderName = senderIsDoctor
    ? thread.doctors?.users?.name ?? "Your doctor"
    : thread.patients?.users?.name ?? "Your patient";
  const preview = String(body).trim().slice(0, 120);
  const message = `New message from ${senderName}: ${preview}`;

  await deliverNotification({
    userId: recipientUser.id,
    user: recipientUser,
    category: "patient_update",
    type: "SYSTEM",
    title: "New Message",
    message,
    emailSubject: "New Message — Life Ways Rehab",
    emailHtml: `<p>Dear ${recipientUser.name || "User"},</p><p>${message}</p>`,
  });
}

module.exports = {
  parseId,
  resolveDoctorIdForUser,
  resolvePatientIdForUser,
  doctorCanMessagePatient,
  getOrCreateThread,
  userCanAccessThread,
  mapMessage,
  mapThreadSummary,
  notifyRecipient,
  getPatientUserId,
  getDoctorUserId,
};
