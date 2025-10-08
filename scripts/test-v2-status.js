#!/usr/bin/env node

/**
 * 🚀 V2.0 DEPLOYMENT STATUS CHECK
 * Simple test to verify V2.0 is deployed and working
 */

const https = require('https');

const BASE_URL = 'https://dev.algorhythm.media';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'V2.0-Status-Check/1.0',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function checkV2Status() {
  console.log('🚀 V2.0 DEPLOYMENT STATUS CHECK');
  console.log('================================');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Test 1: Basic connectivity
    console.log('🔍 Test 1: Basic Connectivity');
    console.log('-------------------------------');
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}/api/v1/health`);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    
    if (response.status === 200) {
      console.log(`📊 Health: ${response.data}`);
    } else {
      console.log(`❌ Health Check Failed: ${response.data}`);
    }
    console.log('');

    // Test 2: Swagger Documentation
    console.log('🔍 Test 2: Swagger Documentation');
    console.log('----------------------------------');
    const swaggerResponse = await makeRequest(`${BASE_URL}/api/docs-json`);
    console.log(`✅ Status: ${swaggerResponse.status}`);
    
    if (swaggerResponse.status === 200) {
      try {
        const swaggerData = JSON.parse(swaggerResponse.data);
        console.log(`📋 Version: ${swaggerData.info?.version || 'Unknown'}`);
        console.log(`📋 Title: ${swaggerData.info?.title || 'Unknown'}`);
        
        // Check for V2.0 endpoints
        const hasRevizEndpoint = swaggerData.paths?.['/api/v1/reviz/complete-experience'];
        const hasEnhancedEndpoint = swaggerData.paths?.['/api/v1/api/v1/reviz/complete-experience'];
        
        console.log(`📋 ReViz Endpoint: ${hasRevizEndpoint ? '✅ Available' : '❌ Missing'}`);
        console.log(`📋 Enhanced Endpoint: ${hasEnhancedEndpoint ? '✅ Available' : '❌ Missing'}`);
        
        if (hasRevizEndpoint) {
          console.log(`📋 ReViz Methods: ${Object.keys(hasRevizEndpoint).join(', ')}`);
        }
      } catch (e) {
        console.log(`❌ Swagger Parse Error: ${e.message}`);
      }
    } else {
      console.log(`❌ Swagger Failed: ${swaggerResponse.data}`);
    }
    console.log('');

    // Test 3: ReViz API (expect 401 - authentication required)
    console.log('🔍 Test 3: ReViz API Authentication');
    console.log('------------------------------------');
    const revizResponse = await makeRequest(`${BASE_URL}/api/v1/reviz/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Status: ${revizResponse.status}`);
    
    if (revizResponse.status === 401) {
      console.log(`🔐 Authentication: ✅ WORKING (401 Unauthorized expected)`);
      console.log(`📊 Service: ✅ DEPLOYED AND RUNNING`);
    } else if (revizResponse.status === 200) {
      console.log(`🎉 API: ✅ WORKING WITHOUT AUTH (unexpected but good)`);
    } else {
      console.log(`❌ API Error: ${revizResponse.data}`);
    }
    console.log('');

    // Test 4: Enhanced Controller
    console.log('🔍 Test 4: Enhanced Controller');
    console.log('--------------------------------');
    const enhancedResponse = await makeRequest(`${BASE_URL}/api/v1/api/v1/reviz/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Status: ${enhancedResponse.status}`);
    
    if (enhancedResponse.status === 401) {
      console.log(`🔐 Enhanced Auth: ✅ WORKING (401 Unauthorized expected)`);
    } else if (enhancedResponse.status === 404) {
      console.log(`❌ Enhanced Controller: NOT DEPLOYED`);
    } else {
      console.log(`📊 Enhanced Controller: ${enhancedResponse.status}`);
    }
    console.log('');

    // Final Summary
    console.log('🎉 V2.0 DEPLOYMENT STATUS SUMMARY');
    console.log('==================================');
    console.log(`✅ Service Connectivity: ${response.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Swagger Documentation: ${swaggerResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ ReViz API: ${revizResponse.status === 401 ? 'PASS (Auth Required)' : 'FAIL'}`);
    console.log(`✅ Enhanced Controller: ${enhancedResponse.status === 401 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Response Time: ${responseTime}ms`);
    console.log('');
    
    if (response.status === 200 && revizResponse.status === 401) {
      console.log('🎉 SUCCESS: V2.0 GCP URL-based architecture is deployed and working!');
      console.log('🔐 Authentication is properly configured');
      console.log('📊 Service is responding correctly');
      console.log('🚀 Ready for ReViz developers with proper JWT tokens!');
    } else {
      console.log('❌ ISSUE: V2.0 architecture may not be fully deployed');
      console.log('🔧 Check deployment logs for issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔧 Check network connectivity and service status');
  }
}

// Run the test
checkV2Status().catch(console.error);
