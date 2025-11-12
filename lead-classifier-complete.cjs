/**
 * MONTHAVEN LEAD CLASSIFIER & CATEGORIZER
 * 
 * Analyzes SMS response data and property data to create properly categorized leads:
 * - HOT/WARM/COLD based on actual responses
 * - Commercial vs SFH (Single Family Home) property types  
 * - Notion-ready CSV exports for team calling
 */

const fs = require('fs').promises;
const path = require('path');

class LeadClassifier {
  constructor() {
    this.hotLeads = [];
    this.warmLeads = [];
    this.coldLeads = [];
    this.optOuts = [];
    
    this.commercialHot = [];
    this.commercialWarm = [];
    this.commercialCold = [];
    
    this.sfhHot = [];
    this.sfhWarm = [];
    this.sfhCold = [];
    
    this.processedCount = 0;
  }

  // Classify SMS responses using expert patterns
  classifyResponse(message, fullName = '', phoneNumber = '') {
    if (!message || typeof message !== 'string') {
      return { type: 'COLD', confidence: 50, priority: 3 };
    }
    
    const text = message.toLowerCase().trim();
    console.log(`📱 Analyzing: "${message}" from ${fullName || phoneNumber}`);
    
    // OPT-OUT patterns (immediate removal)
    const optOutPatterns = [
      /\bstop\b/i, /\bunsubscribe\b/i, /\bremove\b/i, /\bdon'?t\s+(text|contact|call)\b/i,
      /\bnot\s+interested\b/i, /\bnever\s+contact\b/i, /\bleave\s+me\s+alone\b/i,
      /\bharassment\b/i, /\billegal\b/i, /\breport\b/i, /\bblock\b/i,
      /\bwrong\s+number\b/i, /\bnot\s+owner\b/i, /\bsold\s+already\b/i,
      /\bnever\s+intended\s+to\s+sell\b/i, /\bnot\s+for\s+sale\b/i
    ];

    // HOT patterns (call immediately)
    const hotPatterns = [
      /\b(yes|yeah|yep|absolutely|definitely)\b/i,
      /\b(interested|ready)\b/i,
      /\bmake\s+(us\s+)?(an?\s+)?offer\b/i,
      /\bhow\s+much\b/i, /\bwhat.*price\b/i,
      /\btell\s+me\s+more\b/i, /\bmore\s+info\b/i,
      /\bcall\s+me\b/i, /\bphone\b/i, /\bwhen\s+can\b/i,
      /\bready\s+to\s+sell\b/i, /\bwant\s+to\s+sell\b/i,
      /\bcash\b/i, /\boffer\b/i, /\bbuy\b/i, /\bpurchase\b/i,
      /\bstill\s+in\s+the\s+middle\s+of\s+the\s+possible\s+sale\b/i,
      /\bquestions\s+for\s+you\b/i, /\breach\s+out\b/i
    ];

    // WARM patterns (follow up in 24-48h)
    const warmPatterns = [
      /\bmaybe\b/i, /\bmight\b/i, /\bpossibly\b/i, /\bdepends\b/i,
      /\bconsidering\b/i, /\bthinking\s+about\b/i,
      /\bhusband\b/i, /\bwife\b/i, /\bspouse\b/i, /\bpartner\b/i, /\bfamily\b/i,
      /\bdiscuss\b/i, /\btalk\s+about\b/i, /\bask\s+my\b/i,
      /\bnot\s+sure\b/i, /\bquestions\b/i, /\binformation\b/i,
      /\bfuture\b/i, /\blater\b/i, /\bmonths?\b/i, /\btiming\b/i,
      /\bwho\s+is\s+this\b/i, /\bwhat.*company\b/i, /\btell.*about\b/i,
      /\bnot\s+really\s+looking\b/i, /\bsorry\b/i
    ];

    // Check for opt-out first
    if (optOutPatterns.some(pattern => pattern.test(text))) {
      return {
        type: 'OPT_OUT',
        confidence: 95,
        priority: 0,
        reason: 'Explicit opt-out request',
        actionRequired: 'REMOVE_IMMEDIATELY'
      };
    }

    // Check for HOT responses
    if (hotPatterns.some(pattern => pattern.test(text))) {
      const matchCount = hotPatterns.filter(pattern => pattern.test(text)).length;
      const confidence = Math.min(60 + (matchCount * 15), 95);
      
      return {
        type: 'HOT',
        confidence,
        priority: 1,
        reason: 'Strong interest indicators detected',
        actionRequired: 'CALL_IMMEDIATELY'
      };
    }

    // Check for WARM responses
    if (warmPatterns.some(pattern => pattern.test(text))) {
      const matchCount = warmPatterns.filter(pattern => pattern.test(text)).length;
      const confidence = Math.min(55 + (matchCount * 10), 85);
      
      return {
        type: 'WARM',
        confidence,
        priority: 2,
        reason: 'Conditional interest or need more info',
        actionRequired: 'FOLLOW_UP_24H'
      };
    }

    // Default to COLD for unclear responses
    return {
      type: 'COLD',
      confidence: 60,
      priority: 3,
      reason: 'Response unclear or neutral',
      actionRequired: 'NURTURE_SEQUENCE'
    };
  }

