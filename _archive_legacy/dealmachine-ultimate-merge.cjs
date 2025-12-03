#!/usr/bin/env node
/**
 * ULTIMATE DEALMACHINE MERGE - ALL INTELLIGENCE
 * 
 * Sources:
 * - All three 11-10 exports (22,540 properties total)
 * - All old DealMachine exports for enrichment
 * - 6,621 EZ Texting contacts with response history
 * 
 * Output: 32 Notion properties with maximum deal intelligence
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parsePhoneNumber } = require('libphonenumber-js');

console.log('🚀 ULTIMATE DEALMACHINE MERGE - ALL INTELLIGENCE\n');
console.log('='.repeat(70) + '\n');

// All DealMachine files
const DEALMACHINE_FILES = {
  // THREE 11-10 EXPORTS (freshest data)
  fresh: [
    '../11-10 export 9843 leads total (1).csv',
    '../11-10 export 9843 leads total (2) (best).csv',
    '../11-10 export 9843 leads total (3).csv',
  ],
  // OLD EXPORTS (for enrichment)
  enrichment: [
    '../deal machine export nc - sorted owner occupied (extra names).csv',
    '../dealmachine-contacts-2025-04-06-175750 - dealmachine-contacts-2025-04-06-175750.csv',
    '../dealmachine-properties-2025-08-05-125343.csv',
    '../dealmachine-properties-2025-08-07-085954.csv',
    '../dealmachine-properties-2025-08-07-181848.csv',
    '../dealmachine-properties-2025-08-08-140423.csv',
    '../dealmachine-properties-2025-08-12-112928.csv',
    '../Combined Deal Machine - Combined Deal Machine.csv',
    '../Deal machine contacts with no contact houses are included no land lines (all NC).csv',
  ]
};

const EXISTING_MASTER = './notion-import-master.csv';

// Normalize phone to E.164
function normalizePhone(phone) {
  if (!phone) return null;
  try {
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) return `1${cleaned}`;
    if (cleaned.length === 11 && cleaned[0] === '1') return cleaned;
    const parsed = parsePhoneNumber(phone, 'US');
    return parsed.number.replace('+', '');
  } catch {
    return null;
  }
}

// Classify property type
function classifyPropertyType(dmData) {
  const propType = (dmData.property_type || '').toLowerCase();
  const unitsCount = parseInt(dmData.units_count) || 0;
  const bedrooms = parseInt(dmData.total_bedrooms) || 0;
  
  if (unitsCount >= 5 || propType.includes('multi') || propType.includes('apartment')) {
    return 'Multi-family';
  }
  
  if (propType.includes('commercial') || 
      propType.includes('industrial') || 
      propType.includes('retail') ||
      propType.includes('office') ||
      propType === 'other' && unitsCount === 0 && bedrooms === 0) {
    return 'Commercial';
  }
  
  if (bedrooms >= 1 && unitsCount <= 1) {
    return 'Single-family';
  }
  
  return 'Unknown';
}

// Parse property flags into array
function parsePropertyFlags(flagsStr) {
  if (!flagsStr) return [];
  return flagsStr.split(',').map(f => f.trim()).filter(Boolean);
}

// Extract comprehensive property data
function extractFullPropertyData(dmData) {
  const estimatedValue = parseFloat((dmData.estimated_value || '').replace(/[$,]/g, '')) || 0;
  const equityAmount = parseFloat((dmData.equity_amount || '').replace(/[$,]/g, '')) || 0;
  const equityPercent = parseFloat(dmData.equity_percent) || 0;
  const loanBalance = parseFloat((dmData.total_loan_balance || '').replace(/[$,]/g, '')) || 0;
  const units = parseInt(dmData.units_count) || 0;
  const bedrooms = parseInt(dmData.total_bedrooms) || 0;
  const baths = parseFloat(dmData.total_baths) || 0;
  const sqft = parseInt(dmData.building_square_feet) || 0;
  const acreage = parseFloat(dmData.lot_acreage) || 0;
  const lastSalePrice = parseFloat((dmData.sale_price || '').replace(/[$,]/g, '')) || 0;
  
  return {
    // Core identifiers
    propertyAddress: dmData.property_address_full || dmData.property_address_line_1 || '',
    propertyType: classifyPropertyType(dmData),
    
    // Financial data
    estimatedValue,
    equityAmount,
    equityPercent,
    loanBalance,
    
    // Physical details
    units,
    bedrooms,
    baths,
    sqft,
    yearBuilt: dmData.year_built || '',
    lotAcreage: acreage,
    
    // Owner intelligence
    isCorporateOwner: dmData.is_corporate_owner === '1' || dmData.is_corporate_owner === 'true',
    outOfStateOwner: dmData.out_of_state_owner === '1' || dmData.out_of_state_owner === 'true',
    ownerLocation: dmData.owner_location || '',
    
    // Property flags
    propertyFlags: parsePropertyFlags(dmData.property_flags),
    
    // Market & condition
    marketStatus: dmData.market_status || '',
    buildingCondition: dmData.building_condition || '',
    lastSaleDate: dmData.sale_date || '',
    lastSalePrice,
  };
}

// Calculate priority score
function calculatePriorityScore(data) {
  let score = 0;
  
  // Multi-family premium
  if (data.propertyType === 'Multi-family') score += 30;
  if (data.units >= 20) score += 25;
  else if (data.units >= 10) score += 20;
  else if (data.units >= 5) score += 15;
  
  // Commercial premium
  if (data.propertyType === 'Commercial') score += 25;
  
  // Equity (motivation signal)
  if (data.equityPercent >= 80) score += 25;
  else if (data.equityPercent >= 70) score += 20;
  else if (data.equityPercent >= 50) score += 15;
  else if (data.equityPercent >= 30) score += 10;
  
  // Property flags
  if (data.propertyFlags.includes('High Equity')) score += 15;
  if (data.propertyFlags.includes('Absentee Owner')) score += 15;
  if (data.propertyFlags.includes('Corporate Owner')) score += 10;
  if (data.propertyFlags.includes('Tax Delinquent')) score += 20;
  if (data.propertyFlags.includes('Pre-foreclosure')) score += 25;
  if (data.propertyFlags.includes('Cash Buyer')) score += 5;
  
  // Value bands
  if (data.estimatedValue >= 5000000) score += 20;
  else if (data.estimatedValue >= 2000000) score += 15;
  else if (data.estimatedValue >= 1000000) score += 10;
  else if (data.estimatedValue >= 500000) score += 5;
  
  // Out of state bonus
  if (data.outOfStateOwner) score += 10;
  
  // Corporate owner bonus
  if (data.isCorporateOwner) score += 10;
  
  return Math.round(score);
}

// Step 1: Load existing EZ Texting master
console.log('📂 Loading existing EZ Texting database...\n');
const existingData = fs.readFileSync(EXISTING_MASTER, 'utf-8');
const existingContacts = parse(existingData, { 
  columns: true, 
  skip_empty_lines: true 
});

console.log(`✅ Loaded ${existingContacts.length.toLocaleString()} existing contacts\n`);

// Build enrichment map
const contactsMap = new Map();
existingContacts.forEach(contact => {
  const phone = normalizePhone(contact.Phone);
  if (phone) {
    contactsMap.set(phone, {
      Phone: phone,
      OwnerName: contact.OwnerName || '',
      PropertyAddress: contact.PropertyAddress || '',
      PropertyType: contact.PropertyType || 'Unknown',
      ResponseType: contact.ResponseType || 'COLD',
      LastMessage: contact.LastMessage || '',
      ValueDiscussed: contact.ValueDiscussed || '',
      DateContacted: contact.DateContacted || '',
      NextAction: contact.NextAction || '',
      Handler: contact.Handler || '',
      SourceCampaign: contact.SourceCampaign || '',
      MessageCount: contact.MessageCount || '0',
      Notes: contact.Notes || '',
      IsOptOut: contact.IsOptOut || 'false',
      
      // NEW FIELDS (will be enriched)
      EstimatedValue: '',
      EquityAmount: '',
      EquityPercent: '',
      LoanBalance: '',
      Units: '',
      Bedrooms: '',
      Bathrooms: '',
      SquareFeet: '',
      YearBuilt: '',
      LotAcreage: '',
      IsCorporateOwner: 'false',
      OutOfStateOwner: 'false',
      OwnerLocation: '',
      PropertyFlags: '',
      MarketStatus: '',
      BuildingCondition: '',
      LastSaleDate: '',
      LastSalePrice: '',
      PriorityScore: '0',
      
      enriched: false
    });
  }
});

console.log('='.repeat(70) + '\n');

// Step 2: Process ALL DealMachine files
console.log('📂 PHASE 1: ENRICHMENT FROM OLD EXPORTS\n');

let enrichmentStats = {
  totalRecords: 0,
  contactsEnriched: 0,
  filesProcessed: 0
};

DEALMACHINE_FILES.enrichment.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping: ${path.basename(filePath)} (not found)`);
    return;
  }
  
  console.log(`📄 ${path.basename(filePath)}`);
  
  try {
    const dmData = fs.readFileSync(fullPath, 'utf-8');
    const dmRecords = parse(dmData, { 
      columns: true, 
      skip_empty_lines: true 
    });
    
    enrichmentStats.totalRecords += dmRecords.length;
    enrichmentStats.filesProcessed++;
    let fileMatches = 0;
    
    dmRecords.forEach(record => {
      // Extract phones
      const phones = [];
      for (let i = 1; i <= 20; i++) {
        for (let j = 1; j <= 3; j++) {
          const phoneField = record[`contact_${i}_phone${j}`];
          if (phoneField) {
            const normalized = normalizePhone(phoneField);
            if (normalized) phones.push(normalized);
          }
        }
      }
      
      // Enrich matching contacts
      phones.forEach(phone => {
        const contact = contactsMap.get(phone);
        if (contact && !contact.enriched) {
          const propData = extractFullPropertyData(record);
          
          // Add property intelligence
          if (!contact.PropertyAddress) contact.PropertyAddress = propData.propertyAddress;
          if (contact.PropertyType === 'Unknown') contact.PropertyType = propData.propertyType;
          
          contact.EstimatedValue = propData.estimatedValue || contact.EstimatedValue;
          contact.EquityAmount = propData.equityAmount || contact.EquityAmount;
          contact.EquityPercent = propData.equityPercent || contact.EquityPercent;
          contact.LoanBalance = propData.loanBalance || contact.LoanBalance;
          contact.Units = propData.units || contact.Units;
          contact.Bedrooms = propData.bedrooms || contact.Bedrooms;
          contact.Bathrooms = propData.baths || contact.Bathrooms;
          contact.SquareFeet = propData.sqft || contact.SquareFeet;
          contact.YearBuilt = propData.yearBuilt || contact.YearBuilt;
          contact.LotAcreage = propData.lotAcreage || contact.LotAcreage;
          contact.IsCorporateOwner = propData.isCorporateOwner ? 'true' : contact.IsCorporateOwner;
          contact.OutOfStateOwner = propData.outOfStateOwner ? 'true' : contact.OutOfStateOwner;
          contact.OwnerLocation = propData.ownerLocation || contact.OwnerLocation;
          contact.PropertyFlags = propData.propertyFlags.join(', ') || contact.PropertyFlags;
          contact.MarketStatus = propData.marketStatus || contact.MarketStatus;
          contact.BuildingCondition = propData.buildingCondition || contact.BuildingCondition;
          contact.LastSaleDate = propData.lastSaleDate || contact.LastSaleDate;
          contact.LastSalePrice = propData.lastSalePrice || contact.LastSalePrice;
          contact.PriorityScore = calculatePriorityScore(propData);
          
          contact.enriched = true;
          fileMatches++;
          enrichmentStats.contactsEnriched++;
        }
      });
    });
    
    console.log(`  ✅ ${dmRecords.length.toLocaleString()} records, ${fileMatches} enriched\n`);
    
  } catch (err) {
    console.log(`  ⚠️  Error: ${err.message}\n`);
  }
});

console.log('='.repeat(70));
console.log(`\n✅ Enrichment complete: ${enrichmentStats.contactsEnriched.toLocaleString()} contacts enriched\n`);
console.log('='.repeat(70) + '\n');

// Step 3: Process THREE 11-10 exports for NEW leads
console.log('📂 PHASE 2: EXPANSION FROM 11-10 EXPORTS\n');

const allNewLeads = [];
const allPhonesProcessed = new Set(Array.from(contactsMap.keys()));
let expansionStats = {
  totalProperties: 0,
  totalPhones: 0,
  newLeads: 0,
  filesProcessed: 0
};

DEALMACHINE_FILES.fresh.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping: ${path.basename(filePath)}`);
    return;
  }
  
  console.log(`📄 Processing: ${path.basename(filePath)}`);
  
  const dmData = fs.readFileSync(fullPath, 'utf-8');
  const dmRecords = parse(dmData, { 
    columns: true, 
    skip_empty_lines: true 
  });
  
  expansionStats.totalProperties += dmRecords.length;
  expansionStats.filesProcessed++;
  let fileNewLeads = 0;
  
  dmRecords.forEach((record, idx) => {
    if (idx % 2000 === 0 && idx > 0) {
      process.stdout.write(`  Progress: ${idx}/${dmRecords.length}...\r`);
    }
    
    const propData = extractFullPropertyData(record);
    const score = calculatePriorityScore(propData);
    
    // Extract all phones
    for (let i = 1; i <= 20; i++) {
      const contactName = record[`contact_${i}_name`];
      for (let j = 1; j <= 3; j++) {
        const phoneField = record[`contact_${i}_phone${j}`];
        if (!phoneField) continue;
        
        const normalized = normalizePhone(phoneField);
        if (!normalized || allPhonesProcessed.has(normalized)) continue;
        
        allPhonesProcessed.add(normalized);
        expansionStats.totalPhones++;
        
        // NEW LEAD!
        allNewLeads.push({
          Phone: normalized,
          OwnerName: contactName || record.owner_1_name || '',
          PropertyAddress: propData.propertyAddress,
          PropertyType: propData.propertyType,
          ResponseType: 'COLD',
          LastMessage: '',
          ValueDiscussed: '',
          DateContacted: '',
          NextAction: 'Send Initial SMS',
          Handler: '',
          SourceCampaign: 'DealMachine-11-10-2025',
          MessageCount: '0',
          Notes: '',
          IsOptOut: 'false',
          
          // FULL PROPERTY INTELLIGENCE
          EstimatedValue: propData.estimatedValue,
          EquityAmount: propData.equityAmount,
          EquityPercent: propData.equityPercent,
          LoanBalance: propData.loanBalance,
          Units: propData.units,
          Bedrooms: propData.bedrooms,
          Bathrooms: propData.baths,
          SquareFeet: propData.sqft,
          YearBuilt: propData.yearBuilt,
          LotAcreage: propData.lotAcreage,
          IsCorporateOwner: propData.isCorporateOwner ? 'true' : 'false',
          OutOfStateOwner: propData.outOfStateOwner ? 'true' : 'false',
          OwnerLocation: propData.ownerLocation,
          PropertyFlags: propData.propertyFlags.join(', '),
          MarketStatus: propData.marketStatus,
          BuildingCondition: propData.buildingCondition,
          LastSaleDate: propData.lastSaleDate,
          LastSalePrice: propData.lastSalePrice,
          PriorityScore: score,
        });
        
        fileNewLeads++;
        expansionStats.newLeads++;
      }
    }
  });
  
  console.log(`  ✅ ${dmRecords.length.toLocaleString()} properties, ${fileNewLeads.toLocaleString()} new leads\n`);
});

console.log('='.repeat(70));
console.log(`\n✅ Expansion complete: ${expansionStats.newLeads.toLocaleString()} new leads added\n`);
console.log('='.repeat(70) + '\n');

// Step 4: Combine everything
console.log('💾 COMBINING ALL DATA\n');

const enrichedContacts = Array.from(contactsMap.values());
const finalDatabase = [...enrichedContacts, ...allNewLeads];

console.log(`Existing contacts: ${enrichedContacts.length.toLocaleString()}`);
console.log(`New leads: ${allNewLeads.length.toLocaleString()}`);
console.log(`TOTAL DATABASE: ${finalDatabase.length.toLocaleString()}\n`);

// Step 5: Statistics
console.log('='.repeat(70) + '\n');
console.log('📊 COMPREHENSIVE STATISTICS\n');

// Property type breakdown
const typeStats = finalDatabase.reduce((acc, c) => {
  acc[c.PropertyType] = (acc[c.PropertyType] || 0) + 1;
  return acc;
}, {});

console.log('🏢 Property Types:');
Object.entries(typeStats).sort(([,a], [,b]) => b - a).forEach(([type, count]) => {
  console.log(`  ${type}: ${count.toLocaleString()}`);
});

// Response breakdown
const responseStats = finalDatabase.reduce((acc, c) => {
  acc[c.ResponseType] = (acc[c.ResponseType] || 0) + 1;
  return acc;
}, {});

console.log('\n📞 Response Status:');
Object.entries(responseStats).sort(([,a], [,b]) => b - a).forEach(([type, count]) => {
  console.log(`  ${type}: ${count.toLocaleString()}`);
});

// Priority counts
const hotLeads = finalDatabase.filter(c => c.ResponseType === 'HOT').length;
const warmLeads = finalDatabase.filter(c => c.ResponseType === 'WARM').length;
const optOuts = finalDatabase.filter(c => c.IsOptOut === 'true').length;
const highPriority = finalDatabase.filter(c => parseInt(c.PriorityScore) >= 50).length;
const multiFamilyCount = finalDatabase.filter(c => c.PropertyType === 'Multi-family').length;
const commercial = finalDatabase.filter(c => c.PropertyType === 'Commercial').length;
const highEquity = finalDatabase.filter(c => parseFloat(c.EquityPercent) >= 70).length;
const corporate = finalDatabase.filter(c => c.IsCorporateOwner === 'true').length;
const outOfState = finalDatabase.filter(c => c.OutOfStateOwner === 'true').length;

console.log('\n🎯 Key Metrics:');
console.log(`  HOT leads: ${hotLeads}`);
console.log(`  WARM leads: ${warmLeads}`);
console.log(`  High-priority (score ≥50): ${highPriority.toLocaleString()}`);
console.log(`  Multi-family properties: ${multiFamilyCount.toLocaleString()}`);
console.log(`  Commercial properties: ${commercial.toLocaleString()}`);
console.log(`  High equity (≥70%): ${highEquity.toLocaleString()}`);
console.log(`  Corporate owners: ${corporate.toLocaleString()}`);
console.log(`  Out-of-state owners: ${outOfState.toLocaleString()}`);
console.log(`  Opt-outs (protected): ${optOuts.toLocaleString()}\n`);

// Step 6: Write output
console.log('='.repeat(70) + '\n');
console.log('💾 WRITING OUTPUT FILES\n');

const headers = [
  'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'ResponseType',
  'LastMessage', 'ValueDiscussed', 'DateContacted', 'NextAction', 'Handler',
  'SourceCampaign', 'MessageCount', 'Notes', 'IsOptOut',
  // NEW INTELLIGENCE FIELDS
  'EstimatedValue', 'EquityAmount', 'EquityPercent', 'LoanBalance',
  'Units', 'Bedrooms', 'Bathrooms', 'SquareFeet', 'YearBuilt', 'LotAcreage',
  'IsCorporateOwner', 'OutOfStateOwner', 'OwnerLocation',
  'PropertyFlags', 'MarketStatus', 'BuildingCondition',
  'LastSaleDate', 'LastSalePrice', 'PriorityScore'
];

function escapeCSV(val) {
  const str = String(val || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const masterCsv = [
  headers.join(','),
  ...finalDatabase.map(row => headers.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync('./notion-import-master-final.csv', masterCsv);
console.log(`✅ Master database (32 columns): notion-import-master-final.csv\n`);

// High-priority new leads
const highPriorityLeads = allNewLeads
  .filter(l => parseInt(l.PriorityScore) >= 50)
  .sort((a, b) => parseInt(b.PriorityScore) - parseInt(a.PriorityScore));

if (highPriorityLeads.length > 0) {
  const hpCsv = [
    headers.join(','),
    ...highPriorityLeads.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ].join('\n');
  
  fs.writeFileSync('./high-priority-new-leads.csv', hpCsv);
  console.log(`✅ High-priority new leads: high-priority-new-leads.csv`);
}

// Enriched contacts
const enrichedOnly = enrichedContacts.filter(c => c.enriched);
if (enrichedOnly.length > 0) {
  const enrichedCsv = [
    headers.join(','),
    ...enrichedOnly.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ].join('\n');
  
  fs.writeFileSync('./enriched-existing-contacts.csv', enrichedCsv);
  console.log(`✅ Enriched existing contacts: enriched-existing-contacts.csv\n`);
}

// Final summary
console.log('='.repeat(70));
console.log('\n🎉 ULTIMATE MERGE COMPLETE!\n');
console.log(`📊 FINAL DATABASE: ${finalDatabase.length.toLocaleString()} contacts`);
console.log(`📈 32 Notion properties with maximum intelligence`);
console.log(`🎯 ${highPriority.toLocaleString()} high-priority opportunities`);
console.log(`🏢 ${multiFamilyCount.toLocaleString()} multi-family + ${commercial.toLocaleString()} commercial`);
console.log(`💰 ${highEquity.toLocaleString()} high-equity deals (≥70%)\n`);

console.log('🚀 Ready to import to Notion and dominate!\n');
