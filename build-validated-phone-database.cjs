#!/usr/bin/env node
/**
 * VALIDATED PHONE DATABASE BUILDER
 * 
 * Extracts only phone numbers that successfully received messages
 * Based on EZ Texting delivery status reports
 */

const fs = require('fs');
const { parse } = require('csv-parse');

console.log('📱 BUILDING VALIDATED PHONE DATABASE FROM SENT MESSAGES...\n');

class ValidatedPhoneDatabase {
  constructor() {
    this.validatedPhones = new Set();
    this.deliveryStats = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      replied: 0,
      optedOut: 0
    };
  }

  async buildFromSentMessages() {
    console.log('📊 Processing sent messages reports...');
    
    // Load both sent message files
    const files = [
      '../sent_messages_detailed_657f63772503000_dbc00a88-e44f-4535-8ede-e9874fa2004e (all) 11-11-25.csv',
      '../sent_messages_657f63772503000_dd9cfcc0-f9ae-449b-a5ed-9fa260ea1475 (all) 11-11-25.csv'
    ];

    for (const file of files) {
      if (fs.existsSync(file)) {
        await this.processSentMessagesFile(file);
      } else {
        console.log(`   ⚠️ File not found: ${file}`);
      }
    }

    this.generateValidatedDatabase();
    this.showDeliveryStats();
    return this.validatedPhones;
  }

  async processSentMessagesFile(filename) {
    console.log(`   📁 Processing: ${filename}`);
    
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filename)
        .pipe(parse({ columns: true, skip_empty_lines: true }))
        .on('data', (row) => {
          this.deliveryStats.total++;
          
          const phone = this.normalizePhone(row['Phone Number']);
          const deliveryStatus = row['Delivery Status'] || '';
          const replied = row['Replied?'] === 'Yes';
          const optedOut = row['Opted Out?'] === 'Yes';

          // Track statistics
          if (deliveryStatus.includes('Delivered')) {
            this.deliveryStats.delivered++;
            
            // Only add successfully delivered numbers
            if (phone) {
              this.validatedPhones.add(phone);
            }
          } else if (deliveryStatus.includes('Failed')) {
            this.deliveryStats.failed++;
          } else if (deliveryStatus.includes('Pending')) {
            this.deliveryStats.pending++;
          }

          if (replied) this.deliveryStats.replied++;
          if (optedOut) this.deliveryStats.optedOut++;
        })
        .on('end', () => {
          console.log(`      ✅ Processed ${this.deliveryStats.total} sent messages`);
          resolve();
        })
        .on('error', (err) => {
          console.log(`      ⚠️ Error processing file: ${err.message}`);
          resolve(); // Continue with other files
        });
    });
  }

  generateValidatedDatabase() {
    console.log('\n📋 GENERATING VALIDATED PHONE DATABASE...');
    
    const validatedArray = Array.from(this.validatedPhones).sort();
    
    // Create CSV with validated phones
    const csvContent = 'Phone,ValidationSource,DeliveryConfirmed\\n' + 
      validatedArray.map(phone => `${phone},EZ-Texting-Sent-Messages,Yes`).join('\\n');
    
    const filename = 'validated-phone-database.csv';
    fs.writeFileSync(filename, csvContent);
    
    console.log(`   ✅ Created: ${filename}`);
    console.log(`   📱 Validated phones: ${validatedArray.length}`);
    
    // Create JSON version for fast lookup
    const jsonContent = {
      validatedPhones: validatedArray,
      generatedAt: new Date().toISOString(),
      source: 'EZ-Texting-Delivery-Reports',
      totalValidated: validatedArray.length
    };
    
    fs.writeFileSync('validated-phone-database.json', JSON.stringify(jsonContent, null, 2));
    console.log(`   ✅ Created: validated-phone-database.json (for fast lookup)`);
  }

  showDeliveryStats() {
    console.log('\\n📊 DELIVERY STATISTICS:');
    console.log(`   📤 Total messages sent: ${this.deliveryStats.total}`);
    console.log(`   ✅ Successfully delivered: ${this.deliveryStats.delivered} (${((this.deliveryStats.delivered/this.deliveryStats.total)*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed delivery: ${this.deliveryStats.failed} (${((this.deliveryStats.failed/this.deliveryStats.total)*100).toFixed(1)}%)`);
    console.log(`   ⏳ Pending: ${this.deliveryStats.pending}`);
    console.log(`   💬 Got replies: ${this.deliveryStats.replied} (${((this.deliveryStats.replied/this.deliveryStats.delivered)*100).toFixed(1)}% response rate)`);
    console.log(`   🚫 Opted out: ${this.deliveryStats.optedOut}`);
    
    console.log('\\n🎯 QUALITY METRICS:');
    console.log(`   📱 Unique validated phones: ${this.validatedPhones.size}`);
    console.log(`   📈 Delivery success rate: ${((this.deliveryStats.delivered/this.deliveryStats.total)*100).toFixed(1)}%`);
    console.log(`   💬 Response rate: ${((this.deliveryStats.replied/this.deliveryStats.delivered)*100).toFixed(1)}%`);
  }

  normalizePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/\\D/g, '');
    if (cleaned.length === 10) return '1' + cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return cleaned;
    return null;
  }
}

// Run the database builder
async function main() {
  const builder = new ValidatedPhoneDatabase();
  await builder.buildFromSentMessages();
  
  console.log('\\n🎊 VALIDATED PHONE DATABASE COMPLETE!');
  console.log('\\n💡 USAGE:');
  console.log('   • Only text numbers that successfully received messages');
  console.log('   • Avoid failed/invalid numbers automatically');  
  console.log('   • Improve delivery rates and reduce waste');
  console.log('   • Focus budget on working phone numbers');
  console.log('\\n🚀 Ready to integrate with SMS Intelligence System!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}