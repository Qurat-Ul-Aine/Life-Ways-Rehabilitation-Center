const { PrismaClient } = require("../../generated/prisma-client");

const prisma = new PrismaClient();

const REQUIRED_MODELS = [
  "hospital_settings",
  "system_preferences",
  "user_preferences",
  "staff_documents",
  "staff_attendance",
  "staff_tasks",
  "staff_notes",
];

function assertPrismaModels() {
  const missing = REQUIRED_MODELS.filter(
    (model) => !prisma[model] || typeof prisma[model].findUnique !== "function",
  );
  if (missing.length > 0) {
    console.error(
      `[Prisma] Missing models: ${missing.join(", ")}. Run: npx prisma generate && npx prisma migrate deploy, then restart the API server.`,
    );
    process.exit(1);
  }
}

assertPrismaModels();

module.exports = prisma;