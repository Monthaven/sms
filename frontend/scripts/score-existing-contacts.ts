/**
 * Score all existing contacts with DM scoring and mark primaries.
 * Run: npx ts-node scripts/score-existing-contacts.ts
 */

import { PrismaClient } from "@prisma/client";
import { scoreContact, selectPrimaryContacts } from "../lib/scoring";

const prisma = new PrismaClient();

async function scoreExisting() {
  console.log("Scoring existing contacts...\n");

  const contacts = await prisma.contact.findMany({
    include: {
      property: {
        select: {
          owner_1_name: true,
          owner_2_name: true,
        },
      },
    },
  });

  console.log(`Processing ${contacts.length} contacts...`);

  let scored = 0;
  for (const contact of contacts) {
    const ownerNames = [contact.property?.owner_1_name, contact.property?.owner_2_name].filter(Boolean) as string[];

    const scoring = scoreContact(
      {
        full_name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || null,
        first_name: contact.firstName ?? undefined,
        last_name: contact.lastName ?? undefined,
        title: contact.title ?? undefined,
        email: contact.email ?? undefined,
        phone_1_type: contact.phoneType ?? undefined,
      },
      ownerNames,
    );

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        dm_score: scoring.dm_score,
        dm_tier: scoring.dm_tier,
        decision_maker: scoring.decision_maker,
        owner_match: scoring.dm_score >= 50,
      },
    });

    scored++;
    if (scored % 500 === 0) {
      console.log(`Progress: ${scored}/${contacts.length}`);
    }
  }

  console.log(`\n✅ Scored: ${scored}`);

  const byTier = await prisma.contact.groupBy({
    by: ["dm_tier"],
    _count: true,
  });

  console.log("\n📊 Tier breakdown:");
  for (const t of byTier) {
    console.log(`${t.dm_tier ?? "NULL"}: ${t._count}`);
  }

  // Select primaries per property
  console.log("\nSelecting primary contacts per property...");
  const properties = await prisma.property.findMany({
    include: { contacts: true },
  });

  let primaries = 0;
  for (const prop of properties) {
    if (!prop.contacts.length) continue;
    const primaryIds = selectPrimaryContacts(prop.contacts as any);

    await prisma.contact.updateMany({
      where: { propertyId: prop.id },
      data: { is_primary: false },
    });

    if (primaryIds.length) {
      await prisma.contact.updateMany({
        where: { id: { in: primaryIds } },
        data: { is_primary: true },
      });
      primaries += primaryIds.length;
    }
  }

  console.log(`✅ Marked ${primaries} contacts as primary`);
}

scoreExisting()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
