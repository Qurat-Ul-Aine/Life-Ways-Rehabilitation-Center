const { PrismaClient } = require("../generated/prisma-client");
const bcrypt = require("bcryptjs");
const REHAB_SERVICES = require("./rehabilitation-services.data");
const seedScreening = require("./seed-screening");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Admin@1234", 10);

  await prisma.users.upsert({
    where: { email: "admin@lifeways.com" },
    update: {
      name: "Super Admin",
      role: "ADMIN",
      password,
    },
    create: {
      email: "admin@lifeways.com",
      name: "Super Admin",
      role: "ADMIN",
      password,
    },
  });

  for (const service of REHAB_SERVICES) {
    await prisma.rehabilitation_services.upsert({
      where: { slug: service.slug },
      update: {
        title: service.title,
        description: service.description,
        is_active: true,
      },
      create: {
        slug: service.slug,
        title: service.title,
        description: service.description,
        is_active: true,
      },
    });
  }

  console.log(`Seeded ${REHAB_SERVICES.length} rehabilitation services.`);
  await seedScreening.seedScreening(prisma);
  console.log("Seeded screening conditions and questions.");
}

main()
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