  // Determine property type from Deal Machine data
  determinePropertyType(propertyType, squareFeet, propertyClass, zoning, ownerName) {
    if (!propertyType) propertyType = '';
    if (!propertyClass) propertyClass = '';
    if (!zoning) zoning = '';
    if (!ownerName) ownerName = '';
    
    const propType = propertyType.toLowerCase();
    const propClass = propertyClass.toLowerCase();
    const zoningLower = zoning.toLowerCase();
    const ownerLower = ownerName.toLowerCase();
    
    // Commercial indicators
    const commercialIndicators = [
      /commercial/i, /office/i, /retail/i, /industrial/i, /warehouse/i,
      /store/i, /shopping/i, /plaza/i, /center/i, /building/i,
      /mixed\s+use/i, /multi[\s-]?family/i, /apartment/i, /duplex/i,
      /triplex/i, /fourplex/i, /\bllc\b/i, /\binc\b/i, /\bcorp\b/i,
      /\bltd\b/i, /company/i, /enterprises/i, /properties/i, /investments/i,
      /trust/i, /partnership/i, /\bassoc\b/i, /\bassociates\b/i
    ];
    
    // Commercial zoning
    const commercialZoning = [
      /^c[\d-]/i, /commercial/i, /business/i, /office/i, /industrial/i,
      /mixed/i, /multi/i, /^m[\d-]/i, /^i[\d-]/i
    ];
    
    // Check various indicators
    const isCommercialType = commercialIndicators.some(pattern => 
      pattern.test(propType) || pattern.test(propClass) || pattern.test(ownerLower)
    );
    
    const isCommercialZoning = commercialZoning.some(pattern => pattern.test(zoningLower));
    
    const isLargeProperty = squareFeet && parseInt(squareFeet.toString().replace(/[^\d]/g, '')) > 5000;
    
    // Multi-unit indicators
    const isMultiUnit = /multi|duplex|triplex|fourplex|apartment/i.test(propType + ' ' + propClass);
    
    if (isCommercialType || isCommercialZoning || isMultiUnit) {
      return {
        category: 'COMMERCIAL',
        subType: isMultiUnit ? 'Multi-Family' : 'Commercial',
        confidence: isCommercialType ? 90 : (isCommercialZoning ? 75 : 60)
      };
    }
    
    // Single Family indicators
    if (propType.includes('single family') || propType.includes('residential')) {
      return {
        category: 'SFH',
        subType: 'Single Family Home',
        confidence: 90
      };
    }
    
    // Default based on size and other factors
    if (isLargeProperty) {
      return {
        category: 'COMMERCIAL',
        subType: 'Large Property',
        confidence: 70
      };
    }
    
    return {
      category: 'SFH',
      subType: 'Single Family Home',
      confidence: 80
    };
  }

