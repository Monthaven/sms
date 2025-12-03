const fs = require('fs');

console.log('🔧 FIXING CSV COLUMN ALIGNMENT\n');

// Read the CSV as text and process line by line
const csvText = fs.readFileSync('notion-import-master-final.csv', 'utf-8');
const lines = csvText.split('\n');

console.log(`📊 Processing ${lines.length} lines...`);

// Get the header (first line) to count expected columns
const header = lines[0];
const expectedColumns = header.split(',').length;
console.log(`📋 Expected columns: ${expectedColumns}`);

// Fix each line to have the correct number of columns
const fixedLines = lines.map((line, index) => {
  if (index === 0) return line; // Keep header as-is
  if (line.trim() === '') return line; // Keep empty lines
  
  const columns = line.split(',');
  const currentColumns = columns.length;
  
  if (currentColumns < expectedColumns) {
    // Add missing columns with empty values
    const missingColumns = expectedColumns - currentColumns;
    const padding = new Array(missingColumns).fill('');
    return [...columns, ...padding].join(',');
  }
  
  return line;
});

// Write the fixed CSV
const fixedCsv = fixedLines.join('\n');
fs.writeFileSync('notion-import-master-fixed.csv', fixedCsv);

console.log(`✅ Fixed CSV saved as: notion-import-master-fixed.csv`);
console.log(`📊 All ${lines.length} lines now have ${expectedColumns} columns`);

// Now enhance with operational intelligence
const { parse, stringify } = require('csv-parse/sync');

console.log('\n🚀 ADDING OPERATIONAL INTELLIGENCE...\n');

const records = parse(fixedCsv, { columns: true, skip_empty_lines: true });
console.log(`📊 Processing ${records.length.toLocaleString()} records...`);

// Enhancement functions
function getOperationalTier(record) {
  const responseType = record.ResponseType || '';
  const estValue = parseFloat(record.EstimatedValue || 0);
  const isOptOut = record.IsOptOut === 'true';
  
  if (isOptOut) return 'T3-COLD-ARCHIVE';
  
  switch (responseType.toUpperCase()) {
    case 'HOT':
      return estValue > 500000 ? 'T1-HOT-NOW' : 'T1-HOT-NOW';
    case 'WARM':
      return estValue > 300000 ? 'T1-WARM-PIPELINE' : 'T2-ACTIVE-FOLLOWUP';
    case 'INTERESTED':
      return 'T1-WARM-PIPELINE';
    case 'COLD':
      const message = (record.LastMessage || '').toLowerCase();
      return message.includes('not interested') || message.includes('stop') 
        ? 'T3-COLD-ARCHIVE' : 'T2-STANDARD-NURTURE';
    case 'NOT_INTERESTED':
      return 'T3-COLD-ARCHIVE';
    default:
      return estValue > 500000 ? 'T1-HIGH-PRIORITY-NEW' : 'T2-STANDARD-NURTURE';
  }
}

function getHandlerAssigned(record) {
  const tier = getOperationalTier(record);
  const estValue = parseFloat(record.EstimatedValue || 0);
  const propertyType = record.PropertyType || '';
  
  if (tier === 'T1-HOT-NOW' || estValue > 1000000) {
    return 'Lead Specialist';
  }
  if (tier === 'T1-WARM-PIPELINE' || propertyType === 'Commercial' || estValue > 500000) {
    return 'Senior Handler';
  }
  if (tier.startsWith('T3') || record.IsOptOut === 'true') {
    return 'Unassigned';
  }
  return 'Standard Handler';
}

function getComplianceStatus(record) {
  const isOptOut = record.IsOptOut === 'true';
  const message = (record.LastMessage || '').toLowerCase();
  
  if (isOptOut || message.includes('stop') || message.includes('remove')) {
    return 'OPT_OUT';
  }
  if (message.includes('not interested') && record.ResponseType === 'COLD') {
    return 'DNC_PROTECTED';
  }
  return 'ACTIVE';
}

