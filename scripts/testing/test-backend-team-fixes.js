#!/usr/bin/env node

/**
 * Test Backend Team Analysis Fixes
 * Tests all 5 critical issues identified by Backend Team
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const WEBHOOK_SECRET = '43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a';

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload, secret, timestamp) {
  const data = JSON.stringify(payload);
  const message = `${timestamp}.${data}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Test Issue 1: Health Endpoint
 */
async function testHealthEndpoint() {
  console.log('\n🧪 Testing Issue 1: Health Endpoint');
  
  const tests = [
    { name: '/api/health', url: `${ALGORHYTHM_BASE_URL}/api/health` },
    { name: '/api/v1/health', url: `${ALGORHYTHM_BASE_URL}/api/v1/health` },
    { name: '/health', url: `${ALGORHYTHM_BASE_URL}/health` }
  ];

  for (const test of tests) {
    try {
      const response = await makeRequest(test.url);
      console.log(`   ${test.name}: ${response.statusCode} ${response.statusCode === 200 ? '✅' : '❌'}`);
      if (response.statusCode === 200) {
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ${test.name}: ❌ ERROR - ${error.message}`);
    }
  }
}

/**
 * Test Issue 2: Webhook Secret Configuration
 */
async function testWebhookSecret() {
  console.log('\n🧪 Testing Issue 2: Webhook Secret Configuration');
  
  const timestamp = Date.now().toString();
  const payload = {
    event: 'asset.created',
    assetId: 'test-123',
    layer: 'G',
    category: 'POP',
    subcategory: 'CLA',
    name: 'Test Asset',
    gcpStorageUrl: 'https://storage.googleapis.com/test/test.mp4',
    metadata: { tags: ['test'] },
    timestamp: new Date().toISOString()
  };
  
  const signature = generateSignature(payload, WEBHOOK_SECRET, timestamp);
  
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}/api/v1/webhooks/assets/created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-algorhythm-signature': signature,
        'x-algorhythm-timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Webhook secret configuration working');
    } else if (response.data?.error?.message?.includes('Webhook secret not configured')) {
      console.log('   ❌ Webhook secret not configured');
    } else {
      console.log('   ⚠️  Different error - check response');
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
}

/**
 * Test Issue 3: Webhook Payload Format (Nested vs Flat)
 */
async function testPayloadFormat() {
  console.log('\n🧪 Testing Issue 3: Webhook Payload Format');
  
  const timestamp = Date.now().toString();
  
  // Test nested format (NNA Registry format)
  const nestedPayload = {
    event: 'asset.created',
    timestamp: new Date().toISOString(),
    data: {
      assetId: 'test-123',
      layer: 'G',
      category: 'POP',
      subcategory: 'CLA',
      name: 'Test Asset',
      gcpStorageUrl: 'https://storage.googleapis.com/test/test.mp4',
      metadata: { tags: ['test'] }
    }
  };
  
  const signature = generateSignature(nestedPayload, WEBHOOK_SECRET, timestamp);
  
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}/api/v1/webhooks/assets/created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-algorhythm-signature': signature,
        'x-algorhythm-timestamp': timestamp
      },
      body: JSON.stringify(nestedPayload)
    });
    
    console.log(`   Nested Format Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Nested payload format working');
    } else {
      console.log('   ❌ Nested payload format failed');
    }
    
  } catch (error) {
    console.log(`   ❌ Nested Format ERROR: ${error.message}`);
  }
  
  // Test flat format (Algorhythm format)
  const flatPayload = {
    event: 'asset.created',
    assetId: 'test-123',
    layer: 'G',
    category: 'POP',
    subcategory: 'CLA',
    name: 'Test Asset',
    gcpStorageUrl: 'https://storage.googleapis.com/test/test.mp4',
    metadata: { tags: ['test'] },
    timestamp: new Date().toISOString()
  };
  
  const flatSignature = generateSignature(flatPayload, WEBHOOK_SECRET, timestamp);
  
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}/api/v1/webhooks/assets/created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-algorhythm-signature': flatSignature,
        'x-algorhythm-timestamp': timestamp
      },
      body: JSON.stringify(flatPayload)
    });
    
    console.log(`   Flat Format Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Flat payload format working');
    } else {
      console.log('   ❌ Flat payload format failed');
    }
    
  } catch (error) {
    console.log(`   ❌ Flat Format ERROR: ${error.message}`);
  }
}

/**
 * Test Issue 4: Header Naming
 */
async function testHeaderNaming() {
  console.log('\n🧪 Testing Issue 4: Header Naming');
  
  const timestamp = Date.now().toString();
  const payload = {
    event: 'asset.created',
    assetId: 'test-123',
    layer: 'G',
    category: 'POP',
    subcategory: 'CLA',
    name: 'Test Asset',
    gcpStorageUrl: 'https://storage.googleapis.com/test/test.mp4',
    metadata: { tags: ['test'] },
    timestamp: new Date().toISOString()
  };
  
  const signature = generateSignature(payload, WEBHOOK_SECRET, timestamp);
  
  // Test with correct headers
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}/api/v1/webhooks/assets/created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-algorhythm-signature': signature,
        'x-algorhythm-timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`   Correct Headers Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Correct headers working');
    } else {
      console.log('   ❌ Correct headers failed');
    }
    
  } catch (error) {
    console.log(`   ❌ Correct Headers ERROR: ${error.message}`);
  }
  
  // Test with wrong headers
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}/api/v1/webhooks/assets/created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-timestamp': timestamp
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`   Wrong Headers Status: ${response.statusCode}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.statusCode === 400 || response.statusCode === 401) {
      console.log('   ✅ Wrong headers properly rejected');
    } else {
      console.log('   ❌ Wrong headers not rejected');
    }
    
  } catch (error) {
    console.log(`   ❌ Wrong Headers ERROR: ${error.message}`);
  }
}

/**
 * Test Issue 5: All Webhook Endpoints
 */
async function testAllWebhookEndpoints() {
  console.log('\n🧪 Testing Issue 5: All Webhook Endpoints');
  
  const endpoints = [
    { name: 'Asset Created', path: '/api/v1/webhooks/assets/created' },
    { name: 'Asset Updated', path: '/api/v1/webhooks/assets/updated' },
    { name: 'Asset Deleted', path: '/api/v1/webhooks/assets/deleted' },
    { name: 'Composite Created', path: '/api/v1/webhooks/composites/created' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${endpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      console.log(`   ${endpoint.name}: ${response.statusCode} ${response.statusCode === 400 ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`   ${endpoint.name}: ❌ ERROR - ${error.message}`);
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Backend Team Analysis Fixes Test Suite');
  console.log(`📍 Service: ${ALGORHYTHM_BASE_URL}`);
  console.log(`🔐 Secret: ${WEBHOOK_SECRET.substring(0, 20)}...`);
  
  await testHealthEndpoint();
  await testWebhookSecret();
  await testPayloadFormat();
  await testHeaderNaming();
  await testAllWebhookEndpoints();
  
  console.log('\n📊 Test Summary:');
  console.log('✅ All tests completed');
  console.log('📋 Check individual test results above');
  console.log('🎯 Ready for Backend Team integration testing');
}

// Run tests
runAllTests().catch(console.error);
