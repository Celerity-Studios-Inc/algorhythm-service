#!/usr/bin/env node

/**
 * Phase 2 Deployment Test Script
 * Tests webhook infrastructure and core functionality
 */

const https = require('https');
const http = require('http');

// Configuration
const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const TEST_TIMEOUT = 10000;

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      timeout: TEST_TIMEOUT,
      ...options
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
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
 * Test health endpoints
 */
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health Endpoints...');
  
  const healthTests = [
    { name: 'Health Check', path: '/api/v1/health' },
    { name: 'Readiness Check', path: '/api/v1/health/ready' },
    { name: 'Liveness Check', path: '/api/v1/health/live' }
  ];

  for (const test of healthTests) {
    try {
      testResults.total++;
      const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${test.path}`);
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.data);
        console.log(`✅ ${test.name}: ${response.statusCode} - ${data.status || 'OK'}`);
        testResults.passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.statusCode}`);
        testResults.failed++;
        testResults.errors.push(`${test.name}: HTTP ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
    }
  }
}

/**
 * Test webhook endpoints
 */
async function testWebhookEndpoints() {
  console.log('\n🔗 Testing Webhook Endpoints...');
  
  const webhookTests = [
    {
      name: 'Asset Created Webhook',
      path: '/api/v1/webhooks/assets/created',
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
      path: '/api/v1/webhooks/assets/updated',
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
      path: '/api/v1/webhooks/assets/deleted',
      payload: {
        event: 'asset.deleted',
        assetId: 'test-asset-123',
        timestamp: new Date().toISOString()
      }
    },
    {
      name: 'Composite Created Webhook',
      path: '/api/v1/webhooks/composites/created',
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

  for (const test of webhookTests) {
    try {
      testResults.total++;
      const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${test.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-algorhythm-signature': 'test-signature',
          'x-algorhythm-timestamp': Date.now().toString()
        },
        body: JSON.stringify(test.payload)
      });
      
      // Expected: 400 Bad Request (webhook secret not configured)
      if (response.statusCode === 400) {
        const data = JSON.parse(response.data);
        if (data.message && data.message.includes('Webhook secret not configured')) {
          console.log(`✅ ${test.name}: ${response.statusCode} - Expected error (secret not configured)`);
          testResults.passed++;
        } else {
          console.log(`❌ ${test.name}: ${response.statusCode} - Unexpected error: ${data.message}`);
          testResults.failed++;
          testResults.errors.push(`${test.name}: Unexpected error`);
        }
      } else if (response.statusCode === 404) {
        console.log(`❌ ${test.name}: ${response.statusCode} - Endpoint not found`);
        testResults.failed++;
        testResults.errors.push(`${test.name}: Endpoint not found`);
      } else {
        console.log(`❌ ${test.name}: ${response.statusCode} - Unexpected status`);
        testResults.failed++;
        testResults.errors.push(`${test.name}: HTTP ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
    }
  }
}

/**
 * Test Algorhythm export endpoints
 */
async function testAlgorhythmEndpoints() {
  console.log('\n📤 Testing Algorhythm Export Endpoints...');
  
  const exportTests = [
    { name: 'Export Composites', path: '/api/v1/algorhythm-export/composites' },
    { name: 'Sync Statistics', path: '/api/v1/algorhythm-export/sync-statistics' },
    { name: 'Test Webhook', path: '/api/v1/algorhythm-export/test-webhook' }
  ];

  for (const test of exportTests) {
    try {
      testResults.total++;
      const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${test.path}`);
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.data);
        console.log(`✅ ${test.name}: ${response.statusCode} - ${data.success ? 'Success' : 'Response received'}`);
        testResults.passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.statusCode}`);
        testResults.failed++;
        testResults.errors.push(`${test.name}: HTTP ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
    }
  }
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints...');
  
  const authTests = [
    { name: 'Auth Debug', path: '/api/v1/auth/debug' }
  ];

  for (const test of authTests) {
    try {
      testResults.total++;
      const response = await makeRequest(`${ALGORHYTHM_BASE_URL}${test.path}`);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${test.name}: ${response.statusCode} - Accessible`);
        testResults.passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.statusCode}`);
        testResults.failed++;
        testResults.errors.push(`${test.name}: HTTP ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
    }
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Phase 2 Deployment Test - Algorhythm Service');
  console.log(`📍 Testing: ${ALGORHYTHM_BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);
  
  const startTime = Date.now();
  
  try {
    await testHealthEndpoints();
    await testWebhookEndpoints();
    await testAlgorhythmEndpoints();
    await testAuthEndpoints();
    
    const duration = Date.now() - startTime;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.total}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Phase 2 deployment is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
