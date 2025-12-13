const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    let camp = await prisma.campaign.findFirst({ where: { name: 'Inbound Unassigned' } });
    if (!camp) {
      camp = await prisma.campaign.create({ data: { name: 'Inbound Unassigned', status: 'ACTIVE' } });
    }
    console.log('Inbound Unassigned id:', camp.id);
  } catch (e) {
    console.error(e);
  }
  await prisma.$disconnect();
})();
