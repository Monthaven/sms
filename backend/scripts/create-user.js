/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@monthaven.com' },
    update: {},
    create: {
      email: 'admin@monthaven.com',
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  console.log('User ready:', user.email, '-', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
