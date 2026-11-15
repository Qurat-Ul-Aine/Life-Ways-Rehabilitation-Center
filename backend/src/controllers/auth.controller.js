const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");
const { validatePassword } = require("../utils/passwordPolicy");
const { hasPermission, normalizeRole, ROLES } = require("../policies/accessPolicy");
const {
  GENERIC_FORGOT_MESSAGE,
  isDevelopment,
  findResetTokenRecord,
  findAnyResetTokenRecord,
  sendPasswordResetForUser,
  normalizePlainResetToken,
} = require("../utils/passwordReset");
const { SECURITY_QUESTION_CATALOG, getQuestionLabel } = require("../constants/securityQuestions");
const {
  saveUserSecurityQuestions,
  getUserSecurityQuestionPrompts,
  verifyUserSecurityAnswers,
  issueResetTokenAfterSecurityVerification,
  REQUIRED_QUESTION_COUNT,
} = require("../utils/securityQuestions");

const SUSPENDED_MESSAGE =
  "Your account has been suspended. Please contact the administrator.";

/** Public sign-up: only Patient and Family Member. Doctor/Staff/Admin are created by admin. */
const PUBLIC_REGISTER_ROLES = Object.freeze(["PATIENT", "FAMILY"]);

function resolvePublicRegisterRole(role) {
  const normalized = String(role ?? "PATIENT").toUpperCase();
  if (!PUBLIC_REGISTER_ROLES.includes(normalized)) {
    return {
      ok: false,
      message:
        "Invalid registration role. Only Patient or Family Member accounts can be created here. Doctor and staff accounts are created by an administrator.",
    };
  }
  return { ok: true, role: normalized };
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const {
      name, email, password, role,
      phone,
      dateOfBirth, gender, address,
      emergencyContactName, emergencyContactPhone,
    } = req.body ?? {};

    if (!name || !email || !password) {
      return sendError(res, 400, "Name, email and password are required.");
    }

    try {
      validatePassword(password);
    } catch (err) {
      return sendError(res, err.status ?? 400, err.message);
    }

    const roleResult = resolvePublicRegisterRole(role);
    if (!roleResult.ok) {
      return sendError(res, 400, roleResult.message);
    }
    const storedRole = roleResult.role;

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return sendError(res, 409, "This email is already registered.");
    }

    const hash = await bcrypt.hash(String(password), 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.users.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hash,
        role: storedRole,
      },
    });

      if (phone) {
        await tx.user_phones.create({
          data: { user_id: created.id, phone: String(phone).trim() },
        });
      }

      if (storedRole === "PATIENT") {
        const dob = dateOfBirth ? new Date(dateOfBirth) : null;
        const validDob = dob && !Number.isNaN(dob.getTime()) ? dob : null;
        const computedAge = validDob
          ? Math.floor((Date.now() - validDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        const patient = await tx.patients.create({
          data: {
            user_id: created.id,
            gender: gender ? String(gender).trim().toLowerCase() : null,
            date_of_birth: validDob,
            age: computedAge,
            emergency_contact_name: emergencyContactName
              ? String(emergencyContactName).trim()
              : null,
            emergency_contact_phone: emergencyContactPhone
              ? String(emergencyContactPhone).trim()
              : null,
            status: "active",
          },
        });

        if (address) {
          await tx.patient_addresses.create({
            data: {
              patient_id: patient.id,
              address: String(address).trim(),
            },
          });
        }

        await tx.patient_admissions.create({
          data: {
            patient_id: patient.id,
            admission_date: new Date(),
          },
        });
      }

      return created;
    });

    const securityQuestions = req.body?.securityQuestions ?? req.body?.security_questions;
    if (Array.isArray(securityQuestions) && securityQuestions.length > 0) {
      try {
        await saveUserSecurityQuestions(user.id, securityQuestions);
      } catch (sqErr) {
        return sendError(res, sqErr.status ?? 400, sqErr.message);
      }
    }

    return sendSuccess(res, 201, "Registration successful. Please sign in to continue.", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Registration failed.");
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required.");
    }

    const user = await prisma.users.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(String(password), user.password))) {
      return sendError(res, 401, "Invalid email or password.");
    }

    if (user.is_active === false) {
      return sendError(res, 403, SUSPENDED_MESSAGE);
    }

    let is_approved = true;

    if (user.role === "DOCTOR") {
      const doctor = await prisma.doctors.findFirst({
        where: { user_id: user.id },
      });

      if (!doctor) {
        return sendError(res, 403, "Doctor profile not found. Contact admin.");
      }

      if (!doctor.is_approved) {
        return sendError(res, 403, "Your account is pending admin approval. Please wait for admin to approve your account.");
      }

      is_approved = doctor.is_approved;
    }

    return sendSuccess(res, 200, "Login successful.", {
      token: signToken({ id: user.id, email: user.email, role: user.role }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: String(user.role).toLowerCase(),
        is_approved,
      },
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Login failed.");
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized.");

    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, created_at: true, is_active: true },
    });

    if (!user) return sendError(res, 404, "User not found.");

    if (user.is_active === false) {
      return sendError(res, 403, SUSPENDED_MESSAGE);
    }

    let is_approved = true;
    if (user.role === "DOCTOR") {
      const doctor = await prisma.doctors.findFirst({ where: { user_id: user.id } });
      is_approved = doctor?.is_approved ?? false;
    }

    return sendSuccess(res, 200, "OK", {
      user: {
        ...user,
        role: String(user.role).toLowerCase(),
        is_approved,
      },
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Error fetching user.");
  }
}

