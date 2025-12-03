import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seed...');

  // 1. Create the Master Admin (YOU)
  // Replace these details with your actual login info
  const adminEmail = "admin@monthaven.com"; // Change this!
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Monthaven Admin",
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Admin User Created: ${admin.email} (${admin.id})`);

  // 2. Create standard Agent users (for testing permissions later)
  const agent1 = await prisma.user.upsert({
    where: { email: "devin@monthavencapital.com" },
    update: {},
    create: {
      email: "devin@monthavencapital.com",
      name: "Devin Cable",
      role: UserRole.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: "agent@monthaven.com" },
    update: {},
    create: {
      email: "agent@monthaven.com",
      name: "Sales Agent 01",
      role: UserRole.AGENT,
    },
  });

  console.log(`✅ Agent Users Created: ${agent1.email}, ${agent2.email}`);

  // 3. Seed some initial DNC numbers (Safety/Compliance)
  const dncNumbers = ["+15550000000", "+15559998888"];
  
  for (const phone of dncNumbers) {
    await prisma.dncList.upsert({
      where: { phoneE164: phone },
      update: {},
      create: {
        phoneE164: phone,
        reason: "Internal Test DNC"
      }
    });
  }
  console.log(`✅ Seeded ${dncNumbers.length} DNC numbers.`);

  console.log('🌱 Seeding Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
