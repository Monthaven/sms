const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const uniquePhone = `+1999${Date.now().toString().slice(-7)}`; // e.g. +1999xxxxxxx
  console.log('Testing transactional rollback with phone:', uniquePhone);

  try {
    await db.$transaction(async (tx) => {
      await tx.contact.create({ data: { phoneE164: uniquePhone, firstName: 'Trx', lastName: 'Test', source: 'TEST' } });
      // force an error to trigger rollback
      throw new Error('force-rollback');
    });
  } catch (err) {
    console.log('Expected transaction error:', err.message);
  }

  const found = await db.contact.findUnique({ where: { phoneE164: uniquePhone } });
  if (found) {
    console.error('Rollback failed: contact still exists:', found);
    process.exitCode = 2;
  } else {
    console.log('Rollback successful: contact does not exist');
  }

  await db.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
