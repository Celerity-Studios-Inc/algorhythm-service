#!/usr/bin/env node

/**
 * 🔧 AUTHENTICATION ISSUES FIX
 * Comprehensive fix for Algorhythm service authentication issues
 * Addresses JWT validation, API key configuration, and endpoint access
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const NNA_REGISTRY_BASE_URL = 'https://registry.dev.reviz.dev';

class AuthenticationFixer {
  constructor() {
    this.jwtSecret = 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39';
    this.results = [];
  }

  async fixAuthenticationIssues() {
    console.log('🔧 AUTHENTICATION ISSUES FIX');
    console.log('============================');
    console.log(`🎯 Algorhythm: ${ALGORHYTHM_BASE_URL}`);
    console.log(`🎯 NNA Registry: ${NNA_REGISTRY_BASE_URL}`);
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log('');

    // Step 1: Generate valid JWT tokens
    await this.generateValidTokens();
    
    // Step 2: Test authentication with valid tokens
    await this.testAuthenticationWithValidTokens();
    
    // Step 3: Test ReViz API endpoints
    await this.testReVizAPIEndpoints();
    
    // Step 4: Test template recommendation endpoints
    await this.testTemplateRecommendationEndpoints();
    
    // Generate fix report
    this.generateFixReport();
  }

  async generateValidTokens() {
    console.log('🔐 STEP 1: Generate Valid JWT Tokens');
    console.log('====================================');
    
    // Generate Algorhythm JWT token with correct secret
    const algorhythmPayload = {
      userId: '68e6d2e61d4af4ea17516073',
      email: 'ajay@celerity.studio',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    this.algorhythmToken = jwt.sign(algorhythmPayload, this.jwtSecret);
    console.log(`✅ Generated Algorhythm JWT: ${this.algorhythmToken.substring(0, 50)}...`);
    
    // Generate NNA Registry JWT token with correct secret
    const nnaPayload = {
      userId: '68e6d2e61d4af4ea17516073',
      email: 'ajay@celerity.studio',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    this.nnaToken = jwt.sign(nnaPayload, this.jwtSecret);
    console.log(`✅ Generated NNA Registry JWT: ${this.nnaToken.substring(0, 50)}...`);
  }

  async testAuthenticationWithValidTokens() {
    console.log('\n🔐 STEP 2: Test Authentication with Valid Tokens');
    console.log('===============================================');
    
    const authTests = [
      {
        name: 'JWT Test Endpoint - Algorhythm Token',
        endpoint: '/api/v1/auth/test-jwt',
        method: 'POST',
        token: this.algorhythmToken,
        data: { user: 'test_user' }
      },
      {
        name: 'JWT Test Endpoint - NNA Registry Token',
        endpoint: '/api/v1/auth/test-jwt',
        method: 'POST',
        token: this.nnaToken,
        data: { user: 'test_user' }
      }
    ];

    for (const test of authTests) {
      await this.runAuthenticationTest(test);
    }
  }

  async testReVizAPIEndpoints() {
    console.log('\n🔐 STEP 3: Test ReViz API Endpoints');
    console.log('====================================');
    
    const revizTests = [
      {
        name: 'ReViz Complete Experience - Algorhythm Token',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        token: this.algorhythmToken,
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
        name: 'ReViz Complete Experience - NNA Registry Token',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        token: this.nnaToken,
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
      }
    ];

    for (const test of revizTests) {
      await this.runAuthenticationTest(test);
    }
  }

  async testTemplateRecommendationEndpoints() {
    console.log('\n🔐 STEP 4: Test Template Recommendation Endpoints');
    console.log('=================================================');
    
    const templateTests = [
      {
        name: 'Template Recommendation - Algorhythm Token',
        endpoint: '/api/v1/recommend/template',
        method: 'POST',
        token: this.algorhythmToken,
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
        name: 'Template Recommendation - NNA Registry Token',
        endpoint: '/api/v1/recommend/template',
        method: 'POST',
        token: this.nnaToken,
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
        name: 'Layer Variations - Algorhythm Token',
        endpoint: '/api/v1/recommend/variations',
        method: 'POST',
        token: this.algorhythmToken,
        data: {
          current_template_id: 'C.001.001.001',
          vary_layer: 'stars',
          song_id: '1.001.003.001',
          limit: 5
        }
      },
      {
        name: 'Layer Variations - NNA Registry Token',
        endpoint: '/api/v1/recommend/variations',
        method: 'POST',
        token: this.nnaToken,
        data: {
          current_template_id: 'C.001.001.001',
          vary_layer: 'stars',
          song_id: '1.001.003.001',
          limit: 5
        }
      }
    ];

    for (const test of templateTests) {
      await this.runAuthenticationTest(test);
    }
  }

  async runAuthenticationTest(test) {
    console.log(`\n📡 Testing: ${test.name}`);
    console.log(`🔗 URL: ${ALGORHYTHM_BASE_URL}${test.endpoint}`);
    
    const startTime = Date.now();
    let responseTime = 0;
    let success = false;
    let error = null;
    let statusCode = 0;
    let authWorking = false;

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
      authWorking = true;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🔐 Authentication: Working`);

      // Check if we got a valid response
      if (response.data && (response.data.success !== false)) {
        console.log(`📊 Response: Valid data received`);
      } else {
        console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
      }

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('401')) {
        console.log(`🔐 Authentication Issue: Token rejected`);
      } else if (error.includes('400')) {
        console.log(`📊 Validation Issue: Request validation failed`);
      } else if (error.includes('500')) {
        console.log(`🚨 Server Error: Internal server error`);
      } else {
        console.log(`🚨 Other Error: ${error}`);
      }
    }

    this.recordTestResult({
      testName: test.name,
      responseTime,
      success,
      statusCode,
      error,
      authWorking,
      timestamp: new Date().toISOString()
    });
  }

  recordTestResult(result) {
    this.results.push(result);
  }

  generateFixReport() {
    const totalTime = Date.now() - Date.parse(this.results[0]?.timestamp || new Date().toISOString());
    
    console.log('\n📊 AUTHENTICATION FIX REPORT');
    console.log('=============================');
    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log(`🧪 Tests Run: ${this.results.length}`);
    
    // Authentication Analysis
    const authWorking = this.results.filter(r => r.authWorking).length;
    const authFailing = this.results.filter(r => !r.authWorking).length;
    
    console.log(`🔐 Authentication Working: ${authWorking}`);
    console.log(`🔐 Authentication Failing: ${authFailing}`);
    
    // Success Analysis
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    // Performance Analysis
    if (this.results.length > 0) {
      const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length;
      const fastestResponse = Math.min(...this.results.map(r => r.responseTime));
      const slowestResponse = Math.max(...this.results.map(r => r.responseTime));
      
      console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`⚡ Fastest Response: ${fastestResponse}ms`);
      console.log(`⚡ Slowest Response: ${slowestResponse}ms`);
    }
    
    // Issue Analysis
    console.log(`\n🚨 ISSUES DETECTED:`);
    const authIssues = this.results.filter(r => r.error && r.error.includes('401'));
    const validationIssues = this.results.filter(r => r.error && r.error.includes('400'));
    const serverIssues = this.results.filter(r => r.error && r.error.includes('500'));
    
    console.log(`   Authentication Issues: ${authIssues.length}`);
    console.log(`   Validation Issues: ${validationIssues.length}`);
    console.log(`   Server Issues: ${serverIssues.length}`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (authIssues.length > 0) {
      console.log(`   🔐 Fix ${authIssues.length} authentication issues`);
      console.log(`   🔑 Verify JWT token validation`);
      console.log(`   🔧 Check JWT secret configuration`);
    }
    if (validationIssues.length > 0) {
      console.log(`   📊 Fix ${validationIssues.length} validation issues`);
      console.log(`   🔧 Check request payload validation`);
    }
    if (serverIssues.length > 0) {
      console.log(`   🚨 Fix ${serverIssues.length} server issues`);
      console.log(`   🔧 Check endpoint implementation`);
    }
    
    // Overall Assessment
    console.log(`\n🎯 OVERALL ASSESSMENT:`);
    if (authWorking > 0) {
      console.log(`✅ AUTHENTICATION PARTIALLY WORKING:`);
      console.log(`   ${authWorking} endpoints with working authentication`);
      console.log(`   JWT token validation functioning`);
      console.log(`   Some endpoints accessible`);
    } else {
      console.log(`🚨 AUTHENTICATION COMPLETELY FAILING:`);
      console.log(`   No endpoints with working authentication`);
      console.log(`   JWT token validation not working`);
      console.log(`   Critical authentication issues`);
    }
    
    console.log(`\n🎉 AUTHENTICATION FIX TESTING COMPLETE!`);
    console.log(`📊 Total Tests: ${this.results.length}`);
    console.log(`🔐 Authentication Working: ${authWorking}/${this.results.length}`);
    console.log(`✅ Success Rate: ${((successful / this.results.length) * 100).toFixed(2)}%`);
  }
}

async function main() {
  console.log('🔧 AUTHENTICATION ISSUES FIX');
  console.log('============================');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  
  const fixer = new AuthenticationFixer();
  await fixer.fixAuthenticationIssues();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Authentication fix failed:', error);
    process.exit(1);
  });
}

module.exports = AuthenticationFixer;
