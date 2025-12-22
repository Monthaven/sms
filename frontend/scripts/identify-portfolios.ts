/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Identify multi-property portfolios by owner name / mailing address.
 * Creates/updates Portfolio records and links Properties.
 * Run: npx ts-node scripts/identify-portfolios.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Normalize owner name or mailing address for matching
function normalizeOwnerKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(llc|llp|inc|corp|ltd|lp|trust|company|co|group|properties|investments|holdings|partners|ventures|capital|realty|real\s+estate)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

async function findPrimaryContact(propertyIds: string[]): Promise<string | null> {
  const primary = await prisma.contact.findFirst({
    where: { propertyId: { in: propertyIds }, is_primary: true },
    select: { id: true },
  });
  return primary?.id ?? null;
}

async function identifyPortfolios() {
  console.log("Identifying portfolios...");

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      owner_1_name: true,
      owner_2_name: true,
      mailing_address: true,
    },
  });

  console.log(`Processing ${properties.length} properties...`);

  // Build owner/mailing -> property mapping
  const ownerToProperties = new Map<string, string[]>();

  properties.forEach((prop, idx) => {
    const keys = [
      normalizeOwnerKey(prop.owner_1_name),
      normalizeOwnerKey(prop.owner_2_name),
      normalizeOwnerKey(prop.mailing_address),
    ].filter(Boolean) as string[];

    for (const key of keys) {
      if (!ownerToProperties.has(key)) ownerToProperties.set(key, []);
      ownerToProperties.get(key)!.push(prop.id);
    }

    if (idx % 500 === 0) {
      console.log(`Progress: ${idx}/${properties.length} properties processed`);
    }
  });

  // Find portfolios (owners with 2+ properties)
  const portfolios: { owner: string; propertyIds: string[]; size: number }[] = [];
  for (const [owner, propertyIds] of ownerToProperties.entries()) {
    const uniqueIds = [...new Set(propertyIds)];
    if (uniqueIds.length >= 2) {
      portfolios.push({ owner, propertyIds: uniqueIds, size: uniqueIds.length });
    }
  }

  portfolios.sort((a, b) => b.size - a.size);

  console.log(`\nFound ${portfolios.length} portfolios (2+ props):\n`);

  let updatedProperties = 0;
  let createdPortfolios = 0;

  for (let i = 0; i < portfolios.length; i++) {
    const portfolio = portfolios[i];
    const primaryContactId = await findPrimaryContact(portfolio.propertyIds);

    const created = await prisma.portfolio.upsert({
      where: { name: portfolio.owner },
      create: {
        name: portfolio.owner,
        property_count: portfolio.size,
        primary_contact_id: primaryContactId,
      },
      update: {
        property_count: portfolio.size,
        primary_contact_id: primaryContactId,
      },
      select: { id: true },
    });

    createdPortfolios++;

    await prisma.property.updateMany({
      where: { id: { in: portfolio.propertyIds } },
      data: { portfolio_id: created.id },
    });

    updatedProperties += portfolio.propertyIds.length;

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${portfolios.length} portfolios processed`);
    }
  }

  const [withPortfolio, total, multiPortfolios] = await Promise.all([
    prisma.property.count({ where: { portfolio_id: { not: null } } }),
    prisma.property.count(),
    prisma.portfolio.count(),
  ]);

  const multiCount = portfolios.length;
  console.log(`\nSummary:`);
  console.log(`  Portfolios created/updated: ${createdPortfolios}`);
  console.log(`  Multi-property portfolios: ${multiCount}`);
  console.log(`  Properties linked: ${updatedProperties}`);
  console.log(`  Properties with portfolio: ${withPortfolio}/${total}`);
}

identifyPortfolios()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
