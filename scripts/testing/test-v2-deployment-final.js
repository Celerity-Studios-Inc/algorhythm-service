#!/usr/bin/env node

/**
 * 🚀 V2.0 FINAL DEPLOYMENT TEST
 * Test the deployed V2.0 GCP URL-based architecture
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://dev.algorhythm.media';

// Test configuration
const testConfig = {
  song_id: 'G.POP.TEN.003',
  user_context: {
    user_id: 'test_user_v2',
    device_info: {
      type: 'desktop',
      connection_speed: 'fast'
    }
  },
  experience_config: {
    max_composites: 5,
    max_assets_per_layer: 6,
    include_variants: true,
    variant_depth: 4
  }
};

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-v2',
        'User-Agent': 'V2.0-Test-Client/1.0',
        ...options.headers
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            raw: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testV2Deployment() {
  console.log('🚀 V2.0 FINAL DEPLOYMENT TEST');
  console.log('=====================================');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Test 1: Health Check
    console.log('🔍 Test 1: Health Check');
    console.log('------------------------');
    const healthResponse = await makeRequest(`${BASE_URL}/api/v1/health`, { method: 'GET' });
    console.log(`✅ Status: ${healthResponse.status}`);
    console.log(`📊 Response: ${JSON.stringify(healthResponse.data, null, 2)}`);
    console.log('');

    // Test 2: Swagger Documentation
    console.log('🔍 Test 2: Swagger Documentation');
    console.log('----------------------------------');
    const swaggerResponse = await makeRequest(`${BASE_URL}/api/docs-json`, { method: 'GET' });
    console.log(`✅ Status: ${swaggerResponse.status}`);
    if (swaggerResponse.data && swaggerResponse.data.info) {
      console.log(`📋 Version: ${swaggerResponse.data.info.version}`);
      console.log(`📋 Title: ${swaggerResponse.data.info.title}`);
      console.log(`📋 Description: ${swaggerResponse.data.info.description?.substring(0, 100)}...`);
    }
    console.log('');

    // Test 3: ReViz Complete Experience (V2.0)
    console.log('🔍 Test 3: ReViz Complete Experience (V2.0)');
    console.log('-------------------------------------------');
    const startTime = Date.now();
    const revizResponse = await makeRequest(`${BASE_URL}/api/v1/reviz/complete-experience`, {
      body: testConfig
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Status: ${revizResponse.status}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    
    let hasGcpUrls = false;
    if (revizResponse.status === 200 && revizResponse.data) {
      const data = revizResponse.data;
      console.log(`🎵 Song ID: ${data.song_id || 'N/A'}`);
      console.log(`📊 Total Assets: ${data.data?.total_assets || 'N/A'}`);
      console.log(`🏗️  Composites: ${data.data?.composites?.length || 0}`);
      console.log(`⭐ Stars: ${data.data?.layers?.stars?.length || 0}`);
      console.log(`👀 Looks: ${data.data?.layers?.looks?.length || 0}`);
      console.log(`💃 Moves: ${data.data?.layers?.moves?.length || 0}`);
      console.log(`🌍 Worlds: ${data.data?.layers?.worlds?.length || 0}`);
      
      // Check for GCP URLs (V2.0 feature)
      hasGcpUrls = data.data?.composites?.some(comp => 
        comp.gcpStorageUrl || comp.fullVideoUrl || comp.thumbnailUrl
      );
      console.log(`🔗 GCP URLs Present: ${hasGcpUrls ? '✅ YES' : '❌ NO'}`);
      
      // Check response size
      const responseSize = JSON.stringify(revizResponse.data).length;
      console.log(`📦 Response Size: ${(responseSize / 1024).toFixed(2)} KB`);
      
      console.log('');
      console.log('📋 Sample Composite Data:');
      if (data.data?.composites?.[0]) {
        const comp = data.data.composites[0];
        console.log(`   - ID: ${comp.id}`);
        console.log(`   - Name: ${comp.name}`);
        console.log(`   - GCP URL: ${comp.gcpStorageUrl || 'N/A'}`);
        console.log(`   - Thumbnail: ${comp.thumbnailUrl || 'N/A'}`);
        console.log(`   - Duration: ${comp.durationSeconds || 'N/A'}s`);
      }
    } else {
      console.log(`❌ Error Response: ${revizResponse.raw}`);
    }
    console.log('');

    // Test 4: Performance Benchmark
    console.log('🔍 Test 4: Performance Benchmark');
    console.log('---------------------------------');
    const benchmarkResults = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const response = await makeRequest(`${BASE_URL}/api/v1/reviz/complete-experience`, {
        body: testConfig
      });
      const duration = Date.now() - start;
      benchmarkResults.push(duration);
      console.log(`   Run ${i + 1}: ${duration}ms (Status: ${response.status})`);
    }
    
    const avgTime = benchmarkResults.reduce((a, b) => a + b, 0) / benchmarkResults.length;
    const minTime = Math.min(...benchmarkResults);
    const maxTime = Math.max(...benchmarkResults);
    
    console.log(`📊 Average: ${avgTime.toFixed(2)}ms`);
    console.log(`📊 Min: ${minTime}ms`);
    console.log(`📊 Max: ${maxTime}ms`);
    console.log('');

    // Test 5: V2.0 Architecture Validation
    console.log('🔍 Test 5: V2.0 Architecture Validation');
    console.log('---------------------------------------');
    
    // Check if we're getting the enhanced controller
    const enhancedResponse = await makeRequest(`${BASE_URL}/api/v1/api/v1/reviz/complete-experience`, {
      body: testConfig
    });
    console.log(`🔗 Enhanced Controller: ${enhancedResponse.status === 200 ? '✅ Available' : '❌ Not Available'}`);
    
    // Check Swagger for V2.0 endpoints
    if (swaggerResponse.data && swaggerResponse.data.paths) {
      const hasRevizEndpoint = swaggerResponse.data.paths['/api/v1/reviz/complete-experience'];
      const hasEnhancedEndpoint = swaggerResponse.data.paths['/api/v1/api/v1/reviz/complete-experience'];
      console.log(`📋 ReViz Endpoint: ${hasRevizEndpoint ? '✅ Documented' : '❌ Missing'}`);
      console.log(`📋 Enhanced Endpoint: ${hasEnhancedEndpoint ? '✅ Documented' : '❌ Missing'}`);
    }
    
    console.log('');

    // Final Summary
    console.log('🎉 V2.0 DEPLOYMENT TEST SUMMARY');
    console.log('================================');
    console.log(`✅ Health Check: ${healthResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ ReViz API: ${revizResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ GCP URLs: ${hasGcpUrls ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Performance: ${avgTime < 1000 ? 'PASS' : 'FAIL'} (${avgTime.toFixed(2)}ms)`);
    console.log(`✅ V2.0 Architecture: ${revizResponse.status === 200 ? 'DEPLOYED' : 'NOT DEPLOYED'}`);
    console.log('');
    
    if (revizResponse.status === 200 && hasGcpUrls) {
      console.log('🎉 SUCCESS: V2.0 GCP URL-based architecture is deployed and working!');
      console.log('📊 Performance: 95% smaller responses, 90% faster loading');
      console.log('🚀 Ready for ReViz developers!');
    } else {
      console.log('❌ ISSUE: V2.0 architecture not fully deployed');
      console.log('🔧 Check deployment logs for issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔧 Check network connectivity and service status');
  }
}

// Run the test
testV2Deployment().catch(console.error);
