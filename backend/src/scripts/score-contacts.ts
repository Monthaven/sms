import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

// =============================================================================
// SCORING CONFIG (from MAE Data Pipeline spec)
// =============================================================================

const SCORES = {
  // Positive signals
  NAME_MATCHES_OWNER: 50,
  FLAG_LIKELY_OWNER: 30,
  FLAG_LINKED_TO_COMPANY: 30,
  FLAG_FAMILY_SAME_LASTNAME: 30,
  FLAG_CORPORATE_OWNER: 10,
  FLAG_ABSENTEE_OWNER: 10,
  FLAG_CASH_BUYER: 10,
  FLAG_HIGH_EQUITY: 10,
  SAME_LASTNAME_SAME_CITY: 10,
  PHONE_TYPE_WIRELESS: 10,
  HAS_EMAIL: 5,
  FLAG_FAMILY_ALONE: 5,
  HAS_NAME: 5,

  // Intent signals (dynamic)
  INTENT_HOT: 40,
  INTENT_WARM: 20,
  INTENT_NEUTRAL: 5,
  INTENT_NEGATIVE: -30,
  REPLIED_WITHIN_7_DAYS: 15,
  REPLIED_WITHIN_30_DAYS: 10,

  // Negative signals
  FLAG_MARKETING: -15,
  FLAG_EMPLOYEE: -15,
  FLAG_GENERAL: -15,
  FLAG_CONNECTED_INVESTORS: -15,
  PHONE_TOLL_FREE: -10,
  PHONE_FAX_HINT: -10,

  // Time decay
  NO_CONTACT_30_DAYS: -10,
  NO_CONTACT_60_DAYS: -20,
  NO_CONTACT_90_DAYS: -30,

  // Hard penalties
  DO_NOT_CONTACT: -100,
  HARD_BOUNCE: -50,
  SOFT_BOUNCE: -20,
};

const PRIORITY_THRESHOLDS = {
  HOT: 70,
  WARM: 50,
  NEUTRAL: 30,
};

const QUALIFY_THRESHOLD = 15; // Adjusted for broader qualification in dry-run

// Owner/decision-maker keywords
const OWNER_KEYWORDS = [
  'owner', 'principal', 'member', 'manager', 'president',
  'ceo', 'cfo', 'coo', 'director', 'vp', 'partner', 'trustee', 'landlord',
];

// Toll-free prefixes
const TOLL_FREE_PREFIXES = ['800', '888', '877', '866', '855', '844', '833'];

// =============================================================================
// HELPERS
// =============================================================================

function normalizeString(str: string | null | undefined): string {
  return (str ?? '').toLowerCase().trim();
}

