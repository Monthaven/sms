// Commercial Real Estate Specific Functions
import { normalizeString } from "./normalize.js";

/**
 * Commercial property types and their characteristics
 */
const PROPERTY_TYPES = {
  office: {
    keywords: ['office', 'medical', 'professional', 'corporate', 'headquarters'],
    minValue: 500000,
    avgDealSize: 2000000,
    holdPeriod: '5-10 years'
  },
  retail: {
    keywords: ['retail', 'shopping', 'store', 'restaurant', 'commercial space'],
    minValue: 300000,
    avgDealSize: 1500000,
    holdPeriod: '7-15 years'
  },
  industrial: {
    keywords: ['warehouse', 'distribution', 'manufacturing', 'logistics', 'flex'],
    minValue: 750000,
    avgDealSize: 3000000,
    holdPeriod: '10-20 years'
  },
  multifamily: {
    keywords: ['apartment', 'multifamily', 'residential', 'units', 'complex'],
    minValue: 1000000,
    avgDealSize: 5000000,
    holdPeriod: '5-15 years'
  },
  mixed_use: {
    keywords: ['mixed use', 'mixed-use', 'live/work', 'ground floor retail'],
    minValue: 800000,
    avgDealSize: 4000000,
    holdPeriod: '7-20 years'
  }
};

/**
 * Detect commercial property type from property description/address
 */
export function detectPropertyType(propertyData) {
  const description = normalizeString(
    [propertyData.description, propertyData.propertyType, propertyData.zoning, propertyData.usage]
      .filter(Boolean)
      .join(' ')
  ).toLowerCase();

  for (const [type, config] of Object.entries(PROPERTY_TYPES)) {
    if (config.keywords.some(keyword => description.includes(keyword))) {
      return {
        type,
        confidence: 0.8,
        characteristics: config
      };
    }
  }

  return {
    type: 'unknown',
    confidence: 0.3,
    characteristics: null
  };
}

/**
 * Calculate commercial property investment metrics
 */
export function calculateCommercialMetrics(propertyData) {
  const {
    askingPrice,
    annualRent,
    expenses,
    squareFootage,
    occupancyRate = 0.95,
    marketCapRate = 0.06
  } = propertyData;

  const netOperatingIncome = (annualRent * occupancyRate) - (expenses || 0);
  const capRate = askingPrice > 0 ? (netOperatingIncome / askingPrice) : 0;
  const pricePerSF = askingPrice && squareFootage ? askingPrice / squareFootage : 0;
  const estimatedValue = netOperatingIncome / marketCapRate;
  
  return {
    noi: netOperatingIncome,
    capRate: capRate * 100, // Convert to percentage
    pricePerSF,
    estimatedValue,
    spreadToMarket: ((capRate - marketCapRate) / marketCapRate) * 100,
    cashFlow: netOperatingIncome - (askingPrice * 0.065), // Assuming 6.5% debt service
    metrics: {
      debtServiceCoverageRatio: netOperatingIncome / (askingPrice * 0.065),
      cashOnCashReturn: ((netOperatingIncome - (askingPrice * 0.065)) / (askingPrice * 0.25)) * 100
    }
  };
}

/**
 * Generate commercial-specific message templates
 */
export function generateCommercialTemplates(propertyType, ownerProfile, marketData) {
  const templates = {
    office: {
      initial: `Hi ${ownerProfile.name}, I noticed your ${propertyType.squareFootage || 'office'} building at ${propertyType.address}. With office markets shifting, I'm helping owners explore strategic exits. Worth a quick conversation?`,
      followUp: `${ownerProfile.name}, office cap rates have compressed 50-75 bps in your submarket. If you've considered selling your ${propertyType.address} property, now might be optimal timing. Quick call?`,
      urgency: `${ownerProfile.name}, we're actively acquiring office properties in your area. Just closed on a similar ${propertyType.squareFootage}SF building nearby. Can we discuss your ${propertyType.address} property this week?`
    },
    retail: {
      initial: `${ownerProfile.name}, I help retail property owners navigate today's changing landscape. Your ${propertyType.address} location caught my attention. Open to discussing strategic options?`,
      followUp: `Hi ${ownerProfile.name}, retail fundamentals are stabilizing in your market. If you've thought about monetizing your ${propertyType.address} investment, I'd love to share current market insights.`,
      urgency: `${ownerProfile.name}, strong retail demand in your corridor. We're pre-approved for acquisitions like your ${propertyType.address} property. Worth a brief conversation this week?`
    },
    industrial: {
      initial: `${ownerProfile.name}, industrial demand is unprecedented right now. I'm acquiring properties like your ${propertyType.address} facility. Mind if I share what we're seeing in the market?`,
      followUp: `Hi ${ownerProfile.name}, logistics/warehouse values have surged 40%+ in your market. If you've considered selling your ${propertyType.address} property, timing couldn't be better. Quick call?`,
      urgency: `${ownerProfile.name}, we have immediate capital for industrial acquisitions. Your ${propertyType.address} property fits our investment criteria perfectly. Can we connect this week?`
    },
    multifamily: {
      initial: `${ownerProfile.name}, I help apartment owners maximize value in today's market. Your ${propertyType.address} property has strong fundamentals. Open to exploring strategic options?`,
      followUp: `Hi ${ownerProfile.name}, multifamily values remain resilient in your submarket. If you've considered selling your ${propertyType.address} property, I'd love to share recent comparables.`,
      urgency: `${ownerProfile.name}, we're actively acquiring stabilized multifamily. Just closed on a similar property nearby. Can we discuss your ${propertyType.address} asset this week?`
    }
  };

  return templates[propertyType.type] || templates.office;
}

