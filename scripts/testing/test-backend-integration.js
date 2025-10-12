#!/usr/bin/env node

/**
 * Backend Team Integration Test Script
 * Tests webhook delivery from NNA Registry to Algorhythm
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const WEBHOOK_SECRET = '43b377dd2766939804720f61f10d8e1b61bbb8df9a89e502e3cd75d0b318783a';

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload, secret, timestamp) {
  const data = JSON.stringify(payload);
  const message = `${timestamp}.${data}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

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
 * Test webhook with proper HMAC signature
 */
async function testWebhookWithSignature(endpoint, payload) {
  console.log(`\n🧪 Testing ${endpoint} with proper HMAC signature...`);
  
  const timestamp = Date.now().toString();
  const signature = generateSignature(payload, WEBHOOK_SECRET, timestamp);
  
  try {
    const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${endpoint}`, {
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
      console.log(`   ✅ SUCCESS: Webhook processed successfully`);
      return true;
    } else {
      console.log(`   ❌ FAILED: Webhook processing failed`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test all webhook endpoints
 */
async function testAllWebhooks() {
  console.log('🚀 Backend Team Integration Test - Algorhythm Service');
  console.log(`📍 Service: ${ALGORHYTHM_BASE_URL}`);
  console.log(`🔐 Secret: ${WEBHOOK_SECRET.substring(0, 20)}...`);
  
  const webhookTests = [
    {
      name: 'Asset Created Webhook',
      endpoint: '/api/v1/webhooks/assets/created',
      payload: {
        event: 'asset.created',
        assetId: 'test-asset-123',
        layer: 'test',
        category: 'test',
        subcategory: 'test',
        name: 'Test Asset',
        gcpStorageUrl: 'https://test.com/asset.mp4',
        metadata: { test: true },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Asset Updated Webhook',
      endpoint: '/api/v1/webhooks/assets/updated',
      payload: {
        event: 'asset.updated',
        assetId: 'test-asset-123',
        layer: 'test',
        category: 'test',
        subcategory: 'test',
        name: 'Test Asset Updated',
        gcpStorageUrl: 'https://test.com/asset.mp4',
        metadata: { test: true },
        changes: { name: true },
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Asset Deleted Webhook',
      endpoint: '/api/v1/webhooks/assets/deleted',
      payload: {
        event: 'asset.deleted',
        assetId: 'test-asset-123',
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Composite Created Webhook',
      endpoint: '/api/v1/webhooks/composites/created',
      payload: {
        event: 'composite.created',
        compositeId: 'test-composite-123',
        layer: 'composite',
        category: 'full',
        subcategory: 'all',
        name: 'Test Composite',
        gcpStorageUrl: 'https://test.com/composite.mp4',
        compositeType: 'full',
        componentCount: 3,
        componentLayers: ['layer1', 'layer2', 'layer3'],
        componentIds: ['comp1', 'comp2', 'comp3'],
        metadata: { test: true },
        components: [],
        timestamp: new Date().toISOString()
      }
    }
  ];

  let successCount = 0;
  let totalTests = webhookTests.length;

  for (const test of webhookTests) {
    const success = await testWebhookWithSignature(test.endpoint, test.payload);
    if (success) successCount++;
  }

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Successful: ${successCount}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL WEBHOOK TESTS PASSED!');
    console.log('✅ Algorhythm service is ready for NNA Registry integration');
    console.log('✅ Backend team can proceed with webhook delivery configuration');
  } else {
    console.log('\n⚠️  Some webhook tests failed');
    console.log('❌ Check Algorhythm service configuration');
  }
}

// Run tests
testAllWebhooks().catch(console.error);
