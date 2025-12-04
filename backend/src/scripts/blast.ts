import { CampaignService } from '../services/campaignService';
import { prisma } from '../db';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("\n🚀 MAE BLAST ENGINE INITIALIZED");
  console.log("--------------------------------");

  const name = await new Promise<string>(r => rl.question('📝 Campaign Name: ', r));
  const message = await new Promise<string>(r => rl.question('💬 SMS Message: ', r));

  if (!name || !message) {
    console.error("❌ Aborted: Missing inputs.");
    process.exit(1);
  }

  console.log(`\n⚠️  PRE-FLIGHT CHECK ⚠️`);
  console.log(`Target: All Leads with Status = NEW`);
  console.log(`Action: Upload to EzTexting & Send`);
  
  const confirm = await new Promise<string>(r => rl.question('\nType "LAUNCH" to execute: ', r));
  
  if (confirm !== 'LAUNCH') {
    console.log("🚫 Aborted by operator.");
    process.exit(0);
  }

  try {
    console.log("\n...Ignition...");
    const result = await CampaignService.launchBlast(name, message);
    console.log("✅ BLAST SUCCESSFUL", result);
  } catch (error) {
    console.error("❌ BLAST FAILED:", error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
