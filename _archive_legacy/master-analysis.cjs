const fs = require('fs');

console.log('🔍 COMPREHENSIVE EZ TEXTING DATA ANALYSIS');
console.log('========================================');
console.log('Merging and analyzing ALL CSV files from parent folder...\n');

// File paths in parent directory
const csvFiles = [
    '../contact_reports_657f63772503000_ce5340fc-1c2a-4c9d-8fd8-d1225bfe286c (all) 11-25.csv',
    '../Incoming Messages Report-1762877906971 8-5 to 11-11-25.csv', 
    '../Incoming Messages Report-1762879212472 (all) 11-11-25.csv',
    '../sent_messages_657f63772503000_dd9cfcc0-f9ae-449b-a5ed-9fa260ea1475 (all) 11-11-25.csv',
    '../sent_messages_detailed_657f63772503000_dbc00a88-e44f-4535-8ede-e9874fa2004e (all) 11-11-25.csv'
];

let allContacts = new Map(); // Use Map to dedupe by phone number
let totalResponses = 0;
let totalSent = 0;
let hotLeads = [];
let warmLeads = [];
let pricingDiscussions = [];
let commercialProperties = [];
let optOuts = [];
let bounces = [];

// Process each CSV file
csvFiles.forEach((filePath, index) => {
    console.log(`📄 Processing file ${index + 1}/5: ${filePath.split('/').pop()}`);
    
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️ File not found, skipping...`);
            return;
        }

        const data = fs.readFileSync(filePath, 'utf-8');
        const lines = data.split('\n');
        
        if (lines.length < 2) {
            console.log(`   ⚠️ Empty or invalid file, skipping...`);
            return;
        }

        const headers = lines[0].toLowerCase();
        const dataLines = lines.slice(1).filter(line => line.trim());
        
        console.log(`   📊 Found ${dataLines.length} records`);

        // Process based on file type
        if (filePath.includes('Incoming Messages')) {
            // Response data
            totalResponses += dataLines.length;
            
            dataLines.forEach(line => {
                const parts = line.split(',');
                if (parts.length < 4) return;
                
                const phone = parts[0]?.replace(/"/g, '').trim();
                const name = parts[2]?.replace(/"/g, '').trim();
                const message = parts[3]?.replace(/"/g, '').trim();
                const dateStr = parts[5]?.replace(/"/g, '').trim();
                const isOptOut = line.includes(',Y');
                
                if (!phone || phone.length < 10) return;
                
                // Store in master contact list
                const contactKey = phone;
                if (!allContacts.has(contactKey)) {
                    allContacts.set(contactKey, {
                        phone: phone,
                        name: name,
                        messages: [],
                        isOptOut: false,
                        responseType: 'COLD',
                        propertyType: 'Unknown',
                        valueDiscussed: null,
                        lastContact: null
                    });
                }
                
                const contact = allContacts.get(contactKey);
                contact.messages.push({
                    message: message,
                    date: dateStr,
                    type: 'RESPONSE'
                });
                
                if (isOptOut) contact.isOptOut = true;
                
                // Categorize response
                const msg = message.toLowerCase();
                
                // Hot leads - explicit interest
                if (msg.includes('make') && msg.includes('offer') ||
                    msg.includes('give') && msg.includes('offer') ||
                    msg.includes('send') && msg.includes('offer') ||
                    msg.includes('call me') ||
                    (msg.includes('yes') && msg.includes('open')) ||
                    msg.includes('accepting offers')) {
                    contact.responseType = 'HOT';
                    hotLeads.push(contact);
                }
                // Warm leads - moderate interest
                else if (msg.includes('maybe') || 
                         msg.includes('depends') ||
                         msg.includes('might') ||
                         msg.includes('how much') ||
                         (msg.includes('what') && msg.includes('offering'))) {
                    if (contact.responseType !== 'HOT') {
                        contact.responseType = 'WARM';
                        warmLeads.push(contact);
                    }
                }
                
                // Pricing discussions
                const priceMatch = message.match(/\$?([\d,]+(?:\.\d+)?)\s*(?:million|mil|k|thousand)/i);
                if (priceMatch || msg.includes('price is') || msg.includes('asking')) {
                    let value = null;
                    if (priceMatch) {
                        const amount = parseFloat(priceMatch[1].replace(/,/g, ''));
                        if (msg.includes('million') || msg.includes('mil')) {
                            value = amount * 1000000;
                        } else if (msg.includes('k') || msg.includes('thousand')) {
                            value = amount * 1000;
                        }
                    }
                    contact.valueDiscussed = value;
                    pricingDiscussions.push(contact);
                }
                
                // Commercial property indicators
                if (msg.includes('hotel') || msg.includes('office') || msg.includes('retail') ||
                    msg.includes('apartment') || msg.includes('units') || msg.includes('warehouse') ||
                    msg.includes('commercial') || msg.includes('acres') || msg.includes('suites') ||
                    msg.includes('plaza') || msg.includes('building')) {
                    contact.propertyType = 'Commercial';
                    commercialProperties.push(contact);
                } else if (msg.includes('house') || msg.includes('home') || msg.includes('residential')) {
                    contact.propertyType = 'Single Family';
                }
                
                if (isOptOut) optOuts.push(contact);
            });
            
        } else if (filePath.includes('sent_messages')) {
            // Sent message data
            totalSent += dataLines.length;
            
            dataLines.forEach(line => {
                const parts = line.split(',');
                if (parts.length < 3) return;
                
                const phone = parts[0]?.replace(/"/g, '').trim();
                const message = parts[1]?.replace(/"/g, '').trim();
                const status = parts[2]?.replace(/"/g, '').trim();
                
                if (!phone || phone.length < 10) return;
                
                // Track bounces and delivery issues
                if (status && (status.includes('bounce') || status.includes('failed') || 
                              status.includes('invalid') || status.includes('landline'))) {
                    bounces.push({
                        phone: phone,
                        status: status,
                        message: message
                    });
                }
                
                // Add to master contact list
                const contactKey = phone;
                if (!allContacts.has(contactKey)) {
                    allContacts.set(contactKey, {
                        phone: phone,
                        name: 'Unknown',
                        messages: [],
                        isOptOut: false,
                        responseType: 'COLD',
                        propertyType: 'Unknown',
                        valueDiscussed: null,
                        lastContact: null
                    });
                }
                
                const contact = allContacts.get(contactKey);
                contact.messages.push({
                    message: message,
                    status: status,
                    type: 'SENT'
                });
            });
        }
        
    } catch (error) {
        console.log(`   ❌ Error processing file: ${error.message}`);
    }
});

// Dedupe and clean up arrays
hotLeads = [...new Map(hotLeads.map(lead => [lead.phone, lead])).values()];
warmLeads = [...new Map(warmLeads.map(lead => [lead.phone, lead])).values()];
pricingDiscussions = [...new Map(pricingDiscussions.map(lead => [lead.phone, lead])).values()];
commercialProperties = [...new Map(commercialProperties.map(lead => [lead.phone, lead])).values()];
optOuts = [...new Map(optOuts.map(lead => [lead.phone, lead])).values()];

console.log('\n🎯 COMPREHENSIVE ANALYSIS RESULTS');
console.log('================================');
console.log(`📞 Total unique contacts: ${allContacts.size.toLocaleString()}`);
console.log(`📤 Total messages sent: ${totalSent.toLocaleString()}`);
console.log(`📥 Total responses received: ${totalResponses.toLocaleString()}`);

if (totalSent > 0) {
    console.log(`📈 Overall response rate: ${((totalResponses / totalSent) * 100).toFixed(2)}%`);
}

console.log('\n🔥 HOT LEADS (Ready to call NOW):');
console.log(`Count: ${hotLeads.length}`);
if (totalResponses > 0) {
    console.log(`Percentage of responses: ${((hotLeads.length / totalResponses) * 100).toFixed(1)}%`);
}

console.log('\n🟡 WARM LEADS (Call within 24-48h):');
console.log(`Count: ${warmLeads.length}`);
if (totalResponses > 0) {
    console.log(`Percentage of responses: ${((warmLeads.length / totalResponses) * 100).toFixed(1)}%`);
}

console.log('\n💰 PRICING DISCUSSIONS:');
console.log(`Count: ${pricingDiscussions.length}`);
const totalValue = pricingDiscussions
    .filter(p => p.valueDiscussed)
    .reduce((sum, p) => sum + p.valueDiscussed, 0);
if (totalValue > 0) {
    console.log(`Total value discussed: $${(totalValue / 1000000).toFixed(1)}M`);
}

console.log('\n🏢 COMMERCIAL PROPERTIES:');
console.log(`Count: ${commercialProperties.length}`);

console.log('\n🚫 OPT-OUTS:');
console.log(`Count: ${optOuts.length}`);
if (totalResponses > 0) {
    console.log(`Opt-out rate: ${((optOuts.length / totalResponses) * 100).toFixed(1)}%`);
}

console.log('\n📉 BOUNCES & DELIVERY ISSUES:');
console.log(`Count: ${bounces.length}`);

// Property type breakdown
const propertyTypes = {};
Array.from(allContacts.values()).forEach(contact => {
    const type = contact.propertyType;
    propertyTypes[type] = (propertyTypes[type] || 0) + 1;
});

console.log('\n🏠 PROPERTY TYPE BREAKDOWN:');
Object.entries(propertyTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
        console.log(`${type}: ${count.toLocaleString()} (${((count / allContacts.size) * 100).toFixed(1)}%)`);
    });

console.log('\n🎯 TOP 15 HOT LEADS - CALL TODAY:');
console.log('===============================');
hotLeads.slice(0, 15).forEach((lead, i) => {
    const latestMessage = lead.messages[lead.messages.length - 1];
    const value = lead.valueDiscussed ? ` [${lead.valueDiscussed >= 1000000 ? '$' + (lead.valueDiscussed/1000000).toFixed(1) + 'M' : '$' + (lead.valueDiscussed/1000).toFixed(0) + 'k'}]` : '';
    console.log(`${i+1}. ${lead.name} (${lead.phone}) ${lead.propertyType}${value}`);
    console.log(`   "${latestMessage.message.substring(0, 100)}..."`);
    console.log('');
});

console.log('\n💎 HIGH-VALUE PRICING DISCUSSIONS (Top 10):');
console.log('===========================================');
pricingDiscussions
    .filter(p => p.valueDiscussed)
    .sort((a, b) => (b.valueDiscussed || 0) - (a.valueDiscussed || 0))
    .slice(0, 10)
    .forEach((lead, i) => {
        const value = lead.valueDiscussed >= 1000000 ? 
            '$' + (lead.valueDiscussed/1000000).toFixed(1) + 'M' : 
            '$' + (lead.valueDiscussed/1000).toFixed(0) + 'k';
        const latestMessage = lead.messages[lead.messages.length - 1];
        console.log(`${i+1}. ${lead.name} (${lead.phone}) - ${value}`);
        console.log(`   "${latestMessage.message.substring(0, 80)}..."`);
        console.log('');
    });

// Generate CSV for Notion import
console.log('\n📊 GENERATING NOTION IMPORT CSV...');
const csvHeaders = 'Phone,Name,PropertyType,ResponseType,LastMessage,ValueDiscussed,IsOptOut,MessageCount,Source\n';
const csvData = Array.from(allContacts.values()).map(contact => {
    const lastMsg = contact.messages[contact.messages.length - 1];
    const message = lastMsg ? lastMsg.message.replace(/"/g, '""') : '';
    const value = contact.valueDiscussed || '';
    return `"${contact.phone}","${contact.name}","${contact.propertyType}","${contact.responseType}","${message}","${value}","${contact.isOptOut}","${contact.messages.length}","EZ_Texting_Historical"`;
}).join('\n');

fs.writeFileSync('./notion-import-master.csv', csvHeaders + csvData);
console.log('✅ Saved: notion-import-master.csv');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Import notion-import-master.csv to Notion');
console.log('2. Call the 21+ hot leads immediately');
console.log('3. Follow up on high-value pricing discussions');
console.log('4. Use this as your "do not double-text" master list');
console.log(`5. You now have ${allContacts.size.toLocaleString()} contacts in your foundation database!`);

console.log('\n✅ COMPREHENSIVE ANALYSIS COMPLETE!');