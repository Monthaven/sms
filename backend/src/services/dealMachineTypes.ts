/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * DealMachine Lead from /public/v1/leads API endpoint
 * Represents a property lead with owner and contact information
 */
export interface DealMachineLead {
  /** Unique identifier for the lead */
  id: string;

  // Property Address
  property_address_line1: string;
  property_address_line2?: string;
  property_address_city: string;
  property_address_state: string;
  property_address_zip: string;

  // Property Details
  /** Estimated property value in dollars */
  EstimatedValue: number;

  /** Property type classification */
  property_type: {
    id: string;
    label: string; // "Single Family", "Multi Family", "Commercial", etc.
  };

  /** Number of units in the property */
  units_count: number;

  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  lot_size?: number;
  year_built?: number;

  // Owner/Equity Info
  /** Owner's equity percentage in the property (0-100) */
  equity_percent: number;

  /** Type of ownership: "absentee", "corporate", "in-state", "out-of-state" */
  owner_type: string;

  /** Whether the owner lives in the property */
  owner_occupied: boolean;

  // Contact Info
  /** Whether the lead has at least one phone number */
  has_phone_number: boolean;

  /** Array of phone numbers associated with the property owner */
  phone_numbers: Array<{
    phone_number: string;
    type: string; // "mobile", "landline", etc.
  }>;

  /** Array of email addresses for the property owner */
  email_addresses?: string[];

  // Owner Details
  owner_name?: string;
  mailing_address?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Buyer criteria model from Prisma schema
 * Used to filter DealMachine leads based on investor preferences
 */
export interface BuyerCriteria {
  id: string;
  investor_id: string;
  criteria_name: string;
  is_active: boolean | null;

  // Market Filters
  /** Target geographic markets (cities, states, MSAs). Empty = no filter. */
  target_markets: string[];

  /** Markets to exclude. Leads in these markets will be rejected. */
  excluded_markets: string[];

  // Deal Size Filters
  /** Minimum acceptable deal size in dollars */
  min_deal_size: Decimal | null;

  /** Maximum acceptable deal size in dollars */
  max_deal_size: Decimal | null;

  /** Preferred minimum deal size (sweet spot) */
  sweet_spot_min: Decimal | null;

  /** Preferred maximum deal size (sweet spot) */
  sweet_spot_max: Decimal | null;

  // Asset Filters
  /** Acceptable asset types: ["multifamily", "commercial", "land", "other"] */
  asset_types: string[];

  /** Minimum number of units */
  min_units: number | null;

  /** Maximum number of units */
  max_units: number | null;

  // Additional fields available but not used in filtering (for future)
  class_preference?: string[];
  strategies?: string[];
  min_irr?: Decimal | null;
  min_equity_multiple?: Decimal | null;
  min_cash_on_cash?: Decimal | null;
  min_cap_rate?: Decimal | null;
  max_cap_rate?: Decimal | null;
  preferred_position?: string | null;
  min_equity_check?: Decimal | null;
  max_equity_check?: Decimal | null;
  requires_audited_financials?: boolean | null;
  requires_phase_i?: boolean | null;
  requires_pml?: boolean | null;
  requires_insurance_quotes?: boolean | null;
  notes?: string | null;

  created_at?: Date;
  updated_at?: Date;
}

/**
 * Lead matching result with score
 */
export interface LeadMatch {
  lead: DealMachineLead;
  score: number;
  matchedCriteriaId?: string;
}

/**
 * Asset type normalization mapping
 * Maps DealMachine property types to standardized categories
 * Note: Single family properties are excluded and will not be imported
 */
export const AssetTypeMap = {
  multifamily: ['multi family', 'multifamily', 'duplex', 'triplex', 'fourplex', 'apartment', '2 unit', '3 unit', '4 unit'],
  commercial: ['commercial', 'retail', 'office', 'industrial', 'warehouse', 'mixed use'],
  land: ['land', 'vacant land', 'lot', 'acreage'],
  other: ['other']
} as const;

export type StandardAssetType = keyof typeof AssetTypeMap;

/**
 * Property types that should be excluded from lead processing
 * These will be filtered out during lead processing
 */
export const ExcludedPropertyTypes = [
  'single family',
  'sfr',
  'single',
  'single-family',
  'detached',
  'single family residential',
  'manufactured',
  'manufactured home',
  'mobile home',
  'condo',
  'condominium',
  'townhouse',
  'townhome'
] as const;
