#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const id = args[0] || `SMOKE_${Date.now()}`;
  const name = args[1] || 'Smoke Test Campaign';

  try {
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (existing) {
      console.log('Campaign already exists:', id);
      return;
    }

    const created = await prisma.campaign.create({ data: { id, name, status: 'DRAFT' } });
    console.log('Created campaign:', created.id);
  } catch (err) {
    console.error('Failed to create campaign:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
