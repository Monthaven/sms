/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { Decimal } from '@prisma/client/runtime/library';
import {
  DealMachineLead,
  BuyerCriteria,
  AssetTypeMap,
  ExcludedPropertyTypes,
  StandardAssetType,
} from './dealMachineTypes';

/**
 * Normalize a property type label to a standard asset type category
 * Returns null for excluded property types (SFR, manufactured, condo, townhouse)
 *
 * @param label Property type label from DealMachine (e.g., "Multi Family", "Commercial")
 * @returns Normalized asset type or null if excluded
 *
 * @example
 * normalizeAssetType("Multi Family") // "multifamily"
 * normalizeAssetType("Duplex") // "multifamily"
 * normalizeAssetType("Single Family") // null (excluded)
 * normalizeAssetType("Condo") // null (excluded)
 * normalizeAssetType("Commercial") // "commercial"
 */
export function normalizeAssetType(label: string): StandardAssetType | null {
  const normalized = label.toLowerCase().trim();

  // Check if it's an excluded property type (SFR, manufactured, condo, townhouse)
  for (const excludedType of ExcludedPropertyTypes) {
    if (normalized.includes(excludedType.toLowerCase())) {
      return null; // Excluded property type
    }
  }

  // Check each asset type category
  for (const [category, patterns] of Object.entries(AssetTypeMap)) {
    for (const pattern of patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return category as StandardAssetType;
      }
    }
  }

  // Default to "other" if no match found (and not SFR)
  return 'other';
}

/**
 * Check if a lead's market (state/city) matches the criteria
 *
 * @param lead DealMachine lead with property address
 * @param targetMarkets List of target markets (empty = accept all)
 * @param excludedMarkets List of excluded markets
 * @returns true if market is acceptable
 */
