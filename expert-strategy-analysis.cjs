const fs = require('fs');

console.log('🧠 EXPERT-LEVEL SMS STRATEGY ANALYSIS');
console.log('=====================================');
console.log('Solving the "Same Owner, Different Property" Challenge\n');

// Load the master data
console.log('📊 Loading master contact data...');
const masterData = fs.readFileSync('./notion-import-master.csv', 'utf-8');
const lines = masterData.split('\n').slice(1).filter(line => line.trim());

// Parse contacts
const contacts = new Map();
const propertyPatterns = new Map();
const multiOwnerDetection = new Map();

console.log(`Processing ${lines.length} contact records...\n`);

lines.forEach(line => {
    const parts = line.split('","').map(part => part.replace(/"/g, ''));
    if (parts.length < 8) return;
    
    const [phone, name, propertyType, responseType, lastMessage, valueDiscussed, isOptOut, messageCount] = parts;
    
    // Track owner names for multi-property detection
    if (name && name !== 'Unknown' && name.length > 3) {
        if (!multiOwnerDetection.has(name)) {
            multiOwnerDetection.set(name, []);
        }
        multiOwnerDetection.get(name).push({
            phone: phone,
            responseType: responseType,
            propertyType: propertyType,
            message: lastMessage,
            value: valueDiscussed
        });
    }
    
    // Store contact details
    contacts.set(phone, {
        phone,
        name,
        propertyType,
        responseType, 
        lastMessage,
        valueDiscussed: valueDiscussed ? parseFloat(valueDiscussed) : null,
        isOptOut: isOptOut === 'true',
        messageCount: parseInt(messageCount) || 1
    });
    
    // Extract property patterns from messages
    const addressMatches = lastMessage.match(/\b\d+[^,]*(?:st|street|ave|avenue|dr|drive|rd|road|blvd|boulevard|way|lane|ln|ct|court|pl|place)[^,]*/gi);
    if (addressMatches) {
        addressMatches.forEach(addr => {
            const normalizedAddr = addr.toLowerCase()
                .replace(/\bstreet\b/g, 'st')
                .replace(/\bavenue\b/g, 'ave') 
                .replace(/\bdrive\b/g, 'dr')
                .replace(/\bread\b/g, 'rd')
                .replace(/\bboulevard\b/g, 'blvd')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (!propertyPatterns.has(normalizedAddr)) {
                propertyPatterns.set(normalizedAddr, []);
            }
            propertyPatterns.get(normalizedAddr).push(phone);
        });
    }
});

// ANALYSIS 1: Multi-Property Owners (Strategic Opportunities)
console.log('🏢 MULTI-PROPERTY OWNER ANALYSIS:');
console.log('=================================');
const multiPropertyOwners = Array.from(multiOwnerDetection.entries())
    .filter(([name, properties]) => properties.length > 1)
    .sort(([,a], [,b]) => b.length - a.length);

console.log(`Found ${multiPropertyOwners.length} owners with multiple properties contacted:\n`);

multiPropertyOwners.slice(0, 10).forEach(([ownerName, properties], i) => {
    const totalValue = properties
        .map(p => parseFloat(p.value) || 0)
        .reduce((sum, val) => sum + val, 0);
    
    const responseTypes = [...new Set(properties.map(p => p.responseType))];
    const hasHotResponse = responseTypes.includes('HOT');
    
    console.log(`${i+1}. ${ownerName} - ${properties.length} properties contacted`);
    console.log(`   Response types: ${responseTypes.join(', ')}`);
    if (totalValue > 0) {
        console.log(`   Total value discussed: $${totalValue >= 1000000 ? (totalValue/1000000).toFixed(1) + 'M' : (totalValue/1000).toFixed(0) + 'k'}`);
    }
    console.log(`   Strategy: ${hasHotResponse ? '🔥 PRIORITY CALL - Already shown interest' : '📞 Relationship cultivation opportunity'}`);
    console.log('');
});

// ANALYSIS 2: Same Property, Multiple Contacts (Deduplication Needed)
console.log('\n🏠 PROPERTY DEDUPLICATION ANALYSIS:');
console.log('==================================');
const duplicateProperties = Array.from(propertyPatterns.entries())
    .filter(([address, phoneNumbers]) => phoneNumbers.length > 1)
    .sort(([,a], [,b]) => b.length - a.length);

console.log(`Found ${duplicateProperties.length} properties with multiple contact attempts:\n`);

duplicateProperties.slice(0, 10).forEach(([address, phoneNumbers], i) => {
    console.log(`${i+1}. ${address}`);
    console.log(`   Contacted ${phoneNumbers.length} different numbers:`);
    
    phoneNumbers.forEach(phone => {
        const contact = contacts.get(phone);
        if (contact) {
            console.log(`   - ${contact.name} (${phone}) - ${contact.responseType}`);
        }
    });
    
    console.log(`   Action: Review if same owner/property to prevent future duplicates\n`);
});

// ANALYSIS 3: Historical Multi-Family Identification
console.log('🔍 HISTORICAL MULTI-FAMILY IDENTIFICATION:');
console.log('==========================================');
const multiFamilyKeywords = [
    'units', 'unit', 'apartment', 'duplex', 'triplex', 'fourplex',
    'rental', 'rent', 'tenant', 'lease', 'income', 'cashflow',
    'building', 'complex', 'suites', 'floors'
];

const potentialMultiFamily = Array.from(contacts.values()).filter(contact => {
    const message = contact.lastMessage.toLowerCase();
    const hasKeywords = multiFamilyKeywords.some(keyword => message.includes(keyword));
    const highValue = contact.valueDiscussed && contact.valueDiscussed > 500000;
    const markedAsSFR = contact.propertyType === 'Single Family';
    
    return (hasKeywords || highValue) && (markedAsSFR || contact.propertyType === 'Unknown');
});

console.log(`Found ${potentialMultiFamily.length} contacts that might be multi-family:\n`);

potentialMultiFamily.slice(0, 15).forEach((contact, i) => {
    const value = contact.valueDiscussed ? 
        (contact.valueDiscussed >= 1000000 ? 
            ` [$${(contact.valueDiscussed/1000000).toFixed(1)}M]` : 
            ` [$${(contact.valueDiscussed/1000).toFixed(0)}k]`) : '';
    
    console.log(`${i+1}. ${contact.name} (${contact.phone}) - ${contact.responseType}${value}`);
    console.log(`   Current type: ${contact.propertyType}`);
    console.log(`   Message: "${contact.lastMessage.substring(0, 80)}..."`);
    console.log(`   Action: ${contact.responseType === 'HOT' ? '🔥 Priority re-classify and call' : '📞 Re-classify as multi-family, consider follow-up'}`);
    console.log('');
});

// ANALYSIS 4: Strategic Re-engagement Opportunities
console.log('🎯 STRATEGIC RE-ENGAGEMENT OPPORTUNITIES:');
console.log('========================================');

const reengagementCandidates = Array.from(contacts.values()).filter(contact => {
    return (
        !contact.isOptOut && 
        (contact.responseType === 'WARM' || 
         (contact.responseType === 'COLD' && contact.valueDiscussed) ||
         (contact.responseType === 'HOT' && contact.lastMessage.includes('not now')))
    );
}).sort((a, b) => (b.valueDiscussed || 0) - (a.valueDiscussed || 0));

console.log(`Found ${reengagementCandidates.length} candidates for strategic follow-up:\n`);

reengagementCandidates.slice(0, 10).forEach((contact, i) => {
    const value = contact.valueDiscussed ? 
        ` [$${contact.valueDiscussed >= 1000000 ? (contact.valueDiscussed/1000000).toFixed(1) + 'M' : (contact.valueDiscussed/1000).toFixed(0) + 'k'}]` : '';
    
    let strategy = '';
    if (contact.responseType === 'HOT') {
        strategy = '🔥 CALL AGAIN - Was interested but timing issue';
    } else if (contact.responseType === 'WARM') {
        strategy = '📞 NURTURE CALL - Build relationship';  
    } else if (contact.valueDiscussed) {
        strategy = '💰 VALUE PLAY - They know their numbers';
    }
    
    console.log(`${i+1}. ${contact.name} (${contact.phone}) - ${contact.responseType}${value}`);
    console.log(`   Strategy: ${strategy}`);
    console.log(`   Message: "${contact.lastMessage.substring(0, 60)}..."`);
    console.log('');
});

// GENERATE PRACTICAL ACTION LISTS
console.log('📋 GENERATING ACTIONABLE CSV FILES...');

// 1. Multi-property owners for relationship building
const multiPropertyCsv = 'OwnerName,Phone,PropertyCount,ResponseTypes,TotalValue,Strategy\n' + 
    multiPropertyOwners.slice(0, 50).map(([name, properties]) => {
        const totalValue = properties.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
        const responseTypes = [...new Set(properties.map(p => p.responseType))].join(';');
        const strategy = responseTypes.includes('HOT') ? 'Priority Call' : 'Relationship Building';
        return `"${name}","${properties[0].phone}","${properties.length}","${responseTypes}","${totalValue}","${strategy}"`;
    }).join('\n');

fs.writeFileSync('./multi-property-owners.csv', multiPropertyCsv);

// 2. Multi-family re-classification list  
const multiPamilyCsv = 'Name,Phone,CurrentType,ResponseType,Value,Message,Action\n' +
    potentialMultiFamily.slice(0, 100).map(contact => {
        const action = contact.responseType === 'HOT' ? 'Priority Call & Reclassify' : 'Reclassify as Multi-family';
        return `"${contact.name}","${contact.phone}","${contact.propertyType}","${contact.responseType}","${contact.valueDiscussed || ''}","${contact.lastMessage.substring(0, 50).replace(/"/g, '')}","${action}"`;
    }).join('\n');

fs.writeFileSync('./multifamily-reclassification.csv', multiPamilyCsv);

// 3. Strategic re-engagement queue
const reengagementCsv = 'Name,Phone,ResponseType,Value,LastMessage,Strategy,Priority\n' +
    reengagementCandidates.slice(0, 100).map(contact => {
        const priority = contact.responseType === 'HOT' ? 'High' : contact.valueDiscussed > 1000000 ? 'Medium' : 'Low';
        const strategy = contact.responseType === 'HOT' ? 'Immediate Call' : 'Market Update Follow-up';
        return `"${contact.name}","${contact.phone}","${contact.responseType}","${contact.valueDiscussed || ''}","${contact.lastMessage.substring(0, 50).replace(/"/g, '')}","${strategy}","${priority}"`;
    }).join('\n');

fs.writeFileSync('./strategic-reengagement.csv', reengagementCsv);

console.log('\n✅ Generated action files:');
console.log('📊 multi-property-owners.csv - Relationship building opportunities');
console.log('🏢 multifamily-reclassification.csv - Properties to re-classify');  
console.log('🎯 strategic-reengagement.csv - Follow-up campaign candidates');

console.log('\n🚀 EXPERT-LEVEL STRATEGY SUMMARY:');
console.log('=================================');
console.log('✅ Same Owner, Different Properties = NEW OPPORTUNITIES (Send)');
console.log('❌ Same Owner, Same Property = RESPECT PREVIOUS CONTACT (Block)');
console.log('🔄 Time-Based Re-engagement = STRATEGIC FOLLOW-UP (Conditional)');
console.log('🏢 Historical Multi-family = MISSED OPPORTUNITIES (Priority Review)');
console.log('📞 Multi-property Owners = RELATIONSHIP GOLDMINE (Cultivate)');
console.log('\nThis approach maximizes opportunities while respecting boundaries! 🎯');