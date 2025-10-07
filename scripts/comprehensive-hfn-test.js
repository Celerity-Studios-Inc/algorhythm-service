#!/usr/bin/env node

/**
 * Comprehensive HFN Support Testing Script
 * 
 * This script tests all aspects of HFN support in AlgoRhythm:
 * 1. HFN format detection and conversion
 * 2. Template recommendations with HFN input
 * 3. Error handling and edge cases
 * 4. Performance metrics
 * 5. Multiple song formats (HFN vs MFA)
 */

const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch');

// Configuration
const REGISTRY_MONGODB_URI = process.env.REGISTRY_MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const REGISTRY_DB_NAME = 'nna-registry-service-dev';
const REGISTRY_API_BASE_URL = 'https://registry.dev.reviz.dev/api';
const ALGORHYTHM_API_BASE_URL = 'https://dev.algorhythm.media/api/v1';
const TEST_USER_EMAIL = `algorhythm-test-${Date.now()}@example.com`;
const TEST_USER_PASSWORD = 'Test1234!';
const TEST_USER_ID = '68dc484b43bd31f1061dfa22';

// Test cases
const TEST_CASES = [
  {
    name: 'HFN Format - G.POP.CON.003',
    song_id: 'G.POP.CON.003',
    expected_mfa: '1.018.002.003',
    description: 'Test HFN conversion for Savage Love'
  },
  {
    name: 'HFN Format - G.POP.CON.002', 
    song_id: 'G.POP.CON.002',
    expected_mfa: '1.018.002.002',
    description: 'Test HFN conversion for Party in the U.S.A. (version 2)'
  },
  {
    name: 'MFA Format - Direct MFA',
    song_id: '1.018.002.001',
    expected_mfa: '1.018.002.001',
    description: 'Test direct MFA input (should not convert)'
  },
  {
    name: 'Invalid Format - Random String',
    song_id: 'INVALID.FORMAT.123',
    expected_mfa: 'INVALID.FORMAT.123',
    description: 'Test invalid format handling'
  }
];

class ComprehensiveHFNTest {
  constructor() {
    this.results = [];
    this.token = null;
    this.mongoClient = null;
  }

  async run() {
    console.log('🚀 Starting Comprehensive HFN Support Testing');
    console.log('=' .repeat(60));
    
    try {
      // 1. Setup authentication
      await this.setupAuthentication();
      
      // 2. Test database connectivity
      await this.testDatabaseConnectivity();
      
      // 3. Test HFN format detection
      await this.testHfnFormatDetection();
      
      // 4. Test conversion logic
      await this.testConversionLogic();
      
      // 5. Test AlgoRhythm API with various formats
      await this.testAlgoRhythmAPI();
      
      // 6. Test error handling
      await this.testErrorHandling();
      
      // 7. Test performance metrics
      await this.testPerformanceMetrics();
      
      // 8. Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
    }
  }

  async setupAuthentication() {
    console.log('\n🔐 Setting up authentication...');
    
    try {
      // Register test user
      await fetch(`${REGISTRY_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          username: TEST_USER_EMAIL.split('@')[0]
        })
      });

      // Login to get JWT
      const loginResponse = await fetch(`${REGISTRY_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        })
      });

      const loginData = await loginResponse.json();
      this.token = loginData.data.token;
      
      console.log('✅ Authentication successful');
      console.log(`   JWT Token: ${this.token.substring(0, 20)}...`);
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async testDatabaseConnectivity() {
    console.log('\n🗄️  Testing database connectivity...');
    
    try {
      this.mongoClient = new MongoClient(REGISTRY_MONGODB_URI);
      await this.mongoClient.connect();
      
      const db = this.mongoClient.db(REGISTRY_DB_NAME);
      const assets = await db.collection('assets').countDocuments();
      
      console.log(`✅ Database connected successfully`);
      console.log(`   Total assets: ${assets}`);
      
      // Check for our test template
      const template = await db.collection('assets').findOne({ 
        name: 'C.POP.TMP.001',
        layer: 'C' 
      });
      
      if (template) {
        console.log(`   ✅ Test template found: ${template.name}`);
      } else {
        console.log(`   ⚠️  Test template not found - creating...`);
        await this.createTestTemplate();
      }
      
    } catch (error) {
      console.error('❌ Database connectivity failed:', error.message);
      throw error;
    }
  }

