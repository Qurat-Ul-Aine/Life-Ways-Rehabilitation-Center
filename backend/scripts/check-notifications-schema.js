"use strict";

const prisma = require("../src/lib/prisma");

async function main() {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
    ORDER BY ordinal_position
  `;
  console.log("notifications columns:", JSON.stringify(cols, null, 2));

  const users = await prisma.users.findMany({
    where: { role: "PATIENT" },
    take: 3,
    select: { id: true, email: true, role: true },
  });
  console.log("patient users:", JSON.stringify(users, null, 2));

  if (users[0]) {
    try {
      const rows = await prisma.notifications.findMany({
        where: { user_id: users[0].id },
        take: 5,
      });
      console.log("notifications for user ok:", rows.length);
    } catch (e) {
      console.log("notifications query error:", e.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