function matchesMarket(
  lead: DealMachineLead,
  targetMarkets: string[],
  excludedMarkets: string[]
): boolean {
  const state = lead.property_address_state?.toLowerCase().trim() || '';
  const city = lead.property_address_city?.toLowerCase().trim() || '';

  // Check excluded markets first (hard reject)
  for (const excluded of excludedMarkets) {
    const normalizedExcluded = excluded.toLowerCase().trim();
    if (state.includes(normalizedExcluded) || city.includes(normalizedExcluded)) {
      return false;
    }
  }

  // If target markets specified, lead must be in one of them
  if (targetMarkets.length > 0) {
    let found = false;
    for (const target of targetMarkets) {
      const normalizedTarget = target.toLowerCase().trim();
      if (state.includes(normalizedTarget) || city.includes(normalizedTarget)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a deal size falls within acceptable range
 *
 * @param value Estimated property value
 * @param min Minimum deal size (null = no minimum)
 * @param max Maximum deal size (null = no maximum)
 * @returns true if value is within range
 */
function matchesDealSize(value: number, min: Decimal | null, max: Decimal | null): boolean {
  if (min !== null && value < Number(min)) {
    return false;
  }
  if (max !== null && value > Number(max)) {
    return false;
  }
  return true;
}

/**
 * Check if a unit count falls within acceptable range
 *
 * @param units Number of units in property
 * @param min Minimum units (null = no minimum)
 * @param max Maximum units (null = no maximum)
 * @returns true if units is within range
 */
function matchesUnitCount(units: number, min: number | null, max: number | null): boolean {
  if (min !== null && units < min) {
    return false;
  }
  if (max !== null && units > max) {
    return false;
  }
  return true;
}

/**
 * Check if a lead matches buyer criteria
 * All active filters must pass for the lead to match
 *
 * @param lead DealMachine lead to evaluate
 * @param criteria Buyer criteria to match against
 * @returns true if lead passes all criteria filters
 *
 * @example
 * const criteria = {
 *   excluded_markets: ["CA"],
 *   target_markets: ["TX", "FL"],
 *   min_deal_size: new Decimal(500000),
 *   max_deal_size: new Decimal(5000000),
 *   asset_types: ["multifamily"],
 *   min_units: 5,
 *   max_units: 100
 * };
 *
 * if (matchesCriteria(lead, criteria)) {
 *   console.log("Lead matches criteria!");
 * }
 */
export function matchesCriteria(lead: DealMachineLead, criteria: BuyerCriteria): boolean {
  // CRITICAL: Exclude SFR, manufactured, condo, townhouse properties first
  const assetType = normalizeAssetType(lead.property_type?.label || '');
  if (assetType === null) {
    return false; // Excluded property type
  }

  // Check market filters
  if (!matchesMarket(lead, criteria.target_markets || [], criteria.excluded_markets || [])) {
    return false;
  }

  // Check deal size
  if (!matchesDealSize(lead.EstimatedValue, criteria.min_deal_size, criteria.max_deal_size)) {
    return false;
  }

  // Check asset type (must be in accepted types)
  const criteriaAssetTypes = criteria.asset_types || ['multifamily'];
  if (!criteriaAssetTypes.includes(assetType)) {
    return false;
  }

  // Check unit count
  if (!matchesUnitCount(lead.units_count || 1, criteria.min_units, criteria.max_units)) {
    return false;
  }

  return true;
}

/**
 * Calculate a fit score for a lead against buyer criteria
 * Score ranges from 0-100, with higher scores indicating better fit
 *
 * Base score: 50 (lead passed all filters)
 * Bonuses:
 * - Sweet spot deal size: +20
 * - High equity (>50%): +15
 * - Absentee/corporate owner: +10
 * - Has phone number: +5
 *
 * @param lead DealMachine lead to score
 * @param criteria Buyer criteria for scoring
 * @returns Score from 0-100
 *
 * @example
 * const score = scoreLead(lead, criteria);
 * if (score >= 80) {
 *   console.log("Excellent fit!");
 * }
 */
export function scoreLead(lead: DealMachineLead, criteria: BuyerCriteria): number {
  let score = 50; // Base score for passing filters

  // Sweet spot bonus: +20 if in preferred deal size range
  if (
    criteria.sweet_spot_min !== null &&
    criteria.sweet_spot_max !== null &&
    lead.EstimatedValue >= Number(criteria.sweet_spot_min) &&
    lead.EstimatedValue <= Number(criteria.sweet_spot_max)
  ) {
    score += 20;
  }

  // High equity bonus: +15 if equity > 50%
  if (lead.equity_percent > 50) {
    score += 15;
  }

  // Absentee/corporate owner bonus: +10
  const ownerType = (lead.owner_type || '').toLowerCase();
  if (ownerType.includes('absentee') || ownerType.includes('corporate')) {
    score += 10;
  }

  // Contact availability bonus: +5 if has phone number
  if (lead.has_phone_number) {
    score += 5;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Filter an array of leads against a single buyer criteria
 * Returns matched leads with scores
 *
 * @param leads Array of DealMachine leads
 * @param criteria Buyer criteria to filter against
 * @returns Array of matched leads with scores
 */
export function filterLeadsByCriteria(
  leads: DealMachineLead[],
  criteria: BuyerCriteria
): Array<{ lead: DealMachineLead; score: number; criteriaId: string }> {
  const matches: Array<{ lead: DealMachineLead; score: number; criteriaId: string }> = [];

  for (const lead of leads) {
    if (matchesCriteria(lead, criteria)) {
      const score = scoreLead(lead, criteria);
      matches.push({ lead, score, criteriaId: criteria.id });
    }
  }

  return matches;
}

/**
 * Filter leads against multiple buyer criteria (OR logic)
 * A lead is included if it matches ANY active criteria
 * First match wins - we don't check remaining criteria after first match
 *
 * @param leads Array of DealMachine leads
 * @param criteriaList Array of buyer criteria to check
 * @returns Array of matched leads with scores (deduplicated by lead ID)
 */
export function filterLeadsByAnyCriteria(
  leads: DealMachineLead[],
  criteriaList: BuyerCriteria[]
): Array<{ lead: DealMachineLead; score: number; criteriaId: string }> {
  const matches: Array<{ lead: DealMachineLead; score: number; criteriaId: string }> = [];
  const matchedLeadIds = new Set<string>();

  for (const lead of leads) {
    // Skip if already matched (first match wins)
    if (matchedLeadIds.has(lead.id)) {
      continue;
    }

    // Check against each criteria (OR logic)
    for (const criteria of criteriaList) {
      if (matchesCriteria(lead, criteria)) {
        const score = scoreLead(lead, criteria);
        matches.push({ lead, score, criteriaId: criteria.id });
        matchedLeadIds.add(lead.id);
        break; // First match wins
      }
    }
  }

  return matches;
}
