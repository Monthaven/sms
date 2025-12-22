/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Ingest DealMachine CSV export into MAE database.
 * Run: npx ts-node scripts/ingest-dealmachine.ts <csv-path>
 */

import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { normalizePhone, classifyPhoneType } from "../lib/phone-utils";
import { scoreContact, selectPrimaryContacts } from "../lib/scoring";

const prisma = new PrismaClient();

interface DealMachineRow {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  units?: string;
  year_built?: string;
  owner_1_name?: string;
  owner_2_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone_1?: string;
  contact_phone_1_type?: string;
  contact_phone_2?: string;
  contact_phone_2_type?: string;
  contact_title?: string;
}

function toInt(value?: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

async function ingest(csvPath: string) {
  console.log(`Ingesting ${csvPath}...`);
  const content = readFileSync(csvPath, "utf-8");
  const records: DealMachineRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} rows`);
  let propertiesCreated = 0;
  let contactsCreated = 0;

  for (const row of records) {
    const addressLine1 = row.address?.trim() || "UNKNOWN";
    const city = row.city?.trim() || "UNKNOWN";
    const state = row.state?.trim() || "NA";
    const postalCode = row.zip?.trim() || "UNKNOWN";

    const property = await prisma.property.upsert({
      where: {
        addressLine1_city_state: {
          addressLine1,
          city,
          state,
        },
      },
      create: {
        addressLine1,
        city,
        state,
        postalCode,
        address: row.address?.trim() || null,
        zip: row.zip?.trim() || null,
        units: toInt(row.units),
        year_built: toInt(row.year_built),
        owner_1_name: row.owner_1_name || null,
        owner_2_name: row.owner_2_name || null,
        mailing_address: null,
      },
      update: {
        owner_1_name: row.owner_1_name || null,
        owner_2_name: row.owner_2_name || null,
        zip: row.zip?.trim() || null,
        units: toInt(row.units),
        year_built: toInt(row.year_built),
      },
    });
    propertiesCreated++;

    const primaryPhone = normalizePhone(row.contact_phone_1 || row.contact_phone_2 || "");
    if (!primaryPhone) {
      continue; // Skip contacts with no valid phone
    }

    const ownerNames = [row.owner_1_name, row.owner_2_name].filter(Boolean) as string[];
    const phone1Normalized = primaryPhone;
    const phone2Normalized = normalizePhone(row.contact_phone_2 || "");

    const contactData = {
      phoneE164: primaryPhone,
      phoneType: classifyPhoneType(row.contact_phone_1, row.contact_phone_1_type),
      firstName: row.contact_first_name || null,
      lastName: row.contact_last_name || null,
      email: row.contact_email || null,
      first_name: row.contact_first_name || null,
      last_name: row.contact_last_name || null,
      full_name: `${row.contact_first_name || ""} ${row.contact_last_name || ""}`.trim() || null,
      phone_1: phone1Normalized,
      phone_1_type: classifyPhoneType(row.contact_phone_1, row.contact_phone_1_type),
      phone_2: phone2Normalized,
      phone_2_type: classifyPhoneType(row.contact_phone_2, row.contact_phone_2_type),
      title: row.contact_title || null,
      has_title: Boolean(row.contact_title),
      propertyId: property.id,
    };

    const scoring = scoreContact(contactData as any, ownerNames);

    await prisma.contact.upsert({
      where: { phoneE164: primaryPhone },
      create: {
        ...contactData,
        ...scoring,
        owner_match: scoring.decision_maker || scoring.dm_score >= 50,
      },
      update: {
        ...contactData,
        ...scoring,
        owner_match: scoring.decision_maker || scoring.dm_score >= 50,
      },
    });
    contactsCreated++;
  }

  console.log(`Created/updated ${propertiesCreated} properties, ${contactsCreated} contacts`);

  console.log("Selecting primary contacts...");
      const properties = await prisma.property.findMany(); // NO include

    for (const property of properties) {
      const contacts = await prisma.contact.findMany({
        where: { propertyId: property.id },
      });
      
      if (!contacts.length) continue;  // Use contacts, not property.Contacts
      
      const primaryIds = selectPrimaryContacts(contacts as any);  // Use contacts
      
      // ... rest stays the same
    

    await prisma.contact.updateMany({
      where: { propertyId: property.id },
      data: { is_primary: false },
    });

    if (primaryIds.length > 0) {
      await prisma.contact.updateMany({
        where: { id: { in: primaryIds } },
        data: { is_primary: true },
      });
    }
  }

  console.log("Done!");
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npx ts-node scripts/ingest-dealmachine.ts <csv-path>");
  process.exit(1);
}

ingest(csvPath)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
