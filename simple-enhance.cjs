const fs = require('fs');

console.log('🚀 ENHANCING CSV WITH EXPERT OPERATIONAL INTELLIGENCE\n');

// Read the original CSV and work with it more carefully
const csvData = fs.readFileSync('notion-import-master-final.csv', 'utf-8');

// Split into lines, but be careful about quoted fields
const lines = csvData.split('\n').filter(line => line.trim());

console.log(`📊 Processing ${lines.length.toLocaleString()} lines...`);

// Process header
const header = lines[0];
console.log('📋 Header detected:', header);

// Check if we need to add the new columns
const hasEnhancements = header.includes('OperationalTier');

if (!hasEnhancements) {
  console.log('📝 Adding enhancement columns to header...');
  
  // Add new columns to header
  const newHeader = header + ',OperationalTier,HandlerAssigned,ComplianceStatus';
  
  // Process each data line and add the new columns
  const enhancedLines = [newHeader];
  
  let processed = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse the line carefully - count actual columns by splitting on commas outside quotes
    const columns = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        columns.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    columns.push(current); // Add the last column
    
    // Extract key fields for analysis (be careful with indexes)
    const phone = columns[0] || '';
    const responseType = (columns[4] || '').toUpperCase();
    const lastMessage = (columns[5] || '').toLowerCase();
    const isOptOut = (columns[13] || '').toLowerCase() === 'true';
    const estimatedValue = parseFloat(columns[14] || 0);
    const propertyType = columns[3] || '';
    
    // Determine operational tier
    let operationalTier = 'T2-STANDARD-NURTURE';
    if (isOptOut || lastMessage.includes('stop') || lastMessage.includes('remove')) {
      operationalTier = 'T3-COLD-ARCHIVE';
    } else if (responseType === 'HOT') {
      operationalTier = 'T1-HOT-NOW';
    } else if (responseType === 'WARM' || responseType === 'INTERESTED') {
      operationalTier = estimatedValue > 300000 ? 'T1-WARM-PIPELINE' : 'T2-ACTIVE-FOLLOWUP';
    } else if (responseType === 'COLD' && (lastMessage.includes('not interested') || lastMessage.includes('never'))) {
      operationalTier = 'T3-COLD-ARCHIVE';
    } else if (estimatedValue > 500000) {
      operationalTier = 'T1-HIGH-PRIORITY-NEW';
    }
    
    // Determine handler
    let handlerAssigned = 'Standard Handler';
    if (operationalTier === 'T1-HOT-NOW' || estimatedValue > 1000000) {
      handlerAssigned = 'Lead Specialist';
    } else if (operationalTier === 'T1-WARM-PIPELINE' || propertyType === 'Commercial' || estimatedValue > 500000) {
      handlerAssigned = 'Senior Handler';
    } else if (operationalTier.startsWith('T3') || isOptOut) {
      handlerAssigned = 'Unassigned';
    }
    
    // Determine compliance status
    let complianceStatus = 'ACTIVE';
    if (isOptOut || lastMessage.includes('stop') || lastMessage.includes('remove')) {
      complianceStatus = 'OPT_OUT';
    } else if (lastMessage.includes('not interested') && responseType === 'COLD') {
      complianceStatus = 'DNC_PROTECTED';
    }
    
    // Add the enhanced line
    const enhancedLine = line + ',' + operationalTier + ',' + handlerAssigned + ',' + complianceStatus;
    enhancedLines.push(enhancedLine);
    
    processed++;
    if (processed % 5000 === 0) {
      console.log(`   ✅ Enhanced ${processed.toLocaleString()} records...`);
    }
  }
  
  console.log(`\n🎯 Enhancement Complete: ${processed.toLocaleString()} records processed`);
  
  // Write the enhanced CSV
  const enhancedCsv = enhancedLines.join('\n');
  fs.writeFileSync('notion-import-master-ENHANCED.csv', enhancedCsv);
  
  console.log(`✅ Enhanced master file: notion-import-master-ENHANCED.csv`);
  
  // Count the operational tiers by parsing the enhanced data
  const tierCounts = {};
  const handlerCounts = {};
  const complianceCounts = {};
  
  enhancedLines.slice(1).forEach(line => {
    const parts = line.split(',');
    const tier = parts[parts.length - 3];
    const handler = parts[parts.length - 2]; 
    const compliance = parts[parts.length - 1];
    
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    handlerCounts[handler] = (handlerCounts[handler] || 0) + 1;
    complianceCounts[compliance] = (complianceCounts[compliance] || 0) + 1;
  });
  
  console.log(`\n📊 Operational Tier Distribution:`);
  Object.entries(tierCounts).sort((a,b) => b[1] - a[1]).forEach(([tier, count]) => {
    console.log(`   • ${tier}: ${count.toLocaleString()}`);
  });
  
  console.log(`\n👥 Handler Assignment:`);
  Object.entries(handlerCounts).sort((a,b) => b[1] - a[1]).forEach(([handler, count]) => {
    console.log(`   • ${handler}: ${count.toLocaleString()}`);
  });
  
  console.log(`\n🔒 Compliance Status:`);
  Object.entries(complianceCounts).sort((a,b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`   • ${status}: ${count.toLocaleString()}`);
  });
  
  // Create segmented files by filtering the enhanced lines
  const smsCommandCenter = [enhancedLines[0]]; // header
  const singleFamilyPipeline = [enhancedLines[0]]; // header
  const complianceAnalytics = enhancedLines.slice(); // all records
  
  enhancedLines.slice(1).forEach(line => {
    const parts = line.split(',');
    const compliance = parts[parts.length - 1];
    const tier = parts[parts.length - 3];
    const propertyType = parts[3] || '';
    const units = parseInt(parts[18]) || 0;
    
    // SMS Command Center - active operational contacts
    if (compliance === 'ACTIVE' && !tier.includes('ARCHIVE')) {
      smsCommandCenter.push(line);
    }
    
    // Single-Family Pipeline - SF properties or small multi-family
    if (propertyType.toLowerCase().includes('single') || 
        propertyType.toLowerCase().includes('family') ||
        (units > 0 && units <= 4)) {
      singleFamilyPipeline.push(line);
    }
  });
  
  // Write segmented files
  fs.writeFileSync('notion-import-SMS-COMMAND-CENTER.csv', smsCommandCenter.join('\n'));
  fs.writeFileSync('notion-import-SINGLE-FAMILY-PIPELINE.csv', singleFamilyPipeline.join('\n'));
  fs.writeFileSync('notion-import-COMPLIANCE-ANALYTICS.csv', complianceAnalytics.join('\n'));
  
  console.log(`\n📁 Segmented Files Created:`);
  console.log(`   • SMS Command Center: ${(smsCommandCenter.length - 1).toLocaleString()} operational contacts`);
  console.log(`   • Single-Family Pipeline: ${(singleFamilyPipeline.length - 1).toLocaleString()} properties`);
  console.log(`   • Compliance & Analytics: ${(complianceAnalytics.length - 1).toLocaleString()} total records`);
  
  console.log(`\n🎉 SUCCESS: All files ready for Notion import!`);
  console.log(`\n🚀 Next Steps:`);
  console.log(`   1. Create 3 databases in Notion`);
  console.log(`   2. Import each CSV file to corresponding database`);
  console.log(`   3. Deploy webhook for real-time updates`);
  console.log(`   4. Launch expert-tier SMS operations!`);
  
} else {
  console.log('✅ CSV already enhanced with operational intelligence!');
}