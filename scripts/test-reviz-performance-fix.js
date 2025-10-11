#!/usr/bin/env node

/**
 * 🚀 ReViz API Performance Test - Critical Fix Verification
 * Tests the performance improvements for the 35+ second response time issue
 */

const axios = require('axios');

const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const TEST_TIMEOUT = 15000; // 15 seconds max

class ReVizPerformanceTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async testReVizCompositeAPI() {
    console.log('🚀 Testing ReViz Composite API Performance Fix');
    console.log('===============================================');
    
    const testCases = [
      {
        name: 'ReViz Complete Experience - Valid Song',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        data: {
          song_id: '1.001.003.001',
          user_context: {
            user_id: 'test_user_123',
            preferences: {
              energy_preference: 'high',
              style_preference: 'modern'
            }
          },
          experience_config: {
            max_composites: 5,
            max_assets_per_layer: 6,
            include_variants: true,
            variant_depth: 3,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      },
      {
        name: 'ReViz Complete Experience - Invalid Song (Fallback Test)',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        data: {
          song_id: 'INVALID_SONG_123',
          user_context: {
            user_id: 'test_user_456'
          },
          experience_config: {
            max_composites: 3,
            max_assets_per_layer: 4,
            include_variants: false,
            layers: ['stars', 'looks']
          }
        }
      },
      {
        name: 'ReViz Composite Experience - Valid Composite',
        endpoint: '/api/v1/reviz/composite/complete-experience',
        method: 'POST',
        data: {
          composite_id: 'C.001.001.001',
          user_context: {
            user_id: 'test_user_789',
            preferences: {
              energy_preference: 'medium',
              style_preference: 'classic'
            }
          },
          experience_config: {
            max_assets_per_layer: 5,
            include_variants: true,
            variant_depth: 3,
            layers: ['stars', 'looks', 'moves', 'worlds']
          }
        }
      }
    ];

    for (const testCase of testCases) {
      await this.runPerformanceTest(testCase);
    }

    this.generateReport();
  }

  async runPerformanceTest(testCase) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`📡 Endpoint: ${testCase.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let responseSize = 0;

    try {
      const response = await axios({
        method: testCase.method,
        url: `${ALGORHYTHM_BASE_URL}${testCase.endpoint}`,
        data: testCase.data,
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc'
        }
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;
      responseSize = JSON.stringify(response.data).length;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`📦 Response Size: ${(responseSize / 1024).toFixed(2)}KB`);

      // Check for performance indicators
      if (responseTime < 1000) {
        console.log(`🚀 EXCELLENT: Response time < 1 second`);
      } else if (responseTime < 5000) {
        console.log(`✅ GOOD: Response time < 5 seconds`);
      } else if (responseTime < 10000) {
        console.log(`⚠️  SLOW: Response time < 10 seconds`);
      } else {
        console.log(`🚨 CRITICAL: Response time > 10 seconds`);
      }

      // Check for fallback indicators
      if (response.data?.metadata?.partial_response) {
        console.log(`🔄 FALLBACK: Using fallback response`);
      }

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (responseTime > 35000) {
        console.log(`🚨 CRITICAL: Response time > 35 seconds - Performance issue not fixed!`);
      }
    }

    this.results.push({
      name: testCase.name,
      endpoint: testCase.endpoint,
      responseTime,
      success,
      statusCode,
      responseSize,
      error,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('==========================');
    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log(`🧪 Tests Run: ${this.results.length}`);
    
    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successfulTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    
    if (successfulTests.length > 0) {
      const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
      const maxResponseTime = Math.max(...successfulTests.map(r => r.responseTime));
      const minResponseTime = Math.min(...successfulTests.map(r => r.responseTime));
      
      console.log(`\n📈 PERFORMANCE METRICS:`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Fastest Response: ${minResponseTime}ms`);
      console.log(`   Slowest Response: ${maxResponseTime}ms`);
      
      if (maxResponseTime < 1000) {
        console.log(`🚀 EXCELLENT: All responses under 1 second`);
      } else if (maxResponseTime < 5000) {
        console.log(`✅ GOOD: All responses under 5 seconds`);
      } else if (maxResponseTime < 10000) {
        console.log(`⚠️  SLOW: Some responses over 5 seconds`);
      } else {
        console.log(`🚨 CRITICAL: Some responses over 10 seconds`);
      }
    }
    
    if (failedTests.length > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.error} (${test.responseTime}ms)`);
      });
    }
    
    // Check for the original 35+ second issue
    const criticalTests = this.results.filter(r => r.responseTime > 35000);
    if (criticalTests.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUE DETECTED:`);
      console.log(`   ${criticalTests.length} tests still taking 35+ seconds`);
      console.log(`   Performance fix may not be working properly`);
    } else {
      console.log(`\n✅ PERFORMANCE FIX SUCCESSFUL:`);
      console.log(`   No tests exceeded 35 seconds`);
      console.log(`   Critical performance issue appears to be resolved`);
    }
  }
}

async function main() {
  console.log('🚀 ReViz API Performance Test - Critical Fix Verification');
  console.log('========================================================');
  console.log(`🎯 Target: ${ALGORHYTHM_BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
  
  const tester = new ReVizPerformanceTester();
  await tester.testReVizCompositeAPI();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = ReVizPerformanceTester;