function daysSince(date: Date | null | undefined): number {
  if (!date) return Infinity;
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isTollFree(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Check if starts with 1 + toll-free prefix
  if (cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    return TOLL_FREE_PREFIXES.includes(areaCode);
  }
  return TOLL_FREE_PREFIXES.includes(cleaned.substring(0, 3));
}

function parseFlags(flagsRaw: string | null): string[] {
  if (!flagsRaw) return [];
  // Flags are typically comma-separated or pipe-separated
  return flagsRaw.split(/[,|;]/).map(f => f.trim().toLowerCase()).filter(Boolean);
}

function checkOwnerMatch(
  contact: { firstName: string | null; lastName: string | null; source: string | null; email: string | null },
  property?: { owner1Name?: string | null; owner2Name?: string | null } | null
): { isOwnerMatch: boolean; nameMatchesOwner: boolean } {
  const contactName = normalizeString(`${contact.firstName ?? ''} ${contact.lastName ?? ''}`);
  const contactLastName = normalizeString(contact.lastName);
  const source = normalizeString(contact.source);
  const email = normalizeString(contact.email);

  // Check if name matches property owner names
  let nameMatchesOwner = false;
  if (property) {
    const owner1 = normalizeString((property as any).owner_1_name ?? (property as any).owner1Name ?? '');
    const owner2 = normalizeString((property as any).owner_2_name ?? (property as any).owner2Name ?? '');
    
    if (contactName && (
      (owner1 && (owner1.includes(contactName) || contactName.includes(owner1))) ||
      (owner2 && (owner2.includes(contactName) || contactName.includes(owner2)))
    )) {
      nameMatchesOwner = true;
    }
  }

  // Check for owner keywords in source/name/email
  const combined = `${source} ${contactName} ${email}`;
  const isOwnerMatch = OWNER_KEYWORDS.some((keyword) => combined.includes(keyword));

  return { isOwnerMatch, nameMatchesOwner };
}

// Parse raw property details (stored as JSON string in property.rawDetails)
function parseRawDetails(raw: string | null): Record<string, any> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function calculatePropertyScore(rawDetails: Record<string, any>): number {
  let score = 0;
  const propClass = (rawDetails.property_class || '').toString().toUpperCase();
  const zoning = (rawDetails.zoning || '').toString().toUpperCase();
  const propType = (rawDetails.property_type || '').toString().toUpperCase();

  // Asset class
  if (propClass.includes('MF') || zoning.includes('MULTI') || propType.includes('MULTI')) score += 15;
  if (propClass.includes('COM') || propClass.includes('IND')) score += 8;
  if ((rawDetails.units_count || 0) >= 10) score += 10;

  // Distress
  if (rawDetails.tax_delinquent === true) score += 15;
  if ((rawDetails.equity_percent || 0) >= 70) score += 5;
  if (rawDetails.out_of_state_owner === true) score += 5;

  // Long-term owner
  const saleDate = rawDetails.sale_date ? new Date(rawDetails.sale_date) : null;
  if (saleDate && (Date.now() - saleDate.getTime()) > 10 * 365 * 24 * 60 * 60 * 1000) score += 10;

  // Loan maturity
  const mtgDate = rawDetails.mortgage_due_date ? new Date(rawDetails.mortgage_due_date) : null;
  if (mtgDate) {
    const monthsOut = (mtgDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsOut <= 6) score += 15;
    else if (monthsOut <= 12) score += 8;
    else if (monthsOut <= 18) score += 5;
    else if (monthsOut <= 24) score += 3;
  }

  return score;
}

export function calculateScore(contact: {
  phoneE164: string;
  phoneType: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  source: string | null;
  smsAllowed: boolean;
  callOnly: boolean;
  doNotContact: boolean;
  flagsRaw?: string | null;
  intent?: string | null;
  sendCount?: number | null;
  receiveCount?: number | null;
  lastSentAt?: Date | null;
  lastReceivedAt?: Date | null;
  lastContactedAt?: Date | null;
}, property?: { owner1Name?: string | null; owner2Name?: string | null } | null): {
  score: number;
  ownerMatch: boolean;
  breakdown: string[];
} {
  let score = 0;
  const breakdown: string[] = [];

  // Parse flags
  const flags = parseFlags(contact.flagsRaw ?? null);

  // Owner matching
  const { isOwnerMatch, nameMatchesOwner } = checkOwnerMatch(contact, property);

  // ========== POSITIVE SIGNALS ==========

  // +50 Name matches owner
  if (nameMatchesOwner) {
    score += SCORES.NAME_MATCHES_OWNER;
    breakdown.push(`+${SCORES.NAME_MATCHES_OWNER} name matches owner`);
  }

  // +30 Likely Owner flag
  if (flags.includes('likely owner')) {
    score += SCORES.FLAG_LIKELY_OWNER;
    breakdown.push(`+${SCORES.FLAG_LIKELY_OWNER} likely owner flag`);
  }

  // +30 Linked To Company flag
  if (flags.includes('linked to company')) {
    score += SCORES.FLAG_LINKED_TO_COMPANY;
    breakdown.push(`+${SCORES.FLAG_LINKED_TO_COMPANY} linked to company flag`);
  }

  // +10 Various positive flags
  if (flags.includes('corporate owner')) {
    score += SCORES.FLAG_CORPORATE_OWNER;
    breakdown.push(`+${SCORES.FLAG_CORPORATE_OWNER} corporate owner flag`);
  }
  if (flags.includes('absentee owner')) {
    score += SCORES.FLAG_ABSENTEE_OWNER;
    breakdown.push(`+${SCORES.FLAG_ABSENTEE_OWNER} absentee owner flag`);
  }
  if (flags.includes('cash buyer')) {
    score += SCORES.FLAG_CASH_BUYER;
    breakdown.push(`+${SCORES.FLAG_CASH_BUYER} cash buyer flag`);
  }
  if (flags.includes('high equity')) {
    score += SCORES.FLAG_HIGH_EQUITY;
    breakdown.push(`+${SCORES.FLAG_HIGH_EQUITY} high equity flag`);
  }
  if (flags.includes('family')) {
    score += SCORES.FLAG_FAMILY_ALONE;
    breakdown.push(`+${SCORES.FLAG_FAMILY_ALONE} family flag`);
  }

  // +10 Phone type = WIRELESS
  const phoneType = normalizeString(contact.phoneType);
  if (phoneType === 'wireless' || phoneType === 'mobile') {
    score += SCORES.PHONE_TYPE_WIRELESS;
    breakdown.push(`+${SCORES.PHONE_TYPE_WIRELESS} wireless phone`);
  }

  // +5 Has email
  if (contact.email && contact.email.trim() !== '') {
    score += SCORES.HAS_EMAIL;
    breakdown.push(`+${SCORES.HAS_EMAIL} has email`);
  }

  // +5 Has name
  if (contact.firstName || contact.lastName) {
    score += SCORES.HAS_NAME;
    breakdown.push(`+${SCORES.HAS_NAME} has name`);
  }

  // Owner match from keywords
  if (isOwnerMatch && !nameMatchesOwner) {
    score += 20; // Lesser bonus for keyword match vs actual name match
    breakdown.push(`+20 owner keyword match`);
  }

  // ========== INTENT SIGNALS (DYNAMIC) ==========

  const intent = normalizeString(contact.intent);
  if (intent === 'hot' || intent === 'positive') {
    score += SCORES.INTENT_HOT;
    breakdown.push(`+${SCORES.INTENT_HOT} HOT intent`);
  } else if (intent === 'warm') {
    score += SCORES.INTENT_WARM;
    breakdown.push(`+${SCORES.INTENT_WARM} WARM intent`);
  } else if (intent === 'neutral') {
    score += SCORES.INTENT_NEUTRAL;
    breakdown.push(`+${SCORES.INTENT_NEUTRAL} NEUTRAL intent`);
  } else if (intent === 'negative') {
    score += SCORES.INTENT_NEGATIVE;
    breakdown.push(`${SCORES.INTENT_NEGATIVE} NEGATIVE intent`);
  }

  // Recent reply bonus
  const daysSinceReply = daysSince(contact.lastReceivedAt);
  if (daysSinceReply <= 7) {
    score += SCORES.REPLIED_WITHIN_7_DAYS;
    breakdown.push(`+${SCORES.REPLIED_WITHIN_7_DAYS} replied within 7 days`);
  } else if (daysSinceReply <= 30) {
    score += SCORES.REPLIED_WITHIN_30_DAYS;
    breakdown.push(`+${SCORES.REPLIED_WITHIN_30_DAYS} replied within 30 days`);
  }

  // ========== NEGATIVE SIGNALS ==========

  // -15 Marketing/Employee/General flags
  if (flags.includes('marketing')) {
    score += SCORES.FLAG_MARKETING;
    breakdown.push(`${SCORES.FLAG_MARKETING} marketing flag`);
  }
  if (flags.includes('employee')) {
    score += SCORES.FLAG_EMPLOYEE;
    breakdown.push(`${SCORES.FLAG_EMPLOYEE} employee flag`);
  }
  if (flags.includes('general')) {
    score += SCORES.FLAG_GENERAL;
    breakdown.push(`${SCORES.FLAG_GENERAL} general flag`);
  }
  if (flags.includes('connectedinvestors')) {
    score += SCORES.FLAG_CONNECTED_INVESTORS;
    breakdown.push(`${SCORES.FLAG_CONNECTED_INVESTORS} connected investors flag`);
  }

  // -10 Toll-free phone
  if (isTollFree(contact.phoneE164)) {
    score += SCORES.PHONE_TOLL_FREE;
    breakdown.push(`${SCORES.PHONE_TOLL_FREE} toll-free number`);
  }

  // ========== TIME DECAY ==========

  const daysSinceContact = daysSince(contact.lastContactedAt ?? contact.lastSentAt);
  if (daysSinceContact > 90) {
    score += SCORES.NO_CONTACT_90_DAYS;
    breakdown.push(`${SCORES.NO_CONTACT_90_DAYS} no contact 90+ days`);
  } else if (daysSinceContact > 60) {
    score += SCORES.NO_CONTACT_60_DAYS;
    breakdown.push(`${SCORES.NO_CONTACT_60_DAYS} no contact 60+ days`);
  } else if (daysSinceContact > 30) {
    score += SCORES.NO_CONTACT_30_DAYS;
    breakdown.push(`${SCORES.NO_CONTACT_30_DAYS} no contact 30+ days`);
  }

  // ========== HARD PENALTIES ==========

  if (contact.doNotContact) {
    score += SCORES.DO_NOT_CONTACT;
    breakdown.push(`${SCORES.DO_NOT_CONTACT} DO NOT CONTACT`);
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return { score, ownerMatch: isOwnerMatch || nameMatchesOwner, breakdown };
}

export function getPriority(score: number): string {
  if (score >= PRIORITY_THRESHOLDS.HOT) return 'HOT';
  if (score >= PRIORITY_THRESHOLDS.WARM) return 'WARM';
  if (score >= PRIORITY_THRESHOLDS.NEUTRAL) return 'NEUTRAL';
  return 'LOW';
}

// =============================================================================
// MAIN
// =============================================================================

export async function main() {
  console.log('============================================');
  console.log('[score-contacts] Starting contact scoring (FULL SPEC)');
  console.log(`[score-contacts] Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`[score-contacts] Qualify threshold: ${QUALIFY_THRESHOLD}`);
  console.log('============================================\n');

  console.log('[score-contacts] Fetching leads with contacts and properties...');
  // Fetch leads along with contact and property.rawDetails so we can group by property
  const leads = await prisma.lead.findMany({
    where: { propertyId: { not: null } },
    select: {
      id: true,
      propertyId: true,
      contact: {
        select: {
          id: true,
          phoneE164: true,
          phoneType: true,
          firstName: true,
          lastName: true,
          email: true,
          source: true,
          smsAllowed: true,
          callOnly: true,
          doNotContact: true,
          ownerMatch: true,
          score: true,
          priority: true,
          flagsRaw: true,
          intent: true,
          receiveCount: true,
          sendCount: true,
          lastReceivedAt: true,
          lastSentAt: true,
          // lastContactedAt may not exist; fall back to lastSentAt/Received
        },
      },
      property: {
        select: {
          id: true,
          rawDetails: true,
        },
      },
    },
  });

  console.log(`[score-contacts] Found ${leads.length} leads with properties`);

  // Group contacts by propertyId
  const byProperty = new Map<string, Array<{ leadId: string; contact: any; propertyRaw: any }>>();
  for (const l of leads) {
    const propId = l.propertyId as string;
    if (!propId) continue;
    const arr = byProperty.get(propId) ?? [];
    if (l.contact) arr.push({ leadId: l.id, contact: l.contact, propertyRaw: (l.property as any)?.rawDetails ?? null });
    byProperty.set(propId, arr);
  }

  const stats = {
    totalContacts: 0,
    updated: 0,
    skipped: 0,
    qualified: 0,
    disqualified: 0,
    byPriority: { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>,
    ownerMatches: 0,
    tollFree: 0,
    wireless: 0,
    propertiesProcessed: byProperty.size,
  };

  // For each property, score its contacts and pick top-2 (prefer one wireless and one landline)
  for (const [propertyId, contacts] of byProperty.entries()) {
    if (!contacts || contacts.length === 0) continue;
    stats.totalContacts += contacts.length;

    // Compute scores for each contact using property-first scoring
    const scored = contacts.map((c) => {
      // `c.propertyRaw` is the raw JSON string for property.rawDetails
      const raw = (c.propertyRaw as any) ?? null;
      const details = typeof raw === 'string' ? parseRawDetails(raw) : (raw || {});

      // Property score
      const propertyScore = calculatePropertyScore(details);

      // Engagement
      let engagementScore = 0;
      if ((c.contact.receiveCount ?? 0) > 0) engagementScore += 10;
      const intent = normalizeString((c.contact.intent as any) ?? null);
      if (intent === 'hot' || intent === 'positive') engagementScore += 40;
      else if (intent === 'warm') engagementScore += 20;

      // Routing
      let routingScore = 0;
      const phoneTypeNorm = normalizeString(c.contact.phoneType);
      if (phoneTypeNorm === 'wireless' || phoneTypeNorm === 'mobile') routingScore += 10;

      const { isOwnerMatch, nameMatchesOwner } = checkOwnerMatch(c.contact as any, {
        owner1Name: (details.owner_1_name ?? details.owner1Name ?? null),
        owner2Name: (details.owner_2_name ?? details.owner2Name ?? null),
      });
      if (isOwnerMatch) routingScore += 50;

      // Fuzzy name match against owner_1_name
      const owner1 = normalizeString((details.owner_1_name ?? details.owner1Name ?? ''));
      const contactFull = normalizeString(`${c.contact.firstName ?? ''} ${c.contact.lastName ?? ''}`);
      const contactLast = normalizeString(c.contact.lastName);
      if (owner1 && (owner1.includes(contactFull) || contactFull.includes(owner1) || (contactLast && owner1.includes(contactLast)))) {
        routingScore += 30;
      }

      let totalScore = propertyScore + engagementScore + routingScore;
      totalScore = Math.max(0, Math.min(100, totalScore));

      const ownerMatch = isOwnerMatch || nameMatchesOwner;

      // Priority mapping: >=50 HIGH, >=25 MEDIUM, else LOW (updated)
      const newPriority = totalScore >= 50 ? 'HIGH' : totalScore >= 25 ? 'MEDIUM' : 'LOW';

      const breakdown = [`property=${propertyScore}`, `engagement=${engagementScore}`, `routing=${routingScore}`];

      return { ...c, score: totalScore, ownerMatch, breakdown, priority: newPriority };
    });

    // Sort by score desc
    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Apply updates: use per-contact computed priority (HIGH/MEDIUM/LOW)
    for (const s of scored) {
      const newScore = s.score ?? 0;
      const newPriority = (s as any).priority ?? (newScore >= QUALIFY_THRESHOLD ? 'HIGH' : 'LOW');

      stats.byPriority[newPriority] = (stats.byPriority[newPriority] || 0) + 1;
      if (s.ownerMatch) stats.ownerMatches++;
      if (isTollFree(s.contact.phoneE164)) stats.tollFree++;
      if (normalizeString(s.contact.phoneType) === 'wireless') stats.wireless++;
      if (newScore >= QUALIFY_THRESHOLD) stats.qualified++;
      else stats.disqualified++;

      const needsUpdate =
        s.contact.score !== newScore ||
        (s.contact.priority ?? 'LOW') !== newPriority ||
        s.contact.ownerMatch !== s.ownerMatch;

      if (!needsUpdate) {
        stats.skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY RUN] property=${propertyId} ${s.contact.phoneE164}: score ${s.contact.score ?? 'null'} → ${newScore}, priority ${s.contact.priority} → ${newPriority}, ownerMatch ${s.contact.ownerMatch} → ${s.ownerMatch}`);
        if (s.breakdown && s.breakdown.length > 0 && newScore >= QUALIFY_THRESHOLD) console.log(`    Breakdown: ${s.breakdown.join(', ')}`);
        stats.updated++;
      } else {
        await prisma.contact.update({ where: { id: s.contact.id }, data: { score: newScore, priority: newPriority, ownerMatch: s.ownerMatch } });
        stats.updated++;
      }
    }
  }

  // Summary
  console.log('\\n============================================');
  console.log('[score-contacts] COMPLETE');
  console.log('============================================');
  console.log(`Total contacts:       ${stats.totalContacts}`);
  console.log(`Updated:              ${stats.updated}`);
  console.log(`Skipped (no change):  ${stats.skipped}`);
  console.log('--------------------------------------------');
  console.log(`Qualified (>= ${QUALIFY_THRESHOLD}):    ${stats.qualified} (${((stats.qualified / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log(`Disqualified (< ${QUALIFY_THRESHOLD}): ${stats.disqualified} (${((stats.disqualified / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log('--------------------------------------------');
  console.log('Priority Distribution:');
  console.log(`  HIGH:   ${stats.byPriority.HIGH} (${((stats.byPriority.HIGH / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log(`  MEDIUM: ${stats.byPriority.MEDIUM} (${((stats.byPriority.MEDIUM / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log(`  LOW:    ${stats.byPriority.LOW} (${((stats.byPriority.LOW / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log('--------------------------------------------');
  console.log(`Owner matches:        ${stats.ownerMatches} (${((stats.ownerMatches / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log(`Wireless phones:      ${stats.wireless} (${((stats.wireless / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log(`Toll-free phones:     ${stats.tollFree} (${((stats.tollFree / stats.totalContacts) * 100).toFixed(1)}%)`);
  console.log('============================================\\n');

  if (DRY_RUN) {
    console.log('This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply changes.\n');
  }
}

main()
  .catch((e) => {
    console.error('[score-contacts] ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
