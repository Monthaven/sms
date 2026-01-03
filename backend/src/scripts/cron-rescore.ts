/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { main as scoreContacts } from './score-contacts';

// Simple cron runner for nightly rescore. This file can be invoked by
// node-cron, system cron, or Vercel cron to run scoring on a schedule.

async function run() {
  console.log('[cron-rescore] Starting nightly rescore');
  try {
    await scoreContacts();
    console.log('[cron-rescore] Nightly rescore complete');
  } catch (err) {
    console.error('[cron-rescore] ERROR', err);
    process.exit(1);
  }
}

run();
