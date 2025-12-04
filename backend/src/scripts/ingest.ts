import { ImportService } from '../services/importService';
import { prisma } from '../db';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: npm run script:ingest <file_relative_path> [campaign_id]");
    process.exit(1);
  }

  const relativePath = args[0];
  const campaignId = args[1];
  const filePath = path.resolve(process.cwd(), relativePath);

  console.log(`\n🏭 ENGINE: Starting Ingestion...`);
  console.log(`📄 Target: ${filePath}`);
  if (campaignId) console.log(`🎯 Campaign: ${campaignId}`);

  try {
    const result = await ImportService.processDealMachineCsv(filePath, campaignId);
    console.log("\n✅ ENGINE: Job Complete.", result);
  } catch (error) {
    console.error("\n❌ ENGINE: Critical Failure:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
