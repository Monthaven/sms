const fs = require('fs');

console.log('🔍 Analyzing EZ Texting Response Data...\n');

// Read the CSV file
const data = fs.readFileSync('../Incoming Messages Report-1762877906971.csv', 'utf-8');
const lines = data.split('\n').slice(1).filter(line => line.trim());

console.log('📊 RESPONSE OVERVIEW');
console.log('===================');
console.log('Total responses:', lines.length);

// Parse responses and categorize
let hotLeads = [];
let warmLeads = [];
let pricingDiscussions = [];
let commercialProperties = [];
let optOuts = [];

lines.forEach(line => {
    const parts = line.split(',');
    const phone = parts[0];
    const name = (parts[2] || '').replace(/"/g, '');
    const message = (parts[3] || '').replace(/"/g, '');
    const isOptOut = line.includes(',Y');
    
    if (isOptOut) {
        optOuts.push({ phone, name, message });
        return;
    }
    
    const msg = message.toLowerCase();
    
    // Hot leads - explicit interest
    if (msg.includes('make') && msg.includes('offer') ||
        msg.includes('give') && msg.includes('offer') ||
        msg.includes('send') && msg.includes('offer') ||
        msg.includes('call me') ||
        (msg.includes('yes') && msg.includes('open')) ||
        msg.includes('accepting offers')) {
        hotLeads.push({ phone, name, message });
    }
    // Warm leads - moderate interest
    else if (msg.includes('maybe') || 
             msg.includes('depends') ||
             msg.includes('might') ||
             msg.includes('how much') ||
             (msg.includes('what') && msg.includes('offering'))) {
        warmLeads.push({ phone, name, message });
    }
    
    // Pricing discussions
    if (msg.includes('million') || 
        msg.includes('price is') ||
        /\$[\d,]+/.test(message)) {
        pricingDiscussions.push({ phone, name, message });
    }
    
    // Commercial properties
    if (msg.includes('hotel') ||
        msg.includes('office') ||
        msg.includes('retail') ||
        msg.includes('apartment') ||
        msg.includes('units') ||
        msg.includes('warehouse') ||
        msg.includes('commercial') ||
        msg.includes('acres')) {
        commercialProperties.push({ phone, name, message });
    }
});

// Results
console.log('\n🔥 HOT LEADS (Call NOW):');
console.log('Count:', hotLeads.length);
console.log('Percentage:', ((hotLeads.length / lines.length) * 100).toFixed(1) + '%');

console.log('\n🟡 WARM LEADS (Call within 24-48h):');
console.log('Count:', warmLeads.length);
console.log('Percentage:', ((warmLeads.length / lines.length) * 100).toFixed(1) + '%');

console.log('\n💰 PRICING DISCUSSIONS:');
console.log('Count:', pricingDiscussions.length);
console.log('Percentage:', ((pricingDiscussions.length / lines.length) * 100).toFixed(1) + '%');

console.log('\n🏢 COMMERCIAL PROPERTIES:');
console.log('Count:', commercialProperties.length);
console.log('Percentage:', ((commercialProperties.length / lines.length) * 100).toFixed(1) + '%');

console.log('\n🚫 OPT-OUTS:');
console.log('Count:', optOuts.length);
console.log('Percentage:', ((optOuts.length / lines.length) * 100).toFixed(1) + '%');

console.log('\n📈 PERFORMANCE METRICS:');
console.log('Response rate (est 40k sent):', ((lines.length / 40000) * 100).toFixed(2) + '%');
console.log('Quality leads (hot+warm):', (((hotLeads.length + warmLeads.length) / lines.length) * 100).toFixed(1) + '%');

console.log('\n🎯 TOP 10 HOT LEADS - CALL IMMEDIATELY:');
console.log('=====================================');
hotLeads.slice(0, 10).forEach((lead, i) => {
    console.log(`${i+1}. ${lead.name} (${lead.phone})`);
    console.log(`   "${lead.message.substring(0, 80)}..."`);
    console.log('');
});

console.log('\n💎 HIGH-VALUE PRICING DISCUSSIONS:');
console.log('==================================');
pricingDiscussions.slice(0, 10).forEach((lead, i) => {
    console.log(`${i+1}. ${lead.name} (${lead.phone})`);
    console.log(`   "${lead.message.substring(0, 80)}..."`);
    console.log('');
});

console.log('\n✅ Analysis complete! This is your foundation data to avoid double-texting.');
console.log('Next step: Import this to Notion as your "Already Contacted" database.');