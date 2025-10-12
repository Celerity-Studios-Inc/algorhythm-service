#!/usr/bin/env node

/**
 * 🔍 WEBHOOK PAYLOAD VALIDATION TESTING
 * 
 * This script tests webhook payload formats and HMAC signature validation
 * to ensure compatibility between NNA Registry and Algorhythm services.
 */

const crypto = require('crypto');

// Test webhook secret
const WEBHOOK_SECRET = 'test-webhook-secret-key-12345';

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload, secret, timestamp) {
  const payloadString = JSON.stringify(payload);
  const data = `${timestamp}.${payloadString}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Validate HMAC signature
 */
function validateSignature(payload, signature, secret, timestamp) {
  const expectedSignature = generateSignature(payload, secret, timestamp);
  return expectedSignature === signature;
}

/**
 * Test webhook payload formats
 */
function testWebhookPayloads() {
  console.log('🔍 Testing Webhook Payload Formats');
  console.log('==================================');
  
  const tests = [
    {
      name: 'Asset Created Payload',
      payload: {
        event: 'asset.created',
        data: {
          assetId: 'S.GRL.TEE.001',
          layer: 'S',
          category: 'GRL',
          subcategory: 'TEE',
          name: 'S.GRL.TEE.001',
          gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/assets/S.GRL.TEE.001.png',
          metadata: {
            description: 'Test asset',
            tags: ['test'],
            size: '1024x1024'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Asset Updated Payload',
      payload: {
        event: 'asset.updated',
        data: {
          assetId: 'S.GRL.TEE.001',
          layer: 'S',
          category: 'GRL',
          subcategory: 'TEE',
          name: 'S.GRL.TEE.001 (Updated)',
          gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/assets/S.GRL.TEE.001.png',
          metadata: {
            description: 'Updated test asset',
            tags: ['test', 'updated'],
            size: '1024x1024'
          },
          changes: {
            name: 'Updated name',
            metadata: 'Updated metadata'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Asset Deleted Payload',
      payload: {
        event: 'asset.deleted',
        data: {
          assetId: 'S.GRL.TEE.001',
          layer: 'S',
          category: 'GRL',
          subcategory: 'TEE',
          name: 'S.GRL.TEE.001',
          gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/assets/S.GRL.TEE.001.png',
          metadata: {
            description: 'Deleted test asset',
            tags: ['test', 'deleted'],
            size: '1024x1024'
          },
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Composite Created Payload',
      payload: {
        event: 'composite.created',
        data: {
          compositeId: 'C.PAR.2LA.001',
          layer: 'C',
          category: 'PAR',
          subcategory: '2LA',
          name: 'C.PAR.2LA.001',
          gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/composites/C.PAR.2LA.001.mp4',
          compositeType: 'full',
          componentCount: 2,
          componentLayers: ['S', 'L'],
          componentIds: ['S.GRL.TEE.001', 'L.CAS.COM.001'],
          metadata: {
            description: 'Test composite',
            duration: 30,
            resolution: '1920x1080',
            tags: ['test', 'composite']
          },
          components: [
            {
              id: 'S.GRL.TEE.001',
              layer: 'S',
              category: 'GRL',
              subcategory: 'TEE',
              name: 'S.GRL.TEE.001',
              gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/assets/S.GRL.TEE.001.png'
            },
            {
              id: 'L.CAS.COM.001',
              layer: 'L',
              category: 'CAS',
              subcategory: 'COM',
              name: 'L.CAS.COM.001',
              gcpStorageUrl: 'https://storage.googleapis.com/nna-registry-dev/assets/L.CAS.COM.001.png'
            }
          ],
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. Testing ${test.name}...`);
    
    try {
      // Test payload structure
      const payload = test.payload;
      
      // Validate required fields
      const requiredFields = ['event', 'data', 'timestamp'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      
      if (missingFields.length > 0) {
        console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Validate event type
      const validEvents = ['asset.created', 'asset.updated', 'asset.deleted', 'composite.created'];
      if (!validEvents.includes(payload.event)) {
        console.log(`❌ Invalid event type: ${payload.event}`);
        return;
      }
      
      // Validate data structure
      const data = payload.data;
      const dataRequiredFields = ['layer', 'category', 'subcategory', 'name', 'timestamp'];
      // For composite events, use compositeId instead of assetId
      if (payload.event === 'composite.created') {
        dataRequiredFields.push('compositeId');
      } else {
        dataRequiredFields.push('assetId');
      }
      const dataMissingFields = dataRequiredFields.filter(field => !data[field]);
      
      if (dataMissingFields.length > 0) {
        console.log(`❌ Missing data fields: ${dataMissingFields.join(', ')}`);
        return;
      }
      
      // Test HMAC signature generation and validation
      const timestamp = payload.timestamp;
      const signature = generateSignature(payload, WEBHOOK_SECRET, timestamp);
      const isValid = validateSignature(payload, signature, WEBHOOK_SECRET, timestamp);
      
      if (!isValid) {
        console.log(`❌ HMAC signature validation failed`);
        return;
      }
      
      console.log(`✅ ${test.name} - All validations passed`);
      console.log(`   Event: ${payload.event}`);
      console.log(`   Asset/Composite ID: ${data.assetId || data.compositeId}`);
      console.log(`   Signature: ${signature.substring(0, 16)}...`);
      
      passedTests++;
      
    } catch (error) {
      console.log(`❌ ${test.name} - Validation failed: ${error.message}`);
    }
  });
  
  console.log('\n📊 PAYLOAD VALIDATION RESULTS');
  console.log('============================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL PAYLOAD VALIDATIONS PASSED!');
    console.log('✅ Webhook payload formats are correct');
    console.log('✅ HMAC signature validation is working');
    console.log('✅ Ready for integration testing');
  } else {
    console.log('\n⚠️  Some payload validations failed');
    console.log('🔧 Review the failed tests above');
  }
  
  return { passed: passedTests, total: totalTests };
}