// ─── PUT /auth/change-password ────────────────────────────────────────────────
async function changePassword(req, res) {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized.");

    const { oldPassword, newPassword } = req.body ?? {};
    if (!oldPassword || !newPassword) {
      return sendError(res, 400, "oldPassword and newPassword are required.");
    }
    try {
      validatePassword(newPassword);
    } catch (err) {
      return sendError(res, err.status ?? 400, err.message);
    }

    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user) return sendError(res, 404, "User not found.");

    const match = await bcrypt.compare(String(oldPassword), user.password);
    if (!match) return sendError(res, 400, "Old password is incorrect.");

    const hash = await bcrypt.hash(String(newPassword), 10);
    await prisma.users.update({ where: { id: req.user.id }, data: { password: hash } });

    return sendSuccess(res, 200, "Password changed successfully.");
  } catch (err) {
    return sendError(res, 500, err.message ?? "Error changing password.");
  }
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
async function forgotPassword(req, res) {
  try {
    const { email } = req.body ?? {};
    if (!email) return sendError(res, 400, "Email is required.");

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.users.findUnique({ where: { email: normalizedEmail } });

    let devResetLink = null;

    if (user && user.is_active !== false) {
      try {
        const result = await sendPasswordResetForUser(user);
        devResetLink = result.devResetLink;
      } catch (err) {
        console.error("[password-reset] Unable to issue reset link:", err.message);
      }
    }

    const responseData = isDevelopment() && devResetLink ? { devResetLink } : undefined;

    return sendSuccess(res, 200, GENERIC_FORGOT_MESSAGE, responseData);
  } catch (err) {
    return sendError(res, 500, err.message ?? "Password reset request failed.");
  }
}

