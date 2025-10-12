#!/usr/bin/env node

/**
 * 🚀 ALGORHYTHM TEAM - COMPREHENSIVE END-TO-END TESTING
 * Complete testing of Algorhythm service with new build deployment
 * Tests all critical endpoints, authentication, and integration
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';

class AlgorhythmE2ETester {
  constructor() {
    this.jwtSecret = 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39';
    this.results = [];
    this.startTime = Date.now();
  }

  async runComprehensiveE2ETest() {
    console.log('🚀 ALGORHYTHM TEAM - COMPREHENSIVE END-TO-END TESTING');
    console.log('=====================================================');
    console.log(`🎯 Algorhythm Service: ${ALGORHYTHM_BASE_URL}`);
    console.log(`🎯 NNA Registry: ${NNA_REGISTRY_BASE_URL}`);
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log('');

    // Step 1: Test Service Health
    await this.testServiceHealth();
    
    // Step 2: Test Authentication System
    await this.testAuthenticationSystem();
    
    // Step 3: Test Core Recommendation APIs
    await this.testCoreRecommendationAPIs();
    
    // Step 4: Test ReViz Integration APIs
    await this.testReVizIntegrationAPIs();
    
    // Step 5: Test NNA Registry Integration
    await this.testNnaRegistryIntegration();
    
    // Step 6: Test Performance and Response Times
    await this.testPerformanceMetrics();
    
    // Generate comprehensive report
    this.generateComprehensiveReport();
  }

  async testServiceHealth() {
    console.log('🏥 STEP 1: Service Health Testing');
    console.log('=================================');
    
    const healthTests = [
      {
        name: 'Algorhythm Health Check',
        endpoint: '/api/v1/health',
        method: 'GET'
      },
      {
        name: 'Swagger Documentation',
        endpoint: '/api/docs',
        method: 'GET'
      },
      {
        name: 'Auth Debug Endpoint',
        endpoint: '/api/v1/auth/debug',
        method: 'GET'
      }
    ];

    for (const test of healthTests) {
      await this.runHealthTest(test);
    }
  }

  async testAuthenticationSystem() {
    console.log('\n🔐 STEP 2: Authentication System Testing');
    console.log('========================================');
    
    // Generate valid JWT tokens
    const algorhythmToken = this.generateJWTToken('algorhythm');
    const nnaToken = this.generateJWTToken('nna_registry');
    
    const authTests = [
      {
        name: 'JWT Test Endpoint - Algorhythm Token',
        endpoint: '/api/v1/auth/test-jwt',
        method: 'POST',
        token: algorhythmToken,
        data: { user: 'test_user' }
      },
      {
        name: 'JWT Test Endpoint - NNA Registry Token',
        endpoint: '/api/v1/auth/test-jwt',
        method: 'POST',
        token: nnaToken,
        data: { user: 'test_user' }
      }
    ];

    for (const test of authTests) {
      await this.runAuthenticationTest(test);
    }
  }

  async testCoreRecommendationAPIs() {
    console.log('\n🎯 STEP 3: Core Recommendation APIs Testing');
    console.log('==========================================');
    
    const algorhythmToken = this.generateJWTToken('algorhythm');
    
    const recommendationTests = [
      {
        name: 'Template Recommendation API',
        endpoint: '/api/v1/recommend/template',
        method: 'POST',
        token: algorhythmToken,
        data: {
          song_id: '1.001.003.001',
          user_context: {
            user_id: 'test_user',
            preferences: {
              mood: 'energetic',
              energy_level: 8
            }
          }
        }
      },
      {
        name: 'Layer Variations API',
        endpoint: '/api/v1/recommend/variations',
        method: 'POST',
        token: algorhythmToken,
        data: {
          current_template_id: 'C.001.001.001',
          vary_layer: 'stars',
          song_id: '1.001.003.001',
          limit: 5
        }
      }
    ];

    for (const test of recommendationTests) {
      await this.runRecommendationTest(test);
    }
  }

  async testReVizIntegrationAPIs() {
    console.log('\n🎬 STEP 4: ReViz Integration APIs Testing');
    console.log('========================================');
    
    const algorhythmToken = this.generateJWTToken('algorhythm');
    
    const revizTests = [
      {
        name: 'ReViz Complete Experience API',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        token: algorhythmToken,
        data: {
          song_id: '1.001.003.001',
          user_context: {
            user_id: 'test_user',
            preferences: {
              mood: 'energetic',
              energy_level: 8
            }
          }
        }
      },
      {
        name: 'ReViz Composite Experience API',
        endpoint: '/api/v1/reviz/composite/complete-experience',
        method: 'POST',
        token: algorhythmToken,
        data: {
          composite_id: 'C.001.001.001',
          user_context: {
            user_id: 'test_user'
          }
        }
      }
    ];

    for (const test of revizTests) {
      await this.runReVizTest(test);
    }
  }

  async testNnaRegistryIntegration() {
    console.log('\n🔗 STEP 5: NNA Registry Integration Testing');
    console.log('===========================================');
    
    const nnaTests = [
      {
        name: 'NNA Registry Health Check',
        endpoint: '/api/v1/health',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL
      },
      {
        name: 'NNA Registry Assets Endpoint',
        endpoint: '/api/v1/assets',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL
      }
    ];

    for (const test of nnaTests) {
      await this.runNnaRegistryTest(test);
    }
  }

  async testPerformanceMetrics() {
    console.log('\n⚡ STEP 6: Performance Metrics Testing');
    console.log('=====================================');
    
    const performanceTests = [
      {
        name: 'Health Endpoint Performance',
        endpoint: '/api/v1/health',
        method: 'GET',
        iterations: 5
      },
      {
        name: 'Auth Debug Performance',
        endpoint: '/api/v1/auth/debug',
        method: 'GET',
        iterations: 5
      }
    ];

    for (const test of performanceTests) {
      await this.runPerformanceTest(test);
    }
  }

  generateJWTToken(source) {
    const payload = {
      userId: '68e6d2e61d4af4ea17516073',
      email: 'ajay@celerity.studio',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }

  async runHealthTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;

    try {
      const response = await axios({
        method: test.method,
        url: `${ALGORHYTHM_BASE_URL}${test.endpoint}`,
        timeout: 10000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🏥 Health: Service running correctly`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }

    this.recordTestResult({
      category: 'Health',
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async runAuthenticationTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;

    try {
      const response = await axios({
        method: test.method,
        url: `${ALGORHYTHM_BASE_URL}${test.endpoint}`,
        data: test.data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${test.token}`
        },
        timeout: 10000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🔐 Authentication: Working correctly`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }

    this.recordTestResult({
      category: 'Authentication',
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async runRecommendationTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;

    try {
      const response = await axios({
        method: test.method,
        url: `${ALGORHYTHM_BASE_URL}${test.endpoint}`,
        data: test.data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${test.token}`
        },
        timeout: 15000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🎯 Recommendation: API working correctly`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }

    this.recordTestResult({
      category: 'Recommendation',
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async runReVizTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;

    try {
      const response = await axios({
        method: test.method,
        url: `${ALGORHYTHM_BASE_URL}${test.endpoint}`,
        data: test.data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${test.token}`
        },
        timeout: 15000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🎬 ReViz Integration: Working correctly`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }

    this.recordTestResult({
      category: 'ReViz',
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async runNnaRegistryTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${test.baseUrl}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;

    try {
      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.endpoint}`,
        timeout: 10000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🔗 NNA Registry: Integration working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }

    this.recordTestResult({
      category: 'NNA Registry',
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      timestamp: new Date().toISOString()
    });
  }

  async runPerformanceTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const responseTimes = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < test.iterations; i++) {
      const startTime = Date.now();
      let responseTime = 0;
      let success = false;

      try {
        const response = await axios({
          method: test.method,
          url: `${ALGORHYTHM_BASE_URL}${test.endpoint}`,
          timeout: 10000
        });

        responseTime = Date.now() - startTime;
        success = true;
        successCount++;

      } catch (error) {
        responseTime = Date.now() - startTime;
        success = false;
        failureCount++;
      }

      responseTimes.push(responseTime);
    }

    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    console.log(`📊 Performance Results:`);
    console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min: ${minResponseTime}ms`);
    console.log(`   Max: ${maxResponseTime}ms`);
    console.log(`   Success Rate: ${((successCount / test.iterations) * 100).toFixed(2)}%`);

    this.recordTestResult({
      category: 'Performance',
      testName: test.name,
      responseTime: avgResponseTime,
      success: successCount > 0,
      statusCode: successCount > 0 ? 200 : 0,
      error: failureCount > 0 ? `${failureCount} failures` : null,
      timestamp: new Date().toISOString(),
      performance: {
        average: avgResponseTime,
        min: minResponseTime,
        max: maxResponseTime,
        successRate: (successCount / test.iterations) * 100
      }
    });
  }

  recordTestResult(result) {
    this.results.push(result);
  }

  generateComprehensiveReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📊 ALGORHYTHM TEAM - COMPREHENSIVE E2E TEST REPORT');
    console.log('==================================================');
    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log(`🧪 Tests Run: ${this.results.length}`);
    
    // Category Analysis
    const categories = {};
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, success: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.success) {
        categories[result.category].success++;
      } else {
        categories[result.category].failed++;
      }
    });

    console.log(`\n📊 CATEGORY BREAKDOWN:`);
    Object.keys(categories).forEach(category => {
      const stats = categories[category];
      const successRate = ((stats.success / stats.total) * 100).toFixed(2);
      console.log(`   ${category}: ${stats.success}/${stats.total} (${successRate}%)`);
    });
    
    // Overall Analysis
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const overallSuccessRate = ((successful / this.results.length) * 100).toFixed(2);
    
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Success Rate: ${overallSuccessRate}%`);
    
    // Performance Analysis
    const responseTimes = this.results.filter(r => r.responseTime).map(r => r.responseTime);
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const fastestResponse = Math.min(...responseTimes);
      const slowestResponse = Math.max(...responseTimes);
      
      console.log(`\n⚡ PERFORMANCE METRICS:`);
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Fastest Response: ${fastestResponse}ms`);
      console.log(`   Slowest Response: ${slowestResponse}ms`);
    }
    
    // Issue Analysis
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(`\n🚨 FAILED TESTS:`);
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.category}: ${test.testName}`);
        console.log(`      Status: ${test.statusCode}`);
        console.log(`      Error: ${test.error}`);
      });
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (overallSuccessRate >= 90) {
      console.log(`   🎉 EXCELLENT: Service is performing very well!`);
      console.log(`   🚀 Ready for production deployment`);
    } else if (overallSuccessRate >= 70) {
      console.log(`   ⚠️  GOOD: Service is mostly working with some issues`);
      console.log(`   🔧 Address failed tests before production`);
    } else {
      console.log(`   🚨 CRITICAL: Service has significant issues`);
      console.log(`   🔧 Major fixes required before production`);
    }
    
    console.log(`\n🎉 ALGORHYTHM TEAM E2E TESTING COMPLETE!`);
    console.log(`📊 Total Tests: ${this.results.length}`);
    console.log(`✅ Success Rate: ${overallSuccessRate}%`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
  }
}

async function main() {
  console.log('🚀 ALGORHYTHM TEAM - COMPREHENSIVE END-TO-END TESTING');
  console.log('=====================================================');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  
  const tester = new AlgorhythmE2ETester();
  await tester.runComprehensiveE2ETest();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Algorhythm E2E testing failed:', error);
    process.exit(1);
  });
}

module.exports = AlgorhythmE2ETester;
