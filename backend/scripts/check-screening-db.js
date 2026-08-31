"use strict";

const prisma = require("../src/lib/prisma");

async function main() {
  const configCount = await prisma.screening_config.count();
  const conditionCount = await prisma.screening_conditions.count();
  const questionCount = await prisma.screening_questions.count();

  let notifError = null;
  let notifCount = null;
  try {
    notifCount = await prisma.notifications.count();
  } catch (e) {
    notifError = e.message;
  }

  const intro = await prisma.screening_config.findUnique({ where: { key: "intro" } });

  console.log(
    JSON.stringify(
      {
        configCount,
        conditionCount,
        questionCount,
        introExists: Boolean(intro),
        notifCount,
        notifError,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
