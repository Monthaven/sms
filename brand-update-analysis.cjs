const fs = require('fs');

console.log('🔄 MONTHAVEN CAPITAL REBRAND ANALYSIS');
console.log('====================================');
console.log('Identifying old brand references that need updating...\n');

// Load master data to check for old brand references
const masterData = fs.readFileSync('./notion-import-master.csv', 'utf-8');
const lines = masterData.split('\n').slice(1).filter(line => line.trim());

// Old brand patterns to identify
const oldBrandPatterns = [
    /kyle/gi,
    /crownandoakcapital/gi,
    /crownandoak/gi,
    /crown.*oak.*capital/gi,
    /crown.*and.*oak/gi,
    /c&o/gi,
    /crown.*oak/gi,
    /crownandoakcapital\.com/gi,
    /646.*964.*9686/gi,
    /646-964-9686/gi,
    /(646)\s*964\s*9686/gi
];

const oldBrandKeywords = [
    'kyle', 'crownandoakcapital', 'crownandoak', 'crown oak capital', 
    'crown and oak', 'c&o', 'crown oak', 'crownandoakcapital.com', 
    '646 964 9686', '646-964-9686'
];

let contactsWithOldBranding = [];
let messageAnalysis = {
    totalMessages: 0,
    messagesWithOldBrand: 0,
    kyleReferences: 0,
    oldCompanyReferences: 0,
    oldPhoneReferences: 0,
    oldWebsiteReferences: 0
};

console.log('📊 Analyzing messages for old brand references...\n');

