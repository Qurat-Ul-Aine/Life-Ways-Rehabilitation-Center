const prisma = require("../lib/prisma");
const { notifyDoctorPatientAssignment } = require("./notification.service");
const { assertApprovedActiveDoctor } = require("../utils/doctorApproval");

const SLOT_MINUTES = 30;

const toDate = (raw) => {
  if (!raw) return null;
  const str = String(raw);
  const d = str.length === 10 ? new Date(str + "T12:00:00.000Z") : new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatTime = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const addMinutesToTime = (timeStr, minutes) => {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

const timesOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && bStart < aEnd;

async function findServiceByIdOrSlug({ serviceId, serviceSlug }) {
  if (serviceId) {
    return prisma.rehabilitation_services.findFirst({
      where: { id: String(serviceId), is_active: true },
    });
  }
  if (serviceSlug) {
    return prisma.rehabilitation_services.findFirst({
      where: { slug: String(serviceSlug).trim(), is_active: true },
    });
  }
  return null;
}

async function doctorProvidesService(doctorId, serviceId) {
  const row = await prisma.doctor_service.findUnique({
    where: {
      doctor_id_service_id: {
        doctor_id: String(doctorId),
        service_id: String(serviceId),
      },
    },
  });
  return Boolean(row);
}

async function isSlotAvailable(doctorId, dateRaw, timeRaw, excludeId = null) {
  const time = formatTime(toTimeValue(timeRaw));
  if (!time) return false;

  const startLabel = time;
  const endLabel = addMinutesToTime(startLabel, SLOT_MINUTES);

  const booked = await prisma.appointments.findMany({
    where: {
      doctor_id: String(doctorId),
      appointment_date: toDate(dateRaw),
      status: { not: "CANCELLED" },
      ...(excludeId ? { id: { not: String(excludeId) } } : {}),
    },
    select: { appointment_time: true },
  });

  return !booked.some((b) => {
    const bStart = formatTime(b.appointment_time);
    if (!bStart) return false;
    const bEnd = addMinutesToTime(bStart, SLOT_MINUTES);
    return timesOverlap(startLabel, endLabel, bStart, bEnd);
  });
}

function toTimeValue(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const match24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(parseInt(match24[1], 10));
    d.setUTCMinutes(parseInt(match24[2], 10));
    return d;
  }
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const d = new Date("1970-01-01T00:00:00.000Z");
    d.setUTCHours(h);
    d.setUTCMinutes(m);
    return d;
  }
  return null;
}

async function listDoctorsForService(serviceId, { bookableOnly = true } = {}) {
  return prisma.doctors.findMany({
    where: {
      ...(bookableOnly ? { is_approved: true, users: { is_active: true } } : {}),
      doctor_service: { some: { service_id: String(serviceId) } },
    },
    include: {
      users: { select: { name: true, email: true, is_active: true } },
    },
    orderBy: { users: { name: "asc" } },
  });
}

/**
 * Pick a doctor for a service. Validates explicit doctorId or auto-selects by load + slot.
 */