// GET /auth/validate-reset-token/:token
async function validateResetToken(req, res) {
  try {
    const plainToken = normalizePlainResetToken(req.params.token);

    if (!plainToken) {
      return sendSuccess(res, 200, "OK", { valid: false, expired: false });
    }

    const resetToken = await findResetTokenRecord(plainToken);

    if (!resetToken) {
      const anyMatch = await findAnyResetTokenRecord(plainToken);
      if (anyMatch?.used) {
        return sendSuccess(res, 200, "OK", { valid: false, expired: false, used: true });
      }
      return sendSuccess(res, 200, "OK", { valid: false, expired: false });
    }

    if (new Date() > resetToken.expires_at) {
      await prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return sendSuccess(res, 200, "OK", { valid: false, expired: true });
    }

    const user = await prisma.users.findUnique({ where: { id: resetToken.user_id } });
    if (!user || user.is_active === false) {
      return sendSuccess(res, 200, "OK", { valid: false, expired: false });
    }

    return sendSuccess(res, 200, "OK", {
      valid: true,
      expired: false,
      role: user.role ? String(user.role).toLowerCase() : null,
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Unable to validate reset link.");
  }
}

// ─── POST /auth/reset-password ────────────────────────────────────────────────
async function resetPassword(req, res) {
  try {
    const plainToken = normalizePlainResetToken(req.body?.token);
    const newPassword = req.body?.newPassword;

    if (!plainToken || !newPassword) {
      return sendError(res, 400, "Token and new password are required.");
    }

    try {
      validatePassword(newPassword);
    } catch (err) {
      return sendError(res, err.status ?? 400, err.message);
    }

    const resetToken = await findResetTokenRecord(plainToken);

    if (!resetToken) return sendError(res, 400, "Invalid or expired reset link.");
    if (new Date() > resetToken.expires_at) {
      await prisma.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return sendError(res, 400, "Reset link has expired. Please request a new one.");
    }

    const user = await prisma.users.findUnique({ where: { id: resetToken.user_id } });
    if (!user || user.is_active === false) {
      return sendError(res, 400, "Invalid or expired reset link.");
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: resetToken.user_id },
        data: { password: hashedPassword },
      });
      await tx.password_reset_tokens.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      await tx.password_reset_tokens.updateMany({
        where: {
          user_id: resetToken.user_id,
          used: false,
        },
        data: { used: true },
      });
    });

    return sendSuccess(res, 200, "Password reset successful.");
  } catch (err) {
    return sendError(res, 500, err.message ?? "Reset password failed.");
  }
}

// GET /auth/security-questions/catalog 
async function getSecurityQuestionCatalog(req, res) {
  return sendSuccess(res, 200, "OK", { questions: SECURITY_QUESTION_CATALOG });
}

// POST /auth/forgot-password/security-questions
async function getResetSecurityQuestions(req, res) {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) return sendError(res, 400, "Email is required.");

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || user.is_active === false) {
      return sendError(
        res,
        404,
        "Security questions are not configured for this account. Please use email verification instead.",
      );
    }

    const prompts = await getUserSecurityQuestionPrompts(user.id);
    if (prompts.length < REQUIRED_QUESTION_COUNT) {
      return sendError(
        res,
        404,
        "Security questions are not configured for this account. Please use email verification instead.",
      );
    }

    return sendSuccess(res, 200, "OK", {
      questions: prompts.map((p) => ({
        key: p.question_key,
        label: getQuestionLabel(p.question_key),
      })),
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Unable to load security questions.");
  }
}

// POST /auth/verify-security-answers — verify answers 
async function verifySecurityAnswersForReset(req, res) {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const answers = req.body?.answers ?? req.body?.securityAnswers;

    if (!email) return sendError(res, 400, "Email is required.");
    if (!Array.isArray(answers) || answers.length < REQUIRED_QUESTION_COUNT) {
      return sendError(res, 400, `Please answer all ${REQUIRED_QUESTION_COUNT} security questions.`);
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || user.is_active === false) {
      return sendError(res, 400, "Verification failed. Please check your answers or use email reset.");
    }

    const verified = await verifyUserSecurityAnswers(user.id, answers);
    if (!verified) {
      return sendError(res, 400, "Verification failed. Please check your answers and try again.");
    }

    const issued = await issueResetTokenAfterSecurityVerification(user);
    const responseData = {
      resetToken: issued.resetToken,
      ...(isDevelopment() && issued.devResetLink ? { devResetLink: issued.devResetLink } : {}),
    };

    return sendSuccess(
      res,
      200,
      "Identity verified. You may now set a new password.",
      responseData,
    );
  } catch (err) {
    return sendError(res, 500, err.message ?? "Verification failed.");
  }
}

