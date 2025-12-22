/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { LeadStatus } from '@prisma/client';

export function isStopKeyword(text: string): boolean {
  const t = text.trim().toUpperCase();
  return ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REMOVE'].includes(t);
}

/**
 * The "Brain" of the operation.
 * Decides if a reply is a DNC request, a Hot Lead, or just a Warm inquiry.
 */
export function classifyReply(raw: string, currentStatus: LeadStatus): LeadStatus {
  const text = raw.toLowerCase();

  // 1. Safety First: Check for STOP/DNC
  if (isStopKeyword(raw) || text.includes('wrong number') || text.includes('do not text')) {
    return LeadStatus.RESP_STOP;
  }

  // 2. Check for Hot signals (Buying intent)
  if (text.includes('yes') || text.includes('offer') || text.includes('price') || text.includes('how much')) {
    return LeadStatus.RESP_HOT;
  }

  // 3. Check for Warm signals (Curiosity)
  if (text.includes('who is this') || text.includes('maybe') || text.includes('info') || text.includes('house')) {
    return LeadStatus.RESP_WARM;
  }

  // 4. Default to Warm for human review if it's not clearly negative
  if (currentStatus === LeadStatus.RESP_HOT) {
    return LeadStatus.RESP_HOT; // Don't downgrade a hot lead automatically
  }

  return LeadStatus.RESP_WARM;
}