/**
 * Score commercial leads based on multiple factors (BUYER-FOCUSED)
 */
export function scoreCommercialLead(lead, propertyData, marketData) {
  let score = 50; // Base score

  // Property value factor (higher value = higher score for acquisition)
  if (propertyData.estimatedValue > 10000000) score += 35; // Premium properties
  else if (propertyData.estimatedValue > 5000000) score += 30;
  else if (propertyData.estimatedValue > 2000000) score += 20;
  else if (propertyData.estimatedValue > 1000000) score += 10;

  // Property type factor (based on current market demand)
  if (propertyData.type === 'industrial') score += 30; // Hottest market
  else if (propertyData.type === 'multifamily') score += 25; // Stable income
  else if (propertyData.type === 'office') score += 15; // Opportunity/value plays
  else if (propertyData.type === 'retail') score += 10; // Selective opportunities
  else if (propertyData.type === 'mixed-use') score += 20; // Diversified income

  // MOTIVATED SELLER FACTORS (key for buyers!)
  if (lead.ownershipType === 'individual') score += 20; // Easier decisions
  if (lead.yearsOwned > 15) score += 15; // Long hold, likely to cash out
  if (lead.yearsOwned > 25) score += 25; // Generational hold, estate planning
  if (lead.outOfStateOwner) score += 25; // Management burden, easier to motivate
  if (lead.elderlyOwner) score += 20; // Estate planning needs
  
  // DISTRESS INDICATORS (buyer opportunities)
  if (lead.distressSignals?.delinquentTaxes) score += 30; // Immediate need for cash
  if (lead.distressSignals?.vacancyIssues) score += 25; // Cash flow problems
  if (lead.distressSignals?.deferredMaintenance) score += 20; // Capital needs
  if (lead.distressSignals?.loanMaturity) score += 35; // Refinancing pressure
  if (lead.distressSignals?.partnershipDispute) score += 30; // Forced sale potential
  
  // ACQUISITION ADVANTAGES
  if (propertyData.capRate > (marketData.marketCapRate || 0.065) + 0.01) score += 20; // Good yield
  if (propertyData.occupancyRate < 0.85) score += 15; // Value-add opportunity
  if (lead.noRecentSales) score += 10; // Not recently transacted
  
  // Market timing factors
  if (marketData.daysOnMarket < 60) score += 15; // Fast market
  if (marketData.priceAppreciation > 0.15) score += 10; // Rising values
  if (marketData.interestRateEnvironment === 'rising') score += 15; // Motivated to sell before rates go higher

  // Cap the score at 100
  return Math.min(score, 100);
}

/**
 * Generate acquisition offer with capital stack (CAPITAL PARTNERS APPROACH)
 */
