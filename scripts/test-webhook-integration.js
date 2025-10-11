#!/usr/bin/env node

/**
 * 🧪 WEBHOOK INTEGRATION TESTING SCRIPT
 * 
 * This script tests the complete webhook integration between
 * NNA Registry and Algorhythm services.
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const ALGORHYTHM_BASE_URL = process.env.ALGORHYTHM_BASE_URL || 'https://algorhythm-service-dev-***.run.app';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-secret-key';

// Test data
const testAsset = {
  assetId: 'test-asset-' + Date.now(),
  layer: 'S',
  category: 'GRL',
  subcategory: 'TEE',
  name: 'Test Asset',
  gcpStorageUrl: 'https://storage.googleapis.com/test-bucket/test-asset.png',
  metadata: {
    description: 'Test asset for webhook integration',
    tags: ['test', 'integration'],
    size: '1024x1024'
  },
  timestamp: new Date().toISOString()
};

const testComposite = {
  compositeId: 'test-composite-' + Date.now(),
  layer: 'C',
  category: 'PAR',
  subcategory: '2LA',
  name: 'Test Composite',
  gcpStorageUrl: 'https://storage.googleapis.com/test-bucket/test-composite.mp4',
  compositeType: 'full',
  componentCount: 2,
  componentLayers: ['S', 'L'],
  componentIds: ['comp-1', 'comp-2'],
  metadata: {
    description: 'Test composite for webhook integration',
    duration: 30,
    resolution: '1920x1080'
  },
  components: [
    { id: 'comp-1', layer: 'S', name: 'Component 1' },
    { id: 'comp-2', layer: 'L', name: 'Component 2' }
  ],
  timestamp: new Date().toISOString()
};

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload, secret, timestamp) {
  const payloadString = JSON.stringify(payload);
  const data = `${timestamp}.${payloadString}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Test webhook endpoint
 */
async function testWebhookEndpoint(endpoint, payload, eventType) {
  try {
    console.log(`\n🧪 Testing ${eventType} webhook...`);
    
    const timestamp = Date.now().toString();
    const signature = generateSignature(payload, WEBHOOK_SECRET, timestamp);
    
    const response = await axios.post(`${ALGORHYTHM_BASE_URL}/webhooks/${endpoint}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-nna-signature': signature,
        'x-nna-timestamp': timestamp
      },
      timeout: 10000
    });
    
    console.log(`✅ ${eventType} webhook test passed`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    
    return { success: true, response: response.data };
  } catch (error) {
    console.log(`❌ ${eventType} webhook test failed`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test service health
 */
async function testServiceHealth() {
  try {
    console.log('\n🏥 Testing Algorhythm service health...');
    
    const response = await axios.get(`${ALGORHYTHM_BASE_URL}/health`, {
      timeout: 5000
    });
    
    console.log('✅ Service health check passed');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    
    return { success: true, health: response.data };
  } catch (error) {
    console.log('❌ Service health check failed');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Webhook Integration Tests');
  console.log('=====================================');
  console.log(`Algorhythm Service: ${ALGORHYTHM_BASE_URL}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  
  const results = {
    health: false,
    assetCreated: false,
    assetUpdated: false,
    assetDeleted: false,
    compositeCreated: false
  };
  
  // Test 1: Service Health
  const healthResult = await testServiceHealth();
  results.health = healthResult.success;
  
  // Test 2: Asset Created Webhook
  const assetCreatedPayload = {
    event: 'asset.created',
    data: {
      assetId: testAsset.assetId,
      layer: testAsset.layer,
      category: testAsset.category,
      subcategory: testAsset.subcategory,
      name: testAsset.name,
      gcpStorageUrl: testAsset.gcpStorageUrl,
      metadata: testAsset.metadata,
      timestamp: testAsset.timestamp
    },
    timestamp: testAsset.timestamp
  };
  
  const assetCreatedResult = await testWebhookEndpoint('assets/created', assetCreatedPayload, 'Asset Created');
  results.assetCreated = assetCreatedResult.success;
  
  // Test 3: Asset Updated Webhook
  const assetUpdatedPayload = {
    event: 'asset.updated',
    data: {
      assetId: testAsset.assetId,
      layer: testAsset.layer,
      category: testAsset.category,
      subcategory: testAsset.subcategory,
      name: testAsset.name + ' (Updated)',
      gcpStorageUrl: testAsset.gcpStorageUrl,
      metadata: { ...testAsset.metadata, updated: true },
      changes: { name: 'Updated name', metadata: 'Updated metadata' },
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  const assetUpdatedResult = await testWebhookEndpoint('assets/updated', assetUpdatedPayload, 'Asset Updated');
  results.assetUpdated = assetUpdatedResult.success;
  
  // Test 4: Asset Deleted Webhook
  const assetDeletedPayload = {
    event: 'asset.deleted',
    data: {
      assetId: testAsset.assetId,
      layer: testAsset.layer,
      category: testAsset.category,
      subcategory: testAsset.subcategory,
      name: testAsset.name,
      gcpStorageUrl: testAsset.gcpStorageUrl,
      metadata: testAsset.metadata,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  const assetDeletedResult = await testWebhookEndpoint('assets/deleted', assetDeletedPayload, 'Asset Deleted');
  results.assetDeleted = assetDeletedResult.success;
  
  // Test 5: Composite Created Webhook
  const compositeCreatedPayload = {
    event: 'composite.created',
    data: {
      compositeId: testComposite.compositeId,
      layer: testComposite.layer,
      category: testComposite.category,
      subcategory: testComposite.subcategory,
      name: testComposite.name,
      gcpStorageUrl: testComposite.gcpStorageUrl,
      compositeType: testComposite.compositeType,
      componentCount: testComposite.componentCount,
      componentLayers: testComposite.componentLayers,
      componentIds: testComposite.componentIds,
      metadata: testComposite.metadata,
      components: testComposite.components,
      timestamp: testComposite.timestamp
    },
    timestamp: testComposite.timestamp
  };
  
  const compositeCreatedResult = await testWebhookEndpoint('composites/created', compositeCreatedPayload, 'Composite Created');
  results.compositeCreated = compositeCreatedResult.success;
  
  // Results Summary
  console.log('\n📊 INTEGRATION TEST RESULTS');
  console.log('==========================');
  console.log(`✅ Service Health: ${results.health ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Asset Created: ${results.assetCreated ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Asset Updated: ${results.assetUpdated ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Asset Deleted: ${results.assetDeleted ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Composite Created: ${results.compositeCreated ? 'PASS' : 'FAIL'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  
  if (successRate === 100) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log('✅ Webhook integration is fully functional');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('\n⚠️  Some tests failed - review the logs above');
    console.log('🔧 Fix issues before proceeding to production');
  }
  
  return results;
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests()
    .then(results => {
      process.exit(Object.values(results).every(Boolean) ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Integration test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests, testWebhookEndpoint, testServiceHealth };
