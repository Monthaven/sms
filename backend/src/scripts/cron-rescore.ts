/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { main as scoreMain } from './score-contacts';

async function run() {
  console.log('[cron-rescore] Running scheduled rescore...');
  try {
    // run as non-dry-run (cron should apply)
    await scoreMain();
    console.log('[cron-rescore] Rescore complete');
  } catch (err) {
    console.error('[cron-rescore] failed', err);
    process.exit(1);
  }
}

run();
import { main as scoreContacts } from './score-contacts';

// Simple cron runner for nightly rescore. This file can be invoked by
// node-cron, system cron, or Vercel cron to run scoring on a schedule.

async function run() {
  console.log('[cron-rescore] Starting nightly rescore');
  await scoreContacts();
  console.log('[cron-rescore] Nightly rescore complete');
}

run().catch((err) => {
  console.error('[cron-rescore] ERROR', err);
  process.exit(1);
});
