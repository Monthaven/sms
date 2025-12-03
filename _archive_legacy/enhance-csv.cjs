const fs = require('fs');
const { parse, stringify } = require('csv-parse/sync');

console.log('🚀 ENHANCING CSV WITH OPERATIONAL INTELLIGENCE\n');

// Read the current CSV
const csvData = fs.readFileSync('notion-import-master-final.csv', 'utf-8');
const records = parse(csvData, { columns: true, skip_empty_lines: true });

console.log(`📊 Processing ${records.length.toLocaleString()} contacts...`);

// Enhancement functions
function getOperationalTier(record) {
  const responseType = record.ResponseType;
  const estValue = parseFloat(record.EstimatedValue || 0);
  const isOptOut = record.IsOptOut === 'true';
  
  if (isOptOut) return 'T3-COLD-ARCHIVE';
  
  switch (responseType) {
    case 'HOT':
      return estValue > 500000 ? 'T1-HOT-NOW' : 'T1-HOT-NOW';
    case 'WARM':
      return estValue > 300000 ? 'T1-WARM-PIPELINE' : 'T2-ACTIVE-FOLLOWUP';
    case 'INTERESTED':
      return 'T1-WARM-PIPELINE';
    case 'COLD':
      return record.LastMessage && record.LastMessage.toLowerCase().includes('not interested') 
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
  const propertyType = record.PropertyType;
  
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

function getNextAction(record) {
  const tier = getOperationalTier(record);
  const responseType = record.ResponseType;
  const complianceStatus = getComplianceStatus(record);
  
  if (complianceStatus === 'OPT_OUT') return 'ARCHIVE';
  
  switch (tier) {
    case 'T1-HOT-NOW':
      return 'CALL_IMMEDIATELY';
    case 'T1-WARM-PIPELINE':
      return responseType === 'HOT' ? 'SCHEDULE_APPOINTMENT' : 'SEND_FOLLOWUP';
    case 'T1-HIGH-PRIORITY-NEW':
      return 'SEND_FOLLOWUP';
    case 'T2-ACTIVE-FOLLOWUP':
      return 'SEND_FOLLOWUP';
    case 'T2-STANDARD-NURTURE':
      return 'NURTURE_SEQUENCE';
    case 'T3-COLD-ARCHIVE':
      return 'ARCHIVE';
    default:
      return 'NURTURE_SEQUENCE';
  }
}

// Process each record
let enhanced = 0;
const enhancedRecords = records.map((record, index) => {
  // Add new columns
  record.OperationalTier = getOperationalTier(record);
  record.HandlerAssigned = getHandlerAssigned(record);
  record.ComplianceStatus = getComplianceStatus(record);
  
  // Update NextAction if empty
  if (!record.NextAction) {
    record.NextAction = getNextAction(record);
  }
  
  enhanced++;
  
  if (enhanced % 5000 === 0) {
    console.log(`   ✅ Enhanced ${enhanced.toLocaleString()} records...`);
  }
  
  return record;
});

console.log(`\n🎯 Enhancement Summary:`);
console.log(`   • Total records processed: ${enhancedRecords.length.toLocaleString()}`);

// Count by operational tier
const tierCounts = {};
const handlerCounts = {};
const complianceCounts = {};

enhancedRecords.forEach(record => {
  tierCounts[record.OperationalTier] = (tierCounts[record.OperationalTier] || 0) + 1;
  handlerCounts[record.HandlerAssigned] = (handlerCounts[record.HandlerAssigned] || 0) + 1;
  complianceCounts[record.ComplianceStatus] = (complianceCounts[record.ComplianceStatus] || 0) + 1;
});

console.log(`\n📊 Operational Tier Distribution:`);
Object.entries(tierCounts).forEach(([tier, count]) => {
  console.log(`   • ${tier}: ${count.toLocaleString()}`);
});

console.log(`\n👥 Handler Assignment:`);
Object.entries(handlerCounts).forEach(([handler, count]) => {
  console.log(`   • ${handler}: ${count.toLocaleString()}`);
});

console.log(`\n🔒 Compliance Status:`);
Object.entries(complianceCounts).forEach(([status, count]) => {
  console.log(`   • ${status}: ${count.toLocaleString()}`);
});

// Write enhanced CSV
const enhancedCsv = stringify(enhancedRecords, { header: true });
fs.writeFileSync('notion-import-master-enhanced.csv', enhancedCsv);

console.log(`\n✅ Enhanced CSV saved as: notion-import-master-enhanced.csv`);
console.log(`\n🚀 Ready for Notion import with expert-level operational intelligence!`);

// Create segmented files for specialized databases
console.log(`\n📊 Creating segmented databases...`);

// SMS Command Center (Active contacts only)
const smsCommandCenter = enhancedRecords.filter(record => 
  record.ComplianceStatus === 'ACTIVE' && 
  !['T3-COLD-ARCHIVE'].includes(record.OperationalTier)
);

// Single-Family Pipeline (SF properties with high priority)
const singleFamilyPipeline = enhancedRecords.filter(record =>
  record.PropertyType === 'Single Family' || 
  (record.EstimatedValue > 0 && record.Units <= 4 && record.ComplianceStatus === 'ACTIVE')
);

// Compliance & Analytics (All records for complete protection)
const complianceAnalytics = enhancedRecords;

// Write segmented files
fs.writeFileSync('notion-import-SMS-COMMAND-CENTER-enhanced.csv', stringify(smsCommandCenter, { header: true }));
fs.writeFileSync('notion-import-SINGLE-FAMILY-PIPELINE-enhanced.csv', stringify(singleFamilyPipeline, { header: true }));
fs.writeFileSync('notion-import-COMPLIANCE-ANALYTICS-enhanced.csv', stringify(complianceAnalytics, { header: true }));

console.log(`\n📁 Segmented Files Created:`);
console.log(`   • SMS Command Center: ${smsCommandCenter.length.toLocaleString()} active contacts`);
console.log(`   • Single-Family Pipeline: ${singleFamilyPipeline.length.toLocaleString()} properties`);
console.log(`   • Compliance & Analytics: ${complianceAnalytics.length.toLocaleString()} total records`);

console.log(`\n🎉 COMPLETE: Enhanced database ready for Notion deployment!`);