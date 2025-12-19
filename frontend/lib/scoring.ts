/**
 * Decision-maker scoring for MAE
 * Weights: owner_match +50, flags +30, signals +10, noise -15
 * Threshold: 40 for inclusion
 * Select top 2 per property (prefer 1 wireless + 1 landline)
 */

import { Contact } from "@prisma/client";

export interface ScoringResult {
  dm_score: number;
  dm_tier: "HIGH" | "MEDIUM" | "LOW";
  is_primary: boolean;
  decision_maker: boolean;
}

// Owner name patterns to match
const OWNER_TITLES = ["owner", "principal", "president", "ceo", "managing", "partner", "director"];
const NOISE_TITLES = ["assistant", "secretary", "receptionist", "intern", "coordinator"];

export function scoreContact(contact: Partial<Contact>, ownerNames: string[]): ScoringResult {
  let score = 0;

  const contactName = (contact.full_name || `${contact.first_name || ""} ${contact.last_name || ""}`).toLowerCase().trim();
  const ownerMatch = ownerNames.some((owner) => {
    if (!owner) return false;
    const ownerLower = owner.toLowerCase().trim();
    if (!ownerLower) return false;
    return contactName.includes(ownerLower) || ownerLower.includes(contactName);
  });
  if (ownerMatch) score += 50;

  const title = (contact.title || "").toLowerCase();
  const hasOwnerTitle = OWNER_TITLES.some((t) => title.includes(t));
  if (hasOwnerTitle) score += 30;

  if (contact.email) score += 10;

  if (contact.phone_1_type?.toLowerCase() === "wireless") score += 10;

  const hasNoiseTitle = NOISE_TITLES.some((t) => title.includes(t));
  if (hasNoiseTitle) score -= 15;

  let tier: "HIGH" | "MEDIUM" | "LOW";
  if (score >= 60) tier = "HIGH";
  else if (score >= 40) tier = "MEDIUM";
  else tier = "LOW";

  return {
    dm_score: Math.max(0, Math.min(100, score)),
    dm_tier: tier,
    is_primary: false,
    decision_maker: score >= 40,
  };
}

// Select top 2 contacts per property
export function selectPrimaryContacts(contacts: (Contact & ScoringResult)[]): string[] {
  const sorted = [...contacts].sort((a, b) => b.dm_score - a.dm_score);

  const wireless = sorted.find((c) => c.phone_1_type?.toLowerCase() === "wireless" && c.dm_score >= 40);
  const landline = sorted.find((c) => c.phone_1_type?.toLowerCase() === "landline" && c.dm_score >= 40);

  const primaryIds: string[] = [];
  if (wireless) primaryIds.push(wireless.id);
  if (landline && primaryIds.length < 2) primaryIds.push(landline.id);

  for (const contact of sorted) {
    if (primaryIds.length >= 2) break;
    if (!primaryIds.includes(contact.id) && contact.dm_score >= 40) {
      primaryIds.push(contact.id);
    }
  }

  return primaryIds;
}
