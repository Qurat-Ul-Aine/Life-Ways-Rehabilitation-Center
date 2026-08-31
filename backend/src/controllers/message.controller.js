"use strict";

const prisma = require("../lib/prisma");
const {
  parseId,
  resolveDoctorIdForUser,
  resolvePatientIdForUser,
  doctorCanMessagePatient,
  getOrCreateThread,
  userCanAccessThread,
  mapMessage,
  mapThreadSummary,
  notifyRecipient,
} = require("../services/message.service");

const THREAD_INCLUDE = {
  doctors: { include: { users: { select: { id: true, name: true } } } },
  patients: { include: { users: { select: { id: true, name: true } } } },
};

async function listThreads(req, res) {
  try {
    const user = req.user;
    const role = String(user.role ?? "").toUpperCase();
    const where = {};

    if (role === "DOCTOR") {
      const doctorId = await resolveDoctorIdForUser(user);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found" });
      where.doctor_id = doctorId;
    } else if (role === "PATIENT" || role === "FAMILY") {
      const patientId = await resolvePatientIdForUser(user);
      if (!patientId) return res.status(404).json({ message: "Patient profile not found" });
      where.patient_id = patientId;
    } else if (role === "ADMIN") {
      // all threads
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const threads = await prisma.message_threads.findMany({
      where,
      include: THREAD_INCLUDE,
      orderBy: { updated_at: "desc" },
    });

    const items = await Promise.all(
      threads.map((t) => mapThreadSummary(t, user.id)),
    );

    return res.json({ items, total: items.length });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function getThreadMessages(req, res) {
  try {
    const threadId = parseId(req.params.threadId);
    const thread = await prisma.message_threads.findUnique({
      where: { id: threadId },
      include: THREAD_INCLUDE,
    });
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const allowed = await userCanAccessThread(req.user, thread);
    if (!allowed) return res.status(403).json({ message: "Forbidden" });

    const messages = await prisma.messages.findMany({
      where: { thread_id: threadId },
      orderBy: { created_at: "asc" },
      include: { users: { select: { name: true } } },
    });

    return res.json({
      thread: await mapThreadSummary(thread, req.user.id),
      items: messages.map((m) => mapMessage(m, req.user.id)),
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function ensureThread(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();
    let doctorId = parseId(req.body?.doctorId ?? req.body?.doctor_id);
    let patientId = parseId(req.body?.patientId ?? req.body?.patient_id);

    if (role === "DOCTOR") {
      const ownDoctorId = await resolveDoctorIdForUser(req.user);
      if (!ownDoctorId) return res.status(404).json({ message: "Doctor profile not found" });
      doctorId = ownDoctorId;
      if (!patientId) return res.status(400).json({ message: "patientId is required" });
    } else if (role === "PATIENT" || role === "FAMILY") {
      const ownPatientId = await resolvePatientIdForUser(req.user);
      if (!ownPatientId) return res.status(404).json({ message: "Patient profile not found" });
      patientId = ownPatientId;
      if (!doctorId) {
        const link = await prisma.doctor_patient.findFirst({
          where: { patient_id: patientId },
          select: { doctor_id: true },
        });
        doctorId = link?.doctor_id ?? null;
        if (!doctorId) {
          const plan = await prisma.therapy_plans.findFirst({
            where: { patient_id: patientId, doctor_id: { not: null } },
            orderBy: { id: "desc" },
            select: { doctor_id: true },
          });
          doctorId = plan?.doctor_id ?? null;
        }
      }
      if (!doctorId) {
        return res.status(400).json({ message: "No assigned doctor found for messaging" });
      }
    } else if (role === "ADMIN") {
      if (!doctorId || !patientId) {
        return res.status(400).json({ message: "doctorId and patientId are required" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const thread = await getOrCreateThread(doctorId, patientId);
    return res.json({ data: await mapThreadSummary(thread, req.user.id) });
  } catch (e) {
    const status = e.message?.includes("not linked") ? 403 : 500;
    return res.status(status).json({ message: e.message });
  }
}

async function sendMessage(req, res) {
  try {
    const threadId = parseId(req.params.threadId);
    const body = String(req.body?.body ?? "").trim();
    if (!body) return res.status(400).json({ message: "Message body is required" });
    if (body.length > 4000) return res.status(400).json({ message: "Message is too long" });

    const thread = await prisma.message_threads.findUnique({
      where: { id: threadId },
      include: THREAD_INCLUDE,
    });
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const allowed = await userCanAccessThread(req.user, thread);
    if (!allowed) return res.status(403).json({ message: "Forbidden" });

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.messages.create({
        data: {
          thread_id: threadId,
          sender_user_id: req.user.id,
          body,
        },
        include: { users: { select: { name: true } } },
      });
      await tx.message_threads.update({
        where: { id: threadId },
        data: { updated_at: new Date() },
      });
      return created;
    });

    notifyRecipient({ thread, senderUserId: req.user.id, body }).catch(() => {});

    return res.status(201).json({ data: mapMessage(message, req.user.id) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function markThreadRead(req, res) {
  try {
    const threadId = parseId(req.params.threadId);
    const thread = await prisma.message_threads.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const allowed = await userCanAccessThread(req.user, thread);
    if (!allowed) return res.status(403).json({ message: "Forbidden" });

    await prisma.messages.updateMany({
      where: {
        thread_id: threadId,
        sender_user_id: { not: req.user.id },
        read_at: null,
      },
      data: { read_at: new Date() },
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function listContacts(req, res) {
  try {
    const role = String(req.user.role ?? "").toUpperCase();

    if (role === "DOCTOR") {
      const doctorId = await resolveDoctorIdForUser(req.user);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found" });

      const [links, appts, plans] = await Promise.all([
        prisma.doctor_patient.findMany({
          where: { doctor_id: doctorId },
          include: { patients: { include: { users: { select: { id: true, name: true } } } } },
        }),
        prisma.appointments.findMany({
          where: { doctor_id: doctorId, patient_id: { not: null } },
          select: { patient_id: true, patients: { include: { users: { select: { name: true } } } } },
          distinct: ["patient_id"],
        }),
        prisma.therapy_plans.findMany({
          where: { doctor_id: doctorId, patient_id: { not: null } },
          select: { patient_id: true, patients: { include: { users: { select: { name: true } } } } },
          distinct: ["patient_id"],
        }),
      ]);

      const byPatient = new Map();

      for (const l of links) {
        byPatient.set(l.patient_id, {
          patientId: l.patient_id,
          name: l.patients?.users?.name ?? "Patient",
        });
      }
      for (const a of appts) {
        if (a.patient_id && !byPatient.has(a.patient_id)) {
          byPatient.set(a.patient_id, {
            patientId: a.patient_id,
            name: a.patients?.users?.name ?? "Patient",
          });
        }
      }
      for (const p of plans) {
        if (p.patient_id && !byPatient.has(p.patient_id)) {
          byPatient.set(p.patient_id, {
            patientId: p.patient_id,
            name: p.patients?.users?.name ?? "Patient",
          });
        }
      }

      return res.json({ items: Array.from(byPatient.values()) });
    }

    if (role === "PATIENT" || role === "FAMILY") {
      const patientId = await resolvePatientIdForUser(req.user);
      if (!patientId) return res.status(404).json({ message: "Patient profile not found" });

      const links = await prisma.doctor_patient.findMany({
        where: { patient_id: patientId },
        include: { doctors: { include: { users: { select: { id: true, name: true } } } } },
      });

      let items = links.map((l) => ({
        doctorId: l.doctor_id,
        name: l.doctors?.users?.name ?? "Doctor",
      }));

      if (items.length === 0) {
        const plan = await prisma.therapy_plans.findFirst({
          where: { patient_id: patientId, doctor_id: { not: null } },
          orderBy: { id: "desc" },
          include: { doctors: { include: { users: { select: { id: true, name: true } } } } },
        });
        if (plan?.doctor_id) {
          items = [{
            doctorId: plan.doctor_id,
            name: plan.doctors?.users?.name ?? "Doctor",
          }];
        }
      }

      return res.json({ items });
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = {
  listThreads,
  getThreadMessages,
  ensureThread,
  sendMessage,
  markThreadRead,
  listContacts,
};
