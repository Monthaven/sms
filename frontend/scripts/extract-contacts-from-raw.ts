/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Extract contacts from rawDetails JSON into Contact table.
 * Run: npx ts-node scripts/extract-contacts-from-raw.ts
 */

import { PrismaClient } from "@prisma/client";
import { normalizePhone, classifyPhoneType } from "../lib/phone-utils";
import { scoreContact } from "../lib/scoring";

const prisma = new PrismaClient();

interface RawDetails {
  [key: string]: string | undefined;
}

async function extractContacts() {
  console.log("Extracting contacts from rawDetails...\n");

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      rawDetails: true,
      owner_1_name: true,
      owner_2_name: true,
    },
  });

  console.log(`Processing ${properties.length} properties...`);

  let created = 0;
  let skipped = 0;

  for (let idx = 0; idx < properties.length; idx++) {
    const prop = properties[idx];
    const raw = (prop.rawDetails as RawDetails | null) || null;
    if (!raw) continue;

    const ownerNames = [prop.owner_1_name, prop.owner_2_name].filter(Boolean) as string[];

    // Extract contacts 1-19
    for (let i = 1; i <= 19; i++) {
      const name = raw[`contact_${i}_name`];
      if (!name) continue;

      const phone1 = raw[`contact_${i}_phone1`];
      const phone1Type = raw[`contact_${i}_phone1_type`];
      const phone2 = raw[`contact_${i}_phone2`];
      const phone2Type = raw[`contact_${i}_phone2_type`];
      const phone3 = raw[`contact_${i}_phone3`];
      const phone3Type = raw[`contact_${i}_phone3_type`];
      const email1 = raw[`contact_${i}_email1`];
      const email2 = raw[`contact_${i}_email2`];
      const email3 = raw[`contact_${i}_email3`];
      const flags = raw[`contact_${i}_flags`];

      const normalizedPhone1 = phone1 ? normalizePhone(phone1) : null;
      const normalizedPhone2 = phone2 ? normalizePhone(phone2) : null;
      const normalizedPhone3 = phone3 ? normalizePhone(phone3) : null;

      // Skip if no valid phone
      if (!normalizedPhone1 && !normalizedPhone2 && !normalizedPhone3) {
        skipped++;
        continue;
      }

      const primaryPhone = normalizedPhone1 || normalizedPhone2 || normalizedPhone3;
      if (!primaryPhone) {
        skipped++;
        continue;
      }

      // Skip if this phone already exists globally (respect unique phoneE164)
      const dup = await prisma.contact.findUnique({ where: { phoneE164: primaryPhone } });
      if (dup) {
        skipped++;
        continue;
      }

      const contactData = {
        full_name: name,
        first_name: name.split(" ")[0] || null,
        last_name: name.split(" ").slice(1).join(" ") || null,
        phone_1: normalizedPhone1,
        phone_1_type: phone1Type ? classifyPhoneType(phone1, phone1Type) : "unknown",
        phone_2: normalizedPhone2,
        phone_2_type: phone2Type ? classifyPhoneType(phone2 || "", phone2Type) : null,
        phone_3: normalizedPhone3,
        phone_3_type: phone3Type ? classifyPhoneType(phone3 || "", phone3Type) : null,
        email: email1 || email2 || email3 || null,
        propertyId: prop.id,
        source: "DEALMACHINE_RAW",
      };

      const scoring = scoreContact(contactData, ownerNames);

      await prisma.contact.create({
        data: {
          ...contactData,
          phoneE164: primaryPhone,
          phoneType: contactData.phone_1_type || contactData.phone_2_type || contactData.phone_3_type,
          dm_score: scoring.dm_score,
          dm_tier: scoring.dm_tier,
          is_primary: false,
          decision_maker: scoring.decision_maker,
          owner_match: scoring.decision_maker || scoring.dm_score >= 50,
        },
      });
      created++;
    }

    if (idx % 100 === 0) {
      console.log(`Progress: ${idx}/${properties.length} properties, ${created} created, ${skipped} skipped`);
    }
  }

  console.log(`\n✅ Created: ${created}`);
  console.log(`⏭️  Skipped (no phone or duplicate): ${skipped}`);

  const total = await prisma.contact.count();
  const byTier = await prisma.contact.groupBy({
    by: ["dm_tier"],
    _count: true,
  });

  console.log(`\n📊 Total contacts: ${total}`);
  for (const t of byTier) {
    console.log(`${t.dm_tier ?? "UNKNOWN"}: ${t._count}`);
  }
}

extractContacts()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
