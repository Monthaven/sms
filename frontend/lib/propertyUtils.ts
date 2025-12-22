/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

export function parsePropertyFinancials(rawDetails: Record<string, any> | null) {
  if (!rawDetails) return { equity: null, estimatedValue: null, lastSalePrice: null, lastSaleDate: null };
  const equity = rawDetails.property_equity_percent ?? rawDetails.equity_percent ?? rawDetails.equity ?? null;
  const estimatedValue = rawDetails.estimated_value ?? rawDetails.estimatedValue ?? rawDetails.market_value ?? null;
  const lastSalePrice = rawDetails.last_sale_price ?? rawDetails.lastSalePrice ?? rawDetails.lastSale ?? null;
  const lastSaleDate = rawDetails.last_sale_date ?? rawDetails.lastSaleDate ?? rawDetails.lastSaleAt ?? null;
  return { equity, estimatedValue, lastSalePrice, lastSaleDate };
}

export function parsePropertyDetails(rawDetails: Record<string, any> | null) {
  if (!rawDetails) return { beds: null, baths: null, sqft: null, yearBuilt: null, propertyType: null, vacant: false, taxDelinquent: false };
  const beds = rawDetails.bedrooms ?? rawDetails.beds ?? rawDetails.bed ?? null;
  const baths = rawDetails.bathrooms ?? rawDetails.baths ?? rawDetails.bath ?? null;
  const sqft = rawDetails.sqft ?? rawDetails.square_feet ?? rawDetails.living_area ?? null;
  const yearBuilt = rawDetails.year_built ?? rawDetails.yearBuilt ?? rawDetails.built ?? null;
  const propertyType = rawDetails.property_type ?? rawDetails.type ?? null;
  const vacant = Boolean(rawDetails.vacant || rawDetails.is_vacant || rawDetails.vacancy);
  const taxDelinquent = Boolean(rawDetails.tax_delinquent || rawDetails.taxDelinquent || rawDetails.tax_delinquent_flag);
  return { beds, baths, sqft, yearBuilt, propertyType, vacant, taxDelinquent };
}

export function parseOwnerNames(rawDetails: Record<string, any> | null) {
  if (!rawDetails) return { owner1Name: null, owner2Name: null };
  const owner1Name = rawDetails.owner_1_name ?? rawDetails.owner1Name ?? rawDetails.owner_name ?? rawDetails.owner ?? null;
  const owner2Name = rawDetails.owner_2_name ?? rawDetails.owner2Name ?? rawDetails.co_owner ?? null;
  return { owner1Name, owner2Name };
}

export function hasDistressIndicators(rawDetails: Record<string, any> | null) {
  if (!rawDetails) return false;
  return Boolean(rawDetails.vacant || rawDetails.tax_delinquent || rawDetails.high_equity || rawDetails.taxDelinquent);
}

export function getContactFlags(rawDetails: Record<string, any> | null, phoneE164: string | null) {
  if (!rawDetails || !phoneE164) return [] as string[];
  // Try to find contact slot by phone: contact_1_phone, contact_2_phone, etc.
  for (let i = 1; i <= 20; i++) {
    const phoneKey = `contact_${i}_phone`;
    const phoneAlt1 = `contact${i}_phone`;
    const phoneAlt2 = `contact_${i}_phone_e164`;
    const val = rawDetails[phoneKey] ?? rawDetails[phoneAlt1] ?? rawDetails[phoneAlt2];
    if (!val) continue;
    // Normalize numbers compare last 10 digits
    const norm = (s: string) => s.replace(/\D/g, '').replace(/^1/, '');
    if (norm(String(val)) === norm(phoneE164)) {
      const flagsKey = `contact_${i}_flags`;
      const flagsAlt = `contact${i}_flags`;
      const flagsRaw = rawDetails[flagsKey] ?? rawDetails[flagsAlt] ?? rawDetails[`${i}_flags`] ?? rawDetails.contact_flags ?? null;
      if (!flagsRaw) return [];
      return String(flagsRaw).split(/[,|;]/).map((f: string) => f.trim()).filter(Boolean);
    }
  }
  return [] as string[];
}

export function findContactIndex(rawDetails: Record<string, any> | null, phoneE164: string | null) {
  if (!rawDetails || !phoneE164) return null;
  for (let i = 1; i <= 20; i++) {
    const phoneKey = `contact_${i}_phone`;
    const phoneAlt1 = `contact${i}_phone`;
    const phoneAlt2 = `contact_${i}_phone_e164`;
    const val = rawDetails[phoneKey] ?? rawDetails[phoneAlt1] ?? rawDetails[phoneAlt2];
    if (!val) continue;
    const norm = (s: string) => s.replace(/\D/g, '').replace(/^1/, '');
    if (norm(String(val)) === norm(phoneE164)) return i;
  }
  return null;
}

export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(n)) return null;
  return `${Math.round(n)}%`;
}
