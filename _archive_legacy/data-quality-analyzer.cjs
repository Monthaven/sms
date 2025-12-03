/**
 * DATA QUALITY ANALYSIS - Lead Classification Confidence Report
 * 
 * Analyzes how many SMS responses have Deal Machine property data
 * and confidence levels in SFH vs Commercial classification
 */

const fs = require('fs').promises;

class DataQualityAnalyzer {
  constructor() {
    this.totalResponses = 0;
    this.responsesWithPropertyData = 0;
    this.responsesWithoutPropertyData = 0;
    this.commercialLeads = 0;
    this.sfhLeads = 0;
    this.confidenceLevels = {
      high: 0,    // 85%+
      medium: 0,  // 70-84%
      low: 0      // <70%
    };
  }

  async analyzeDataQuality() {
    console.log('\n🔍 DATA QUALITY ANALYSIS REPORT\n');
    console.log('Analyzing SMS responses vs Deal Machine property data matching...\n');

    // Load SMS responses
    const responsesPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Incoming Messages Report-1762879212472 (all) 11-11-25.csv';
    const responses = await this.parseCSV(responsesPath);
    
    // Load property data 
    const propertyPath = 'C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms\\Combined Deal Machine - Combined Deal Machine.csv';
    const properties = await this.parseCSV(propertyPath);
    
    console.log(`📊 Total SMS Responses: ${responses.length}`);
    console.log(`🏠 Total Deal Machine Properties: ${properties.length}\n`);

    // Create phone number lookup
    const phoneToProperty = new Map();
    let totalPhoneNumbers = 0;
    
    properties.forEach(prop => {
      // Check all contact phone numbers in Deal Machine data
      for (let i = 1; i <= 18; i++) {
        const phone1 = prop[`contact_${i}_phone1`];
        const phone2 = prop[`contact_${i}_phone2`];
        const phone3 = prop[`contact_${i}_phone3`];
        
        [phone1, phone2, phone3].forEach(phone => {
          if (phone && phone.length > 5) {
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
              phoneToProperty.set(cleanPhone, prop);
              totalPhoneNumbers++;
            }
          }
        });
      }
    });
    
    console.log(`📞 Total Phone Numbers in Deal Machine: ${totalPhoneNumbers.toLocaleString()}`);
    console.log(`🔗 Unique Phone-to-Property Mappings: ${phoneToProperty.size.toLocaleString()}\n`);

    // Analyze each SMS response
    let matchedResponses = 0;
    let unmatchedResponses = 0;
    let commercialMatches = 0;
    let sfhMatches = 0;
    let responsesByConfidence = { high: 0, medium: 0, low: 0 };
    
    const sampleMatched = [];
    const sampleUnmatched = [];

    responses.forEach(response => {
      const phoneNumber = response['Phone Number']?.replace(/\D/g, '') || '';
      const message = response['Actual Message'] || '';
      const fullName = response['Full Name'] || '';
      
      if (!phoneNumber || phoneNumber.length < 10) return;
      
      this.totalResponses++;
      
      // Check if we have property data for this phone number
      const property = phoneToProperty.get(phoneNumber);
      
      if (property) {
        matchedResponses++;
        this.responsesWithPropertyData++;
        
        // Analyze property type confidence
        const propertyType = this.determinePropertyType(
          property.property_type,
          property.building_square_feet, 
          property.property_class,
          property.zoning,
          property.owner_1_name
        );
        
        if (propertyType.category === 'COMMERCIAL') {
          commercialMatches++;
        } else {
          sfhMatches++;
        }
        
        // Track confidence levels
        if (propertyType.confidence >= 85) {
          responsesByConfidence.high++;
        } else if (propertyType.confidence >= 70) {
          responsesByConfidence.medium++;
        } else {
          responsesByConfidence.low++;
        }
        
        // Collect samples
        if (sampleMatched.length < 10) {
          sampleMatched.push({
            name: fullName,
            phone: phoneNumber,
            message: message.substring(0, 50) + '...',
            address: property.property_address_full || 'Address Available',
            propertyType: propertyType.category,
            confidence: propertyType.confidence,
            value: property.estimated_value || 'N/A',
            sqft: property.building_square_feet || 'N/A'
          });
        }
        
      } else {
        unmatchedResponses++;
        this.responsesWithoutPropertyData++;
        
        // Collect unmatched samples
        if (sampleUnmatched.length < 10) {
          sampleUnmatched.push({
            name: fullName,
            phone: phoneNumber,
            message: message.substring(0, 50) + '...'
          });
        }
      }
    });

