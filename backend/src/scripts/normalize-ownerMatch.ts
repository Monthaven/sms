import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

async function main() {
  console.log('[normalize-ownerMatch] Checking ownerMatch values');

  // Count rows where ownerMatch is boolean or non-text-like values
  try {
    const sample = await prisma.$queryRawUnsafe(`SELECT id, ownerMatch FROM contact LIMIT 20`);
    console.log('[normalize-ownerMatch] sample rows:', sample.length);
  } catch (e) {
    console.warn('[normalize-ownerMatch] sample query failed', e);
  }

  // Convert boolean true/false to string 'true'/'false' and lowercase existing values
  const sql = `UPDATE contact SET ownerMatch = lower(ownerMatch::text) WHERE ownerMatch IS NOT NULL`;

  console.log('[normalize-ownerMatch] Prepared SQL:', sql);
  if (DRY_RUN) {
    console.log('[normalize-ownerMatch] DRY RUN - no changes will be made');
    process.exit(0);
  }

  if (!FORCE) {
    console.log('Pass --force to execute the normalization');
    process.exit(0);
  }

  try {
    const res = await prisma.$executeRawUnsafe(sql);
    console.log('[normalize-ownerMatch] Rows affected:', res);
  } catch (e) {
    console.error('[normalize-ownerMatch] normalization failed', e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
