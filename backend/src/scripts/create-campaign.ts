/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { prisma } from '../db';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("\n🏗️  MAE CAMPAIGN CREATOR");
  
  const name = await new Promise<string>(r => rl.question('Campaign Name (e.g. "Nashville-Buyers-Nov"): ', r));
  
  if (!name) {
    console.error("❌ Name required.");
    process.exit(1);
  }

  try {
    const campaign = await prisma.campaign.create({
      data: { name, status: 'DRAFT' }
    });
    console.log(`\n✅ Campaign Created!`);
    console.log(`🆔 ID: ${campaign.id}`);
    console.log(`📋 Use this ID for ingestion.`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
