#!/usr/bin/env node

/**
 * 🔧 V2.0: Test GCP URL-based API
 * Verify the new architecture works correctly
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3002';
const TEST_SONG = 'G.POP.TEN.003';

async function testGCPURLAPI() {
  console.log('🧪 Testing GCP URL-based ReViz API (V2.0)');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/api/v1/reviz/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Version: ${healthData.version}`);
      console.log(`   Architecture: ${healthData.architecture}`);
    } else {
      console.log('❌ Health check failed');
      return;
    }
    
    // Test 2: Complete experience endpoint
    console.log('\n2️⃣ Testing complete experience endpoint...');
    const requestBody = {
      song_id: TEST_SONG,
      user_context: {
        user_id: 'test_user_123',
        device_info: {
          type: 'mobile',
          connection_speed: 'medium'
        }
      },
      experience_config: {
        max_composites: 3,
        max_assets_per_layer: 4,
        include_variants: true,
        variant_depth: 2
      }
    };
    
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/v1/reviz/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Mock token for testing
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseTime = Date.now() - startTime;
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ Complete experience endpoint working');
      console.log(`   Response time: ${responseTime}ms`);
      console.log(`   Response size: ${JSON.stringify(responseData).length} bytes`);
      
      // Test 3: Verify GCP URLs
      console.log('\n3️⃣ Verifying GCP URL structure...');
      verifyGCPURLs(responseData);
      
      // Test 4: Performance metrics
      console.log('\n4️⃣ Performance metrics:');
      if (responseData.data?.performance_metrics) {
        const metrics = responseData.data.performance_metrics;
        console.log(`   Total assets: ${metrics.total_assets_loaded}`);
        console.log(`   Response time: ${metrics.response_time_ms}ms`);
        console.log(`   Response size: ${metrics.response_size_bytes} bytes`);
        console.log(`   Cache hit rate: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`);
        console.log(`   Assets from CDN: ${metrics.assets_from_cdn}`);
      }
      
      // Test 5: Response size validation
      console.log('\n5️⃣ Response size validation:');
      const responseSizeMB = JSON.stringify(responseData).length / (1024 * 1024);
      console.log(`   Response size: ${responseSizeMB.toFixed(2)}MB`);
      
      if (responseSizeMB < 5) {
        console.log('✅ Response size < 5MB (V2.0 target achieved)');
      } else {
        console.log('❌ Response size > 5MB (V2.0 target missed)');
      }
      
    } else {
      console.log('❌ Complete experience endpoint failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(responseData)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function verifyGCPURLs(responseData) {
  if (!responseData.data?.layer_assets) {
    console.log('❌ No layer assets found');
    return;
  }
  
  let urlCount = 0;
  let validURLCount = 0;
  
  // Check each layer
  Object.entries(responseData.data.layer_assets).forEach(([layerName, layerData]) => {
    if (layerData.assets) {
      layerData.assets.forEach(asset => {
        if (asset.media) {
          // Check thumbnail URL
          if (asset.media.thumbnail_url) {
            urlCount++;
            if (asset.media.thumbnail_url.startsWith('https://storage.googleapis.com/')) {
              validURLCount++;
            }
          }
          
          // Check preview URL
          if (asset.media.preview_url) {
            urlCount++;
            if (asset.media.preview_url.startsWith('https://storage.googleapis.com/')) {
              validURLCount++;
            }
          }
          
          // Check full asset URL
          if (asset.media.full_asset_url) {
            urlCount++;
            if (asset.media.full_asset_url.startsWith('https://storage.googleapis.com/')) {
              validURLCount++;
            }
          }
        }
      });
    }
  });
  
  console.log(`   Total URLs found: ${urlCount}`);
  console.log(`   Valid GCP URLs: ${validURLCount}`);
  
  if (urlCount === validURLCount && urlCount > 0) {
    console.log('✅ All URLs are valid GCP Storage URLs');
  } else if (urlCount === 0) {
    console.log('⚠️  No URLs found in response');
  } else {
    console.log('❌ Some URLs are not valid GCP Storage URLs');
  }
  
  // Show sample URLs
  if (responseData.data.layer_assets.stars?.assets?.[0]?.media) {
    const sampleAsset = responseData.data.layer_assets.stars.assets[0];
    console.log('\n   Sample URLs:');
    console.log(`   Thumbnail: ${sampleAsset.media.thumbnail_url}`);
    console.log(`   Preview: ${sampleAsset.media.preview_url}`);
    console.log(`   Full: ${sampleAsset.media.full_asset_url}`);
  }
}

// Run tests
testGCPURLAPI()
  .then(() => {
    console.log('\n🎉 GCP URL API testing completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
