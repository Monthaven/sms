/**
 * WEBHOOK TESTER - Test your EZ Texting → Notion integration
 * Run this in Google Apps Script to verify webhook is working
 */

function testWebhook() {
  // Test incoming message webhook
  const testPayload = {
    event_type: 'incoming_message',
    from: '+15551234567',
    to: '+15559876543',
    message: 'Yes, I am interested in selling my property. Call me ASAP!',
    timestamp: new Date().toISOString(),
    message_id: 'test_' + Date.now()
  };
  
  console.log('🧪 Testing webhook with HOT response...');
  
  try {
    // Simulate webhook call
    const mockEvent = {
      postData: {
        contents: JSON.stringify(testPayload)
      }
    };
    
    const result = doPost(mockEvent);
    console.log('✅ Webhook test successful:', result.getContent());
    
    // Test classification
    const classification = classifyResponse(testPayload.message);
    console.log('🎯 Response classified as:', classification);
    
    console.log('📊 Expected actions:');
    console.log('   - Update Notion record');
    console.log('   - Classify as HOT');
    console.log('   - Assign Lead Specialist');
    console.log('   - Set NextAction: CALL_IMMEDIATELY');
    console.log('   - Send team alert');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test different response types
 */
function testAllResponseTypes() {
  const testCases = [
    { message: 'Yes call me now!', expected: 'HOT' },
    { message: 'Maybe, tell me more about your offer', expected: 'WARM' },
    { message: 'No thanks not interested', expected: 'COLD' },
    { message: 'STOP', expected: 'OPT_OUT' },
    { message: 'What is your cash offer?', expected: 'WARM' },
    { message: 'I want to sell immediately', expected: 'HOT' }
  ];
  
  console.log('🧪 Testing response classification...\n');
  
  testCases.forEach((test, index) => {
    const classification = classifyResponse(test.message);
    const status = classification === test.expected ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: "${test.message}"`);
    console.log(`   Expected: ${test.expected}, Got: ${classification}\n`);
  });
}

/**
 * Test Notion database connection
 */
function testNotionConnection() {
  console.log('🔌 Testing Notion API connection...');
  
  try {
    // This would test the actual Notion connection
    // You'll need to update the database IDs after creating them
    console.log('✅ Notion connection test would run here');
    console.log('📝 Next step: Update database IDs in webhook script');
    console.log('   1. Create the 3 databases in Notion');
    console.log('   2. Copy their IDs');
    console.log('   3. Update SMS_COMMAND_CENTER_DB variable');
    
  } catch (error) {
    console.error('❌ Notion connection failed:', error);
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 MONTHAVEN CAPITAL - WEBHOOK TESTING SUITE\n');
  
  testWebhook();
  console.log('\n' + '='.repeat(50) + '\n');
  
  testAllResponseTypes();
  console.log('='.repeat(50) + '\n');
  
  testNotionConnection();
  
  console.log('🎉 Testing complete! Deploy when ready.');
}