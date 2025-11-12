#!/usr/bin/env node
/**
 * EXPERT DATABASE SEGMENTATION
 * Creates 3 specialized Notion databases based on 10,000-hour strategy
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');

console.log('🎯 EXPERT DATABASE SEGMENTATION\n');
console.log('Creating 3 specialized databases for maximum ROI...\n');

// Load master data
const csvData = fs.readFileSync('./notion-import-master-final.csv', 'utf-8');
const allRecords = parse(csvData, { 
  columns: true, 
  skip_empty_lines: true 
});

console.log(`📊 Master database: ${allRecords.length.toLocaleString()} total contacts\n`);

// Phone type classification (basic heuristic)
function classifyPhoneType(phone) {
  // This is a simplified classification - in reality you'd use a phone validation service
  // For now, we'll assume all are potentially SMS-capable unless proven otherwise
  return 'Cell Phone'; // Will create landline filter later if needed
}

// Enhanced priority scoring for segmentation
function calculateSegmentPriority(record) {
  let score = parseInt(record.PriorityScore) || 0;
  
  // Response history bonus (HUGE multiplier)
  if (record.ResponseType === 'HOT') score += 1000;
  if (record.ResponseType === 'WARM') score += 500;
  
  // Property type focus
  if (record.PropertyType === 'Multi-family') score += 100;
  if (record.PropertyType === 'Commercial') score += 80;
  
  // Previous contact intelligence
  if (record.LastMessage && record.ResponseType !== 'COLD') score += 200;
  
  return score;
}

// Segment 1: SMS COMMAND CENTER (Primary Operations)
console.log('🚀 Creating SMS COMMAND CENTER database...');

const smsRecords = allRecords.filter(record => {
  // Exclude opt-outs from operational database (they go to compliance-only views)
  return record.IsOptOut !== 'true';
});

// Add segmentation intelligence
const enhancedSmsRecords = smsRecords.map(record => ({
  ...record,
  PhoneType: classifyPhoneType(record.Phone),
  SegmentPriority: calculateSegmentPriority(record),
  OperationalTier: getOperationalTier(record),
  NextContactDate: getNextContactDate(record),
  ContactStrategy: getContactStrategy(record)
}));

function getOperationalTier(record) {
  const isMFC = record.PropertyType === 'Multi-family' || record.PropertyType === 'Commercial';
  
  if (record.ResponseType === 'HOT' && isMFC) return 'T1-HOT-NOW';
  if (record.ResponseType === 'WARM' && isMFC) return 'T1-WARM-PIPELINE';
  if (!record.LastMessage && isMFC && parseInt(record.PriorityScore) >= 70) return 'T1-HIGH-PRIORITY-NEW';
  if (record.ResponseType === 'COLD' && isMFC && parseFloat(record.EquityPercent) >= 70) return 'T2-RE-ENGAGEMENT';
  if (record.PropertyType === 'Unknown' && parseFloat(record.EstimatedValue) >= 500000) return 'T2-RESEARCH-REQUIRED';
  if (record.PropertyType.includes('Single') && parseFloat(record.EstimatedValue) >= 500000) return 'T3-HIGH-VALUE-SF';
  
  return 'T4-STANDARD';
}

function getNextContactDate(record) {
  if (record.ResponseType === 'HOT') return new Date().toISOString().split('T')[0]; // Today
  if (record.ResponseType === 'WARM') return new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0]; // 3 days
  if (record.ResponseType === 'COLD' && record.LastMessage) {
    // 180 days for re-engagement
    return new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0];
  }
  if (!record.LastMessage) return new Date().toISOString().split('T')[0]; // New leads - today
  
  return '';
}

function getContactStrategy(record) {
  const isMFC = record.PropertyType === 'Multi-family' || record.PropertyType === 'Commercial';
  
  if (record.ResponseType === 'HOT') return 'CALL-IMMEDIATELY';
  if (record.ResponseType === 'WARM') return 'CALL-PLUS-SMS';
  if (!record.LastMessage && isMFC) return 'SMS-PROVEN-TEMPLATE';
  if (record.ResponseType === 'COLD' && isMFC) return 'RE-ENGAGEMENT-SMS';
  
  return 'STANDARD-SMS';
}

// Sort by segment priority (highest first)
enhancedSmsRecords.sort((a, b) => b.SegmentPriority - a.SegmentPriority);

console.log(`  ✅ SMS Command Center: ${enhancedSmsRecords.length.toLocaleString()} contacts`);

// Segment 2: SINGLE-FAMILY PIPELINE (Secondary Operations)
console.log('🏠 Creating SINGLE-FAMILY PIPELINE database...');

const singleFamilyRecords = allRecords.filter(record => {
  return record.PropertyType.includes('Single') && record.IsOptOut !== 'true';
}).map(record => ({
  ...record,
  SFSegment: getSingleFamilySegment(record),
  SFPriority: getSingleFamilyPriority(record)
}));

function getSingleFamilySegment(record) {
  if (record.ResponseType === 'HOT') return 'SF-HOT';
  if (record.ResponseType === 'WARM') return 'SF-WARM';
  if (parseFloat(record.EstimatedValue) >= 500000) return 'SF-HIGH-VALUE';
  if (!record.LastMessage) return 'SF-NEW';
  return 'SF-STANDARD';
}

function getSingleFamilyPriority(record) {
  let score = parseFloat(record.EstimatedValue) || 0;
  if (record.ResponseType === 'HOT') score += 1000000;
  if (record.ResponseType === 'WARM') score += 500000;
  return Math.round(score);
}

singleFamilyRecords.sort((a, b) => b.SFPriority - a.SFPriority);

console.log(`  ✅ Single-Family Pipeline: ${singleFamilyRecords.length.toLocaleString()} contacts`);

// Segment 3: COMPLIANCE & ANALYTICS (All records including opt-outs)
console.log('🛡️ Creating COMPLIANCE & ANALYTICS database...');

const complianceRecords = allRecords.map(record => ({
  ...record,
  ComplianceStatus: record.IsOptOut === 'true' ? 'DO-NOT-CONTACT' : 'CONTACTABLE',
  LastContactDays: getLastContactDays(record),
  LifetimeValue: getLifetimeValue(record)
}));

function getLastContactDays(record) {
  if (!record.DateContacted) return '';
  const lastContact = new Date(record.DateContacted);
  const now = new Date();
  const days = Math.floor((now - lastContact) / (24*60*60*1000));
  return days;
}

function getLifetimeValue(record) {
  // Estimate potential lifetime value based on property type and response history
  const baseValue = parseFloat(record.EstimatedValue) || 0;
  let multiplier = 0.01; // Base 1% potential
  
  if (record.ResponseType === 'HOT') multiplier = 0.20; // 20% close rate
  else if (record.ResponseType === 'WARM') multiplier = 0.10; // 10% close rate
  else if (record.PropertyType === 'Multi-family') multiplier = 0.05; // 5% for MF
  else if (record.PropertyType === 'Commercial') multiplier = 0.03; // 3% for commercial
  
  return Math.round(baseValue * multiplier);
}

console.log(`  ✅ Compliance & Analytics: ${complianceRecords.length.toLocaleString()} contacts\n`);

// Write enhanced CSV files
const headers = [
  'Phone', 'OwnerName', 'PropertyAddress', 'PropertyType', 'ResponseType',
  'LastMessage', 'ValueDiscussed', 'DateContacted', 'NextAction', 'Handler',
  'SourceCampaign', 'MessageCount', 'Notes', 'IsOptOut',
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

// SMS Command Center with enhanced fields
const smsHeaders = [...headers, 'PhoneType', 'SegmentPriority', 'OperationalTier', 'NextContactDate', 'ContactStrategy'];
const smsCsv = [
  smsHeaders.join(','),
  ...enhancedSmsRecords.map(row => smsHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync('./notion-import-SMS-COMMAND-CENTER.csv', smsCsv);
console.log('✅ Created: notion-import-SMS-COMMAND-CENTER.csv');

// Single-Family Pipeline
const sfHeaders = [...headers, 'SFSegment', 'SFPriority'];
const sfCsv = [
  sfHeaders.join(','),
  ...singleFamilyRecords.map(row => sfHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync('./notion-import-SINGLE-FAMILY-PIPELINE.csv', sfCsv);
console.log('✅ Created: notion-import-SINGLE-FAMILY-PIPELINE.csv');

// Compliance & Analytics
const complianceHeaders = [...headers, 'ComplianceStatus', 'LastContactDays', 'LifetimeValue'];
const complianceCsv = [
  complianceHeaders.join(','),
  ...complianceRecords.map(row => complianceHeaders.map(h => escapeCSV(row[h])).join(','))
].join('\n');

fs.writeFileSync('./notion-import-COMPLIANCE-ANALYTICS.csv', complianceCsv);
console.log('✅ Created: notion-import-COMPLIANCE-ANALYTICS.csv\n');

// Generate operational statistics
console.log('📊 OPERATIONAL INTELLIGENCE\n');

const t1Hot = enhancedSmsRecords.filter(r => r.OperationalTier === 'T1-HOT-NOW').length;
const t1Warm = enhancedSmsRecords.filter(r => r.OperationalTier === 'T1-WARM-PIPELINE').length;
const t1New = enhancedSmsRecords.filter(r => r.OperationalTier === 'T1-HIGH-PRIORITY-NEW').length;
const t2Reeng = enhancedSmsRecords.filter(r => r.OperationalTier === 'T2-RE-ENGAGEMENT').length;

console.log('🎯 SMS COMMAND CENTER TIERS:');
console.log(`  T1-HOT-NOW: ${t1Hot} contacts (CALL TODAY)`);
console.log(`  T1-WARM-PIPELINE: ${t1Warm} contacts (CALL THIS WEEK)`);
console.log(`  T1-HIGH-PRIORITY-NEW: ${t1New} contacts (TEXT IMMEDIATELY)`);
console.log(`  T2-RE-ENGAGEMENT: ${t2Reeng} contacts (180+ DAY FOLLOW-UP)\n`);

const sfHot = singleFamilyRecords.filter(r => r.SFSegment === 'SF-HOT').length;
const sfWarm = singleFamilyRecords.filter(r => r.SFSegment === 'SF-WARM').length;
const sfHighValue = singleFamilyRecords.filter(r => r.SFSegment === 'SF-HIGH-VALUE').length;

console.log('🏠 SINGLE-FAMILY SEGMENTS:');
console.log(`  SF-HOT: ${sfHot} contacts`);
console.log(`  SF-WARM: ${sfWarm} contacts`);
console.log(`  SF-HIGH-VALUE: ${sfHighValue} contacts\n`);

const optOutCount = complianceRecords.filter(r => r.ComplianceStatus === 'DO-NOT-CONTACT').length;
const totalLTV = complianceRecords.reduce((sum, r) => sum + (r.LifetimeValue || 0), 0);

console.log('🛡️ COMPLIANCE & ANALYTICS:');
console.log(`  DO-NOT-CONTACT: ${optOutCount} contacts (PROTECTED)`);
console.log(`  Estimated Lifetime Value: $${(totalLTV / 1000000).toFixed(1)}M\n`);

console.log('='.repeat(70));
console.log('🚀 EXPERT SEGMENTATION COMPLETE!\n');
console.log('📊 THREE DATABASES READY FOR NOTION IMPORT:');
console.log('  1. SMS Command Center (Primary Operations)');
console.log('  2. Single-Family Pipeline (Secondary Focus)');
console.log('  3. Compliance & Analytics (Complete Records)\n');
console.log('🎯 NEXT STEP: Import to 3 separate Notion databases for maximum workflow efficiency!\n');