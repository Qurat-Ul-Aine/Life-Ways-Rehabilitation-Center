"use strict";

const prisma = require("../src/lib/prisma");

async function main() {
  const user = await prisma.users.findFirst({
    where: { role: "PATIENT", is_active: true },
    select: { id: true, email: true },
  });
  if (!user) {
    console.log("no patient user");
    return;
  }

  const rows = await prisma.notifications.findMany({
    where: { user_id: user.id },
    take: 5,
  });
  const count = await prisma.notifications.count({
    where: {
      user_id: user.id,
      OR: [{ status: { not: "read" } }, { is_read: false }],
    },
  });
  console.log(JSON.stringify({ email: user.email, rows: rows.length, unread: count, ok: true }));
}

main()
  .catch((e) => {
    console.error("FAIL", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
