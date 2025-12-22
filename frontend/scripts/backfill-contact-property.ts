/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Backfill Contact.propertyId from Lead table.
 * Run: npx ts-node scripts/backfill-contact-property.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfill() {
  console.log("Backfilling Contact.propertyId from Lead...\n");

  const leads = await prisma.lead.findMany({
    where: {
      contactId: { not: undefined as any },
      propertyId: { not: undefined as any },
    },
    select: {
      contactId: true,
      propertyId: true,
    },
  });

  console.log(`Found ${leads.length} leads with contact+property links`);

  const contactToProperty = new Map<string, string>();
  for (const lead of leads) {
    if (!lead.contactId || !lead.propertyId) continue;
    if (!contactToProperty.has(lead.contactId)) {
      contactToProperty.set(lead.contactId, lead.propertyId);
    }
  }

  console.log(`Unique contacts to update: ${contactToProperty.size}`);

  let updated = 0;
  for (const [contactId, propertyId] of contactToProperty.entries()) {
    await prisma.contact.update({
      where: { id: contactId },
      data: { propertyId },
    });
    updated++;
    if (updated % 500 === 0) {
      console.log(`Progress: ${updated}/${contactToProperty.size}`);
    }
  }

  console.log(`\n✅ Updated: ${updated} contacts`);

  const withProperty = await prisma.contact.count({
    where: { propertyId: { not: null } },
  });
  const total = await prisma.contact.count();
  console.log(`\n📊 Contacts with propertyId: ${withProperty}/${total}`);
}

backfill()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
