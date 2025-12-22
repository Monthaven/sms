/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Extract owner names from rawDetails JSON into Property columns.
 * Run: npx ts-node scripts/extract-owners-from-raw.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface RawDetails {
  owner_1_firstname?: string;
  owner_1_lastname?: string;
  owner_2_firstname?: string;
  owner_2_lastname?: string;
  [key: string]: any;
}

function buildFullName(first?: string | null, last?: string | null): string | null {
  const parts = [first, last].filter(Boolean).map((s) => s?.trim()).filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" ") : null;
}

async function extractOwners() {
  console.log("Extracting owner data from rawDetails...\n");

  const properties = await prisma.property.findMany({
    select: { id: true, rawDetails: true },
  });

  console.log(`Processing ${properties.length} properties...`);

  let updated = 0;
  let skipped = 0;

  for (const prop of properties) {
    const raw = (prop.rawDetails as RawDetails | null) || null;
    if (!raw) {
      skipped++;
      continue;
    }

    const owner1 = buildFullName(raw.owner_1_firstname, raw.owner_1_lastname);
    const owner2 = buildFullName(raw.owner_2_firstname, raw.owner_2_lastname);

    if (owner1 || owner2) {
      await prisma.property.update({
        where: { id: prop.id },
        data: {
          owner_1_name: owner1,
          owner_2_name: owner2,
        },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped (no owner data): ${skipped}`);

  const withOwner = await prisma.property.count({
    where: { owner_1_name: { not: null } },
  });
  console.log(`\n📊 Properties with owner_1_name: ${withOwner}/${properties.length}`);
}

extractOwners()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
