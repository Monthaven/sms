/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import path from "path";
import { ImportService } from "../services/importService";
import { prisma } from "../db";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npm run script:ingest <file_relative_path> [campaign_id]");
    process.exit(1);
  }

  const relativePath = args[0];
  const campaignId = args[1];
  const filePath = path.resolve(process.cwd(), relativePath);

  console.log("\nENGINE: Starting Ingestion...");
  console.log(`Target: ${filePath}`);
  if (campaignId) console.log(`Campaign: ${campaignId}`);

  const jobStart = Date.now();

  try {
    const result = await ImportService.processDealMachineCsv(filePath, campaignId, undefined);
    console.log("\nENGINE: Job Complete.", result);
  } catch (error) {
    console.error("\nENGINE: Critical Failure:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