    // Generate detailed report
    this.generateDetailedReport(
      matchedResponses, 
      unmatchedResponses, 
      commercialMatches, 
      sfhMatches, 
      responsesByConfidence,
      sampleMatched,
      sampleUnmatched
    );
  }

  generateDetailedReport(matched, unmatched, commercial, sfh, confidence, sampleMatched, sampleUnmatched) {
    const totalProcessed = matched + unmatched;
    const matchRate = (matched / totalProcessed * 100).toFixed(1);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('              DATA QUALITY SUMMARY                     ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Total SMS Responses Analyzed: ${totalProcessed.toLocaleString()}`);
    console.log(`✅ With Deal Machine Data: ${matched.toLocaleString()} (${matchRate}%)`);
    console.log(`❌ Without Property Data: ${unmatched.toLocaleString()} (${(100-matchRate).toFixed(1)}%)`);
    console.log('\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('           PROPERTY TYPE CLASSIFICATION                ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🏢 Commercial Properties: ${commercial.toLocaleString()} (${(commercial/matched*100).toFixed(1)}%)`);
    console.log(`🏠 Single Family Homes: ${sfh.toLocaleString()} (${(sfh/matched*100).toFixed(1)}%)`);
    console.log('\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('            CLASSIFICATION CONFIDENCE                  ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🎯 HIGH Confidence (85%+): ${confidence.high.toLocaleString()} (${(confidence.high/matched*100).toFixed(1)}%)`);
    console.log(`🔶 MEDIUM Confidence (70-84%): ${confidence.medium.toLocaleString()} (${(confidence.medium/matched*100).toFixed(1)}%)`);
    console.log(`⚠️  LOW Confidence (<70%): ${confidence.low.toLocaleString()} (${(confidence.low/matched*100).toFixed(1)}%)`);
    console.log('\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('        SAMPLE RESPONSES WITH PROPERTY DATA           ');
    console.log('═══════════════════════════════════════════════════════');
    sampleMatched.forEach((sample, index) => {
      console.log(`${index + 1}. ${sample.name} (${sample.phone})`);
      console.log(`   💬 "${sample.message}"`);
      console.log(`   🏠 ${sample.address}`);
      console.log(`   📊 ${sample.propertyType} (${sample.confidence}% confidence)`);
      console.log(`   💰 ${sample.value} | ${sample.sqft} sq ft`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('       SAMPLE RESPONSES WITHOUT PROPERTY DATA         ');
    console.log('═══════════════════════════════════════════════════════');
    sampleUnmatched.slice(0, 5).forEach((sample, index) => {
      console.log(`${index + 1}. ${sample.name} (${sample.phone})`);
      console.log(`   💬 "${sample.message}"`);
      console.log(`   ❌ No Deal Machine property data found`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('                  KEY INSIGHTS                         ');
    console.log('═══════════════════════════════════════════════════════');
    
    if (matchRate >= 80) {
      console.log('🎉 EXCELLENT: Very high data match rate!');
    } else if (matchRate >= 60) {
      console.log('✅ GOOD: Solid data match rate');
    } else if (matchRate >= 40) {
      console.log('⚠️  MODERATE: Room for improvement in data matching');
    } else {
      console.log('🔴 LOW: Significant data gaps - consider data source optimization');
    }

    const highConfidenceRate = (confidence.high / matched * 100).toFixed(1);
    if (highConfidenceRate >= 80) {
      console.log('🎯 Classification confidence is VERY HIGH');
    } else if (highConfidenceRate >= 60) {
      console.log('🔶 Classification confidence is GOOD');
    } else {
      console.log('⚠️  Classification confidence needs improvement');
    }

    console.log('\n📝 RECOMMENDATIONS:');
    if (matchRate < 70) {
      console.log('• Consider expanding Deal Machine data coverage');
      console.log('• Cross-reference with additional property databases');
    }
    
    if (confidence.low > matched * 0.3) {
      console.log('• Enhance property classification rules');
      console.log('• Add manual review process for low-confidence leads');
    }
    
    console.log('• Focus calling efforts on high-confidence matches first');
    console.log('• Use unmatched responses for lead qualification calls');
    console.log('═══════════════════════════════════════════════════════\n');
  }

  // Property type determination logic (same as classifier)
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

  // CSV parsing utility
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
  const analyzer = new DataQualityAnalyzer();
  await analyzer.analyzeDataQuality();
}

main().catch(console.error);