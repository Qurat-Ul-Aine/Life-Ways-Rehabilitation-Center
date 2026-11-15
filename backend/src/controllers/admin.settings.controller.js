"use strict";

const prisma = require("../lib/prisma");

const HOSPITAL_ID = "default";
const SYSTEM_ID = "default";

const VALID_DATE_FORMATS = new Set([
  "dd MMM yyyy",
  "MMM d, yyyy",
  "yyyy-MM-dd",
  "dd/MM/yyyy",
]);

const { VALID_TIMEZONES } = require("../constants/adminTimezones");

const PRISMA_SETUP_MESSAGE =
  "Settings storage is not available. Run: npx prisma generate && npx prisma migrate deploy, then restart the API server.";

function hospitalSettingsDelegate() {
  const delegate = prisma?.hospital_settings;
  if (!delegate || typeof delegate.findUnique !== "function") {
    throw new Error(PRISMA_SETUP_MESSAGE);
  }
  return delegate;
}

function systemPreferencesDelegate() {
  const delegate = prisma?.system_preferences;
  if (!delegate || typeof delegate.findUnique !== "function") {
    throw new Error(PRISMA_SETUP_MESSAGE);
  }
  return delegate;
}

function withUpdatedBy(data, userId) {
  if (userId) {
    data.updated_by = String(userId);
  }
  return data;
}

function isMissingModelError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes(PRISMA_SETUP_MESSAGE) ||
    msg.includes("Cannot read properties of undefined") ||
    msg.includes("reading 'findUnique'") ||
    msg.includes("reading 'update'") ||
    msg.includes("reading 'create'")
  );
}

