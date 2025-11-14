/**
 * AUGUST 5TH+ COMMERCIAL LEAD ANALYZER
 * 
 * Filters SMS responses from August 5th onward and categorizes them as commercial leads
 * Prepares data for AI address verification and property type classification
 */

const fs = require('fs').promises;

class August5thCommercialAnalyzer {
  constructor() {
    this.august5thResponses = [];
    this.commercialLeads = [];
    this.hotLeads = [];
    this.warmLeads = [];
    this.coldLeads = [];
    this.optOutLeads = [];
  }

  async analyzeAugust5thResponses() {
    console.log('\n🏢 AUGUST 5TH+ COMMERCIAL LEAD ANALYSIS\n');
    console.log('Filtering SMS responses from August 5th, 2025 onward...\n');

    // Load SMS responses
    const responsesPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Incoming Messages Report-1762879212472 (all) 11-11-25.csv';
    const responses = await this.parseCSV(responsesPath);
    
    // Load property data for address enrichment
    const propertyPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Combined Deal Machine - Combined Deal Machine.csv';
    const properties = await this.parseCSV(propertyPath);

    console.log(`📊 Total SMS Responses: ${responses.length.toLocaleString()}`);

    // Create phone number to property lookup
    const phoneToProperty = new Map();
    properties.forEach(prop => {
      for (let i = 1; i <= 18; i++) {
        const phone1 = prop[`contact_${i}_phone1`];
        const phone2 = prop[`contact_${i}_phone2`];
        const phone3 = prop[`contact_${i}_phone3`];
        
        [phone1, phone2, phone3].forEach(phone => {
          if (phone && phone.length > 5) {
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
              phoneToProperty.set(cleanPhone, prop);
            }
          }
        });
      }
    });

    console.log(`🔗 Phone-to-Property Mappings Available: ${phoneToProperty.size.toLocaleString()}\n`);

    // Filter responses from August 5th onward
    const august5th2025 = new Date('2025-08-05');
    let august5thCount = 0;
    let withAddressCount = 0;

    responses.forEach(response => {
      const dateStr = response['Received date and time'] || response['Date Sent'] || response['Date'] || '';
      const messageDate = this.parseMessageDate(dateStr);
      
      if (messageDate && messageDate >= august5th2025) {
        august5thCount++;
        
        const phoneNumber = response['Phone Number']?.replace(/\D/g, '') || '';
        const message = response['Actual Message'] || '';
        const fullName = response['Full Name'] || '';
        
        if (phoneNumber.length >= 10) {
          // Get property data if available
          const property = phoneToProperty.get(phoneNumber);
          
          const leadData = {
            name: fullName,
            phone: phoneNumber,
            message: message,
            dateReceived: messageDate.toISOString().split('T')[0],
            
            // Property information (for AI address verification)
            address: property ? (property.property_address_full || 'Address Available') : 'Address Unknown',
            propertyType: property ? property.property_type : 'Unknown',
            squareFeet: property ? property.building_square_feet : '',
            estimatedValue: property ? property.estimated_value : '',
            zoning: property ? property.zoning : '',
            propertyClass: property ? property.property_class : '',
            
            // Response classification
            responseType: this.classifyResponse(message),
            
            // For AI processing
            needsAddressVerification: !property || !property.property_address_full,
            hasPropertyData: !!property
          };

          if (property && property.property_address_full) {
            withAddressCount++;
          }

          this.august5thResponses.push(leadData);
          
          // Categorize by response type
          switch (leadData.responseType) {
            case 'HOT':
              this.hotLeads.push(leadData);
              break;
            case 'WARM':
              this.warmLeads.push(leadData);
              break;
            case 'COLD':
              this.coldLeads.push(leadData);
              break;
            case 'OPT_OUT':
              this.optOutLeads.push(leadData);
              break;
          }
        }
      }
    });

