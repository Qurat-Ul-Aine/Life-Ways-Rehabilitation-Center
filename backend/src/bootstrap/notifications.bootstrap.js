"use strict";

/**
 * Previously aligned notification columns on PostgreSQL at startup.
 * MySQL schema is created via `prisma db push`, so this is a no-op.
 */
async function ensureNotificationsSchema() {
  return;
}

module.exports = { ensureNotificationsSchema };
