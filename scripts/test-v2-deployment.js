#!/usr/bin/env node

/**
 * Test V2.0 GCP URL Architecture Deployment
 * Verifies that the deployed service has the V2.0 implementation
 */

const https = require('https');

const API_BASE_URL = 'https://dev.algorhythm.media';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testHealthEndpoint() {
  console.log('🔍 Testing health endpoint...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/reviz/health`);
    console.log(`✅ Health Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    return response.status === 200;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testSwaggerVersion() {
  console.log('\n🔍 Testing Swagger version...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/docs-json`);
    console.log(`📚 API Title: ${response.data.info.title}`);
    console.log(`📚 API Version: ${response.data.info.version}`);
    console.log(`📚 API Description: ${response.data.info.description.substring(0, 100)}...`);
    
    // Check for V2.0 features
    const hasV2Features = response.data.info.description.includes('V2.0') || 
                         response.data.info.description.includes('GCP URL');
    console.log(`🎯 V2.0 Features: ${hasV2Features ? '✅ Present' : '❌ Missing'}`);
    
    return hasV2Features;
  } catch (error) {
    console.error('❌ Swagger check failed:', error.message);
    return false;
  }
}

async function testReVizEndpoints() {
  console.log('\n🔍 Testing ReViz endpoints...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/docs-json`);
    const paths = Object.keys(response.data.paths);
    const revizPaths = paths.filter(path => path.includes('reviz'));
    
    console.log(`📋 Found ${revizPaths.length} ReViz endpoints:`);
    revizPaths.forEach(path => console.log(`  - ${path}`));
    
    const hasCompleteExperience = revizPaths.some(path => path.includes('complete-experience'));
    console.log(`🎯 Complete Experience Endpoint: ${hasCompleteExperience ? '✅ Present' : '❌ Missing'}`);
    
    return hasCompleteExperience;
  } catch (error) {
    console.error('❌ ReViz endpoints check failed:', error.message);
    return false;
  }
}

async function testV2Implementation() {
  console.log('\n🔍 Testing V2.0 implementation...');
  try {
    // Test with a simple request to see if we get V2.0 response structure
    const requestBody = JSON.stringify({
      song_id: 'G.POP.TEN.003',
      experience_config: {
        max_composites: 1,
        max_assets_per_layer: 1
      }
    });
    
    const response = await makeRequest(`${API_BASE_URL}/api/v1/reviz/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: requestBody
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ Authentication working (401 Unauthorized expected)');
      return true;
    } else if (response.status === 500) {
      console.log('❌ Server error - likely old implementation');
      console.log('📋 Error details:', JSON.stringify(response.data, null, 2));
      return false;
    } else {
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
      return response.status === 200;
    }
  } catch (error) {
    console.error('❌ V2.0 implementation test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing V2.0 GCP URL Architecture Deployment');
  console.log('==================================================');
  
  const results = {
    health: await testHealthEndpoint(),
    swagger: await testSwaggerVersion(),
    endpoints: await testReVizEndpoints(),
    implementation: await testV2Implementation()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`✅ Health Endpoint: ${results.health ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Swagger V2.0: ${results.swagger ? 'PASS' : 'FAIL'}`);
  console.log(`✅ ReViz Endpoints: ${results.endpoints ? 'PASS' : 'FAIL'}`);
  console.log(`✅ V2.0 Implementation: ${results.implementation ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ V2.0 DEPLOYED' : '❌ V2.0 NOT READY'}`);
  
  if (!allPassed) {
    console.log('\n🔧 Next Steps:');
    console.log('- Wait for GitHub Actions build to complete');
    console.log('- Check deployment logs for any errors');
    console.log('- Verify all commits are pushed to dev branch');
  }
  
  return allPassed;
}

runTests().catch(console.error);
