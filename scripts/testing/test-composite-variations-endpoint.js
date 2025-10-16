#!/usr/bin/env node

/**
 * Test Composite Variations Endpoint
 * 
 * This script tests the new composite-specific layer variations endpoint
 * that was implemented by the backend team.
 */

const https = require('https');

// Configuration
const ALGORHYTHM_BASE_URL = 'https://dev.algorhythm.media';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';

// Test composite IDs
const TEST_COMPOSITES = [
  'C.FUL.ALL.001',
  'C.FUL.ALL.002', 
  'C.PAR.2LA.003'
];

// Test layers
const TEST_LAYERS = ['stars', 'looks', 'moves', 'worlds'];

async function makeRequest(url, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testCompositeVariationsEndpoint() {
  console.log('🧪 Testing Composite Variations Endpoint');
  console.log('=====================================');
  
  for (const compositeId of TEST_COMPOSITES) {
    console.log(`\n📦 Testing Composite: ${compositeId}`);
    
    for (const layer of TEST_LAYERS) {
      console.log(`\n  🎯 Testing Layer: ${layer}`);
      
      try {
        const requestData = {
          composite_id: compositeId,
          vary_layer: layer,
          limit: 5,
          include_scoring_details: true
        };
        
        const startTime = Date.now();
        const response = await makeRequest(
          `${ALGORHYTHM_BASE_URL}/api/v1/reviz/composite/variations`,
          requestData
        );
        const responseTime = Date.now() - startTime;
        
        console.log(`    ✅ Status: ${response.status}`);
        console.log(`    ⏱️  Response Time: ${responseTime}ms`);
        
        if (response.status === 200 && response.data.success) {
          const data = response.data.data;
          console.log(`    📊 Composite Info: ${data.composite_info?.composite_name || 'N/A'}`);
          console.log(`    🎭 Current Asset: ${data.current_layer_asset?.asset_name || 'N/A'}`);
          console.log(`    🔄 Variations: ${data.variations?.length || 0} found`);
          console.log(`    📈 Total Available: ${data.total_available || 0}`);
          
          if (data.variations && data.variations.length > 0) {
            console.log(`    🏆 Top Variation: ${data.variations[0].asset_name} (Score: ${data.variations[0].compatibility_score})`);
          }
        } else {
          console.log(`    ❌ Error: ${response.data?.error?.message || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Request Failed: ${error.message}`);
      }
    }
  }
}

async function testBackendEndpointDirectly() {
  console.log('\n🔧 Testing Backend Endpoint Directly');
  console.log('=====================================');
  
  const NNA_REGISTRY_URL = 'https://registry.dev.reviz.dev';
  
  for (const compositeId of TEST_COMPOSITES) {
    console.log(`\n📦 Testing Backend: ${compositeId}`);
    
    try {
      const url = `${NNA_REGISTRY_URL}/api/v1/assets/composites/by-id/${compositeId}/variants`;
      console.log(`    🔗 URL: ${url}`);
      
      const startTime = Date.now();
      const response = await makeRequest(url);
      const responseTime = Date.now() - startTime;
      
      console.log(`    ✅ Status: ${response.status}`);
      console.log(`    ⏱️  Response Time: ${responseTime}ms`);
      
      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        console.log(`    📊 Composite: ${data.composite_id}`);
        console.log(`    🧩 Components: ${data.components?.length || 0} found`);
        
        if (data.components) {
          data.components.forEach(component => {
            console.log(`      ${component.type}: ${component.base_asset?.name || 'N/A'} (${component.variants?.length || 0} variants)`);
          });
        }
      } else {
        console.log(`    ❌ Error: ${response.data?.error?.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`    ❌ Request Failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Composite Variations Endpoint Test');
  console.log('=====================================');
  console.log(`AlgoRhythm URL: ${ALGORHYTHM_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`Test Composites: ${TEST_COMPOSITES.join(', ')}`);
  console.log(`Test Layers: ${TEST_LAYERS.join(', ')}`);
  
  try {
    // Test AlgoRhythm endpoint
    await testCompositeVariationsEndpoint();
    
    // Test backend endpoint directly
    await testBackendEndpointDirectly();
    
    console.log('\n🎉 Testing Complete!');
    
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testCompositeVariationsEndpoint,
  testBackendEndpointDirectly
};