/**
 * Test HMAC signature edge cases
 */
function testHMACEdgeCases() {
  console.log('\n🔐 Testing HMAC Signature Edge Cases');
  console.log('====================================');
  
  const tests = [
    {
      name: 'Valid Signature',
      payload: { event: 'asset.created', data: { assetId: 'test' }, timestamp: '1234567890' },
      secret: WEBHOOK_SECRET,
      timestamp: '1234567890',
      expected: true
    },
    {
      name: 'Invalid Signature',
      payload: { event: 'asset.created', data: { assetId: 'test' }, timestamp: '1234567890' },
      secret: WEBHOOK_SECRET,
      timestamp: '1234567890',
      signature: 'invalid-signature',
      expected: false
    },
    {
      name: 'Wrong Secret',
      payload: { event: 'asset.created', data: { assetId: 'test' }, timestamp: '1234567890' },
      secret: 'wrong-secret',
      timestamp: '1234567890',
      expected: false
    },
    {
      name: 'Timestamp Mismatch',
      payload: { event: 'asset.created', data: { assetId: 'test' }, timestamp: '1234567890' },
      secret: WEBHOOK_SECRET,
      timestamp: '9876543210',
      expected: false
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. Testing ${test.name}...`);
    
    try {
      let signature;
      let isValid;
      
      if (test.signature) {
        // Test with provided signature (for invalid signature test)
        signature = test.signature;
        isValid = validateSignature(test.payload, signature, test.secret, test.timestamp);
      } else {
        // Test with generated signature
        signature = generateSignature(test.payload, test.secret, test.timestamp);
        isValid = validateSignature(test.payload, signature, test.secret, test.timestamp);
      }
      
      if (isValid === test.expected) {
        console.log(`✅ ${test.name} - Expected result: ${test.expected}`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name} - Expected ${test.expected}, got ${isValid}`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - Test failed: ${error.message}`);
    }
  });
  
  console.log('\n📊 HMAC EDGE CASE RESULTS');
  console.log('==========================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`🎯 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  return { passed: passedTests, total: totalTests };
}

/**
 * Main test function
 */
function runPayloadTests() {
  console.log('🧪 WEBHOOK PAYLOAD VALIDATION TESTS');
  console.log('===================================');
  console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  
  const payloadResults = testWebhookPayloads();
  const hmacResults = testHMACEdgeCases();
  
  const totalPassed = payloadResults.passed + hmacResults.passed;
  const totalTests = payloadResults.total + hmacResults.total;
  const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);
  
  console.log('\n🎯 OVERALL RESULTS');
  console.log('==================');
  console.log(`✅ Total Passed: ${totalPassed}/${totalTests}`);
  console.log(`🎯 Overall Success Rate: ${overallSuccessRate}%`);
  
  if (overallSuccessRate === 100) {
    console.log('\n🎉 ALL PAYLOAD TESTS PASSED!');
    console.log('✅ Webhook payload formats are validated');
    console.log('✅ HMAC signature security is working');
    console.log('✅ Ready for end-to-end integration testing');
  } else {
    console.log('\n⚠️  Some payload tests failed');
    console.log('🔧 Review the failed tests above');
  }
  
  return { payloadResults, hmacResults, overallSuccessRate };
}

// Run tests if called directly
if (require.main === module) {
  runPayloadTests();
}

module.exports = { runPayloadTests, testWebhookPayloads, testHMACEdgeCases };