// GET /auth/security-questions/me — which questions the user has configured
async function getMySecurityQuestions(req, res) {
  try {
    if (!req.user?.id) return sendError(res, 401, "Unauthorized.");

    const prompts = await getUserSecurityQuestionPrompts(req.user.id);
    return sendSuccess(res, 200, "OK", {
      configured: prompts.length >= REQUIRED_QUESTION_COUNT,
      questions: prompts.map((p) => ({
        key: p.question_key,
        label: getQuestionLabel(p.question_key),
      })),
      catalog: SECURITY_QUESTION_CATALOG,
      requiredCount: REQUIRED_QUESTION_COUNT,
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Unable to load security questions.");
  }
}

// PUT /auth/security-questions/me — set or update security questions (authenticated)
async function setMySecurityQuestions(req, res) {
  try {
    if (!req.user?.id) return sendError(res, 401, "Unauthorized.");

    const answers = req.body?.answers ?? req.body?.securityQuestions;
    await saveUserSecurityQuestions(req.user.id, answers);

    return sendSuccess(res, 200, "Security questions saved successfully.");
  } catch (err) {
    return sendError(res, err.status ?? 500, err.message ?? "Failed to save security questions.");
  }
}

// ─── PATCH /auth/admin/users/:id/disable ─────────────────────────────────────
async function disableAccount(req, res) {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized.");
    if (req.user.role !== "ADMIN") return sendError(res, 403, "Forbidden.");

    const userId = req.params.id;
    if (userId === req.user.id) {
      return sendError(res, 400, "You cannot suspend your own account.");
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 404, "User not found.");

    if (user.is_active === false) {
      return sendSuccess(res, 200, "Account is already suspended.");
    }

    await prisma.users.update({ where: { id: userId }, data: { is_active: false } });

    return sendSuccess(res, 200, "Account suspended successfully.");
  } catch (err) {
    return sendError(res, 500, err.message ?? "Error suspending account.");
  }
}

// ─── PATCH /auth/admin/users/:id/enable ──────────────────────────────────────
async function enableAccount(req, res) {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized.");
    if (req.user.role !== "ADMIN") return sendError(res, 403, "Forbidden.");

    const userId = req.params.id;
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 404, "User not found.");

    if (user.is_active !== false) {
      return sendSuccess(res, 200, "Account is already active.");
    }

    await prisma.users.update({ where: { id: userId }, data: { is_active: true } });

    return sendSuccess(res, 200, "Account reactivated successfully.");
  } catch (err) {
    return sendError(res, 500, err.message ?? "Error reactivating account.");
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────
async function logout(req, res) {
  return sendSuccess(res, 200, "Logged out");
}

// GET /auth/admin/users — list portal users (e.g. family accounts tab in admin)
async function listUsers(req, res) {
  try {
    if (!hasPermission(req.user?.role, "users:manage_roles")) {
      return sendError(res, 403, "Forbidden");
    }

    const search = String(req.query.search ?? "").trim();
    const roleFilter = req.query.role ? normalizeRole(req.query.role) : null;

    const where = {};
    if (roleFilter && ROLES.includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    return sendSuccess(res, 200, "OK", {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: String(u.role).toLowerCase(),
        isActive: u.is_active !== false,
        createdAt: u.created_at,
      })),
    });
  } catch (err) {
    return sendError(res, 500, err.message ?? "Failed to list users.");
  }
}

module.exports = {
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getSecurityQuestionCatalog,
  getResetSecurityQuestions,
  verifySecurityAnswersForReset,
  getMySecurityQuestions,
  setMySecurityQuestions,
  disableAccount,
  enableAccount,
  listUsers,
  logout,
};