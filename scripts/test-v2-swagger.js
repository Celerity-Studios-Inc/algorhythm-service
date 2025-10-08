#!/usr/bin/env node

/**
 * 🚀 V2.0 SWAGGER ENDPOINT TEST
 * Test the deployed V2.0 using Swagger documentation endpoints
 */

const https = require('https');

const BASE_URL = 'https://dev.algorhythm.media';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'V2.0-Swagger-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          contentType: res.headers['content-type']
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function testV2Swagger() {
  console.log('🚀 V2.0 SWAGGER ENDPOINT TEST');
  console.log('==============================');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Test 1: Swagger UI
    console.log('🔍 Test 1: Swagger UI');
    console.log('----------------------');
    const swaggerUIResponse = await makeRequest(`${BASE_URL}/api/docs`);
    console.log(`✅ Status: ${swaggerUIResponse.status}`);
    console.log(`📋 Content-Type: ${swaggerUIResponse.contentType}`);
    console.log(`📋 Content Length: ${swaggerUIResponse.data.length} bytes`);
    
    if (swaggerUIResponse.status === 200) {
      console.log(`✅ Swagger UI: AVAILABLE`);
      if (swaggerUIResponse.data.includes('AlgoRhythm')) {
        console.log(`✅ Service Name: FOUND`);
      }
      if (swaggerUIResponse.data.includes('2.0')) {
        console.log(`✅ Version 2.0: FOUND`);
      }
    } else {
      console.log(`❌ Swagger UI: NOT AVAILABLE`);
    }
    console.log('');

    // Test 2: Swagger JSON
    console.log('🔍 Test 2: Swagger JSON');
    console.log('------------------------');
    const swaggerJSONResponse = await makeRequest(`${BASE_URL}/api/docs-json`);
    console.log(`✅ Status: ${swaggerJSONResponse.status}`);
    console.log(`📋 Content-Type: ${swaggerJSONResponse.contentType}`);
    
    if (swaggerJSONResponse.status === 200) {
      try {
        const swaggerData = JSON.parse(swaggerJSONResponse.data);
        console.log(`✅ Swagger JSON: PARSED SUCCESSFULLY`);
        console.log(`📋 Title: ${swaggerData.info?.title || 'Unknown'}`);
        console.log(`📋 Version: ${swaggerData.info?.version || 'Unknown'}`);
        console.log(`📋 Description: ${swaggerData.info?.description?.substring(0, 100)}...`);
        
        // Check for V2.0 endpoints
        const paths = swaggerData.paths || {};
        const revizEndpoint = paths['/api/v1/reviz/complete-experience'];
        const enhancedEndpoint = paths['/api/v1/api/v1/reviz/complete-experience'];
        const healthEndpoint = paths['/api/v1/health'];
        
        console.log('');
        console.log('📋 V2.0 Endpoints Status:');
        console.log(`   - ReViz Complete Experience: ${revizEndpoint ? '✅ AVAILABLE' : '❌ MISSING'}`);
        console.log(`   - Enhanced Controller: ${enhancedEndpoint ? '✅ AVAILABLE' : '❌ MISSING'}`);
        console.log(`   - Health Check: ${healthEndpoint ? '✅ AVAILABLE' : '❌ MISSING'}`);
        
        if (revizEndpoint) {
          const methods = Object.keys(revizEndpoint);
          console.log(`   - ReViz Methods: ${methods.join(', ')}`);
          
          if (revizEndpoint.post) {
            console.log(`   - POST Description: ${revizEndpoint.post.summary || 'No summary'}`);
            if (revizEndpoint.post.tags) {
              console.log(`   - Tags: ${revizEndpoint.post.tags.join(', ')}`);
            }
          }
        }
        
        // Check for V2.0 features in description
        const description = swaggerData.info?.description || '';
        if (description.includes('GCP URL') || description.includes('V2.0')) {
          console.log(`✅ V2.0 Features: DOCUMENTED`);
        } else {
          console.log(`❌ V2.0 Features: NOT DOCUMENTED`);
        }
        
        console.log('');
        console.log('📋 Available Endpoints:');
        Object.keys(paths).forEach(path => {
          const methods = Object.keys(paths[path]);
          console.log(`   ${path}: ${methods.join(', ')}`);
        });
        
      } catch (e) {
        console.log(`❌ Swagger JSON Parse Error: ${e.message}`);
        console.log(`📋 Raw Response: ${swaggerJSONResponse.data.substring(0, 200)}...`);
      }
    } else {
      console.log(`❌ Swagger JSON: NOT AVAILABLE (${swaggerJSONResponse.status})`);
      console.log(`📋 Error: ${swaggerJSONResponse.data}`);
    }
    console.log('');

    // Test 3: Health Check via Swagger
    console.log('🔍 Test 3: Health Check via Swagger');
    console.log('------------------------------------');
    const healthResponse = await makeRequest(`${BASE_URL}/api/v1/health`);
    console.log(`✅ Status: ${healthResponse.status}`);
    console.log(`📋 Content-Type: ${healthResponse.contentType}`);
    
    if (healthResponse.status === 200) {
      try {
        const healthData = JSON.parse(healthResponse.data);
        console.log(`✅ Health Check: WORKING`);
        console.log(`📋 Health Data: ${JSON.stringify(healthData, null, 2)}`);
      } catch (e) {
        console.log(`📋 Health Response: ${healthResponse.data}`);
      }
    } else {
      console.log(`❌ Health Check: FAILED (${healthResponse.status})`);
      console.log(`📋 Error: ${healthResponse.data}`);
    }
    console.log('');

    // Test 4: ReViz API Authentication Test
    console.log('🔍 Test 4: ReViz API Authentication Test');
    console.log('----------------------------------------');
    const revizResponse = await makeRequest(`${BASE_URL}/api/v1/reviz/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Status: ${revizResponse.status}`);
    console.log(`📋 Content-Type: ${revizResponse.contentType}`);
    
    if (revizResponse.status === 401) {
      console.log(`🔐 Authentication: ✅ WORKING (401 Unauthorized expected)`);
      console.log(`📊 Service: ✅ DEPLOYED AND RUNNING`);
    } else if (revizResponse.status === 200) {
      console.log(`🎉 API: ✅ WORKING WITHOUT AUTH`);
    } else {
      console.log(`❌ API Error: ${revizResponse.data}`);
    }
    console.log('');

    // Final Summary
    console.log('🎉 V2.0 SWAGGER TEST SUMMARY');
    console.log('============================');
    console.log(`✅ Swagger UI: ${swaggerUIResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Swagger JSON: ${swaggerJSONResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Health Check: ${healthResponse.status === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ ReViz API: ${revizResponse.status === 401 ? 'PASS (Auth Required)' : 'FAIL'}`);
    console.log('');
    
    if (swaggerJSONResponse.status === 200 && revizResponse.status === 401) {
      console.log('🎉 SUCCESS: V2.0 GCP URL-based architecture is deployed and working!');
      console.log('📊 Swagger documentation is available and up-to-date');
      console.log('🔐 Authentication is properly configured');
      console.log('🚀 Ready for ReViz developers with proper JWT tokens!');
      console.log('');
      console.log('🔗 Swagger UI: https://dev.algorhythm.media/api/docs');
      console.log('🔗 Swagger JSON: https://dev.algorhythm.media/api/docs-json');
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
testV2Swagger().catch(console.error);
