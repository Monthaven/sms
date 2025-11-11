#!/usr/bin/env node
/**
 * COMPREHENSIVE DEALMACHINE MERGE STRATEGY
 * 
 * Phase 1: ENRICHMENT
 * - Match OLD DealMachine exports against 6,621 EZ Texting contacts
 * - Add property intelligence (multi-family, units, value, etc.)
 * - Upgrade "Unknown" property types to actual classifications
 * 
 * Phase 2: EXPANSION  
 * - Process 11-10 export (fresh full data)
 * - Find brand new leads never contacted
 * - Dedupe across ALL sources
 * 
 * Output: Master database with maximum intelligence
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { parsePhoneNumber } = require('libphonenumber-js');

console.log('🔄 COMPREHENSIVE DEALMACHINE MERGE\n');
console.log('Phase 1: Enriching existing contacts');
console.log('Phase 2: Adding new leads\n');
console.log('='.repeat(60) + '\n');

// File paths
const PARENT_DIR = '..';
const EXISTING_MASTER = './notion-import-master.csv';

const DEALMACHINE_FILES = [
  // OLD exports for enrichment
  '../deal machine export nc - sorted owner occupied (extra names).csv',
  '../dealmachine-contacts-2025-04-06-175750 - dealmachine-contacts-2025-04-06-175750.csv',
  '../dealmachine-properties-2025-08-05-125343.csv',
  '../dealmachine-properties-2025-08-07-085954.csv',
  '../dealmachine-properties-2025-08-07-181848.csv',
  '../dealmachine-properties-2025-08-08-140423.csv',
  '../dealmachine-properties-2025-08-12-112928.csv',
  '../Combined Deal Machine - Combined Deal Machine.csv',
  '../Deal machine contacts with no contact houses are included no land lines (all NC).csv',
  
  // NEWEST export for expansion (11-10)
  '../11-10 export 9843 leads total (2) (best).csv',
];

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

// Helper: Classify property type
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

// Helper: Extract property intelligence
function extractPropertyIntel(dmData) {
  return {
    address: dmData.property_address_full || dmData.property_address_line_1 || '',
    type: classifyPropertyType(dmData),
    units: parseInt(dmData.units_count) || 0,
    bedrooms: parseInt(dmData.total_bedrooms) || 0,
    baths: parseInt(dmData.total_baths) || 0,
    sqft: parseInt(dmData.building_square_feet) || 0,
    yearBuilt: dmData.year_built || '',
    estimatedValue: dmData.estimated_value || '',
    equity: dmData.equity_amount || '',
    equityPercent: parseFloat(dmData.equity_percent) || 0,
    propertyFlags: dmData.property_flags || '',
    ownerType: dmData.is_corporate_owner === '1' ? 'Corporate' : 'Individual',
    outOfState: dmData.out_of_state_owner === '1',
  };
}

// Helper: Calculate priority score
function calculateScore(intel) {
  let score = 0;
  
  // Multi-family bonus
  if (intel.type === 'Multi-family') score += 25;
  if (intel.units >= 10) score += 20;
  else if (intel.units >= 5) score += 15;
  
  // Commercial bonus
  if (intel.type === 'Commercial') score += 20;
  
  // Equity bonus
  if (intel.equityPercent >= 80) score += 20;
  else if (intel.equityPercent >= 50) score += 10;
  
  // Property flags
  const flags = intel.propertyFlags.toLowerCase();
  if (flags.includes('high equity')) score += 15;
  if (flags.includes('absentee')) score += 10;
  if (flags.includes('corporate')) score += 10;
  
  // Value bonus
  const value = parseFloat((intel.estimatedValue || '').replace(/[$,]/g, '')) || 0;
  if (value >= 1000000) score += 15;
  else if (value >= 500000) score += 10;
  
  return Math.round(score);
}

// Step 1: Load existing EZ Texting master
console.log('📂 PHASE 1: ENRICHMENT\n');
console.log('Loading existing master database...');
const existingData = fs.readFileSync(EXISTING_MASTER, 'utf-8');
const existingContacts = parse(existingData, { 
  columns: true, 
  skip_empty_lines: true 
});

console.log(`✅ Loaded ${existingContacts.length} existing contacts\n`);

// Create enrichment map: phone -> enhanced data
const enrichmentMap = new Map();
existingContacts.forEach(contact => {
  const phone = normalizePhone(contact.Phone);
  if (phone) {
    enrichmentMap.set(phone, {
      ...contact,
      enriched: false,
      propertyIntel: null
    });
  }
});

// Step 2: Load ALL DealMachine files for enrichment
console.log('Processing DealMachine files for enrichment...\n');

let totalDMRecords = 0;
let enrichmentMatches = 0;
let unknownUpgrades = 0;
let multiFamilyFound = 0;
let commercialFound = 0;

DEALMACHINE_FILES.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping: ${path.basename(filePath)} (not found)`);
    return;
  }
  
  console.log(`📄 Processing: ${path.basename(filePath)}`);
  
  try {
    const dmData = fs.readFileSync(fullPath, 'utf-8');
    const dmRecords = parse(dmData, { 
      columns: true, 
      skip_empty_lines: true 
    });
    
    totalDMRecords += dmRecords.length;
    let fileMatches = 0;
    
    // Process each DealMachine record
    dmRecords.forEach(record => {
      // Extract all phone numbers
      const phones = [];
      
      // Try contact fields (contact_1 through contact_20)
      for (let i = 1; i <= 20; i++) {
        for (let j = 1; j <= 3; j++) {
          const phoneField = record[`contact_${i}_phone${j}`];
          if (phoneField) {
            const normalized = normalizePhone(phoneField);
            if (normalized) phones.push(normalized);
          }
        }
      }
      
      // Check if any phone matches existing contacts
      phones.forEach(phone => {
        const existing = enrichmentMap.get(phone);
        if (existing && !existing.enriched) {
          // MATCH! Enrich this contact
          const intel = extractPropertyIntel(record);
          
          existing.propertyIntel = intel;
          existing.enriched = true;
          
          // Upgrade property type if was Unknown
          if (existing.PropertyType === 'Unknown' && intel.type !== 'Unknown') {
            existing.PropertyType = intel.type;
            unknownUpgrades++;
          }
          
          // Track multi-family discoveries
          if (intel.type === 'Multi-family') {
            multiFamilyFound++;
          }
          
          if (intel.type === 'Commercial') {
            commercialFound++;
          }
          
          // Add property address if missing
          if (!existing.PropertyAddress && intel.address) {
            existing.PropertyAddress = intel.address;
          }
          
          // Add enriched notes
          const notes = [];
          if (intel.units > 0) notes.push(`${intel.units} units`);
          if (intel.bedrooms > 0) notes.push(`${intel.bedrooms}bed/${intel.baths}bath`);
          if (intel.sqft > 0) notes.push(`${intel.sqft.toLocaleString()} sqft`);
          if (intel.estimatedValue) notes.push(`Est: ${intel.estimatedValue}`);
          if (intel.equityPercent > 0) notes.push(`${intel.equityPercent}% equity`);
          if (intel.propertyFlags) notes.push(intel.propertyFlags);
          
          if (notes.length > 0) {
            existing.Notes = existing.Notes 
              ? `${existing.Notes} | ${notes.join(', ')}`
              : notes.join(', ');
          }
          
          fileMatches++;
          enrichmentMatches++;
        }
      });
    });
    
    console.log(`  ✅ ${dmRecords.length.toLocaleString()} records, ${fileMatches} matches`);
    
  } catch (err) {
    console.log(`  ⚠️  Error processing file: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('ENRICHMENT RESULTS:\n');
console.log(`Total DealMachine records processed: ${totalDMRecords.toLocaleString()}`);
console.log(`Contacts enriched: ${enrichmentMatches.toLocaleString()}`);
console.log(`Unknown → Classified: ${unknownUpgrades.toLocaleString()}`);
console.log(`Multi-family discovered: ${multiFamilyFound.toLocaleString()}`);
console.log(`Commercial discovered: ${commercialFound.toLocaleString()}\n`);

// Step 3: EXPANSION - Find new leads from 11-10 export
console.log('='.repeat(60));
console.log('\n📂 PHASE 2: EXPANSION\n');
console.log('Processing 11-10 export for NEW leads...\n');

const latestExport = path.join(__dirname, '../11-10 export 9843 leads total (2) (best).csv');
const latestData = fs.readFileSync(latestExport, 'utf-8');
const latestRecords = parse(latestData, { 
  columns: true, 
  skip_empty_lines: true 
});

console.log(`✅ Loaded ${latestRecords.length.toLocaleString()} properties from 11-10 export\n`);

const newLeads = [];
const allPhonesProcessed = new Set();

latestRecords.forEach((record, idx) => {
  if (idx % 1000 === 0 && idx > 0) {
    console.log(`Progress: ${idx.toLocaleString()}/${latestRecords.length.toLocaleString()} properties...`);
  }
  
  const intel = extractPropertyIntel(record);
  const score = calculateScore(intel);
  
  // Extract all phones
  const phones = [];
  for (let i = 1; i <= 20; i++) {
    const contactName = record[`contact_${i}_name`];
    for (let j = 1; j <= 3; j++) {
      const phoneField = record[`contact_${i}_phone${j}`];
      const phoneType = record[`contact_${i}_phone${j}_type`];
      
      if (phoneField) {
        const normalized = normalizePhone(phoneField);
        if (normalized && !allPhonesProcessed.has(normalized)) {
          allPhonesProcessed.add(normalized);
          
          // Check if this is a NEW lead
          if (!enrichmentMap.has(normalized)) {
            newLeads.push({
              Phone: normalized,
              OwnerName: contactName || record.owner_1_name || '',
              PropertyAddress: intel.address,
              PropertyType: intel.type,
              ResponseType: 'COLD',
              LastMessage: '',
              ValueDiscussed: intel.estimatedValue,
              DateContacted: '',
              NextAction: 'Send Initial SMS',
              Handler: '',
              SourceCampaign: 'DealMachine-11-10-2025',
              MessageCount: '0',
              Notes: [
                intel.units > 0 ? `${intel.units} units` : '',
                intel.bedrooms > 0 ? `${intel.bedrooms}bed/${intel.baths}bath` : '',
                intel.sqft > 0 ? `${intel.sqft.toLocaleString()} sqft` : '',
                intel.equityPercent > 0 ? `${intel.equityPercent}% equity` : '',
                intel.propertyFlags
              ].filter(Boolean).join(', '),
              IsOptOut: 'false',
              Score: score
            });
          }
        }
      }
    }
  }
});

console.log('\n✅ Expansion complete!\n');

// Step 4: Combine enriched + new
console.log('='.repeat(60));
console.log('\n💾 COMBINING DATABASES\n');

const enrichedContacts = Array.from(enrichmentMap.values());
const finalDatabase = [...enrichedContacts, ...newLeads];

console.log(`Enriched existing contacts: ${enrichedContacts.length.toLocaleString()}`);
console.log(`Brand new leads: ${newLeads.length.toLocaleString()}`);
console.log(`Total final database: ${finalDatabase.length.toLocaleString()}\n`);

// Step 5: Generate outputs
console.log('='.repeat(60));
console.log('\n📊 FINAL STATISTICS\n');

// Property type breakdown
const typeBreakdown = finalDatabase.reduce((acc, contact) => {
  acc[contact.PropertyType] = (acc[contact.PropertyType] || 0) + 1;
  return acc;
}, {});

console.log('Property type distribution:');
Object.entries(typeBreakdown)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count.toLocaleString()}`);
  });

// Response type breakdown
const responseBreakdown = finalDatabase.reduce((acc, contact) => {
  acc[contact.ResponseType] = (acc[contact.ResponseType] || 0) + 1;
  return acc;
}, {});

console.log('\nResponse type distribution:');
Object.entries(responseBreakdown)
  .sort(([,a], [,b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count.toLocaleString()}`);
  });

// High priority counts
const hotLeads = finalDatabase.filter(c => c.ResponseType === 'HOT').length;
const warmLeads = finalDatabase.filter(c => c.ResponseType === 'WARM').length;
const optOuts = finalDatabase.filter(c => c.IsOptOut === 'true').length;
const highPriority = newLeads.filter(l => l.Score >= 50).length;

console.log('\n🎯 Priority leads:');
console.log(`  HOT leads (ready to call): ${hotLeads}`);
console.log(`  WARM leads (nurture): ${warmLeads}`);
console.log(`  High-priority new (score ≥50): ${highPriority.toLocaleString()}`);
console.log(`  Opt-outs (protected): ${optOuts.toLocaleString()}\n`);

// Step 6: Write output files
console.log('='.repeat(60));
console.log('\n💾 WRITING OUTPUT FILES\n');

const headers = [
  'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'ResponseType',
  'LastMessage', 'ValueDiscussed', 'DateContacted', 'NextAction', 'Handler',
  'SourceCampaign', 'MessageCount', 'Notes', 'IsOptOut'
];

const masterCsv = [
  headers.join(','),
  ...finalDatabase.map(row => {
    return headers.map(h => {
      const val = String(row[h] || '');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  })
].join('\n');

fs.writeFileSync('./notion-import-master-final.csv', masterCsv);
console.log(`✅ Master database: ./notion-import-master-final.csv`);

// Write high-priority new leads
const highPriorityLeads = newLeads.filter(l => l.Score >= 50).sort((a, b) => b.Score - a.Score);
if (highPriorityLeads.length > 0) {
  const hpCsv = [
    headers.join(','),
    ...highPriorityLeads.map(row => {
      return headers.map(h => {
        const val = String(row[h] || '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    })
  ].join('\n');
  
  fs.writeFileSync('./high-priority-new-leads.csv', hpCsv);
  console.log(`✅ High priority new leads: ./high-priority-new-leads.csv`);
}

// Write enriched contacts only (for review)
const enrichedOnly = enrichedContacts.filter(c => c.enriched);
if (enrichedOnly.length > 0) {
  const enrichedCsv = [
    headers.join(','),
    ...enrichedOnly.map(row => {
      return headers.map(h => {
        const val = String(row[h] || '');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    })
  ].join('\n');
  
  fs.writeFileSync('./enriched-existing-contacts.csv', enrichedCsv);
  console.log(`✅ Enriched existing contacts: ./enriched-existing-contacts.csv`);
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('✅ COMPREHENSIVE MERGE COMPLETE!\n');
console.log('📊 FINAL RESULTS:');
console.log(`  Total contacts: ${finalDatabase.length.toLocaleString()}`);
console.log(`  Existing enriched: ${enrichmentMatches.toLocaleString()}`);
console.log(`  New from 11-10: ${newLeads.length.toLocaleString()}`);
console.log(`  Multi-family total: ${typeBreakdown['Multi-family'] || 0}`);
console.log(`  Commercial total: ${typeBreakdown['Commercial'] || 0}\n`);

console.log('🎯 IMMEDIATE ACTIONS:');
console.log(`  1. Import notion-import-master-final.csv to Notion`);
console.log(`  2. Call ${hotLeads} HOT leads`);
console.log(`  3. Text ${highPriority.toLocaleString()} high-priority new leads`);
console.log(`  4. Review ${enrichmentMatches.toLocaleString()} enriched contacts\n`);

console.log('🚀 Your pipeline is now MAXIMUM INTELLIGENCE!\n');
