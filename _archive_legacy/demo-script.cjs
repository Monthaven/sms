// 🚀 MONTHAVEN SMS INTELLIGENCE - DEMO SCRIPT
// Run this to see your system in action!

const fs = require('fs');
const csv = require('csv-parser');

console.log('\n🎯 MONTHAVEN SMS INTELLIGENCE DEMO\n');

// Sample lead data to demonstrate cross-reference
const sampleLeads = [
    {
        phone: '9195551234',
        address: '123 Main St, Raleigh NC',
        name: 'John Smith',
        property_type: 'Single Family'
    },
    {
        phone: '9195555678', 
        address: '456 Oak Ave, Durham NC',
        name: 'Sarah Johnson',
        property_type: 'Multi Family'
    },
    {
        phone: '9195559999',
        address: '789 Pine Rd, Charlotte NC', 
        name: 'Mike Wilson',
        property_type: 'Commercial'
    }
];

console.log('📊 SAMPLE LEADS TO PROCESS:');
sampleLeads.forEach((lead, i) => {
    console.log(`   ${i+1}. ${lead.name} - ${lead.phone} (${lead.property_type})`);
});

console.log('\n🔍 CROSS-REFERENCE ANALYSIS:');

// Simulate cross-reference against your 32k database
sampleLeads.forEach((lead, i) => {
    const analysis = analyzeContact(lead);
    console.log(`\n   Lead ${i+1}: ${lead.name}`);
    console.log(`   📱 Phone: ${lead.phone}`);
    console.log(`   🏠 Property: ${lead.address}`);
    console.log(`   📋 Status: ${analysis.status}`);
    console.log(`   💬 Template: ${analysis.template}`);
    console.log(`   ⚡ Action: ${analysis.action}`);
});

console.log('\n🎯 SMART TEMPLATE SELECTION:');

const templates = {
    INITIAL: "Hi {name}, I'm interested in your property at {address}. Are you open to an offer?",
    FOLLOWUP: "Hi {name}, just checking in on your property at {address}. Market's been active - any thoughts?", 
    COMMERCIAL: "Hi {name}, I specialize in commercial acquisitions. Would you consider an off-market offer for {address}?",
    HOT_FOLLOWUP: "Hi {name}, following up on our conversation about {address}. Any updates?",
    CHECKING_IN: "Hi {name}, checking in about {address}. Still considering your options?"
};

Object.entries(templates).forEach(([type, template]) => {
    console.log(`\n   ${type}:`);
    console.log(`   "${template}"`);
});

console.log('\n📈 CAMPAIGN GENERATION PREVIEW:');

const campaignData = sampleLeads.map(lead => {
    const analysis = analyzeContact(lead);
    return {
        phone: lead.phone,
        message: personalizeMessage(templates[analysis.template], lead),
        priority: analysis.priority,
        expected_response: analysis.expectedResponse
    };
});

campaignData.forEach((campaign, i) => {
    console.log(`\n   Campaign ${i+1}:`);
    console.log(`   📱 To: ${campaign.phone}`);
    console.log(`   💬 Message: "${campaign.message}"`);
    console.log(`   ⭐ Priority: ${campaign.priority}`);
    console.log(`   📊 Expected: ${campaign.expected_response}`);
});

console.log('\n🔥 HOT LEAD SIMULATION:');

// Simulate incoming responses
const mockResponses = [
    { phone: '9195551234', message: 'Yes, very interested! When can we talk?', classification: 'HOT' },
    { phone: '9195555678', message: 'Maybe, what are you offering?', classification: 'WARM' },
    { phone: '9195559999', message: 'Not interested', classification: 'COLD' }
];

mockResponses.forEach(response => {
    const classification = classifyResponse(response.message);
    console.log(`\n   📱 ${response.phone}: "${response.message}"`);
    console.log(`   🎯 Classification: ${classification.category} (${classification.confidence}% confidence)`);
    console.log(`   ⚡ Action: ${classification.action}`);
    console.log(`   👥 Handler: ${classification.handler}`);
});

console.log('\n💼 TEAM DASHBOARD PREVIEW:');
console.log(`
   🔥 HOT LEADS: 1 ready to call
   📞 CALL QUEUE: 3 contacts pending  
   📊 TODAY'S STATS: 15 sent, 8 responses (53% rate)
   🛡️ PROTECTED: 247 opt-outs blocked
   ⚡ SYSTEM STATUS: All systems operational
`);

console.log('\n🎊 SYSTEM BENEFITS:');
console.log(`
   ✅ ZERO DOUBLE-TEXTING: Cross-reference prevents duplicates
   ✅ SMART TEMPLATES: Right message at right time
   ✅ INSTANT CLASSIFICATION: Auto-sort responses  
   ✅ TEAM COORDINATION: Real-time hot lead alerts
   ✅ COMPLIANCE PROTECTION: Opt-out blocking built-in
   ✅ EZ TEXTING READY: Export CSV for your proven workflow
`);

console.log('\n🚀 Ready to process real campaigns at http://localhost:3000!\n');

// Helper functions for demo
function analyzeContact(lead) {
    // Simulate cross-reference analysis
    const hasHistory = Math.random() > 0.7;
    const isOptOut = Math.random() > 0.9;
    
    if (isOptOut) {
        return {
            status: '🚫 BLOCKED (Opt-out)',
            template: 'NONE',
            action: 'DO NOT CONTACT',
            priority: 0,
            expectedResponse: '0%'
        };
    }
    
    if (hasHistory) {
        return {
            status: '🔄 FOLLOW-UP',
            template: 'FOLLOWUP',
            action: 'SAFE TO SEND',
            priority: 3,
            expectedResponse: '35%'
        };
    }
    
    const template = lead.property_type === 'Commercial' ? 'COMMERCIAL' : 'INITIAL';
    
    return {
        status: '✅ NEW CONTACT',
        template: template,
        action: 'SAFE TO SEND',
        priority: 2,
        expectedResponse: '25%'
    };
}

function personalizeMessage(template, lead) {
    return template
        .replace('{name}', lead.name)
        .replace('{address}', lead.address);
}

function classifyResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('yes') || msg.includes('interested') || msg.includes('when') || msg.includes('call')) {
        return {
            category: 'HOT',
            confidence: 95,
            action: 'CALL IMMEDIATELY',
            handler: 'Lead Specialist'
        };
    }
    
    if (msg.includes('maybe') || msg.includes('what') || msg.includes('how much') || msg.includes('offer')) {
        return {
            category: 'WARM',
            confidence: 80,
            action: 'FOLLOW UP TODAY',
            handler: 'Senior Handler'
        };
    }
    
    return {
        category: 'COLD',
        confidence: 90,
        action: 'MARK FOR LATER FOLLOW-UP',
        handler: 'Standard Handler'
    };
}

// Run demo if called directly
if (require.main === module) {
    // This is being run as a script
}