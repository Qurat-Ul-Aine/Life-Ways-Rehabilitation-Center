"use strict";

const prisma = require("../lib/prisma");

let schemaPromise = null;

/**
 * Adds notification columns expected by Prisma when an older DB schema is missing them.
 * Idempotent — safe on every server start.
 */
async function ensureNotificationsSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(200);
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" BOOLEAN DEFAULT false;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_role" "user_role";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "related_id" UUID;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications"("status");
      `);
    })().catch((err) => {
      schemaPromise = null;
      console.error("[bootstrap] notifications schema alignment failed:", err.message);
      throw err;
    });
  }
  return schemaPromise;
}

module.exports = { ensureNotificationsSchema };