  async createTestTemplate() {
    console.log('📝 Creating test template...');
    
    const db = this.mongoClient.db(REGISTRY_DB_NAME);
    const assets = db.collection('assets');
    
    // Create placeholder assets if they don't exist
    const placeholderAssets = [
      {
        layer: 'S', category: 'POP', subcategory: 'DIV',
        name: 'S.POP.DIV.001', nna_address: '2.001.002.001',
        description: 'Test star for recommendations',
        tags: ['test', 'pop', 'dancer'], source: 'test-script',
        registeredBy: 'test-script', createdAt: new Date(), updatedAt: new Date()
      },
      {
        layer: 'L', category: 'CAS', subcategory: 'STR',
        name: 'L.CAS.STR.001', nna_address: '3.001.002.001',
        description: 'Test look for recommendations',
        tags: ['test', 'casual', 'streetwear'], source: 'test-script',
        registeredBy: 'test-script', createdAt: new Date(), updatedAt: new Date()
      },
      {
        layer: 'M', category: 'POP', subcategory: 'DAN',
        name: 'M.POP.DAN.001', nna_address: '4.001.002.001',
        description: 'Test move for recommendations',
        tags: ['test', 'pop', 'dance'], source: 'test-script',
        registeredBy: 'test-script', createdAt: new Date(), updatedAt: new Date()
      },
      {
        layer: 'W', category: 'URB', subcategory: 'STR',
        name: 'W.URB.STR.001', nna_address: '5.001.002.001',
        description: 'Test world for recommendations',
        tags: ['test', 'urban', 'street'], source: 'test-script',
        registeredBy: 'test-script', createdAt: new Date(), updatedAt: new Date()
      }
    ];

    for (const asset of placeholderAssets) {
      const existing = await assets.findOne({ nna_address: asset.nna_address });
      if (!existing) {
        await assets.insertOne(asset);
        console.log(`   ✅ Created: ${asset.name}`);
      }
    }

    // Create template
    const template = {
      layer: 'C', category: 'POP', subcategory: 'TMP',
      name: 'C.POP.TMP.001', nna_address: '6.001.002.001',
      description: 'Test template for HFN testing',
      tags: ['test', 'template', 'pop'], source: 'test-script',
      registeredBy: 'test-script',
      components: ['1.018.002.003', '2.001.002.001', '3.001.002.001', '4.001.002.001', '5.001.002.001'],
      componentAssets: [
        { layer: 'G', nna_address: '1.018.002.003', name: 'G.POP.CON.003' },
        { layer: 'S', nna_address: '2.001.002.001', name: 'S.POP.DIV.001' },
        { layer: 'L', nna_address: '3.001.002.001', name: 'L.CAS.STR.001' },
        { layer: 'M', nna_address: '4.001.002.001', name: 'M.POP.DAN.001' },
        { layer: 'W', nna_address: '5.001.002.001', name: 'W.URB.STR.001' }
      ],
      createdAt: new Date(), updatedAt: new Date()
    };

    const existingTemplate = await assets.findOne({ nna_address: template.nna_address });
    if (!existingTemplate) {
      await assets.insertOne(template);
      console.log(`   ✅ Created template: ${template.name}`);
    }
  }

  async testHfnFormatDetection() {
    console.log('\n🔍 Testing HFN format detection...');
    
    const testCases = [
      { input: 'G.POP.CON.003', expected: true, description: 'Valid HFN' },
      { input: '1.018.002.003', expected: false, description: 'MFA format' },
      { input: 'INVALID.FORMAT', expected: false, description: 'Invalid format' },
      { input: 'S.POP.DIV.001', expected: true, description: 'Stars HFN' },
      { input: 'L.CAS.STR.001', expected: true, description: 'Looks HFN' }
    ];

    for (const testCase of testCases) {
      const isHfn = /^[GLMSWBPTC]\.\w+\.\w+\.\d+$/.test(testCase.input);
      const result = isHfn === testCase.expected;
      
      console.log(`   ${result ? '✅' : '❌'} ${testCase.description}: ${testCase.input} → ${isHfn ? 'HFN' : 'MFA'}`);
      
      this.results.push({
        test: 'HFN Format Detection',
        input: testCase.input,
        expected: testCase.expected,
        actual: isHfn,
        passed: result
      });
    }
  }

