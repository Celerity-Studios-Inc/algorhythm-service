#!/usr/bin/env node

/**
 * 🔐 JWT AUTHENTICATION TEST
 * Tests JWT token generation and validation
 * Fixes authentication issues in Algorhythm service
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';

class JWTAuthenticationTester {
  constructor() {
    this.algorhythmSecret = 'algorhythm-dev-jwt-secret-key';
    this.nnaRegistrySecret = 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39';
  }

  async testJWTAuthentication() {
    console.log('🔐 JWT AUTHENTICATION TEST');
    console.log('===========================');
    console.log(`🎯 Target: ${ALGORHYTHM_BASE_URL}`);
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log('');

    // Test 1: Generate and test Algorhythm JWT token
    await this.testAlgorhythmJWT();
    
    // Test 2: Generate and test NNA Registry JWT token
    await this.testNnaRegistryJWT();
    
    // Test 3: Test authentication endpoints
    await this.testAuthenticationEndpoints();
    
    // Generate authentication report
    this.generateAuthenticationReport();
  }

  async testAlgorhythmJWT() {
    console.log('🔐 TEST 1: Algorhythm JWT Token');
    console.log('===============================');
    
    // Generate Algorhythm JWT token
    const algorhythmPayload = {
      userId: '68e6d2e61d4af4ea17516073',
      email: 'ajay@celerity.studio',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const algorhythmToken = jwt.sign(algorhythmPayload, this.algorhythmSecret);
    console.log(`📝 Generated Algorhythm JWT: ${algorhythmToken.substring(0, 50)}...`);
    
    // Test with Algorhythm token
    await this.testWithToken(algorhythmToken, 'Algorhythm JWT');
  }

  async testNnaRegistryJWT() {
    console.log('\n🔐 TEST 2: NNA Registry JWT Token');
    console.log('==================================');
    
    // Generate NNA Registry JWT token
    const nnaPayload = {
      userId: '68e6d2e61d4af4ea17516073',
      email: 'ajay@celerity.studio',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const nnaToken = jwt.sign(nnaPayload, this.nnaRegistrySecret);
    console.log(`📝 Generated NNA Registry JWT: ${nnaToken.substring(0, 50)}...`);
    
    // Test with NNA Registry token
    await this.testWithToken(nnaToken, 'NNA Registry JWT');
  }

  async testWithToken(token, tokenType) {
    console.log(`\n📡 Testing with ${tokenType}`);
    console.log(`🔗 Token: ${token.substring(0, 30)}...`);
    
    const tests = [
      {
        name: 'Template Recommendation',
        endpoint: '/api/v1/recommend/template',
        method: 'POST',
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
        name: 'ReViz Complete Experience',
        endpoint: '/api/v1/reviz/complete-experience',
        method: 'POST',
        data: {
          song_id: '1.001.003.001',
          user_context: {
            user_id: 'test_user'
          }
        }
      },
      {
        name: 'JWT Test Endpoint',
        endpoint: '/api/v1/auth/test-jwt',
        method: 'POST',
        data: {
          user: 'test_user'
        }
      }
    ];

    for (const test of tests) {
      await this.runAuthenticationTest(test, token, tokenType);
    }
  }

  async runAuthenticationTest(test, token, tokenType) {
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
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      responseTime = Date.now() - startTime;
      success = true;
      statusCode = response.status;

      console.log(`✅ SUCCESS: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🔐 Authentication: ${tokenType} working`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);

      if (error.includes('401')) {
        console.log(`🔐 Authentication Issue: ${tokenType} token rejected`);
      } else if (error.includes('404')) {
        console.log(`🔗 Endpoint Issue: ${test.endpoint} not found`);
      } else {
        console.log(`🚨 Other Error: ${error}`);
      }
    }
  }

  async testAuthenticationEndpoints() {
    console.log('\n🔐 TEST 3: Authentication Endpoints');
    console.log('===================================');
    
    const authTests = [
      {
        name: 'Auth Debug',
        endpoint: '/api/v1/auth/debug',
        method: 'GET'
      }
    ];

    for (const test of authTests) {
      await this.runAuthEndpointTest(test);
    }
  }

  async runAuthEndpointTest(test) {
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
      console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);

    } catch (error) {
      responseTime = Date.now() - startTime;
      success = false;
      error = error.message;
      statusCode = error.response?.status || 0;

      console.log(`❌ FAILED: ${responseTime}ms`);
      console.log(`📊 Status: ${statusCode}`);
      console.log(`🚨 Error: ${error}`);
    }
  }

  generateAuthenticationReport() {
    console.log('\n📊 JWT AUTHENTICATION TEST REPORT');
    console.log('==================================');
    console.log(`📅 Completed: ${new Date().toISOString()}`);
    console.log('');
    
    console.log('🔐 JWT SECRETS CONFIGURED:');
    console.log(`   Algorhythm Secret: ${this.algorhythmSecret.substring(0, 20)}...`);
    console.log(`   NNA Registry Secret: ${this.nnaRegistrySecret.substring(0, 20)}...`);
    console.log('');
    
    console.log('💡 RECOMMENDATIONS:');
    console.log('   1. Verify JWT token format and payload structure');
    console.log('   2. Check token expiration and signature validation');
    console.log('   3. Ensure proper secret configuration in environment');
    console.log('   4. Test with valid tokens from both services');
    console.log('');
    
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Generate valid JWT tokens for testing');
    console.log('   2. Test authentication with real tokens');
    console.log('   3. Fix any JWT validation issues');
    console.log('   4. Deploy authentication fixes');
    console.log('');
    
    console.log('🎉 JWT AUTHENTICATION TESTING COMPLETE!');
  }
}

async function main() {
  console.log('🔐 JWT AUTHENTICATION TEST');
  console.log('===========================');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  
  const tester = new JWTAuthenticationTester();
  await tester.testJWTAuthentication();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 JWT authentication test failed:', error);
    process.exit(1);
  });
}

module.exports = JWTAuthenticationTester;
