/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  try {
    const c = await db.contact.count();
    const p = await db.property.count();
    const t = await db.campaignTarget.count();
    console.log('Counts => Contacts:', c, 'Properties:', p, 'CampaignTargets:', t);
  } catch (e) {
    console.error('Query error', e);
  } finally {
    await db.$disconnect();
  }
})();
