"use strict";

const { ensureNotificationsSchema } = require("../src/bootstrap/notifications.bootstrap");
const prisma = require("../src/lib/prisma");

ensureNotificationsSchema()
  .then(async () => {
    const count = await prisma.notifications.count();
    const user = await prisma.users.findFirst({ where: { role: "PATIENT" } });
    if (user) {
      const rows = await prisma.notifications.findMany({
        where: { user_id: user.id },
        take: 3,
      });
      console.log(JSON.stringify({ ok: true, notifCount: count, patientRows: rows.length }));
    } else {
      console.log(JSON.stringify({ ok: true, notifCount: count }));
    }
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