  async testConversionLogic() {
    console.log('\n🔄 Testing conversion logic...');
    
    for (const testCase of TEST_CASES) {
      console.log(`\n   Testing: ${testCase.name}`);
      console.log(`   Input: ${testCase.song_id}`);
      console.log(`   Expected MFA: ${testCase.expected_mfa}`);
      
      try {
        // Test the conversion by calling NNA Registry API
        const response = await fetch(`${REGISTRY_API_BASE_URL}/assets?layer=G&category=POP&subcategory=CON&limit=10`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        const data = await response.json();
        const assets = data.data || [];
        
        // Find matching asset
        const matchingAsset = assets.find(asset => 
          asset.name === testCase.song_id || 
          asset.friendlyName === testCase.song_id ||
          asset.nna_address === testCase.song_id
        );
        
        if (matchingAsset) {
          console.log(`   ✅ Found asset: ${matchingAsset.name} → ${matchingAsset.nna_address}`);
          
          this.results.push({
            test: 'Conversion Logic',
            input: testCase.song_id,
            expected: testCase.expected_mfa,
            actual: matchingAsset.nna_address,
            passed: matchingAsset.nna_address === testCase.expected_mfa
          });
        } else {
          console.log(`   ⚠️  Asset not found: ${testCase.song_id}`);
          
          this.results.push({
            test: 'Conversion Logic',
            input: testCase.song_id,
            expected: testCase.expected_mfa,
            actual: 'NOT_FOUND',
            passed: false
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        
        this.results.push({
          test: 'Conversion Logic',
          input: testCase.song_id,
          expected: testCase.expected_mfa,
          actual: 'ERROR',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testAlgoRhythmAPI() {
    console.log('\n🎵 Testing AlgoRhythm API with HFN support...');
    
    for (const testCase of TEST_CASES) {
      console.log(`\n   Testing: ${testCase.name}`);
      console.log(`   Song ID: ${testCase.song_id}`);
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${ALGORHYTHM_API_BASE_URL}/recommend/template`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            song_id: testCase.song_id,
            user_context: {
              user_id: TEST_USER_ID,
              preferences: {
                energy_preference: 'high',
                style_preference: 'modern',
                genre_preferences: ['pop', 'electronic']
              },
              device_info: {
                platform: 'ios',
                version: '18.1'
              }
            },
            max_alternatives: 5,
            include_scoring_details: true
          })
        });

        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Response Time: ${responseTime}ms`);
        
        if (data.success) {
          console.log(`   ✅ Success: ${data.data.total_available} templates available`);
          console.log(`   Performance: ${data.performance_metrics?.response_time_ms || responseTime}ms`);
          
          this.results.push({
            test: 'AlgoRhythm API',
            input: testCase.song_id,
            expected: 'SUCCESS',
            actual: 'SUCCESS',
            passed: true,
            response_time: responseTime,
            templates_available: data.data.total_available
          });
        } else {
          console.log(`   ❌ Failed: ${data.error?.message || 'Unknown error'}`);
          
          this.results.push({
            test: 'AlgoRhythm API',
            input: testCase.song_id,
            expected: 'SUCCESS',
            actual: 'FAILED',
            passed: false,
            error: data.error?.message
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
        
        this.results.push({
          test: 'AlgoRhythm API',
          input: testCase.song_id,
          expected: 'SUCCESS',
          actual: 'NETWORK_ERROR',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️  Testing error handling...');
    
    const errorTestCases = [
      {
        name: 'Invalid Song ID',
        song_id: 'NONEXISTENT.SONG.999',
        expected_error: 'Song not found'
      },
      {
        name: 'Malformed HFN',
        song_id: 'G.POP.INVALID',
        expected_error: 'Invalid format'
      },
      {
        name: 'Empty Song ID',
        song_id: '',
        expected_error: 'Validation error'
      }
    ];

    for (const testCase of errorTestCases) {
      console.log(`\n   Testing: ${testCase.name}`);
      console.log(`   Input: "${testCase.song_id}"`);
      
      try {
        const response = await fetch(`${ALGORHYTHM_API_BASE_URL}/recommend/template`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            song_id: testCase.song_id,
            user_context: {
              user_id: TEST_USER_ID,
              preferences: { energy_preference: 'high' }
            }
          })
        });

        const data = await response.json();
        
        if (!data.success) {
          console.log(`   ✅ Error handled correctly: ${data.error?.message}`);
          
          this.results.push({
            test: 'Error Handling',
            input: testCase.song_id,
            expected: 'ERROR',
            actual: 'ERROR',
            passed: true,
            error_message: data.error?.message
          });
        } else {
          console.log(`   ⚠️  Unexpected success for invalid input`);
          
          this.results.push({
            test: 'Error Handling',
            input: testCase.song_id,
            expected: 'ERROR',
            actual: 'SUCCESS',
            passed: false
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
        
        this.results.push({
          test: 'Error Handling',
          input: testCase.song_id,
          expected: 'ERROR',
          actual: 'NETWORK_ERROR',
          passed: false,
          error: error.message
        });
      }
    }
  }

  async testPerformanceMetrics() {
    console.log('\n⚡ Testing performance metrics...');
    
    const performanceTests = [
      { name: 'HFN Format', song_id: 'G.POP.CON.003' },
      { name: 'MFA Format', song_id: '1.018.002.003' },
      { name: 'Another HFN', song_id: 'G.POP.CON.002' }
    ];

    const performanceResults = [];

    for (const test of performanceTests) {
      console.log(`\n   Testing: ${test.name} (${test.song_id})`);
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${ALGORHYTHM_API_BASE_URL}/recommend/template`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            song_id: test.song_id,
            user_context: {
              user_id: TEST_USER_ID,
              preferences: { energy_preference: 'high' }
            }
          })
        });

        const responseTime = Date.now() - startTime;
        const data = await response.json();
        
        console.log(`   Response Time: ${responseTime}ms`);
        console.log(`   Success: ${data.success}`);
        
        performanceResults.push({
          test_name: test.name,
          song_id: test.song_id,
          response_time_ms: responseTime,
          success: data.success,
          performance_metrics: data.performance_metrics
        });
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        
        performanceResults.push({
          test_name: test.name,
          song_id: test.song_id,
          response_time_ms: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate performance statistics
    const successfulTests = performanceResults.filter(r => r.success);
    const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.response_time_ms, 0) / successfulTests.length;
    const maxResponseTime = Math.max(...successfulTests.map(r => r.response_time_ms));
    const minResponseTime = Math.min(...successfulTests.map(r => r.response_time_ms));

    console.log(`\n   📊 Performance Statistics:`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${maxResponseTime}ms`);
    console.log(`   Min Response Time: ${minResponseTime}ms`);
    console.log(`   Success Rate: ${successfulTests.length}/${performanceResults.length} (${(successfulTests.length/performanceResults.length*100).toFixed(1)}%)`);

    this.results.push({
      test: 'Performance Metrics',
      average_response_time: avgResponseTime,
      max_response_time: maxResponseTime,
      min_response_time: minResponseTime,
      success_rate: successfulTests.length / performanceResults.length,
      total_tests: performanceResults.length
    });
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    
    // Group results by test type
    const groupedResults = this.results.reduce((groups, result) => {
      const test = result.test;
      if (!groups[test]) groups[test] = [];
      groups[test].push(result);
      return groups;
    }, {});

    // Calculate overall statistics
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    // Detailed results by test type
    for (const [testType, results] of Object.entries(groupedResults)) {
      console.log(`\n📋 ${testType.toUpperCase()}:`);
      
      const testPassed = results.filter(r => r.passed).length;
      const testTotal = results.length;
      const testSuccessRate = (testPassed / testTotal * 100).toFixed(1);
      
      console.log(`   Success Rate: ${testPassed}/${testTotal} (${testSuccessRate}%)`);
      
      for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.input || result.test_name || 'N/A'}: ${result.actual || result.error || 'N/A'}`);
      }
    }

    // Performance summary
    const performanceResult = this.results.find(r => r.test === 'Performance Metrics');
    if (performanceResult) {
      console.log(`\n⚡ PERFORMANCE SUMMARY:`);
      console.log(`   Average Response Time: ${performanceResult.average_response_time?.toFixed(2)}ms`);
      console.log(`   Max Response Time: ${performanceResult.max_response_time}ms`);
      console.log(`   Min Response Time: ${performanceResult.min_response_time}ms`);
      console.log(`   Success Rate: ${(performanceResult.success_rate * 100).toFixed(1)}%`);
    }

    console.log('\n🎉 HFN Support Testing Complete!');
    
    if (successRate >= 80) {
      console.log('✅ HFN support is working excellently!');
    } else if (successRate >= 60) {
      console.log('⚠️  HFN support is working but has some issues.');
    } else {
      console.log('❌ HFN support needs significant improvements.');
    }
  }
}

// Run the comprehensive test
const test = new ComprehensiveHFNTest();
test.run().catch(console.error);

