/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone-utils";
import { logger } from "@/lib/logger";

type ColumnMapping = {
  csvColumn: string;
  field: string;
};

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mappingsJson = formData.get("mappings") as string;

    if (!file) {
      return NextResponse.json({ error: { message: "No file uploaded" } }, { status: 400 });
    }

    const mappings: ColumnMapping[] = JSON.parse(mappingsJson || "[]");
    if (!mappings.some((m) => m.field === "phone")) {
      return NextResponse.json(
        { error: { message: "Phone number mapping is required" } },
        { status: 400 }
      );
    }

    // Parse CSV content
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const rows = lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Create column index map
    const fieldIndexMap: Record<string, number> = {};
    mappings.forEach((m, i) => {
      if (m.field !== "skip") {
        fieldIndexMap[m.field] = i;
      }
    });

    const results = {
      total: dataRows.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get default campaign ID
    const defaultCampaign = await prisma.campaign.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // Account for header and 0-index

      try {
        // Extract values based on mappings
        const getValue = (field: string) => {
          const idx = fieldIndexMap[field];
          return idx !== undefined ? row[idx]?.trim() || null : null;
        };

        const phone = getValue("phone");
        if (!phone) {
          results.skipped++;
          results.errors.push(`Row ${rowNum}: Missing phone number`);
          continue;
        }

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
          results.skipped++;
          results.errors.push(`Row ${rowNum}: Invalid phone number "${phone}"`);
          continue;
        }

        // Check for existing contact by phoneE164
        const existingContact = await prisma.contact.findFirst({
          where: { phoneE164: normalizedPhone },
        });

        if (existingContact) {
          results.skipped++;
          continue; // Skip duplicates silently
        }

        // Create property if address provided
        let propertyId: string | null = null;
        const address = getValue("address");
        if (address) {
          const property = await prisma.property.create({
            data: {
              addressLine1: address,
              address: address,
              city: getValue("city") || null,
              state: getValue("state") || null,
              postalCode: getValue("zip") || getValue("postalCode") || "",
              zip: getValue("zip") || null,
              units: parseInt(getValue("units") || "1", 10) || 1,
            },
          });
          propertyId = property.id;
        }

        // Create contact with proper field names
        const contact = await prisma.contact.create({
          data: {
            firstName: getValue("firstName") || getValue("name")?.split(" ")[0] || null,
            lastName: getValue("lastName") || getValue("name")?.split(" ").slice(1).join(" ") || null,
            phoneE164: normalizedPhone,
            email: getValue("email"),
            score: 50, // Default score
            priority: "MEDIUM",
            ...(propertyId && { propertyId }),
          },
        });

        // Create lead - campaignId is required
        if (!defaultCampaign) {
          results.errors.push(`Row ${rowNum}: No campaign available for lead creation`);
          results.skipped++;
          continue;
        }

        await prisma.lead.create({
          data: {
            contactId: contact.id,
            campaignId: defaultCampaign.id,
            ...(propertyId && { propertyId }),
            status: "NEW",
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
        results.skipped++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Import error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: { message: "Failed to process import" } },
      { status: 500 }
    );
  }
}
