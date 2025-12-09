// Print counts of leads grouped by status using backend Prisma client
async function main() {
  try {
    const mod = await import('../backend/node_modules/@prisma/client/index.js');
    const PrismaClient = mod.PrismaClient || mod.default || mod.PrismaClient;
    const p = new PrismaClient();

    const rows = await p.$queryRaw`SELECT status, count(*) as cnt FROM "Lead" GROUP BY status ORDER BY cnt DESC`;
    console.log('STATUS_COUNTS:');
    for (const r of rows) {
      console.log(`${r.status}: ${r.cnt}`);
    }

    // check specifically for QUEUED_FOR_CALL
    const queued = await p.lead.count({ where: { status: 'QUEUED_FOR_CALL' } });
    console.log('\nQUEUED_FOR_CALL count:', queued);

    await p.$disconnect();
  } catch (err) {
    console.error('PRISMA_ERROR:', err && err.message ? err.message : err);
    process.exitCode = 0;
  }
}

main();
