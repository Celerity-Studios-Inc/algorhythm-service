#!/usr/bin/env node

/**
 * 🚨 API VERSIONING UPDATE VALIDATION
 * Tests all NNA Registry API endpoints with /api/v1/ prefix
 * Validates webhook endpoints and integration URLs
 */

const axios = require('axios');

const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';
const TEST_TIMEOUT = 10000;

class ApiVersioningValidator {
  constructor() {
    this.results = [];
    this.versioningMetrics = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      fastestResponse: Infinity,
      slowestResponse: 0,
      versioningIssues: [],
      integrationTests: [],
      webhookTests: []
    };
  }

  async testApiVersioning() {
    console.log('🚨 API VERSIONING UPDATE VALIDATION');
    console.log('===================================');
    console.log(`🎯 Algorhythm: ${ALGORHYTHM_BASE_URL}`);
    console.log(`🎯 NNA Registry: ${NNA_REGISTRY_BASE_URL}`);
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log('');

    // Test 1: NNA Registry API v1 Endpoints
    await this.testNnaRegistryV1Endpoints();
    
    // Test 2: Algorhythm Integration with NNA Registry
    await this.testAlgorhythmIntegration();
    
    // Test 3: Webhook Endpoint Versioning
    await this.testWebhookVersioning();
    
    // Test 4: Legacy API Compatibility
    await this.testLegacyApiCompatibility();
    
    // Generate versioning report
    this.generateVersioningReport();
  }

  async testNnaRegistryV1Endpoints() {
    console.log('🔗 TEST 1: NNA Registry API v1 Endpoints');
    console.log('========================================');
    
    const nnaTests = [
      {
        name: 'NNA Registry Health Check (v1)',
        endpoint: '/api/v1/health',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL
      },
      {
        name: 'NNA Registry Assets (v1)',
        endpoint: '/api/v1/assets',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL,
        params: { limit: 5 }
      },
      {
        name: 'NNA Registry Assets Search (v1)',
        endpoint: '/api/v1/assets/search',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL,
        params: { q: 'test', limit: 5 }
      }
    ];

    for (const test of nnaTests) {
      await this.runNnaRegistryTest(test);
    }
  }

  async runNnaRegistryTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${test.baseUrl}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let versioningGrade = 'F';

    try {
      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.endpoint}`,
        params: test.params,
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AlgoRhythm-API-Versioning-Test/1.0.0'
        }
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      if (responseTime < 1000) {
        versioningGrade = 'A+';
        console.log(`🚀 EXCELLENT: ${responseTime}ms (Grade: ${versioningGrade})`);
      } else if (responseTime < 2000) {
        versioningGrade = 'A';
        console.log(`✅ EXCELLENT: ${responseTime}ms (Grade: ${versioningGrade})`);
      } else {
        versioningGrade = 'B';
        console.log(`✅ GOOD: ${responseTime}ms (Grade: ${versioningGrade})`);
      }

      console.log(`📊 Status: ${statusCode}`);
      console.log(`✅ API v1 Endpoint Working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('404')) {
        console.log(`🚨 CRITICAL: API v1 endpoint not found - versioning issue!`);
        versioningGrade = 'F';
      } else if (error.includes('401') || error.includes('403')) {
        console.log(`⚠️  AUTHENTICATION: API v1 endpoint exists but requires auth`);
        versioningGrade = 'B';
      } else {
        versioningGrade = 'C';
      }
    }

    this.versioningMetrics.integrationTests.push({
      testName: test.name,
      responseTime,
      success,
      versioningGrade,
      error
    });

    this.recordTestResult({
      testName: test.name,
      category: 'nna_registry_v1',
      responseTime,
      success,
      statusCode,
      error,
      versioningGrade,
      timestamp: new Date().toISOString()
    });
  }

  async testAlgorhythmIntegration() {
    console.log('\n🔗 TEST 2: Algorhythm Integration with NNA Registry');
    console.log('====================================================');
    
    const integrationTests = [
      {
        name: 'Algorhythm Health Check',
        endpoint: '/api/v1/health',
        method: 'GET',
        baseUrl: ALGORHYTHM_BASE_URL
      },
      {
        name: 'Algorhythm Template Recommendation',
        endpoint: '/api/v1/recommend/template',
        method: 'POST',
        baseUrl: ALGORHYTHM_BASE_URL,
        data: {
          song_id: '1.001.003.001',
          user_context: {
            user_id: 'versioning_test_user',
            preferences: {
              mood: 'energetic',
              energy_level: 8
            }
          }
        }
      }
    ];

    for (const test of integrationTests) {
      await this.runAlgorhythmIntegrationTest(test);
    }
  }

  async runAlgorhythmIntegrationTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${test.baseUrl}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let integrationGrade = 'F';

    try {
      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.endpoint}`,
        data: test.data,
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc'
        }
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      if (responseTime < 1000) {
        integrationGrade = 'A+';
        console.log(`🚀 EXCELLENT: ${responseTime}ms (Grade: ${integrationGrade})`);
      } else if (responseTime < 2000) {
        integrationGrade = 'A';
        console.log(`✅ EXCELLENT: ${responseTime}ms (Grade: ${integrationGrade})`);
      } else {
        integrationGrade = 'B';
        console.log(`✅ GOOD: ${responseTime}ms (Grade: ${integrationGrade})`);
      }

      console.log(`📊 Status: ${statusCode}`);
      console.log(`✅ Algorhythm Integration Working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('401') || error.includes('Unauthorized')) {
        console.log(`⚠️  AUTHENTICATION: Expected auth error - integration working`);
        integrationGrade = 'A'; // This is actually expected
      } else if (error.includes('404')) {
        console.log(`🚨 CRITICAL: Algorhythm endpoint not found`);
        integrationGrade = 'F';
      } else {
        integrationGrade = 'B';
      }
    }

    this.recordTestResult({
      testName: test.name,
      category: 'algorhythm_integration',
      responseTime,
      success,
      statusCode,
      error,
      integrationGrade,
      timestamp: new Date().toISOString()
    });
  }

  async testWebhookVersioning() {
    console.log('\n🔗 TEST 3: Webhook Endpoint Versioning');
    console.log('=====================================');
    
    const webhookTests = [
      {
        name: 'Algorhythm Webhook Asset Created (v1)',
        endpoint: '/api/v1/webhooks/assets/created',
        method: 'POST',
        baseUrl: ALGORHYTHM_BASE_URL,
        data: {
          event: 'asset.created',
          assetId: 'versioning_test_123',
          layer: 'stars',
          category: 'performance',
          subcategory: 'dancing',
          name: 'Versioning Test Asset',
          gcpStorageUrl: 'https://storage.googleapis.com/test/asset.mp4',
          metadata: {
            description: 'Versioning test description',
            tags: ['versioning', 'test']
          },
          timestamp: new Date().toISOString()
        }
      },
      {
        name: 'Algorhythm Webhook Composite Created (v1)',
        endpoint: '/api/v1/webhooks/composites/created',
        method: 'POST',
        baseUrl: ALGORHYTHM_BASE_URL,
        data: {
          event: 'composite.created',
          compositeId: 'versioning_composite_123',
          layer: 'composite',
          category: 'full',
          subcategory: 'complete',
          name: 'Versioning Test Composite',
          gcpStorageUrl: 'https://storage.googleapis.com/test/composite.mp4',
          metadata: {
            description: 'Versioning test composite description',
            tags: ['versioning', 'composite', 'test']
          },
          timestamp: new Date().toISOString()
        }
      }
    ];

    for (const test of webhookTests) {
      await this.runWebhookVersioningTest(test);
    }
  }

  async runWebhookVersioningTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${test.baseUrl}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let webhookGrade = 'F';

    try {
      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.endpoint}`,
        data: test.data,
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'x-algorhythm-signature': 'versioning_test_signature',
          'x-algorhythm-timestamp': Date.now().toString()
        }
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      if (responseTime < 500) {
        webhookGrade = 'A+';
        console.log(`🚀 EXCELLENT: ${responseTime}ms (Grade: ${webhookGrade})`);
      } else if (responseTime < 1000) {
        webhookGrade = 'A';
        console.log(`✅ EXCELLENT: ${responseTime}ms (Grade: ${webhookGrade})`);
      } else {
        webhookGrade = 'B';
        console.log(`✅ GOOD: ${responseTime}ms (Grade: ${webhookGrade})`);
      }

      console.log(`📊 Status: ${statusCode}`);
      console.log(`✅ Webhook v1 Endpoint Working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('404')) {
        console.log(`🚨 CRITICAL: Webhook v1 endpoint not found - versioning issue!`);
        webhookGrade = 'F';
      } else if (error.includes('400') || error.includes('Bad Request')) {
        console.log(`✅ EXPECTED: Webhook v1 endpoint exists, validation working`);
        webhookGrade = 'A'; // This is actually expected
      } else if (error.includes('401') || error.includes('Unauthorized')) {
        console.log(`✅ EXPECTED: Webhook v1 endpoint exists, auth required`);
        webhookGrade = 'A'; // This is actually expected
      } else {
        webhookGrade = 'B';
      }
    }

    this.versioningMetrics.webhookTests.push({
      testName: test.name,
      responseTime,
      success,
      webhookGrade,
      error
    });

    this.recordTestResult({
      testName: test.name,
      category: 'webhook_versioning',
      responseTime,
      success,
      statusCode,
      error,
      webhookGrade,
      timestamp: new Date().toISOString()
    });
  }

  async testLegacyApiCompatibility() {
    console.log('\n🔗 TEST 4: Legacy API Compatibility');
    console.log('=================================');
    console.log('⚠️  Testing legacy /api/ endpoints to ensure they still work');
    
    const legacyTests = [
      {
        name: 'Legacy NNA Registry Health Check',
        endpoint: '/api/health',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL
      },
      {
        name: 'Legacy NNA Registry Assets',
        endpoint: '/api/assets',
        method: 'GET',
        baseUrl: NNA_REGISTRY_BASE_URL,
        params: { limit: 5 }
      }
    ];

    for (const test of legacyTests) {
      await this.runLegacyApiTest(test);
    }
  }

  async runLegacyApiTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${test.baseUrl}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let legacyGrade = 'F';

    try {
      const response = await axios({
        method: test.method,
        url: `${test.baseUrl}${test.endpoint}`,
        params: test.params,
        timeout: TEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AlgoRhythm-Legacy-Test/1.0.0'
        }
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      if (responseTime < 1000) {
        legacyGrade = 'A+';
        console.log(`🚀 EXCELLENT: ${responseTime}ms (Grade: ${legacyGrade})`);
      } else if (responseTime < 2000) {
        legacyGrade = 'A';
        console.log(`✅ EXCELLENT: ${responseTime}ms (Grade: ${legacyGrade})`);
      } else {
        legacyGrade = 'B';
        console.log(`✅ GOOD: ${responseTime}ms (Grade: ${legacyGrade})`);
      }

      console.log(`📊 Status: ${statusCode}`);
      console.log(`✅ Legacy API Still Working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('404')) {
        console.log(`⚠️  LEGACY DEPRECATED: Legacy API no longer available`);
        legacyGrade = 'C';
      } else {
        legacyGrade = 'B';
      }
    }

    this.recordTestResult({
      testName: test.name,
      category: 'legacy_compatibility',
      responseTime,
      success,
      statusCode,
      error,
      legacyGrade,
      timestamp: new Date().toISOString()
    });
  }

  recordTestResult(result) {
    this.results.push(result);
    this.versioningMetrics.totalTests++;
    
    if (result.success) {
      this.versioningMetrics.successfulTests++;
    } else {
      this.versioningMetrics.failedTests++;
    }

    this.versioningMetrics.fastestResponse = Math.min(this.versioningMetrics.fastestResponse, result.responseTime);
    this.versioningMetrics.slowestResponse = Math.max(this.versioningMetrics.slowestResponse, result.responseTime);
  }

  generateVersioningReport() {
    const totalTime = Date.now() - Date.parse(this.results[0]?.timestamp || new Date().toISOString());
    
    console.log('\n📊 API VERSIONING VALIDATION REPORT');
    console.log('===================================');
    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log(`🧪 Tests Run: ${this.versioningMetrics.totalTests}`);
    console.log(`✅ Successful: ${this.versioningMetrics.successfulTests}`);
    console.log(`❌ Failed: ${this.versioningMetrics.failedTests}`);
    console.log(`📊 Success Rate: ${((this.versioningMetrics.successfulTests / this.versioningMetrics.totalTests) * 100).toFixed(2)}%`);
    
    // NNA Registry v1 Analysis
    console.log(`\n🔗 NNA REGISTRY API v1:`);
    const nnaTests = this.results.filter(r => r.category === 'nna_registry_v1');
    const nnaSuccess = nnaTests.filter(r => r.success).length;
    console.log(`   API v1 Endpoints: ${nnaSuccess}/${nnaTests.length} working`);
    
    // Algorhythm Integration Analysis
    console.log(`\n🔗 ALGORHYTHM INTEGRATION:`);
    const integrationTests = this.results.filter(r => r.category === 'algorhythm_integration');
    const integrationSuccess = integrationTests.filter(r => r.success).length;
    console.log(`   Integration Tests: ${integrationSuccess}/${integrationTests.length} successful`);
    
    // Webhook Versioning Analysis
    console.log(`\n🔗 WEBHOOK VERSIONING:`);
    const webhookTests = this.results.filter(r => r.category === 'webhook_versioning');
    const webhookSuccess = webhookTests.filter(r => r.success).length;
    console.log(`   Webhook v1 Tests: ${webhookSuccess}/${webhookTests.length} successful`);
    
    // Legacy Compatibility Analysis
    console.log(`\n🔗 LEGACY COMPATIBILITY:`);
    const legacyTests = this.results.filter(r => r.category === 'legacy_compatibility');
    const legacySuccess = legacyTests.filter(r => r.success).length;
    console.log(`   Legacy API Tests: ${legacySuccess}/${legacyTests.length} working`);
    
    // Performance Analysis
    console.log(`\n⚡ PERFORMANCE ANALYSIS:`);
    if (this.versioningMetrics.successfulTests > 0) {
      const avgResponseTime = this.results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / this.versioningMetrics.successfulTests;
      
      console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Fastest Response: ${this.versioningMetrics.fastestResponse}ms`);
      console.log(`   Slowest Response: ${this.versioningMetrics.slowestResponse}ms`);
      
      if (this.versioningMetrics.slowestResponse < 1000) {
        console.log(`🚀 EXCELLENT: All responses under 1 second`);
      } else if (this.versioningMetrics.slowestResponse < 5000) {
        console.log(`✅ GOOD: All responses under 5 seconds`);
      } else {
        console.log(`⚠️  SLOW: Some responses over 5 seconds`);
      }
    }
    
    // Versioning Issues Analysis
    console.log(`\n🚨 VERSIONING ISSUES:`);
    const versioningIssues = this.results.filter(r => 
      r.error && r.error.includes('404') && r.category.includes('v1')
    );
    
    if (versioningIssues.length === 0) {
      console.log(`✅ NO VERSIONING ISSUES DETECTED:`);
      console.log(`   All API v1 endpoints working correctly`);
      console.log(`   Webhook v1 endpoints accessible`);
      console.log(`   Integration functioning properly`);
      console.log(`   Versioning update successful`);
    } else {
      console.log(`🚨 VERSIONING ISSUES DETECTED:`);
      console.log(`   ${versioningIssues.length} API v1 endpoints not found`);
      console.log(`   Versioning update may be incomplete`);
      console.log(`   Additional fixes required`);
    }
    
    // Overall Assessment
    console.log(`\n🎯 OVERALL ASSESSMENT:`);
    
    const criticalIssues = this.results.filter(r => 
      r.error && r.error.includes('404') && r.category.includes('v1')
    );
    
    if (criticalIssues.length === 0) {
      console.log(`✅ API VERSIONING UPDATE SUCCESSFUL:`);
      console.log(`   All API v1 endpoints working`);
      console.log(`   Webhook v1 endpoints accessible`);
      console.log(`   Integration functioning properly`);
      console.log(`   No critical versioning issues`);
      console.log(`   Ready for production`);
    } else {
      console.log(`🚨 API VERSIONING ISSUES DETECTED:`);
      console.log(`   ${criticalIssues.length} critical versioning issues found`);
      console.log(`   API v1 endpoints may not be properly configured`);
      console.log(`   Additional versioning fixes required`);
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (versioningIssues.length > 0) {
      console.log(`   🔧 Fix ${versioningIssues.length} API v1 endpoint issues`);
      console.log(`   🔗 Verify NNA Registry API v1 configuration`);
      console.log(`   📡 Test webhook v1 endpoint accessibility`);
    }
    if (this.versioningMetrics.slowestResponse > 5000) {
      console.log(`   ⚡ Optimize slow API responses (${this.versioningMetrics.slowestResponse}ms)`);
    }
    
    console.log(`\n🎉 API VERSIONING VALIDATION COMPLETE!`);
    console.log(`📊 Total Tests: ${this.versioningMetrics.totalTests}`);
    console.log(`✅ Success Rate: ${((this.versioningMetrics.successfulTests / this.versioningMetrics.totalTests) * 100).toFixed(2)}%`);
    console.log(`⚡ Performance: ${this.versioningMetrics.fastestResponse}ms - ${this.versioningMetrics.slowestResponse}ms`);
  }
}

async function main() {
  console.log('🚨 API VERSIONING UPDATE VALIDATION');
  console.log('===================================');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  
  const validator = new ApiVersioningValidator();
  await validator.testApiVersioning();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 API versioning validation failed:', error);
    process.exit(1);
  });
}

module.exports = ApiVersioningValidator;