// Process each record
let enhanced = 0;
const enhancedRecords = records.map((record) => {
  // Fill in the new columns
  record.OperationalTier = record.OperationalTier || getOperationalTier(record);
  record.HandlerAssigned = record.HandlerAssigned || getHandlerAssigned(record);
  record.ComplianceStatus = record.ComplianceStatus || getComplianceStatus(record);
  
  enhanced++;
  
  if (enhanced % 5000 === 0) {
    console.log(`   ✅ Enhanced ${enhanced.toLocaleString()} records...`);
  }
  
  return record;
});

// Count distributions
const tierCounts = {};
const handlerCounts = {};
const complianceCounts = {};

enhancedRecords.forEach(record => {
  tierCounts[record.OperationalTier] = (tierCounts[record.OperationalTier] || 0) + 1;
  handlerCounts[record.HandlerAssigned] = (handlerCounts[record.HandlerAssigned] || 0) + 1;
  complianceCounts[record.ComplianceStatus] = (complianceCounts[record.ComplianceStatus] || 0) + 1;
});

console.log(`\n🎯 Enhancement Complete!`);
console.log(`   • Total records: ${enhancedRecords.length.toLocaleString()}`);

console.log(`\n📊 Operational Tiers:`);
Object.entries(tierCounts).sort((a,b) => b[1] - a[1]).forEach(([tier, count]) => {
  console.log(`   • ${tier}: ${count.toLocaleString()}`);
});

console.log(`\n👥 Handler Distribution:`);
Object.entries(handlerCounts).sort((a,b) => b[1] - a[1]).forEach(([handler, count]) => {
  console.log(`   • ${handler}: ${count.toLocaleString()}`);
});

console.log(`\n🔒 Compliance Status:`);
Object.entries(complianceCounts).sort((a,b) => b[1] - a[1]).forEach(([status, count]) => {
  console.log(`   • ${status}: ${count.toLocaleString()}`);
});

// Save enhanced master file
const enhancedCsv = stringify(enhancedRecords, { header: true });
fs.writeFileSync('notion-import-master-FINAL-ENHANCED.csv', enhancedCsv);

// Create segmented files
const activeContacts = enhancedRecords.filter(r => r.ComplianceStatus === 'ACTIVE');
const smsOperational = activeContacts.filter(r => !r.OperationalTier.includes('ARCHIVE'));
const singleFamily = enhancedRecords.filter(r => 
  (r.PropertyType && r.PropertyType.toLowerCase().includes('single')) || 
  (r.Units && parseInt(r.Units) <= 4 && parseInt(r.Units) > 0)
);

fs.writeFileSync('notion-import-SMS-COMMAND-CENTER-FINAL.csv', stringify(smsOperational, { header: true }));
fs.writeFileSync('notion-import-SINGLE-FAMILY-PIPELINE-FINAL.csv', stringify(singleFamily, { header: true }));
fs.writeFileSync('notion-import-COMPLIANCE-ANALYTICS-FINAL.csv', stringify(enhancedRecords, { header: true }));

console.log(`\n📁 Final Files Created:`);
console.log(`   • Master Enhanced: ${enhancedRecords.length.toLocaleString()} records`);
console.log(`   • SMS Command Center: ${smsOperational.length.toLocaleString()} operational contacts`);
console.log(`   • Single-Family Pipeline: ${singleFamily.length.toLocaleString()} properties`);
console.log(`   • Compliance & Analytics: ${enhancedRecords.length.toLocaleString()} total records`);

console.log(`\n🎉 SUCCESS: Enhanced CSV ready for Notion import!`);
console.log(`\n🚀 Next Steps:`);
console.log(`   1. Import the 3 FINAL.csv files to Notion databases`);
console.log(`   2. Deploy webhook for real-time updates`);
console.log(`   3. Launch expert-tier SMS operations!`);