#!/usr/bin/env node

/**
 * 🧪 ALGORHYTHM SERVICE DEPLOYMENT TEST
 * 
 * This script tests the deployed Algorhythm service to verify:
 * - Service is running and accessible
 * - Health check endpoints are working
 * - Basic functionality is available
 * - Webhook endpoints status
 */

import axios from 'axios';

// Configuration
const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  errors: []
};

/**
 * HTTP request helper with timeout
 */
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${ALGORHYTHM_BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'NNA-Registry-Test/1.0.0',
      ...headers,
    },
    timeout: TEST_TIMEOUT,
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

/**
 * Test 1: Service Health Check
 */
async function testServiceHealth() {
  try {
    console.log('🧪 [TEST] Testing Service Health...');
    
    const result = await makeRequest('GET', '/health');
    
    if (result.success && result.status === 200) {
      console.log('✅ [PASS] Service health check passed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return true;
    } else {
      console.log('❌ [FAIL] Service health check failed');
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Service health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Service Readiness Check
 */
async function testServiceReadiness() {
  try {
    console.log('\n🧪 [TEST] Testing Service Readiness...');
    
    const result = await makeRequest('GET', '/ready');
    
    if (result.success && result.status === 200) {
      console.log('✅ [PASS] Service readiness check passed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return true;
    } else {
      console.log('❌ [FAIL] Service readiness check failed');
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Service readiness check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Service Liveness Check
 */
async function testServiceLiveness() {
  try {
    console.log('\n🧪 [TEST] Testing Service Liveness...');
    
    const result = await makeRequest('GET', '/live');
    
    if (result.success && result.status === 200) {
      console.log('✅ [PASS] Service liveness check passed');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return true;
    } else {
      console.log('❌ [FAIL] Service liveness check failed');
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Service liveness check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Basic Service Info
 */
async function testServiceInfo() {
  try {
    console.log('\n🧪 [TEST] Testing Service Info...');
    
    const result = await makeRequest('GET', '/');
    
    if (result.success) {
      console.log('✅ [PASS] Service info accessible');
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return true;
    } else {
      console.log('❌ [FAIL] Service info check failed');
      console.log(`   Error: ${result.error}`);
      console.log(`   Status: ${result.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Service info check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Webhook Endpoints Check
 */
async function testWebhookEndpoints() {
  try {
    console.log('\n🧪 [TEST] Testing Webhook Endpoints...');
    
    const webhookEndpoints = [
      '/webhooks/assets/created',
      '/webhooks/assets/updated',
      '/webhooks/composites/created'
    ];
    
    let availableEndpoints = 0;
    
    for (const endpoint of webhookEndpoints) {
      const result = await makeRequest('GET', endpoint);
      
      if (result.success || result.status === 405) { // 405 = Method Not Allowed (endpoint exists)
        console.log(`✅ [PASS] Webhook endpoint ${endpoint} is available`);
        availableEndpoints++;
      } else {
        console.log(`❌ [FAIL] Webhook endpoint ${endpoint} not available`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Status: ${result.status}`);
      }
    }
    
    if (availableEndpoints === webhookEndpoints.length) {
      console.log('✅ [PASS] All webhook endpoints are available');
      return true;
    } else {
      console.log(`⚠️ [PARTIAL] ${availableEndpoints}/${webhookEndpoints.length} webhook endpoints available`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Webhook endpoints check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Algorhythm Export Endpoints
 */
async function testAlgorhythmExportEndpoints() {
  try {
    console.log('\n🧪 [TEST] Testing Algorhythm Export Endpoints...');
    
    const exportEndpoints = [
      '/api/v1/algorhythm-export/songs',
      '/api/v1/algorhythm-export/templates',
      '/api/v1/algorhythm-export/composites'
    ];
    
    let availableEndpoints = 0;
    
    for (const endpoint of exportEndpoints) {
      const result = await makeRequest('GET', endpoint);
      
      if (result.success || result.status === 405) {
        console.log(`✅ [PASS] Export endpoint ${endpoint} is available`);
        availableEndpoints++;
      } else {
        console.log(`❌ [FAIL] Export endpoint ${endpoint} not available`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Status: ${result.status}`);
      }
    }
    
    if (availableEndpoints === exportEndpoints.length) {
      console.log('✅ [PASS] All export endpoints are available');
      return true;
    } else {
      console.log(`⚠️ [PARTIAL] ${availableEndpoints}/${exportEndpoints.length} export endpoints available`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Export endpoints check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 7: Service Performance
 */
async function testServicePerformance() {
  try {
    console.log('\n🧪 [TEST] Testing Service Performance...');
    
    const startTime = Date.now();
    const result = await makeRequest('GET', '/health');
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    if (result.success && responseTime < 5000) { // Less than 5 seconds
      console.log('✅ [PASS] Service performance is good');
      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Status: ${result.status}`);
      return true;
    } else {
      console.log('❌ [FAIL] Service performance is poor');
      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ [FAIL] Service performance test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAlgorhythmDeploymentTests() {
  console.log('🚀 [ALGORHYTHM DEPLOYMENT] Starting Algorhythm Service Tests...');
  console.log(`📡 [ENDPOINT] Testing against: ${ALGORHYTHM_BASE_URL}`);
  console.log(`⏱️ [TIMEOUT] Request timeout: ${TEST_TIMEOUT}ms`);
  
  try {
    // Run all tests
    const tests = [
      { name: 'Service Health', fn: testServiceHealth },
      { name: 'Service Readiness', fn: testServiceReadiness },
      { name: 'Service Liveness', fn: testServiceLiveness },
      { name: 'Service Info', fn: testServiceInfo },
      { name: 'Webhook Endpoints', fn: testWebhookEndpoints },
      { name: 'Export Endpoints', fn: testAlgorhythmExportEndpoints },
      { name: 'Service Performance', fn: testServicePerformance },
    ];
    
    for (const test of tests) {
      testResults.total++;
      const result = await test.fn();
      if (result) {
        testResults.passed++;
        testResults.tests.push({ name: test.name, status: 'PASS' });
      } else {
        testResults.failed++;
        testResults.tests.push({ name: test.name, status: 'FAIL' });
      }
    }
    
    // Print results
    console.log('\n📊 [RESULTS] Algorhythm Service Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.total}`);
    console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n🎯 [DETAILED RESULTS]');
    testResults.tests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name}: ${test.status}`);
    });
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ [ERRORS] Detailed Error Information:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 [SUCCESS] All Algorhythm service tests passed!');
      console.log('✅ Service is running successfully');
      console.log('✅ Ready for Phase 2 implementation');
    } else {
      console.log('\n⚠️ [WARNING] Some tests failed. Review the logs above.');
      console.log('🔧 Fix issues before proceeding to Phase 2');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('\n💥 [FATAL] Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAlgorhythmDeploymentTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Algorhythm deployment test failed:', error.message);
      process.exit(1);
    });
}

export { runAlgorhythmDeploymentTests };
