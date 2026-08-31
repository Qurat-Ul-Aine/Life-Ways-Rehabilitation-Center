"use strict";

const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const {
  REQUIRED_QUESTION_COUNT,
  VALID_KEYS,
  normalizeAnswer,
} = require("../constants/securityQuestions");
const { issuePasswordSetupToken, RESET_TOKEN_TTL_MS } = require("./passwordReset");

async function hashAnswer(answer) {
  return bcrypt.hash(normalizeAnswer(answer), 10);
}

async function verifyAnswer(plain, hash) {
  return bcrypt.compare(normalizeAnswer(plain), hash);
}

function validateQuestionPayload(answers) {
  if (!Array.isArray(answers) || answers.length !== REQUIRED_QUESTION_COUNT) {
    throw Object.assign(
      new Error(`Please provide exactly ${REQUIRED_QUESTION_COUNT} security questions.`),
      { status: 400 },
    );
  }

  const keys = answers.map((a) => String(a.questionKey ?? a.question_key ?? "").trim());
  if (new Set(keys).size !== keys.length) {
    throw Object.assign(new Error("Each security question must be unique."), { status: 400 });
  }

  for (const item of answers) {
    const key = String(item.questionKey ?? item.question_key ?? "").trim();
    const answer = item.answer;
    if (!VALID_KEYS.has(key)) {
      throw Object.assign(new Error("Invalid security question selected."), { status: 400 });
    }
    if (!answer || String(answer).trim().length < 2) {
      throw Object.assign(new Error("Security answers must be at least 2 characters."), {
        status: 400,
      });
    }
  }

  return answers.map((item) => ({
    questionKey: String(item.questionKey ?? item.question_key).trim(),
    answer: String(item.answer),
  }));
}

async function saveUserSecurityQuestions(userId, answers) {
  const validated = validateQuestionPayload(answers);

  await prisma.$transaction(async (tx) => {
    await tx.user_security_questions.deleteMany({ where: { user_id: userId } });

    for (const item of validated) {
      const answer_hash = await hashAnswer(item.answer);
      await tx.user_security_questions.create({
        data: {
          user_id: userId,
          question_key: item.questionKey,
          answer_hash,
        },
      });
    }
  });
}

async function getUserSecurityQuestionPrompts(userId) {
  const rows = await prisma.user_security_questions.findMany({
    where: { user_id: userId },
    select: { question_key: true },
    orderBy: { id: "asc" },
  });
  return rows;
}

async function verifyUserSecurityAnswers(userId, answers) {
  const stored = await prisma.user_security_questions.findMany({
    where: { user_id: userId },
  });

  if (stored.length < REQUIRED_QUESTION_COUNT) {
    return false;
  }

  const answerMap = new Map(
    answers.map((a) => [
      String(a.questionKey ?? a.question_key).trim(),
      String(a.answer ?? ""),
    ]),
  );

  for (const row of stored) {
    const provided = answerMap.get(row.question_key);
    if (!provided) return false;
    const ok = await verifyAnswer(provided, row.answer_hash);
    if (!ok) return false;
  }

  return true;
}

async function issueResetTokenAfterSecurityVerification(user) {
  const issued = await issuePasswordSetupToken(user, { ttlMs: RESET_TOKEN_TTL_MS });
  return {
    resetToken: issued.plainToken,
    devResetLink: issued.devResetLink,
  };
}

module.exports = {
  saveUserSecurityQuestions,
  getUserSecurityQuestionPrompts,
  verifyUserSecurityAnswers,
  issueResetTokenAfterSecurityVerification,
  REQUIRED_QUESTION_COUNT,
};