    console.log(`📅 Responses from Aug 5th+: ${august5thCount.toLocaleString()}`);
    console.log(`📞 Valid Phone Numbers: ${this.august5thResponses.length.toLocaleString()}`);
    console.log(`🏠 With Address Data: ${withAddressCount.toLocaleString()} (${(withAddressCount/this.august5thResponses.length*100).toFixed(1)}%)`);
    console.log(`❓ Need Address Verification: ${this.august5thResponses.length - withAddressCount} (${((this.august5thResponses.length - withAddressCount)/this.august5thResponses.length*100).toFixed(1)}%)`);

    console.log('\n📊 RESPONSE BREAKDOWN:');
    console.log(`🔥 HOT Leads: ${this.hotLeads.length.toLocaleString()}`);
    console.log(`🔶 WARM Leads: ${this.warmLeads.length.toLocaleString()}`);
    console.log(`❄️  COLD Leads: ${this.coldLeads.length.toLocaleString()}`);
    console.log(`🚫 OPT-OUT: ${this.optOutLeads.length.toLocaleString()}\n`);

    // Generate CSV files for AI processing
    await this.generateCommercialCSVs();
    
    // Show samples for verification
    this.showSamples();
  }

  async generateCommercialCSVs() {
    console.log('📄 GENERATING CSV FILES FOR AI ADDRESS VERIFICATION...\n');

    // CSV headers optimized for AI address verification
    const csvHeaders = [
      'Full_Name',
      'Phone_Number', 
      'Message',
      'Date_Received',
      'Response_Type',
      'Current_Address',
      'Property_Type',
      'Square_Feet',
      'Estimated_Value',
      'Zoning',
      'Property_Class',
      'Needs_Address_Verification',
      'Has_Property_Data',
      'AI_Address_Lookup_Required'
    ].join(',');

    // Generate separate files for each response type
    const categories = [
      { name: 'HOT', leads: this.hotLeads, priority: 'HIGHEST' },
      { name: 'WARM', leads: this.warmLeads, priority: 'HIGH' },
      { name: 'COLD', leads: this.coldLeads, priority: 'MEDIUM' },
      { name: 'OPT-OUT', leads: this.optOutLeads, priority: 'REMOVE' }
    ];

    for (const category of categories) {
      const fileName = `August-5th-${category.name}-Commercial-Leads-2025-11-12.csv`;
      const csvContent = [csvHeaders];
      
      category.leads.forEach(lead => {
        const row = [
          this.escapeCsv(lead.name),
          lead.phone,
          this.escapeCsv(lead.message),
          lead.dateReceived,
          lead.responseType,
          this.escapeCsv(lead.address),
          this.escapeCsv(lead.propertyType),
          lead.squareFeet || '',
          lead.estimatedValue || '',
          this.escapeCsv(lead.zoning),
          this.escapeCsv(lead.propertyClass),
          lead.needsAddressVerification ? 'YES' : 'NO',
          lead.hasPropertyData ? 'YES' : 'NO',
          lead.needsAddressVerification ? 'REQUIRED' : 'OPTIONAL'
        ].join(',');
        
        csvContent.push(row);
      });

      await fs.writeFile(fileName, csvContent.join('\n'), 'utf-8');
      console.log(`✅ Created: ${fileName} (${category.leads.length.toLocaleString()} leads) - Priority: ${category.priority}`);
    }

    // Create master file with all August 5th+ leads
    const masterFileName = 'August-5th-ALL-Commercial-Leads-Master-2025-11-12.csv';
    const masterContent = [csvHeaders];
    
    this.august5thResponses.forEach(lead => {
      const row = [
        this.escapeCsv(lead.name),
        lead.phone,
        this.escapeCsv(lead.message),
        lead.dateReceived,
        lead.responseType,
        this.escapeCsv(lead.address),
        this.escapeCsv(lead.propertyType),
        lead.squareFeet || '',
        lead.estimatedValue || '',
        this.escapeCsv(lead.zoning),
        this.escapeCsv(lead.propertyClass),
        lead.needsAddressVerification ? 'YES' : 'NO',
        lead.hasPropertyData ? 'YES' : 'NO',
        lead.needsAddressVerification ? 'REQUIRED' : 'OPTIONAL'
      ].join(',');
      
      masterContent.push(row);
    });

    await fs.writeFile(masterFileName, masterContent.join('\n'), 'utf-8');
    console.log(`✅ Created: ${masterFileName} (${this.august5thResponses.length.toLocaleString()} total leads)\n`);

    // Create address verification priority file
    const addressVerificationLeads = this.august5thResponses.filter(lead => lead.needsAddressVerification);
    const verificationFileName = 'August-5th-ADDRESS-VERIFICATION-PRIORITY-2025-11-12.csv';
    const verificationContent = [
      'Full_Name,Phone_Number,Message,Response_Type,Priority_Score,AI_Lookup_Instructions'
    ];

    addressVerificationLeads
      .sort((a, b) => {
        // Prioritize HOT > WARM > COLD for address lookup
        const priority = { 'HOT': 4, 'WARM': 3, 'COLD': 2, 'OPT_OUT': 1 };
        return (priority[b.responseType] || 0) - (priority[a.responseType] || 0);
      })
      .forEach(lead => {
        const priority = { 'HOT': 4, 'WARM': 3, 'COLD': 2, 'OPT_OUT': 1 }[lead.responseType] || 1;
        const instructions = lead.responseType === 'HOT' ? 'URGENT - Lookup property address and type immediately' :
                           lead.responseType === 'WARM' ? 'HIGH - Verify property details and commercial potential' :
                           'STANDARD - Basic address and property type verification';
        
        const row = [
          this.escapeCsv(lead.name),
          lead.phone,
          this.escapeCsv(lead.message.substring(0, 100) + '...'),
          lead.responseType,
          priority,
          instructions
        ].join(',');
        
        verificationContent.push(row);
      });

    await fs.writeFile(verificationFileName, verificationContent.join('\n'), 'utf-8');
    console.log(`🔍 Created: ${verificationFileName} (${addressVerificationLeads.length.toLocaleString()} need AI address lookup)\n`);
  }

  showSamples() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('     SAMPLE AUGUST 5TH+ COMMERCIAL LEADS PREVIEW      ');
    console.log('═══════════════════════════════════════════════════════');

    // Show HOT leads first (highest priority)
    if (this.hotLeads.length > 0) {
      console.log('🔥 TOP HOT LEADS (Call Immediately):');
      this.hotLeads.slice(0, 5).forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.name} (${lead.phone})`);
        console.log(`   💬 "${lead.message.substring(0, 60)}${lead.message.length > 60 ? '...' : ''}"`);
        console.log(`   📅 ${lead.dateReceived}`);
        console.log(`   🏠 ${lead.address}`);
        console.log(`   🔍 Address Verification: ${lead.needsAddressVerification ? 'REQUIRED' : 'Complete'}`);
        console.log('');
      });
    }

    // Show WARM leads
    if (this.warmLeads.length > 0) {
      console.log('🔶 TOP WARM LEADS (High Priority):');
      this.warmLeads.slice(0, 3).forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.name} (${lead.phone})`);
        console.log(`   💬 "${lead.message.substring(0, 60)}${lead.message.length > 60 ? '...' : ''}"`);
        console.log(`   📅 ${lead.dateReceived}`);
        console.log(`   🏠 ${lead.address}`);
        console.log(`   🔍 Address Verification: ${lead.needsAddressVerification ? 'REQUIRED' : 'Complete'}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('               NEXT STEPS FOR AI PROCESSING            ');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. 📤 Upload the CSV files to your AI system');
    console.log('2. 🔍 Run address verification on leads marked "REQUIRED"');
    console.log('3. 🏢 Classify property types (Commercial vs SFH)');
    console.log('4. 📊 Prioritize by: HOT > WARM > COLD > OPT-OUT');
    console.log('5. ☎️  Begin calling HOT leads immediately');
    console.log('═══════════════════════════════════════════════════════\n');

    // Summary statistics
    const totalWithAddress = this.august5thResponses.filter(l => !l.needsAddressVerification).length;
    const totalNeedAddress = this.august5thResponses.filter(l => l.needsAddressVerification).length;
    
    console.log('📊 FINAL SUMMARY:');
    console.log(`• Total August 5th+ Leads: ${this.august5thResponses.length.toLocaleString()}`);
    console.log(`• Have Address Data: ${totalWithAddress.toLocaleString()} (${(totalWithAddress/this.august5thResponses.length*100).toFixed(1)}%)`);
    console.log(`• Need AI Address Lookup: ${totalNeedAddress.toLocaleString()} (${(totalNeedAddress/this.august5thResponses.length*100).toFixed(1)}%)`);
    console.log(`• Ready to Call (HOT): ${this.hotLeads.length.toLocaleString()}`);
    console.log(`• Follow-up Priority (WARM): ${this.warmLeads.length.toLocaleString()}`);
  }

  classifyResponse(message) {
    if (!message) return 'COLD';
    
    const msg = message.toLowerCase();
    
    // OPT-OUT patterns (highest priority to identify)
    const optOutPatterns = [
      /stop/i, /unsubscribe/i, /remove/i, /opt[\s-]?out/i, /no[\s]?more/i,
      /don[''']?t[\s]?(text|contact|call)/i, /leave[\s]?me[\s]?alone/i,
      /not[\s]?interested/i, /never[\s]?contact/i, /block/i, /spam/i
    ];
    
    if (optOutPatterns.some(pattern => pattern.test(msg))) {
      return 'OPT_OUT';
    }
    
    // HOT patterns (very interested, ready to move)
    const hotPatterns = [
      /make[\s]?(me[\s]?)?an?[\s]?offer/i, /what[\s]?(?:can[\s]?you|will[\s]?you)[\s]?(?:offer|pay)/i,
      /how[\s]?much/i, /cash[\s]?offer/i, /interested/i, /yes[\s]?please/i,
      /tell[\s]?me[\s]?more/i, /call[\s]?me/i, /when[\s]?can[\s]?you/i,
      /let[''']?s[\s]?talk/i, /ready[\s]?to[\s]?sell/i, /need[\s]?to[\s]?sell/i,
      /asap/i, /urgent/i, /quickly/i, /fast/i, /soon/i
    ];
    
    if (hotPatterns.some(pattern => pattern.test(msg))) {
      return 'HOT';
    }
    
    // WARM patterns (some interest, needs nurturing)
    const warmPatterns = [
      /maybe/i, /possibly/i, /might[\s]?be/i, /could[\s]?be/i, /thinking[\s]?about/i,
      /considering/i, /in[\s]?the[\s]?future/i, /not[\s]?right[\s]?now/i,
      /more[\s]?info/i, /send[\s]?me/i, /email[\s]?me/i, /text[\s]?me/i,
      /what[\s]?(?:do[\s]?you|are[\s]?you)/i, /tell[\s]?me/i
    ];
    
    if (warmPatterns.some(pattern => pattern.test(msg))) {
      return 'WARM';
    }
    
    // Default to COLD for other responses
    return 'COLD';
  }

  parseMessageDate(dateStr) {
    if (!dateStr) return null;
    
    // Try multiple date formats - prioritize the actual format used: MM-DD-YYYY HH:MM AM/PM
    const formats = [
      // MM-DD-YYYY HH:MM AM/PM (actual format in data)
      /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i,
      // MM/DD/YYYY HH:MM:SS AM/PM
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) { // MM-DD-YYYY HH:MM AM/PM
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else if (format === formats[1]) { // MM/DD/YYYY HH:MM:SS AM/PM
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else if (format === formats[2]) { // MM/DD/YYYY
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else { // YYYY-MM-DD
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        }
        
        return new Date(year, month, day);
      }
    }
    
    // Fallback to Date.parse
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? null : new Date(parsed);
  }

  escapeCsv(str) {
    if (!str) return '';
    const stringValue = str.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

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
}

// Run the analysis
async function main() {
  const analyzer = new August5thCommercialAnalyzer();
  await analyzer.analyzeAugust5thResponses();
}

main().catch(console.error);