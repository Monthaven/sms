/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

﻿const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.interaction.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { contact: true } });
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) { console.error(e); }
  await prisma.$disconnect();
})();
