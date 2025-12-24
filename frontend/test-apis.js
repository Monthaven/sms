/**
 * API Test Script - Tests all endpoints
 * Run with: node test-apis.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Your phone number to receive test SMS
const TEST_PHONE = process.env.TEST_PHONE || null; // Set this to your verified phone

async function testAPIs() {
  console.log('🧪 Starting API Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  if (TEST_PHONE) console.log(`Test Phone: ${TEST_PHONE}`);
  console.log('');
  
  const results = [];
  
  // 1. Test GET /api/leads
  console.log('1️⃣  Testing GET /api/leads...');
  try {
    const res = await fetch(`${BASE_URL}/api/leads`);
    const leads = await res.json();
    if (res.ok && leads.length > 0) {
      console.log(`   ✅ PASS - Got ${leads.length} leads`);
      console.log(`   📋 Sample Lead: ${leads[0].id}`);
      console.log(`   📞 Phone: ${leads[0].contact?.phoneE164 || 'N/A'}`);
      results.push({ test: 'GET /api/leads', status: 'PASS', data: leads[0] });
    } else {
      console.log(`   ❌ FAIL - Status: ${res.status}`);
      results.push({ test: 'GET /api/leads', status: 'FAIL' });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    results.push({ test: 'GET /api/leads', status: 'ERROR', error: e.message });
  }
  
  // Get a test lead for subsequent tests
  let testLead = null;
  let testPhone = null;
  try {
    const res = await fetch(`${BASE_URL}/api/leads`);
    const leads = await res.json();
    testLead = leads[0];
    testPhone = testLead?.contact?.phoneE164;
  } catch (e) {}
  
  if (!testLead) {
    console.log('\n❌ Cannot proceed - no test lead available');
    return;
  }
  
  console.log(`\n📌 Using test lead: ${testLead.id}`);
  console.log(`📞 Phone: ${testPhone}\n`);
  
  // 2. Test GET /api/agents
  console.log('2️⃣  Testing GET /api/agents...');
  try {
    const res = await fetch(`${BASE_URL}/api/agents`);
    const data = await res.json();
    if (res.ok) {
      console.log(`   ✅ PASS - Got ${data.length || 0} agents`);
      results.push({ test: 'GET /api/agents', status: 'PASS' });
    } else {
      console.log(`   ❌ FAIL - Status: ${res.status}`);
      results.push({ test: 'GET /api/agents', status: 'FAIL' });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    results.push({ test: 'GET /api/agents', status: 'ERROR', error: e.message });
  }
  
  // 3. Test PATCH /api/leads/[leadId]/notes
  console.log('\n3️⃣  Testing PATCH /api/leads/[id]/notes...');
  try {
    const res = await fetch(`${BASE_URL}/api/leads/${testLead.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: `Test note at ${new Date().toISOString()}` })
    });
    if (res.ok) {
      console.log(`   ✅ PASS - Notes saved`);
      results.push({ test: 'PATCH notes', status: 'PASS' });
    } else {
      const err = await res.text();
      console.log(`   ❌ FAIL - Status: ${res.status} - ${err}`);
      results.push({ test: 'PATCH notes', status: 'FAIL' });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    results.push({ test: 'PATCH notes', status: 'ERROR', error: e.message });
  }
  
  // 4. Test POST /api/sms/send (Twilio)
  console.log('\n4️⃣  Testing POST /api/sms/send (Twilio)...');
  const smsPhone = TEST_PHONE || testPhone;
  if (smsPhone) {
    try {
      const res = await fetch(`${BASE_URL}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: testLead.id,
          to: smsPhone,
          message: 'API Test from MAE Command Center - ' + new Date().toLocaleTimeString(),
          provider: 'twilio'
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`   ✅ PASS - SMS sent via Twilio`);
        console.log(`   📧 External ID: ${data.externalId || 'N/A'}`);
        results.push({ test: 'SMS Twilio', status: 'PASS' });
      } else {
        console.log(`   ❌ FAIL - ${data.error || res.status}`);
        results.push({ test: 'SMS Twilio', status: 'FAIL', error: data.error });
      }
    } catch (e) {
      console.log(`   ❌ ERROR: ${e.message}`);
      results.push({ test: 'SMS Twilio', status: 'ERROR', error: e.message });
    }
  } else {
    console.log('   ⚠️  SKIP - No phone number (set TEST_PHONE env var)');
    results.push({ test: 'SMS Twilio', status: 'SKIP' });
  }
  
  // 5. Test POST /api/sms/send (EzTexting)
  console.log('\n5️⃣  Testing POST /api/sms/send (EzTexting)...');
  if (smsPhone) {
    try {
      const res = await fetch(`${BASE_URL}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: testLead.id,
          to: smsPhone,
          message: 'EzTexting API Test from MAE - ' + new Date().toLocaleTimeString(),
          provider: 'eztexting'
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`   ✅ PASS - SMS sent via EzTexting`);
        results.push({ test: 'SMS EzTexting', status: 'PASS' });
      } else {
        console.log(`   ❌ FAIL - ${data.error || res.status}`);
        results.push({ test: 'SMS EzTexting', status: 'FAIL', error: data.error });
      }
    } catch (e) {
      console.log(`   ❌ ERROR: ${e.message}`);
      results.push({ test: 'SMS EzTexting', status: 'ERROR', error: e.message });
    }
  } else {
    console.log('   ⚠️  SKIP - No phone number (set TEST_PHONE env var)');
    results.push({ test: 'SMS EzTexting', status: 'SKIP' });
  }
  
  // 6. Test POST /api/email/send
  console.log('\n6️⃣  Testing POST /api/email/send...');
  const testEmail = testLead?.contact?.email;
  if (testEmail) {
    try {
      const res = await fetch(`${BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: testLead.id,
          to: testEmail,
          subject: 'MAE Test Email',
          body: 'This is a test email from MAE Command Center.'
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`   ✅ PASS - Email sent`);
        results.push({ test: 'Email send', status: 'PASS' });
      } else {
        console.log(`   ❌ FAIL - ${data.error || res.status}`);
        results.push({ test: 'Email send', status: 'FAIL', error: data.error });
      }
    } catch (e) {
      console.log(`   ❌ ERROR: ${e.message}`);
      results.push({ test: 'Email send', status: 'ERROR', error: e.message });
    }
  } else {
    console.log('   ⚠️  SKIP - No email on contact');
    results.push({ test: 'Email send', status: 'SKIP' });
  }
  
  // 7. Test GET /api/campaigns
  console.log('\n7️⃣  Testing GET /api/campaigns...');
  try {
    const res = await fetch(`${BASE_URL}/api/campaigns`);
    if (res.ok) {
      const data = await res.json();
      console.log(`   ✅ PASS - Got ${data.length || 0} campaigns`);
      results.push({ test: 'GET campaigns', status: 'PASS' });
    } else {
      console.log(`   ❌ FAIL - Status: ${res.status}`);
      results.push({ test: 'GET campaigns', status: 'FAIL' });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    results.push({ test: 'GET campaigns', status: 'ERROR', error: e.message });
  }
  
  // 8. Test Alternative Contacts API
  console.log('\n8️⃣  Testing GET /api/properties/[id]/contacts...');
  const propertyId = testLead?.property?.id;
  if (propertyId) {
    try {
      const res = await fetch(`${BASE_URL}/api/properties/${propertyId}/contacts`);
      if (res.ok) {
        const data = await res.json();
        console.log(`   ✅ PASS - Got ${data.length || 0} contacts for property`);
        results.push({ test: 'Property contacts', status: 'PASS' });
      } else {
        console.log(`   ❌ FAIL - Status: ${res.status}`);
        results.push({ test: 'Property contacts', status: 'FAIL' });
      }
    } catch (e) {
      console.log(`   ❌ ERROR: ${e.message}`);
      results.push({ test: 'Property contacts', status: 'ERROR', error: e.message });
    }
  } else {
    console.log('   ⚠️  SKIP - No property on lead');
    results.push({ test: 'Property contacts', status: 'SKIP' });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  console.log(`✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⚠️  Errors:  ${errors}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(50));
  
  if (failed > 0 || errors > 0) {
    console.log('\n❌ FAILURES:');
    results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').forEach(r => {
      console.log(`   - ${r.test}: ${r.error || 'Unknown error'}`);
    });
  }
  
  return results;
}

testAPIs().catch(console.error);
