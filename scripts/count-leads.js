// quick helper to count Lead rows using backend Prisma client
async function main() {
  try {
    const mod = await import('../backend/node_modules/@prisma/client/index.js');
    const PrismaClient = mod.PrismaClient || mod.default || mod.PrismaClient;
    if (!PrismaClient) throw new Error('PrismaClient not found in module');
    const p = new PrismaClient();
    const count = await p.lead.count();
    console.log('LEAD_COUNT:', count);
    await p.$disconnect();
  } catch (err) {
    console.error('PRISMA_ERROR:', err && err.message ? err.message : err);
    process.exitCode = 0;
  }
}

main();
