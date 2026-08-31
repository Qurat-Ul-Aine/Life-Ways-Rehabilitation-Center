"use strict";

const crypto = require("crypto");
const prisma = require("../lib/prisma");
const sendEmail = require("./sendEmail");

const isEmailConfigured = sendEmail.isEmailConfigured;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const GENERIC_FORGOT_MESSAGE =
  "If an account exists with this email, a password reset link has been sent.";

function getFrontendUrl() {
  const publicUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL;
  if (publicUrl) {
    return String(publicUrl).replace(/\/$/, "");
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !/localhost|127\.0\.0\.1/i.test(String(frontendUrl))) {
    return String(frontendUrl).replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://www.lifewaysrehab.com";
  }

  if (frontendUrl) {
    return String(frontendUrl).replace(/\/$/, "");
  }

  const corsOrigin = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return (corsOrigin || "http://localhost:8081").replace(/\/$/, "");
}

function buildResetPasswordLink(plainToken) {
  const base = getFrontendUrl();
  const encoded = encodeURIComponent(String(plainToken).trim());
  return `${base}/reset-password?token=${encoded}`;
}

function normalizePlainResetToken(raw) {
  if (!raw) return "";

  let token = String(raw).trim();
  try {
    token = decodeURIComponent(token);
  } catch {
    // keep raw
  }
  return token.trim().replace(/[.,)>\]}"']+$/, "");
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token).trim()).digest("hex");
}

