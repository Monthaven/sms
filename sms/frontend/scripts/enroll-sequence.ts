/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Bulk enroll contacts into a sequence.
 * Usage: npx ts-node scripts/enroll-sequence.ts --sequence="Sequence Name" [--tier=HIGH|MEDIUM|ALL]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const sequenceName = args.find((a) => a.startsWith("--sequence="))?.split("=")[1];
  const tier = args.find((a) => a.startsWith("--tier="))?.split("=")[1]?.toUpperCase() || "ALL";
  return { sequenceName, tier };
}

async function enrollContacts() {
  const { sequenceName, tier } = parseArgs();

  if (!sequenceName) {
    console.error('Usage: --sequence="Sequence Name" [--tier=HIGH|MEDIUM|ALL]');
    process.exit(1);
  }

  let sequence = await prisma.sequence.findFirst({ where: { name: sequenceName } });
  if (!sequence) {
    sequence = await prisma.sequence.create({
      data: { name: sequenceName, status: "draft" },
    });
    console.log(`Created sequence: ${sequenceName}`);
  }

  const whereClause: any = { opt_out: false };
  if (tier === "HIGH") whereClause.dm_tier = "HIGH";
  if (tier === "MEDIUM") whereClause.dm_tier = { in: ["HIGH", "MEDIUM"] };

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    select: { id: true },
  });

  console.log(`Found ${contacts.length} contacts to enroll`);

  let enrolled = 0;
  for (const contact of contacts) {
    try {
      await prisma.sequenceContact.create({
        data: {
          sequenceId: sequence.id,
          contactId: contact.id,
          status: "pending",
          currentStep: 0,
        },
      });
      enrolled++;
    } catch (e: any) {
      if (e.code !== "P2002") throw e;
    }
  }

  if (enrolled > 0) {
    await prisma.sequence.update({
      where: { id: sequence.id },
      data: { totalContacts: { increment: enrolled } },
    });
  }

  console.log(`✅ Enrolled ${enrolled} contacts into "${sequenceName}"`);
}

enrollContacts()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
