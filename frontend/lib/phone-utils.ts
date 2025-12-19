/**
 * Phone number utilities for MAE
 * - E.164 normalization
 * - Type classification
 * - Toll-free detection
 */

// E.164 format: +1XXXXXXXXXX
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Strip all non-digits
  const digits = phone.replace(/\D/g, "");

  // Handle various formats
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("1")) {
    return `+${digits.slice(1)}`;
  }
  if (phone.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null; // Invalid
}

// Toll-free prefixes
const TOLL_FREE_PREFIXES = ["800", "888", "877", "866", "855", "844", "833"];

export function isTollFree(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone ?? "");
  if (!normalized) return false;
  const areaCode = normalized.slice(2, 5);
  return TOLL_FREE_PREFIXES.includes(areaCode);
}

// Basic type classification (can enhance with lookup API later)
export function classifyPhoneType(phone: string | null | undefined, knownType?: string | null): string {
  if (knownType) return knownType.toLowerCase();
  if (isTollFree(phone)) return "toll_free";
  return "unknown"; // Would need carrier lookup for wireless/landline
}

export function isValidPhone(phone: string | null | undefined): boolean {
  return normalizePhone(phone ?? "") !== null;
}

// Batch normalize
export function normalizePhones(phones: (string | null | undefined)[]): (string | null)[] {
  return phones.map((p) => (p ? normalizePhone(p) : null));
}