function buildPasswordResetEmailHtml(resetLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light" />
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;">
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px 16px;">
      <h2 style="margin: 0 0 8px; font-size: 22px;">Reset your Life Ways password</h2>
      <p style="margin: 0 0 16px; font-size: 16px;">We received a request to reset your password. Tap the button below on your phone to open the reset page.</p>
      <p style="margin: 24px 0; text-align: center;">
        <a href="${resetLink}" style="background:#0f766e;color:#ffffff;padding:16px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;min-width:200px;text-align:center;-webkit-text-size-adjust:none;">
          Reset password
        </a>
      </p>
      <p style="font-size: 14px; color: #555; margin: 0 0 12px;">This link expires in <strong>1 hour</strong> and works once. If you did not request this, ignore this email.</p>
      <p style="font-size: 13px; color: #777; word-break: break-all; margin: 0;">If the button does not open on your phone, copy this link into Safari or Chrome:<br /><a href="${resetLink}" style="color:#0f766e;">${resetLink}</a></p>
    </div>
    </body>
    </html>
  `;
}

function buildDoctorWelcomeEmailHtml({ doctorName, specialization, setPasswordLink, expiresLabel }) {
  const specLine = specialization
    ? `<p>Your specialization: <strong>${specialization}</strong></p>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 560px;">
      <h2 style="margin-bottom: 8px;">Welcome to Life Ways Rehabilitation Center</h2>
      <p>Dear Dr. ${doctorName},</p>
      <p>Your doctor account has been created by our administration team. To get started, please set your password using the secure link below.</p>
      ${specLine}
      <p style="margin: 24px 0;">
        <a href="${setPasswordLink}" style="background:#0f766e;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Set your password
        </a>
      </p>
      <p style="font-size: 13px; color: #555;">
        This link expires in <strong>${expiresLabel}</strong> and can only be used once.
        After setting your password, sign in at the doctor portal once your account has been approved by admin.
      </p>
      <p style="font-size: 12px; color: #777; word-break: break-all;">
        If the button does not work, copy and paste this link into your browser:<br />${setPasswordLink}
      </p>
      <p style="font-size: 13px; color: #555; margin-top: 20px;">Regards,<br />Life Ways Rehabilitation Center</p>
    </div>
  `;
}

async function findResetTokenRecord(plainToken) {
  const trimmed = String(plainToken ?? "").trim();
  if (!trimmed) return null;

  const hashed = hashResetToken(trimmed);

  return prisma.password_reset_tokens.findFirst({
    where: {
      used: false,
      OR: [{ token: hashed }, { token: trimmed }],
    },
  });
}

async function findAnyResetTokenRecord(plainToken) {
  const trimmed = String(plainToken ?? "").trim();
  if (!trimmed) return null;

  const hashed = hashResetToken(trimmed);

  return prisma.password_reset_tokens.findFirst({
    where: {
      OR: [{ token: hashed }, { token: trimmed }],
    },
    orderBy: { created_at: "desc" },
  });
}

async function issuePasswordSetupToken(user, options = {}) {
  const ttlMs = options.ttlMs ?? RESET_TOKEN_TTL_MS;
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(plainToken);
  const expires_at = new Date(Date.now() + ttlMs);
  const resetLink = buildResetPasswordLink(plainToken);

  await prisma.$transaction(async (tx) => {
    await tx.password_reset_tokens.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true },
    });

    await tx.password_reset_tokens.create({
      data: {
        user_id: user.id,
        token: tokenHash,
        expires_at,
        used: false,
      },
    });
  });

  return {
    plainToken,
    tokenHash,
    resetLink,
    devResetLink: isDevelopment() ? resetLink : null,
    expiresMs: ttlMs,
  };
}

async function sendPasswordResetForUser(user) {
  const issued = await issuePasswordSetupToken(user, { ttlMs: RESET_TOKEN_TTL_MS });

  if (isEmailConfigured()) {
    await sendEmail(
      user.email,
      "Reset your Life Ways password",
      buildPasswordResetEmailHtml(issued.resetLink),
    );
    console.log(`[password-reset] Email dispatched for user ${user.id}`);
  } else if (isDevelopment()) {
    console.log(`[password-reset] Dev reset link: ${issued.resetLink}`);
  } else {
    await prisma.password_reset_tokens.deleteMany({ where: { token: issued.tokenHash } });
    throw new Error("EMAIL_UNAVAILABLE");
  }

  return { devResetLink: issued.devResetLink };
}

async function sendDoctorAccountCreatedEmail(user, {
  doctorName,
  specialization,
  temporaryPassword,
}) {
  const loginUrl = `${getFrontendUrl()}/login/doctor`;
  const html = buildDoctorAccountCreatedEmailHtml({
    doctorName: String(doctorName ?? user.name ?? "Doctor").trim(),
    email: String(user.email ?? "").trim(),
    temporaryPassword: String(temporaryPassword),
    specialization: specialization ? String(specialization).trim() : null,
    loginUrl,
  });

  if (isEmailConfigured()) {
    await sendEmail(
      user.email,
      "Your Life Ways doctor account — login details",
      html,
    );
    console.log(`[doctor-invite] Account email dispatched for user ${user.id}`);
  } else if (isDevelopment()) {
    console.log(
      `[doctor-invite] Dev credentials — email: ${user.email} | password: ${temporaryPassword} | login: ${loginUrl}`,
    );
  } else {
    throw new Error("EMAIL_UNAVAILABLE");
  }

  return {
    welcomeEmailSent: isEmailConfigured() || isDevelopment(),
    devLoginUrl: isDevelopment() ? loginUrl : null,
  };
}

function buildDoctorAccountCreatedEmailHtml({
  doctorName,
  email,
  temporaryPassword,
  specialization,
  loginUrl,
}) {
  const specLine = specialization
    ? `<p style="margin:0 0 12px;font-size:15px;">Specialization: <strong>${specialization}</strong></p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light" />
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;">
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111; max-width: 560px; margin: 0 auto; padding: 24px 16px;">
      <h2 style="margin: 0 0 8px; font-size: 22px;">Your Life Ways doctor account is ready</h2>
      <p style="margin: 0 0 16px; font-size: 16px;">Dear Dr. ${doctorName},</p>
      <p style="margin: 0 0 16px; font-size: 15px;">An administrator has created your doctor account on the Life Ways Rehabilitation Center portal. Use the credentials below to sign in.</p>
      ${specLine}
      <div style="margin: 20px 0; padding: 16px; border-radius: 10px; background: #ecfdf5; border: 1px solid #99f6e4;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #555;">Login email</p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; word-break: break-all;">${email}</p>
        <p style="margin: 0 0 10px; font-size: 14px; color: #555;">Temporary password</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; font-family: Consolas, Monaco, monospace;">${temporaryPassword}</p>
      </div>
      <p style="margin: 24px 0; text-align: center;">
        <a href="${loginUrl}" style="background:#0f766e;color:#ffffff;padding:16px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;min-width:200px;text-align:center;-webkit-text-size-adjust:none;">
          Open doctor login
        </a>
      </p>
      <p style="font-size: 14px; color: #555; margin: 0 0 12px;">For security, change your password after your first login from account settings.</p>
      <p style="font-size: 13px; color: #777; word-break: break-all; margin: 0;">If the button does not open on your phone, copy this link into your browser:<br /><a href="${loginUrl}" style="color:#0f766e;">${loginUrl}</a></p>
      <p style="font-size: 13px; color: #555; margin-top: 20px;">Regards,<br />Life Ways Rehabilitation Center</p>
    </div>
    </body>
    </html>
  `;
}

async function sendDoctorWelcomeInvite(user, { doctorName, specialization }) {
  const issued = await issuePasswordSetupToken(user, { ttlMs: INVITE_TOKEN_TTL_MS });
  const expiresLabel = "24 hours";

  if (isEmailConfigured()) {
    await sendEmail(
      user.email,
      "Welcome to Life Ways — Set Your Password",
      buildDoctorWelcomeEmailHtml({
        doctorName: String(doctorName ?? user.name ?? "Doctor").trim(),
        specialization: specialization ? String(specialization).trim() : null,
        setPasswordLink: issued.resetLink,
        expiresLabel,
      }),
    );
    console.log(`[doctor-invite] Welcome email dispatched for user ${user.id}`);
  } else if (isDevelopment()) {
    console.log(`[doctor-invite] Dev set-password link: ${issued.resetLink}`);
  } else {
    await prisma.password_reset_tokens.deleteMany({ where: { token: issued.tokenHash } });
    throw new Error("EMAIL_UNAVAILABLE");
  }

  return {
    inviteEmailSent: isEmailConfigured() || isDevelopment(),
    devSetPasswordLink: issued.devResetLink,
  };
}

module.exports = {
  GENERIC_FORGOT_MESSAGE,
  RESET_TOKEN_TTL_MS,
  INVITE_TOKEN_TTL_MS,
  getFrontendUrl,
  buildResetPasswordLink,
  normalizePlainResetToken,
  isDevelopment,
  hashResetToken,
  findResetTokenRecord,
  findAnyResetTokenRecord,
  issuePasswordSetupToken,
  sendPasswordResetForUser,
  sendDoctorAccountCreatedEmail,
  sendDoctorWelcomeInvite,
  buildDoctorWelcomeEmailHtml,
  buildPasswordResetEmailHtml,
};