lines.forEach(line => {
    const parts = line.split('","').map(part => part.replace(/"/g, ''));
    if (parts.length < 5) return;
    
    const [phone, name, propertyType, responseType, lastMessage] = parts;
    messageAnalysis.totalMessages++;
    
    let hasOldBranding = false;
    let brandIssues = [];
    
    // Check for each old brand pattern
    oldBrandPatterns.forEach((pattern, index) => {
        if (pattern.test(lastMessage)) {
            hasOldBranding = true;
            brandIssues.push(oldBrandKeywords[index] || 'old branding');
            
            // Categorize the type of reference
            if (/kyle/i.test(lastMessage)) messageAnalysis.kyleReferences++;
            if (/crown|oak|c&o/i.test(lastMessage)) messageAnalysis.oldCompanyReferences++;
            if (/646.*964.*9686/i.test(lastMessage)) messageAnalysis.oldPhoneReferences++;
            if (/crownandoakcapital\.com/i.test(lastMessage)) messageAnalysis.oldWebsiteReferences++;
        }
    });
    
    if (hasOldBranding) {
        messageAnalysis.messagesWithOldBrand++;
        contactsWithOldBranding.push({
            phone,
            name,
            responseType,
            lastMessage,
            brandIssues: [...new Set(brandIssues)],
            priority: responseType === 'HOT' ? 'HIGH' : responseType === 'WARM' ? 'MEDIUM' : 'LOW'
        });
    }
});

// Sort by priority (HOT first, then WARM, then COLD)
contactsWithOldBranding.sort((a, b) => {
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
});

console.log('📈 BRAND REFERENCE ANALYSIS:');
console.log('===========================');
console.log(`Total messages analyzed: ${messageAnalysis.totalMessages.toLocaleString()}`);
console.log(`Messages with old branding: ${messageAnalysis.messagesWithOldBrand} (${((messageAnalysis.messagesWithOldBrand / messageAnalysis.totalMessages) * 100).toFixed(1)}%)`);
console.log(`Kyle references: ${messageAnalysis.kyleReferences}`);
console.log(`Old company references: ${messageAnalysis.oldCompanyReferences}`);
console.log(`Old phone number references: ${messageAnalysis.oldPhoneReferences}`);
console.log(`Old website references: ${messageAnalysis.oldWebsiteReferences}`);

console.log('\n🔥 CONTACTS WITH OLD BRANDING (Priority Order):');
console.log('===============================================');

// Show top contacts that need attention
contactsWithOldBranding.slice(0, 20).forEach((contact, i) => {
    const priorityIcon = contact.priority === 'HIGH' ? '🔥' : contact.priority === 'MEDIUM' ? '🟡' : '❄️';
    
    console.log(`${i+1}. ${priorityIcon} ${contact.name} (${contact.phone}) - ${contact.responseType}`);
    console.log(`   Brand issues: ${contact.brandIssues.join(', ')}`);
    console.log(`   Message: "${contact.lastMessage.substring(0, 100)}..."`);
    console.log('');
});

// Generate brand consistency templates
console.log('\n✅ NEW MONTHAVEN CAPITAL MESSAGING TEMPLATES:');
console.log('============================================');

const newTemplates = {
    opener: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - {caller_name}, Monthaven Capital",
    
    openerWithPhone: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - {caller_name}, Monthaven Capital {phone}",
    
    followUp: "Just checking in on {StreetAddress} - worth a quick chat this week, or pass for now? - {caller_name}, Monthaven Capital",
    
    valueAdd: "Happy to share what nearby sales look like. Curious about {StreetAddress}? - {caller_name}, Monthaven Capital",
    
    differentProperty: "Hi again {OwnerName}, reaching out about a different property - {NewAddress}. Still in acquisition mode? - {caller_name}, Monthaven Capital",
    
    reengagement: "Hi {OwnerName}, quick market update on {StreetAddress} - values have shifted since we last spoke. Worth revisiting? - {caller_name}, Monthaven Capital"
};

Object.entries(newTemplates).forEach(([type, template]) => {
    console.log(`${type.charAt(0).toUpperCase() + type.slice(1)}: "${template}"`);
    console.log('');
});

// Brand consistency recommendations
console.log('🎯 BRAND CONSISTENCY RECOMMENDATIONS:');
console.log('====================================');
console.log('1. IMMEDIATE ACTIONS:');
console.log(`   • Update ${messageAnalysis.messagesWithOldBrand} contacts about rebrand`);
console.log('   • Call HOT leads first to explain rebrand personally');
console.log('   • Send market update to WARM leads mentioning rebrand');
console.log('');
console.log('2. GOING FORWARD:');
console.log('   • Always use "Monthaven Capital" in signatures');
console.log('   • Replace Kyle with actual caller names');
console.log('   • Use new phone numbers (not 646-964-9686)');
console.log('   • No reference to Crown and Oak or C&O');
console.log('');
console.log('3. FOLLOW-UP STRATEGY:');
console.log('   • "Quick update - we\'ve rebranded to Monthaven Capital, same team, same focus on {market}. Still interested in discussing {address}?"');
console.log('');

// Generate contact update CSV
const rebrandCsv = 'Priority,Name,Phone,ResponseType,BrandIssues,LastMessage,Action\n' + 
    contactsWithOldBranding.map(contact => {
        const action = contact.priority === 'HIGH' ? 'Call to explain rebrand + continue deal' : 
                      contact.priority === 'MEDIUM' ? 'Text rebrand update + gauge interest' : 
                      'Include in rebrand announcement batch';
        
        return `"${contact.priority}","${contact.name}","${contact.phone}","${contact.responseType}","${contact.brandIssues.join('; ')}","${contact.lastMessage.substring(0, 100).replace(/"/g, '')}","${action}"`;
    }).join('\n');

fs.writeFileSync('./brand-update-contacts.csv', rebrandCsv);

// Generate template variations for different callers
const callerTemplates = {
    "Devin": {
        opener: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - Devin, Monthaven Capital",
        followUp: "Just checking in on {StreetAddress} - worth a quick chat this week, or pass for now? - Devin"
    },
    "Alec": {
        opener: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - Alec, Monthaven Capital", 
        followUp: "Just checking in on {StreetAddress} - worth a quick chat this week, or pass for now? - Alec"
    },
    "Team Member": {
        opener: "Hi, reaching out about {StreetAddress}. Still open to offers, or has that ship sailed? - {caller_name}, Monthaven Capital",
        followUp: "Just checking in on {StreetAddress} - worth a quick chat this week, or pass for now? - {caller_name}"
    }
};

const templateJson = JSON.stringify(callerTemplates, null, 2);
fs.writeFileSync('./monthaven-message-templates.json', templateJson);

console.log('📁 Generated Files:');
console.log('==================');
console.log('✅ brand-update-contacts.csv - Contacts needing rebrand communication');
console.log('✅ monthaven-message-templates.json - New consistent messaging templates');

console.log('\n🚀 REBRAND EXECUTION PLAN:');
console.log('=========================');
console.log('PHASE 1 (This Week):');
console.log('• Call all HOT leads personally to explain rebrand');
console.log('• Update systems with new Monthaven Capital branding');
console.log('• Create rebrand announcement message');
console.log('');
console.log('PHASE 2 (Next Week):');  
console.log('• Send rebrand updates to WARM leads');
console.log('• Batch update COLD leads with market update + rebrand');
console.log('• Update all future campaigns with new branding');
console.log('');
console.log('PHASE 3 (Ongoing):');
console.log('• Consistent Monthaven Capital messaging');
console.log('• Track brand recognition and response rates');
console.log('• Build new brand awareness in market');

console.log('\n✅ REBRAND ANALYSIS COMPLETE!');
console.log('Your brand consistency is now data-driven and actionable! 🎯');