async function resolveDoctorForBooking(serviceId, { doctorId, date, time, excludeAppointmentId } = {}) {
  if (doctorId) {
    const doctor = await prisma.doctors.findUnique({
      where: { id: String(doctorId) },
      include: { users: { select: { is_active: true } } },
    });
    if (!doctor) {
      const err = new Error("Doctor not found");
      err.status = 404;
      throw err;
    }
    if (!doctor.is_approved || !doctor.users?.is_active) {
      const err = new Error("Selected doctor is not available for booking");
      err.status = 400;
      throw err;
    }
    const provides = await doctorProvidesService(doctor.id, serviceId);
    if (!provides) {
      const err = new Error("Selected doctor does not provide this rehabilitation service");
      err.status = 400;
      throw err;
    }
    if (date && time) {
      const available = await isSlotAvailable(doctor.id, date, time, excludeAppointmentId);
      if (!available) {
        const err = new Error("This time slot is no longer available");
        err.status = 409;
        throw err;
      }
    }
    return doctor.id;
  }

  const doctors = await listDoctorsForService(serviceId);
  if (!doctors.length) {
    const err = new Error("No doctors are assigned to this rehabilitation service");
    err.status = 404;
    throw err;
  }

  let pool = doctors.map((d) => d.id);

  if (date && time) {
    const available = [];
    for (const id of pool) {
      if (await isSlotAvailable(id, date, time, excludeAppointmentId)) {
        available.push(id);
      }
    }
    if (!available.length) {
      const err = new Error("No doctors are available for this service at the selected time");
      err.status = 409;
      throw err;
    }
    pool = available;
  }

  const counts = await prisma.appointments.groupBy({
    by: ["doctor_id"],
    where: {
      doctor_id: { in: pool },
      status: { not: "CANCELLED" },
    },
    _count: { doctor_id: true },
  });

  const countMap = new Map(counts.map((c) => [c.doctor_id, c._count.doctor_id]));
  pool.sort((a, b) => (countMap.get(a) ?? 0) - (countMap.get(b) ?? 0));
  return pool[0];
}

async function ensureDoctorPatientLink(doctorId, patientId, tx = prisma) {
  await assertApprovedActiveDoctor(tx, doctorId, { assignment: true });

  const existing = await tx.doctor_patient.findUnique({
    where: {
      doctor_id_patient_id: {
        doctor_id: String(doctorId),
        patient_id: String(patientId),
      },
    },
  });
  if (existing) return false;

  await tx.doctor_patient.create({
    data: {
      doctor_id: String(doctorId),
      patient_id: String(patientId),
    },
  });
  return true;
}

async function upsertPatientService(patientId, serviceId, subService, tx = prisma) {
  const service = await tx.rehabilitation_services.findUnique({
    where: { id: String(serviceId) },
    select: { title: true },
  });

  await tx.patient_services.upsert({
    where: { patient_id: String(patientId) },
    create: {
      patient_id: String(patientId),
      service_id: String(serviceId),
      sub_service: subService ? String(subService) : null,
    },
    update: {
      service_id: String(serviceId),
      sub_service: subService ? String(subService) : null,
      selected_at: new Date(),
    },
  });

  if (service?.title) {
    await tx.patients.update({
      where: { id: String(patientId) },
      data: { condition: service.title },
    });
  }
}

async function assignPatientToDoctorForBooking({ patientId, doctorId, serviceId, subService }) {
  let linkCreated = false;
  await prisma.$transaction(async (tx) => {
    linkCreated = await ensureDoctorPatientLink(doctorId, patientId, tx);
    await upsertPatientService(patientId, serviceId, subService, tx);
  });

  if (linkCreated) {
    await notifyDoctorPatientAssignment({
      doctorId,
      patientId,
      event: "assigned",
    });
  }
}

async function setDoctorServices(doctorId, serviceIds) {
  const ids = [...new Set((serviceIds ?? []).map(String))];

  if (ids.length) {
    const found = await prisma.rehabilitation_services.count({
      where: { id: { in: ids }, is_active: true },
    });
    if (found !== ids.length) {
      const err = new Error("One or more rehabilitation services are invalid");
      err.status = 400;
      throw err;
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.doctor_service.deleteMany({ where: { doctor_id: String(doctorId) } });
    if (ids.length) {
      await tx.doctor_service.createMany({
        data: ids.map((service_id) => ({
          doctor_id: String(doctorId),
          service_id,
        })),
        skipDuplicates: true,
      });
    }
    return tx.doctors.findUnique({
      where: { id: String(doctorId) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
            user_phones: { select: { phone: true } },
          },
        },
        doctor_service: {
          include: {
            rehabilitation_services: {
              select: { id: true, slug: true, title: true },
            },
          },
        },
      },
    });
  });
}

module.exports = {
  findServiceByIdOrSlug,
  doctorProvidesService,
  isSlotAvailable,
  listDoctorsForService,
  resolveDoctorForBooking,
  ensureDoctorPatientLink,
  upsertPatientService,
  assignPatientToDoctorForBooking,
  setDoctorServices,
};
