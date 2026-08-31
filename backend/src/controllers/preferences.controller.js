"use strict";

const prisma = require("../lib/prisma");

const DEFAULTS = {
  appointmentNotifications: true,
  medicationReminders: true,
  recoveryNotifications: true,
  sessionNotifications: true,
  patientUpdates: true,
  emailNotifications: true,
  inAppNotifications: true,
  doctorRegistrationNotifications: true,
  patientRegistrationNotifications: true,
  telehealthNotifications: true,
  profileVisibility: "care_team",
  dataSharing: true,
  theme: "system",
};

function preferencesDelegate() {
  const delegate = prisma?.user_preferences;
  if (!delegate || typeof delegate.findUnique !== "function") {
    throw new Error(
      "Preferences storage is not available. Run: npx prisma generate && npx prisma migrate deploy, then restart the API server.",
    );
  }
  return delegate;
}

function mapPreferences(row) {
  if (!row) return { ...DEFAULTS };
  return {
    appointmentNotifications: row.appointment_notifications,
    medicationReminders: row.medication_reminders,
    recoveryNotifications: row.recovery_notifications,
    sessionNotifications: row.session_notifications,
    patientUpdates: row.patient_updates,
    emailNotifications: row.email_notifications,
    inAppNotifications: row.in_app_notifications,
    doctorRegistrationNotifications: row.doctor_registration_notifications ?? true,
    patientRegistrationNotifications: row.patient_registration_notifications ?? true,
    telehealthNotifications: row.telehealth_notifications ?? true,
    profileVisibility: row.profile_visibility,
    dataSharing: row.data_sharing,
    theme: row.theme,
  };
}

async function getOrCreate(userId) {
  const db = preferencesDelegate();
  let row = await db.findUnique({ where: { user_id: String(userId) } });
  if (!row) {
    row = await db.create({
      data: { user_id: String(userId) },
    });
  }
  return row;
}

async function getMine(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const row = await getOrCreate(req.user.id);
    return res.json({ success: true, data: mapPreferences(row) });
  } catch (e) {
    console.error("[preferences.getMine]", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function updateMine(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const body = req.body ?? {};
    const data = {};

    if (body.appointmentNotifications !== undefined) {
      data.appointment_notifications = Boolean(body.appointmentNotifications);
    }
    if (body.medicationReminders !== undefined) {
      data.medication_reminders = Boolean(body.medicationReminders);
    }
    if (body.recoveryNotifications !== undefined) {
      data.recovery_notifications = Boolean(body.recoveryNotifications);
    }
    if (body.sessionNotifications !== undefined) {
      data.session_notifications = Boolean(body.sessionNotifications);
    }
    if (body.patientUpdates !== undefined) {
      data.patient_updates = Boolean(body.patientUpdates);
    }
    if (body.emailNotifications !== undefined) {
      data.email_notifications = Boolean(body.emailNotifications);
    }
    if (body.inAppNotifications !== undefined) {
      data.in_app_notifications = Boolean(body.inAppNotifications);
    }
    if (body.doctorRegistrationNotifications !== undefined) {
      data.doctor_registration_notifications = Boolean(body.doctorRegistrationNotifications);
    }
    if (body.patientRegistrationNotifications !== undefined) {
      data.patient_registration_notifications = Boolean(body.patientRegistrationNotifications);
    }
    if (body.telehealthNotifications !== undefined) {
      data.telehealth_notifications = Boolean(body.telehealthNotifications);
    }
    if (body.profileVisibility !== undefined) {
      const v = String(body.profileVisibility).toLowerCase();
      if (!["public", "care_team", "private"].includes(v)) {
        return res.status(400).json({ success: false, message: "Invalid profile visibility." });
      }
      data.profile_visibility = v;
    }
    if (body.dataSharing !== undefined) {
      data.data_sharing = Boolean(body.dataSharing);
    }
    if (body.theme !== undefined) {
      const t = String(body.theme).toLowerCase();
      if (!["light", "dark", "system"].includes(t)) {
        return res.status(400).json({ success: false, message: "Invalid theme." });
      }
      data.theme = t;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No preference fields provided." });
    }

    const db = preferencesDelegate();
    const row = await db.upsert({
      where: { user_id: String(req.user.id) },
      create: { user_id: String(req.user.id), ...data },
      update: data,
    });

    return res.json({ success: true, data: mapPreferences(row) });
  } catch (e) {
    console.error("[preferences.updateMine]", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getMine, updateMine, DEFAULTS };
