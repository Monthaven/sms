#!/usr/bin/env node
/**
 * DealMachine + EZ Texting Master Merge
 * 
 * Combines:
 * - 9,843 DealMachine leads (fresh property data)
 * - 6,621 EZ Texting contacts (historical responses)
 * 
 * Output: Updated notion-import-master.csv with intelligence
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parsePhoneNumber } = require('libphonenumber-js');

// File paths
const DEALMACHINE_FILE = '../11-10 export 9843 leads total (2) (best).csv';
const EXISTING_MASTER = './notion-import-master.csv';
const OUTPUT_FILE = './notion-import-master-updated.csv';
const NEW_LEADS_FILE = './dealmachine-new-leads.csv';
const MATCHED_FILE = './dealmachine-matched-contacts.csv';

console.log('🔄 DEALMACHINE + EZ TEXTING SMART MERGE\n');

// Helper: Normalize phone to E.164
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

// Helper: Classify property type from DealMachine
function classifyPropertyType(dmData) {
  const propType = (dmData.property_type || '').toLowerCase();
  const unitsCount = parseInt(dmData.units_count) || 0;
  const bedrooms = parseInt(dmData.total_bedrooms) || 0;
  
  // Multi-family detection
  if (unitsCount >= 5 || propType.includes('multi') || propType.includes('apartment')) {
    return 'Multi-family';
  }
  
  // Commercial detection
  if (propType.includes('commercial') || 
      propType.includes('industrial') || 
      propType.includes('retail') ||
      propType.includes('office') ||
      propType === 'other' && unitsCount === 0 && bedrooms === 0) {
    return 'Commercial';
  }
  
  // Single family
  if (bedrooms >= 1 && unitsCount <= 1) {
    return 'Single-family';
  }
  
  return 'Unknown';
}

// Helper: Calculate property score (prioritization)
function calculateScore(dmData) {
  let score = 0;
  
  // Equity (higher = better)
  const equityPercent = parseFloat(dmData.equity_percent) || 0;
  score += equityPercent * 0.5;
  
  // Property flags
  const flags = (dmData.property_flags || '').toLowerCase();
  if (flags.includes('high equity')) score += 20;
  if (flags.includes('absentee owner')) score += 15;
  if (flags.includes('corporate owner')) score += 10;
  if (flags.includes('cash buyer')) score += 5;
  
  // Property type bonus
  const propType = classifyPropertyType(dmData);
  if (propType === 'Multi-family') score += 25;
  if (propType === 'Commercial') score += 20;
  
  // Value (higher = better)
  const value = parseFloat((dmData.estimated_value || '').replace(/[$,]/g, '')) || 0;
  if (value >= 1000000) score += 15;
  else if (value >= 500000) score += 10;
  else if (value >= 250000) score += 5;
  
  return Math.round(score);
}

// Step 1: Load existing EZ Texting master database
console.log('📂 Loading existing master database...');
const existingData = fs.readFileSync(EXISTING_MASTER, 'utf-8');
const existingContacts = parse(existingData, { 
  columns: true, 
  skip_empty_lines: true 
});

// Build lookup map: phone -> full contact data
const existingMap = new Map();
existingContacts.forEach(contact => {
  const phone = normalizePhone(contact.Phone);
  if (phone) {
    existingMap.set(phone, contact);
  }
});

console.log(`✅ Loaded ${existingMap.size} existing contacts\n`);

// Step 2: Load DealMachine export
console.log('📂 Loading DealMachine export...');
const dmData = fs.readFileSync(path.join(__dirname, DEALMACHINE_FILE), 'utf-8');
const dmLeads = parse(dmData, { 
  columns: true, 
  skip_empty_lines: true 
});

console.log(`✅ Loaded ${dmLeads.length} DealMachine properties\n`);

// Step 3: Process DealMachine leads
console.log('🔍 Processing contacts from DealMachine...\n');

const newLeads = [];
const matchedLeads = [];
const allPhonesSeen = new Set();
let totalPhonesFound = 0;
let duplicatePhonesSkipped = 0;

dmLeads.forEach((lead, idx) => {
  if (idx % 1000 === 0) {
    console.log(`Progress: ${idx}/${dmLeads.length} properties...`);
  }
  
  const propertyAddress = lead.property_address_line_1;
  const ownerName = lead.owner_1_name || lead.contact_1_name;
  const propertyType = classifyPropertyType(lead);
  const estimatedValue = lead.estimated_value;
  const propertyFlags = lead.property_flags;
  const score = calculateScore(lead);
  
  // Extract all phone numbers (contact_1 through contact_20, each with phone1-3)
  const phones = [];
  for (let i = 1; i <= 20; i++) {
    const contactName = lead[`contact_${i}_name`];
    for (let j = 1; j <= 3; j++) {
      const phoneField = lead[`contact_${i}_phone${j}`];
      const phoneType = lead[`contact_${i}_phone${j}_type`];
      
      if (phoneField) {
        const normalized = normalizePhone(phoneField);
        if (normalized && normalized.length === 11) {
          phones.push({
            phone: normalized,
            type: phoneType || 'Unknown',
            contactName: contactName || ownerName
          });
        }
      }
    }
  }
  
  // Process each phone number
  phones.forEach(({ phone, type, contactName }) => {
    totalPhonesFound++;
    
    // Skip if we've already processed this phone in DealMachine data
    if (allPhonesSeen.has(phone)) {
      duplicatePhonesSkipped++;
      return;
    }
    allPhonesSeen.add(phone);
    
    // Check if exists in EZ Texting database
    const existing = existingMap.get(phone);
    
    if (existing) {
      // MATCHED: Already contacted via EZ Texting
      matchedLeads.push({
        Phone: phone,
        OwnerName: contactName,
        PropertyAddress: propertyAddress,
        PropertyType: propertyType,
        EstimatedValue: estimatedValue,
        PropertyFlags: propertyFlags,
        Score: score,
        PhoneType: type,
        ExistingResponseType: existing.ResponseType,
        ExistingLastMessage: existing.LastMessage,
        ExistingValueDiscussed: existing.ValueDiscussed,
        IsOptOut: existing.IsOptOut === 'true' ? 'Yes' : 'No'
      });
    } else {
      // NEW LEAD: Never contacted before
      newLeads.push({
        Phone: phone,
        OwnerName: contactName,
        PropertyAddress: propertyAddress,
        PropertyType: propertyType,
        EstimatedValue: estimatedValue,
        PropertyFlags: propertyFlags,
        Score: score,
        PhoneType: type,
        ResponseType: 'COLD',
        LastMessage: '',
        ValueDiscussed: '',
        DateContacted: '',
        NextAction: 'Send Initial SMS',
        Handler: '',
        SourceCampaign: 'DealMachine-11-10-2025',
        MessageCount: '0',
        Notes: `Property: ${propertyAddress} | Flags: ${propertyFlags}`,
        IsOptOut: 'false'
      });
    }
  });
});

console.log(`\n✅ Processing complete!\n`);

// Step 4: Generate statistics
console.log('📊 MERGE ANALYSIS:\n');
console.log(`Total DealMachine properties: ${dmLeads.length.toLocaleString()}`);
console.log(`Total phone numbers found: ${totalPhonesFound.toLocaleString()}`);
console.log(`Unique phone numbers: ${allPhonesSeen.size.toLocaleString()}`);
console.log(`Duplicate phones in DealMachine: ${duplicatePhonesSkipped.toLocaleString()}\n`);

console.log(`🆕 NEW LEADS (never contacted): ${newLeads.length.toLocaleString()}`);
console.log(`✅ MATCHED (already in database): ${matchedLeads.length.toLocaleString()}\n`);

// Breakdown of matched leads by response type
const matchedByResponse = matchedLeads.reduce((acc, lead) => {
  const type = lead.ExistingResponseType || 'COLD';
  acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {});

console.log('📞 Matched leads breakdown:');
Object.entries(matchedByResponse)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count.toLocaleString()}`);
  });

// Count opt-outs in matched
const matchedOptOuts = matchedLeads.filter(l => l.IsOptOut === 'Yes').length;
console.log(`  🚫 Opt-outs (DO NOT CONTACT): ${matchedOptOuts.toLocaleString()}\n`);

// Step 5: Analyze new leads by property type
const newByType = newLeads.reduce((acc, lead) => {
  acc[lead.PropertyType] = (acc[lead.PropertyType] || 0) + 1;
  return acc;
}, {});

console.log('🏢 New leads by property type:');
Object.entries(newByType)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count.toLocaleString()}`);
  });
console.log();

// Top priority new leads (score >= 50)
const highPriorityNew = newLeads.filter(l => l.Score >= 50).length;
console.log(`🎯 High priority new leads (score >= 50): ${highPriorityNew.toLocaleString()}\n`);

// Step 6: Merge and create updated master
console.log('💾 Creating updated master database...\n');

// Combine existing contacts with new leads
const updatedMaster = [
  ...existingContacts, // Keep all existing with their response history
  ...newLeads // Add new leads that weren't in existing
];

console.log(`📊 Updated database size: ${updatedMaster.length.toLocaleString()} contacts\n`);

// Step 7: Write output files
console.log('💾 Writing output files...\n');

// Output 1: Updated master CSV (for Notion import)
const masterHeaders = [
  'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'ResponseType',
  'LastMessage', 'ValueDiscussed', 'DateContacted', 'NextAction', 'Handler',
  'SourceCampaign', 'MessageCount', 'Notes', 'IsOptOut'
];

const masterCsv = [
  masterHeaders.join(','),
  ...updatedMaster.map(row => {
    return masterHeaders.map(h => {
      const val = row[h] || '';
      // Escape commas and quotes
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  })
].join('\n');

fs.writeFileSync(OUTPUT_FILE, masterCsv);
console.log(`✅ Updated master: ${OUTPUT_FILE}`);

// Output 2: New leads only (for immediate campaign)
if (newLeads.length > 0) {
  const newLeadsHeaders = [
    'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'EstimatedValue',
    'PropertyFlags', 'Score', 'PhoneType', 'Notes'
  ];
  
  // Sort by score descending
  newLeads.sort((a, b) => b.Score - a.Score);
  
  const newLeadsCsv = [
    newLeadsHeaders.join(','),
    ...newLeads.map(row => {
      return newLeadsHeaders.map(h => {
        const val = String(row[h] || '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    })
  ].join('\n');
  
  fs.writeFileSync(NEW_LEADS_FILE, newLeadsCsv);
  console.log(`✅ New leads only: ${NEW_LEADS_FILE}`);
}

// Output 3: Matched contacts (for reference/analysis)
if (matchedLeads.length > 0) {
  const matchedHeaders = [
    'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'EstimatedValue',
    'PropertyFlags', 'Score', 'ExistingResponseType', 'ExistingValueDiscussed', 'IsOptOut'
  ];
  
  const matchedCsv = [
    matchedHeaders.join(','),
    ...matchedLeads.map(row => {
      return matchedHeaders.map(h => {
        const val = String(row[h] || '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    })
  ].join('\n');
  
  fs.writeFileSync(MATCHED_FILE, matchedCsv);
  console.log(`✅ Matched contacts: ${MATCHED_FILE}`);
}

// Step 8: Final summary
console.log('\n' + '='.repeat(60));
console.log('✅ MERGE COMPLETE!\n');
console.log(`📊 FINAL DATABASE:`);
console.log(`  Total contacts: ${updatedMaster.length.toLocaleString()}`);
console.log(`  New from DealMachine: ${newLeads.length.toLocaleString()}`);
console.log(`  Existing from EZ Texting: ${existingContacts.length.toLocaleString()}\n`);

console.log(`🎯 IMMEDIATE OPPORTUNITIES:`);
console.log(`  New high-priority leads: ${highPriorityNew.toLocaleString()}`);
console.log(`  Existing HOT leads: ${existingContacts.filter(c => c.ResponseType === 'HOT').length}`);
console.log(`  Existing WARM leads: ${existingContacts.filter(c => c.ResponseType === 'WARM').length}\n`);

console.log(`⚠️  COMPLIANCE:`);
console.log(`  Total opt-outs protected: ${existingContacts.filter(c => c.IsOptOut === 'true').length.toLocaleString()}\n`);

console.log(`📝 NEXT STEPS:`);
console.log(`  1. Review new leads in: ${NEW_LEADS_FILE}`);
console.log(`  2. Import updated master to Notion: ${OUTPUT_FILE}`);
console.log(`  3. Start texting high-priority new leads (score >= 50)`);
console.log(`  4. Continue working existing HOT/WARM leads\n`);

console.log('🚀 Ready to scale your pipeline!\n');