  // Parse CSV file
  async parseCSV(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const headers = this.parseCSVLine(lines[0]);
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this.parseCSVLine(lines[i]);
          if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            data.push(row);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Error parsing CSV ${filePath}:`, error.message);
      return [];
    }
  }

  // Parse CSV line with proper quote handling
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Create Notion-ready CSV
  createNotionCSV(leads, filename, propertyCategory) {
    const headers = [
      'Contact Name',
      'Phone Number',
      'Property Address', 
      'Property Type',
      'Response Type',
      'Classification',
      'Confidence',
      'Priority',
      'Action Required',
      'Last Message',
      'Response Date',
      'Property Value',
      'Equity',
      'Square Feet',
      'Source Campaign',
      'Notes'
    ];
    
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
    
    leads.forEach(lead => {
      const row = [
        lead.contactName || 'Unknown',
        lead.phoneNumber || '',
        lead.propertyAddress || '',
        `${propertyCategory} - ${lead.propertySubType || ''}`,
        lead.responseType || '',
        lead.classification || '',
        lead.confidence || '',
        lead.priority || '',
        lead.actionRequired || '',
        lead.lastMessage || '',
        lead.responseDate || '',
        lead.propertyValue || '',
        lead.equity || '',
        lead.squareFeet || '',
        lead.sourceCampaign || 'SMS Campaign',
        lead.notes || ''
      ];
      
      csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });
    
    return csvContent;
  }

  // Main analysis function
  async analyzeAllData() {
    console.log('\n🔍 MONTHAVEN LEAD CLASSIFICATION SYSTEM\n');
    console.log('📊 Analyzing SMS responses and property data...\n');
    
    // Load SMS responses
    const responsesPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Incoming Messages Report-1762879212472 (all) 11-11-25.csv';
    const responses = await this.parseCSV(responsesPath);
    console.log(`📱 Loaded ${responses.length} SMS responses`);
    
    // Load property data
    const propertyPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Combined Deal Machine - Combined Deal Machine.csv';
    const properties = await this.parseCSV(propertyPath);
    console.log(`🏠 Loaded ${properties.length} property records\n`);
    
    // Create phone number lookup for properties
    const phoneToProperty = new Map();
    properties.forEach(prop => {
      // Check all contact phone numbers
      for (let i = 1; i <= 18; i++) {
        const phone = prop[`contact_${i}_phone1`];
        if (phone && phone.length > 5) {
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length >= 10) {
            phoneToProperty.set(cleanPhone, prop);
          }
        }
      }
    });
    
    console.log(`📞 Created lookup for ${phoneToProperty.size} phone numbers\n`);
    
    // Process each response
    responses.forEach(response => {
      const phoneNumber = response['Phone Number']?.replace(/\D/g, '') || '';
      const message = response['Actual Message'] || '';
      const fullName = response['Full Name'] || '';
      const responseDate = response['Received date and time'] || '';
      const optedOut = response['Opted out'] === 'Y';
      
      if (!phoneNumber || phoneNumber.length < 10) return;
      
      // Skip if already opted out
      if (optedOut) {
        this.optOuts.push({
          contactName: fullName,
          phoneNumber: phoneNumber,
          lastMessage: message,
          responseDate: responseDate,
          classification: 'OPT_OUT',
          priority: 0,
          actionRequired: 'REMOVE_IMMEDIATELY'
        });
        return;
      }
      
      // Classify the response
      const classification = this.classifyResponse(message, fullName, phoneNumber);
      
      // Find property data
      const property = phoneToProperty.get(phoneNumber);
      
      // Determine property type
      const propertyType = this.determinePropertyType(
        property?.property_type,
        property?.building_square_feet,
        property?.property_class,
        property?.zoning,
        property?.owner_1_name
      );
      
      const lead = {
        contactName: fullName,
        phoneNumber: phoneNumber,
        propertyAddress: property?.property_address_full || 'Address Unknown',
        propertySubType: propertyType.subType,
        responseType: classification.type,
        classification: classification.type,
        confidence: classification.confidence,
        priority: classification.priority,
        actionRequired: classification.actionRequired,
        lastMessage: message,
        responseDate: responseDate,
        propertyValue: property?.estimated_value || '',
        equity: property?.equity_amount || '',
        squareFeet: property?.building_square_feet || '',
        sourceCampaign: 'EZ Texting Historical',
        notes: `${classification.reason} | Property confidence: ${propertyType.confidence}%`
      };
      
      // Sort into categories
      if (classification.type === 'HOT') {
        this.hotLeads.push(lead);
        if (propertyType.category === 'COMMERCIAL') {
          this.commercialHot.push(lead);
        } else {
          this.sfhHot.push(lead);
        }
      } else if (classification.type === 'WARM') {
        this.warmLeads.push(lead);
        if (propertyType.category === 'COMMERCIAL') {
          this.commercialWarm.push(lead);
        } else {
          this.sfhWarm.push(lead);
        }
      } else if (classification.type === 'COLD') {
        this.coldLeads.push(lead);
        if (propertyType.category === 'COMMERCIAL') {
          this.commercialCold.push(lead);
        } else {
          this.sfhCold.push(lead);
        }
      }
      
      this.processedCount++;
    });
    
    await this.generateReports();
  }

  // Generate all reports and CSV files
  async generateReports() {
    console.log('\n📈 ANALYSIS COMPLETE - GENERATING REPORTS\n');
    
    // Summary statistics
    console.log('═══════════════════════════════════════');
    console.log('           LEAD CLASSIFICATION           ');
    console.log('═══════════════════════════════════════');
    console.log(`🔥 HOT Leads (Call Now):     ${this.hotLeads.length.toString().padStart(4)}`);
    console.log(`🔶 WARM Leads (24-48h):      ${this.warmLeads.length.toString().padStart(4)}`);
    console.log(`❄️  COLD Leads (Nurture):     ${this.coldLeads.length.toString().padStart(4)}`);
    console.log(`🚫 OPT-OUTS (Remove):        ${this.optOuts.length.toString().padStart(4)}`);
    console.log('───────────────────────────────────────');
    console.log(`📊 TOTAL PROCESSED:          ${this.processedCount.toString().padStart(4)}`);
    console.log('\n');
    
    console.log('═══════════════════════════════════════');
    console.log('         PROPERTY BREAKDOWN             ');
    console.log('═══════════════════════════════════════');
    console.log('🏢 COMMERCIAL PROPERTIES:');
    console.log(`   🔥 HOT Commercial:        ${this.commercialHot.length.toString().padStart(4)}`);
    console.log(`   🔶 WARM Commercial:       ${this.commercialWarm.length.toString().padStart(4)}`);
    console.log(`   ❄️  COLD Commercial:       ${this.commercialCold.length.toString().padStart(4)}`);
    console.log('\n🏠 SINGLE FAMILY HOMES:');
    console.log(`   🔥 HOT SFH:               ${this.sfhHot.length.toString().padStart(4)}`);
    console.log(`   🔶 WARM SFH:              ${this.sfhWarm.length.toString().padStart(4)}`);
    console.log(`   ❄️  COLD SFH:              ${this.sfhCold.length.toString().padStart(4)}`);
    console.log('═══════════════════════════════════════\n');

    // Generate CSV files for Notion import
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // HOT Leads CSVs
    if (this.commercialHot.length > 0) {
      const hotCommercialCSV = this.createNotionCSV(this.commercialHot, `HOT-Commercial-${timestamp}`, 'Commercial');
      await fs.writeFile(`HOT-Commercial-Leads-${timestamp}.csv`, hotCommercialCSV);
      console.log(`🔥 Generated: HOT-Commercial-Leads-${timestamp}.csv (${this.commercialHot.length} leads)`);
    }
    
    if (this.sfhHot.length > 0) {
      const hotSFHCSV = this.createNotionCSV(this.sfhHot, `HOT-SFH-${timestamp}`, 'SFH');
      await fs.writeFile(`HOT-SFH-Leads-${timestamp}.csv`, hotSFHCSV);
      console.log(`🔥 Generated: HOT-SFH-Leads-${timestamp}.csv (${this.sfhHot.length} leads)`);
    }
    
    // WARM Leads CSVs
    if (this.commercialWarm.length > 0) {
      const warmCommercialCSV = this.createNotionCSV(this.commercialWarm, `WARM-Commercial-${timestamp}`, 'Commercial');
      await fs.writeFile(`WARM-Commercial-Leads-${timestamp}.csv`, warmCommercialCSV);
      console.log(`🔶 Generated: WARM-Commercial-Leads-${timestamp}.csv (${this.commercialWarm.length} leads)`);
    }
    
    if (this.sfhWarm.length > 0) {
      const warmSFHCSV = this.createNotionCSV(this.sfhWarm, `WARM-SFH-${timestamp}`, 'SFH');
      await fs.writeFile(`WARM-SFH-Leads-${timestamp}.csv`, warmSFHCSV);
      console.log(`🔶 Generated: WARM-SFH-Leads-${timestamp}.csv (${this.sfhWarm.length} leads)`);
    }
    
    // COLD Leads CSVs  
    if (this.commercialCold.length > 0) {
      const coldCommercialCSV = this.createNotionCSV(this.commercialCold, `COLD-Commercial-${timestamp}`, 'Commercial');
      await fs.writeFile(`COLD-Commercial-Leads-${timestamp}.csv`, coldCommercialCSV);
      console.log(`❄️  Generated: COLD-Commercial-Leads-${timestamp}.csv (${this.commercialCold.length} leads)`);
    }
    
    if (this.sfhCold.length > 0) {
      const coldSFHCSV = this.createNotionCSV(this.sfhCold, `COLD-SFH-${timestamp}`, 'SFH');
      await fs.writeFile(`COLD-SFH-Leads-${timestamp}.csv`, coldSFHCSV);
      console.log(`❄️  Generated: COLD-SFH-Leads-${timestamp}.csv (${this.sfhCold.length} leads)`);
    }
    
    console.log('\n✅ All CSV files generated and ready for Notion import!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Upload the HOT leads CSVs to Notion first (highest priority)');
    console.log('2. Start calling the HOT leads immediately');
    console.log('3. Upload WARM leads for follow-up in 24-48 hours');
    console.log('4. Upload COLD leads for nurture campaigns');
    console.log('5. Remove all OPT-OUT contacts from active lists\n');
    
    // Generate sample data preview
    this.generateSamplePreview();
  }

  generateSamplePreview() {
    console.log('═══════════════════════════════════════');
    console.log('           SAMPLE HOT LEADS             ');
    console.log('═══════════════════════════════════════');
    
    // Show top 5 HOT leads
    const topHotLeads = this.hotLeads.slice(0, 5);
    topHotLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.contactName}`);
      console.log(`   📞 ${lead.phoneNumber}`);
      console.log(`   🏠 ${lead.propertyAddress}`);
      console.log(`   💬 "${lead.lastMessage}"`);
      console.log(`   🎯 ${lead.classification} (${lead.confidence}% confidence)`);
      console.log(`   ⚡ ${lead.actionRequired}\n`);
    });
    
    if (this.hotLeads.length > 5) {
      console.log(`   ... and ${this.hotLeads.length - 5} more HOT leads!\n`);
    }
    
    console.log('═══════════════════════════════════════\n');
  }
}

// Run the analysis
async function main() {
  const classifier = new LeadClassifier();
  await classifier.analyzeAllData();
}

main().catch(console.error);