"use strict";

const prisma = require("../lib/prisma");
const { seedScreening, syncScreeningContent } = require("../../prisma/seed-screening");

let bootstrapPromise = null;

/**
 * Ensures screening intro config, conditions, questions, and guidance exist.
 * Safe to call on every server start — uses upserts; never deletes questions when data exists.
 */
async function ensureScreeningBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const conditionCount = await prisma.screening_conditions.count({
        where: { is_active: true },
      });

      if (conditionCount === 0) {
        await seedScreening(prisma);
        console.log("[bootstrap] Screening module data initialized (full seed).");
      } else {
        await syncScreeningContent(prisma);
        console.log("[bootstrap] Screening module content synced (intro, names, skip logic).");
      }
    })().catch((err) => {
      bootstrapPromise = null;
      console.error("[bootstrap] Screening bootstrap failed:", err.message);
      throw err;
    });
  }
  return bootstrapPromise;
}

module.exports = { ensureScreeningBootstrap };