async function fetchSystemRowRaw() {
  const rows = await prisma.$queryRaw`
    SELECT id, default_appointment_duration, timezone, date_format, updated_at, updated_by
    FROM system_preferences
    WHERE id = ${SYSTEM_ID}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function ensureSystemRowRaw() {
  await prisma.$executeRaw`
    INSERT INTO system_preferences (id)
    VALUES (${SYSTEM_ID})
    ON CONFLICT (id) DO NOTHING
  `;
  return fetchSystemRowRaw();
}

async function updateSystemRowRaw(data) {
  const duration = data.default_appointment_duration;
  const timezone = data.timezone;
  const dateFormat = data.date_format;
  const updatedBy = data.updated_by ?? null;

  if (updatedBy) {
    await prisma.$executeRaw`
      UPDATE system_preferences
      SET
        default_appointment_duration = COALESCE(${duration}, default_appointment_duration),
        timezone = COALESCE(${timezone}, timezone),
        date_format = COALESCE(${dateFormat}, date_format),
        updated_by = CAST(${updatedBy} AS uuid),
        updated_at = NOW()
      WHERE id = ${SYSTEM_ID}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE system_preferences
      SET
        default_appointment_duration = COALESCE(${duration}, default_appointment_duration),
        timezone = COALESCE(${timezone}, timezone),
        date_format = COALESCE(${dateFormat}, date_format),
        updated_at = NOW()
      WHERE id = ${SYSTEM_ID}
    `;
  }

  const row = await fetchSystemRowRaw();
  if (!row) {
    throw new Error("Failed to save system preferences.");
  }
  return row;
}

const HOSPITAL_DEFAULTS = {
  hospital_name: "Life Ways Rehabilitation Center",
  contact_email: "info@lifewaysrehab.com",
  contact_phone: "+92 51 234 5678",
  address: "123 Medical Complex, Blue Area, Islamabad, Pakistan",
};

function mapHospital(row) {
  if (!row) {
    return {
      hospitalName: HOSPITAL_DEFAULTS.hospital_name,
      logoUrl: null,
      contactEmail: HOSPITAL_DEFAULTS.contact_email,
      contactPhone: HOSPITAL_DEFAULTS.contact_phone,
      address: HOSPITAL_DEFAULTS.address,
      updatedAt: null,
    };
  }
  return {
    hospitalName: row.hospital_name,
    logoUrl: row.logo_url ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    address: row.address ?? null,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

function mapSystem(row) {
  if (!row) {
    return {
      defaultAppointmentDuration: 30,
      timezone: "Asia/Karachi",
      dateFormat: "dd MMM yyyy",
      updatedAt: null,
    };
  }
  return {
    defaultAppointmentDuration: row.default_appointment_duration,
    timezone: row.timezone,
    dateFormat: row.date_format,
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

async function getOrCreateHospital() {
  const hospital = hospitalSettingsDelegate();
  let row = await hospital.findUnique({ where: { id: HOSPITAL_ID } });
  if (!row) {
    row = await hospital.create({ data: { id: HOSPITAL_ID, ...HOSPITAL_DEFAULTS } });
  }
  return row;
}

async function getOrCreateSystem() {
  try {
    const system = systemPreferencesDelegate();
    let row = await system.findUnique({ where: { id: SYSTEM_ID } });
    if (!row) {
      row = await system.create({ data: { id: SYSTEM_ID } });
    }
    return row;
  } catch (err) {
    if (!isMissingModelError(err)) throw err;
    let row = await fetchSystemRowRaw();
    if (!row) row = await ensureSystemRowRaw();
    return row;
  }
}

async function mapAdminProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { id: String(userId) },
    include: { user_phones: { take: 1 } },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.user_phones?.[0]?.phone ?? "",
    avatarUrl: user.avatar_url ?? null,
    role: user.role,
  };
}

// GET /admin/settings/profile
async function getProfile(req, res) {
  try {
    const profile = await mapAdminProfile(req.user?.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }
    return res.json({ success: true, data: profile });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /admin/settings/profile
async function updateProfile(req, res) {
  try {
    const userId = String(req.user?.id ?? "");
    const { name, email, phone } = req.body ?? {};

    const data = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: "Name cannot be empty." });
      }
      data.name = trimmed.slice(0, 100);
    }
    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return res.status(400).json({ success: false, message: "Invalid email address." });
      }
      data.email = trimmed;
    }

    if (Object.keys(data).length === 0 && phone === undefined) {
      return res.status(400).json({ success: false, message: "No profile fields provided." });
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.users.update({ where: { id: userId }, data });
      }
      if (phone !== undefined) {
        const phoneVal = String(phone).trim().slice(0, 20);
        const existing = await tx.user_phones.findFirst({ where: { user_id: userId } });
        if (existing) {
          await tx.user_phones.update({ where: { id: existing.id }, data: { phone: phoneVal } });
        } else if (phoneVal) {
          await tx.user_phones.create({ data: { user_id: userId, phone: phoneVal } });
        }
      }
    });

    const profile = await mapAdminProfile(userId);
    return res.json({ success: true, data: profile });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ success: false, message: "Email already in use." });
    }
    return res.status(500).json({ success: false, message: e.message });
  }
}

// POST /admin/settings/profile-image
async function uploadProfileImage(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded." });
    }

    const imageUrl = `/uploads/avatars/admins/${file.filename}`;
    await prisma.users.update({
      where: { id: String(req.user.id) },
      data: { avatar_url: imageUrl },
    });

    return res.json({ success: true, url: imageUrl, data: { avatarUrl: imageUrl } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /settings/hospital (public) & GET /admin/settings/hospital
async function getHospital(req, res) {
  try {
    const row = await getOrCreateHospital();
    return res.json({ success: true, data: mapHospital(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /admin/settings/hospital
async function updateHospital(req, res) {
  try {
    const { hospitalName, contactEmail, contactPhone, address, logoUrl } = req.body ?? {};
    const data = withUpdatedBy({}, req.user?.id);

    if (hospitalName !== undefined) {
      const trimmed = String(hospitalName).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: "Hospital name is required." });
      }
      data.hospital_name = trimmed.slice(0, 200);
    }
    if (contactEmail !== undefined) {
      const val = String(contactEmail).trim();
      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return res.status(400).json({ success: false, message: "Invalid contact email." });
      }
      data.contact_email = val || null;
    }
    if (contactPhone !== undefined) {
      data.contact_phone = String(contactPhone).trim().slice(0, 30) || null;
    }
    if (address !== undefined) {
      data.address = String(address).trim() || null;
    }
    if (logoUrl !== undefined) {
      data.logo_url = String(logoUrl).trim() || null;
    }

    if (Object.keys(data).length === 0 || (Object.keys(data).length === 1 && "updated_by" in data)) {
      return res.status(400).json({ success: false, message: "No hospital fields provided." });
    }

    const hospital = hospitalSettingsDelegate();
    await getOrCreateHospital();
    const row = await hospital.update({
      where: { id: HOSPITAL_ID },
      data,
    });

    return res.json({ success: true, data: mapHospital(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// POST /admin/settings/hospital-logo
async function uploadHospitalLogo(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No logo uploaded." });
    }

    const logoUrl = `/uploads/hospital/${file.filename}`;
    const hospital = hospitalSettingsDelegate();
    await getOrCreateHospital();
    const row = await hospital.update({
      where: { id: HOSPITAL_ID },
      data: withUpdatedBy({ logo_url: logoUrl }, req.user?.id),
    });

    return res.json({ success: true, url: logoUrl, data: mapHospital(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /admin/settings/system
async function getSystemPreferences(req, res) {
  try {
    const row = await getOrCreateSystem();
    return res.json({ success: true, data: mapSystem(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// PATCH /admin/settings/system
async function updateSystemPreferences(req, res) {
  try {
    const { defaultAppointmentDuration, timezone, dateFormat } = req.body ?? {};
    const data = withUpdatedBy({}, req.user?.id);

    if (defaultAppointmentDuration !== undefined) {
      const mins = Number(defaultAppointmentDuration);
      if (!Number.isFinite(mins) || mins < 5 || mins > 240) {
        return res.status(400).json({
          success: false,
          message: "Appointment duration must be between 5 and 240 minutes.",
        });
      }
      data.default_appointment_duration = Math.round(mins);
    }
    if (timezone !== undefined) {
      const tz = String(timezone).trim();
      if (!VALID_TIMEZONES.has(tz)) {
        return res.status(400).json({ success: false, message: "Unsupported timezone." });
      }
      data.timezone = tz;
    }
    if (dateFormat !== undefined) {
      const fmt = String(dateFormat).trim();
      if (!VALID_DATE_FORMATS.has(fmt)) {
        return res.status(400).json({ success: false, message: "Unsupported date format." });
      }
      data.date_format = fmt;
    }

    if (Object.keys(data).length === 0 || (Object.keys(data).length === 1 && "updated_by" in data)) {
      return res.status(400).json({ success: false, message: "No system preference fields provided." });
    }

    await getOrCreateSystem();

    let row;
    try {
      const system = systemPreferencesDelegate();
      row = await system.update({
        where: { id: SYSTEM_ID },
        data,
      });
    } catch (err) {
      if (!isMissingModelError(err)) throw err;
      row = await updateSystemRowRaw(data);
    }

    return res.json({ success: true, data: mapSystem(row) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  getHospital,
  updateHospital,
  uploadHospitalLogo,
  getSystemPreferences,
  updateSystemPreferences,
};