export function generateCapitalStackOffer(propertyData, marketData, buyerCriteria = {}) {
  const {
    targetCapRate = 0.065,        // Target cap rate for capital stack
    maxLTV = 0.80,                // Max loan-to-value (higher with partners)
    equityPartnerReturn = 0.15,   // Expected equity partner return
    renovationBudget = 0,         // Estimated renovation/improvement costs
    acquisitionCosts = 0.025,     // Lower costs with volume (2.5%)
    preferredReturn = 0.08,       // Preferred return to capital partners
    discountForComplexity = 0.05  // Discount for deal complexity
  } = buyerCriteria;

  const baseValue = propertyData.estimatedValue || 0;
  const noi = propertyData.noi || 0;
  
  // Calculate offer based on NOI and target cap rate for capital stack
  const capRateBasedValue = noi > 0 ? noi / targetCapRate : baseValue;
  
  // Capital stack considerations - can pay closer to market value
  const complexityDiscount = propertyData.distressIndicators?.length > 0 ? discountForComplexity : 0;
  
  // Calculate total project cost including improvements
  const totalProjectCosts = renovationBudget + (baseValue * acquisitionCosts);
  
  // Capital stack allows for higher offers (80% LTV typical)
  const maxFinanceableAmount = baseValue * maxLTV;
  const equityRequired = baseValue * (1 - maxLTV) + totalProjectCosts;
  
  // Generate offer range - more aggressive with capital partners
  const lowOffer = Math.max(
    capRateBasedValue * (1 - complexityDiscount) - totalProjectCosts,
    baseValue * 0.85  // Higher floor with capital partners (85% of value)
  );
  
  const highOffer = Math.min(
    capRateBasedValue + (baseValue * 0.05), // Can go 5% above cap rate value with capital
    baseValue * 1.02  // Can pay slight premium with right capital stack
  );
  
  const recommendedOffer = (lowOffer + highOffer) / 2;
  
  // Calculate returns for capital partners
  const projectedNOI = noi || (recommendedOffer * targetCapRate);
  const debtService = maxFinanceableAmount * 0.06; // 6% debt rate assumption
  const cashFlow = projectedNOI - debtService;
  const equityReturn = equityRequired > 0 ? (cashFlow / equityRequired) * 100 : 0;
  
  return {
    recommendedOffer: Math.round(recommendedOffer),
    offerRange: {
      low: Math.round(lowOffer),
      high: Math.round(highOffer)
    },
    capitalStack: {
      totalPurchasePrice: Math.round(recommendedOffer),
      debtAmount: Math.round(maxFinanceableAmount),
      equityRequired: Math.round(equityRequired),
      debtToValue: maxLTV * 100,
      equityToValue: (1 - maxLTV) * 100
    },
    metrics: {
      offerCapRate: projectedNOI > 0 ? (projectedNOI / recommendedOffer) * 100 : null,
      projectedCashFlow: Math.round(cashFlow),
      equityReturn: equityReturn.toFixed(1) + '%',
      debtServiceCoverage: debtService > 0 ? (projectedNOI / debtService).toFixed(2) : null,
      leveragedReturn: equityRequired > 0 ? ((cashFlow / equityRequired) * 100).toFixed(1) + '%' : null
    },
    dealAdvantages: [
      'Flexible financing structure with capital partners',
      'Can close quickly with committed capital', 
      complexityDiscount > 0 ? 'Creative solutions for complex situations' : 'Fair market approach',
      'No broker fees - more value to seller',
      'Professional acquisition team with track record',
      `${maxLTV * 100}% financing available - strong capital backing`
    ]
  };
}

/**
 * Detect motivated seller indicators (KEY FOR BUYERS)
 */
export function detectMotivatedSeller(lead, propertyData, marketData) {
  const motivationFactors = [];
  let motivationScore = 0;

  // Financial distress indicators
  if (lead.distressSignals?.delinquentTaxes) {
    motivationFactors.push('Delinquent property taxes - immediate cash need');
    motivationScore += 40;
  }
  
  if (lead.distressSignals?.loanMaturity) {
    motivationFactors.push('Loan maturity approaching - refinancing pressure');
    motivationScore += 35;
  }
  
  if (propertyData.vacancyRate > 0.3) {
    motivationFactors.push('High vacancy - cash flow problems');
    motivationScore += 30;
  }
  
  // Ownership situation factors
  if (lead.ownershipType === 'estate' || lead.elderlyOwner) {
    motivationFactors.push('Estate/elderly owner - succession planning needs');
    motivationScore += 25;
  }
  
  if (lead.partnershipDispute || lead.ownershipType === 'partnership') {
    motivationFactors.push('Partnership/multiple owners - potential for disputes');
    motivationScore += 20;
  }
  
  if (lead.outOfStateOwner) {
    motivationFactors.push('Out-of-state owner - management burden');
    motivationScore += 15;
  }
  
  // Time-based factors
  if (lead.yearsOwned > 20) {
    motivationFactors.push('Long-term ownership - potential exit timing');
    motivationScore += 15;
  }
  
  // Market factors
  if (marketData.interestRateEnvironment === 'rising') {
    motivationFactors.push('Rising rates - window to sell before values decline');
    motivationScore += 10;
  }
  
  if (propertyData.deferredMaintenance) {
    motivationFactors.push('Deferred maintenance - capital needs');
    motivationScore += 20;
  }

  return {
    motivationScore: Math.min(motivationScore, 100),
    motivationLevel: motivationScore >= 70 ? 'HIGH' : motivationScore >= 40 ? 'MEDIUM' : 'LOW',
    factors: motivationFactors,
    buyerStrategy: getBuyerStrategy(motivationScore, motivationFactors)
  };
}

/**
 * Get buyer strategy based on motivation level
 */
function getBuyerStrategy(motivationScore, factors) {
  if (motivationScore >= 70) {
    return {
      approach: 'AGGRESSIVE',
      timeline: 'Move fast - call within 4 hours',
      messaging: 'Emphasize quick cash solution and problem-solving',
      offerStrategy: 'Present immediate cash offer with fast close',
      followUpFrequency: 'Daily until response'
    };
  } else if (motivationScore >= 40) {
    return {
      approach: 'CONSULTATIVE', 
      timeline: 'Call within 24 hours',
      messaging: 'Focus on market timing and strategic opportunity',
      offerStrategy: 'Build relationship first, then present offer',
      followUpFrequency: 'Every 3-4 days'
    };
  } else {
    return {
      approach: 'RELATIONSHIP_BUILDING',
      timeline: 'Call within 48 hours',
      messaging: 'Market intelligence and long-term relationship',
      offerStrategy: 'Nurture relationship, wait for motivation to increase',
      followUpFrequency: 'Weekly, then monthly'
    };
  }
}

/**
 * Classify inbound responses for commercial context
 */
export function classifyCommercialResponse(message) {
  const msg = message.toLowerCase();
  
  // Commercial-specific intent detection
  if (/\b(interested|tell me more|what.*(offer|price)|how much)\b/.test(msg)) {
    return {
      classification: 'INTERESTED',
      confidence: 0.9,
      priority: 'HIGH',
      suggestedAction: 'Schedule property tour within 48 hours',
      commercial_intent: 'sale_interest'
    };
  }
  
  if (/\b(refinanc|loan|debt|mortgage|capital)\b/.test(msg)) {
    return {
      classification: 'REFINANCING_INTEREST', 
      confidence: 0.8,
      priority: 'MEDIUM',
      suggestedAction: 'Connect with lending partner',
      commercial_intent: 'financing_need'
    };
  }
  
  if (/\b(partner|joint venture|invest with|equity)\b/.test(msg)) {
    return {
      classification: 'PARTNERSHIP_INTEREST',
      confidence: 0.85,
      priority: 'MEDIUM', 
      suggestedAction: 'Schedule investment committee presentation',
      commercial_intent: 'partnership_opportunity'
    };
  }
  
  if (/\b(management|operate|lease|tenant)\b/.test(msg)) {
    return {
      classification: 'MANAGEMENT_INTEREST',
      confidence: 0.7,
      priority: 'LOW',
      suggestedAction: 'Refer to property management team',
      commercial_intent: 'service_need'
    };
  }
  
  // Default classifications
  if (/\b(not interested|no|remove)\b/.test(msg)) {
    return {
      classification: 'NOT_INTERESTED',
      confidence: 0.9,
      priority: 'LOW',
      suggestedAction: 'Add to suppression list',
      commercial_intent: 'rejection'
    };
  }
  
  return {
    classification: 'NEEDS_REVIEW',
    confidence: 0.5,
    priority: 'MEDIUM',
    suggestedAction: 'Human review required',
    commercial_intent: 'unclear'
  };
}

/**
 * Generate market-aware follow-up sequence
 */
export function generateFollowUpSequence(lead, propertyData, responseHistory) {
  const propertyType = propertyData.type;
  const leadScore = scoreCommercialLead(lead, propertyData, {});
  
  const sequences = {
    high_value: {
      day_3: `${lead.name}, following up on your ${propertyData.address} property. Market conditions are creating unique opportunities for sellers. 10-minute call to discuss?`,
      day_7: `${lead.name}, just closed on a similar ${propertyType} property in your market at ${propertyData.estimatedValue > 2000000 ? 'strong' : 'competitive'} pricing. Worth comparing notes on your asset?`,
      day_14: `${lead.name}, final follow-up on your ${propertyData.address} property. We're moving to other opportunities in the area. Still open to a brief conversation?`,
      day_30: `${lead.name}, market update: ${propertyType} values continue trending up in your submarket. Thought you'd want to know given your ${propertyData.address} asset.`
    },
    medium_value: {
      day_5: `${lead.name}, quick follow-up on your ${propertyData.address} property. Happy to share what we're seeing in the local market if helpful.`,
      day_12: `${lead.name}, still interested in discussing your ${propertyData.address} property. No pressure - just market insights if valuable to you.`,
      day_25: `${lead.name}, hope all is well with your ${propertyData.address} property. Here if you ever want to discuss market trends or opportunities.`
    }
  };
  
  return leadScore >= 70 ? sequences.high_value : sequences.medium_value;
}