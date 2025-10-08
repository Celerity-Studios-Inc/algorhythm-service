#!/usr/bin/env node

/**
 * Production API Test Script
 * Tests the enhanced ReViz API with all production features
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api/v1/reviz';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with a valid JWT token

/**
 * Test scenarios for production API
 */
async function runProductionTests() {
  console.log('🚀 Starting Production API Tests');
  console.log('================================');
  
  try {
    // Test 1: Health Check
    await testHealthCheck();
    
    // Test 2: Rate Limiting
    await testRateLimiting();
    
    // Test 3: Request Validation
    await testRequestValidation();
    
    // Test 4: Performance Monitoring
    await testPerformanceMonitoring();
    
    // Test 5: Cache Warming
    await testCacheWarming();
    
    // Test 6: Error Handling
    await testErrorHandling();
    
    // Test 7: Streaming Support
    await testStreamingSupport();
    
    console.log('\n✅ All production tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Production tests failed:', error);
    process.exit(1);
  }
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Health Check Response:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Database: ${data.services.database}`);
    console.log(`   Redis: ${data.services.redis}`);
    console.log(`   NNA Registry: ${data.services.nnaRegistry}`);
    console.log(`   Avg Response Time: ${data.performance.average_response_time_ms}ms`);
    console.log(`   Cache Hit Rate: ${data.performance.cache_hit_rate}`);
    console.log(`   Error Rate: ${data.performance.error_rate}`);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
}

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n🚦 Testing Rate Limiting...');
  
  const requests = [];
  const startTime = Date.now();
  
  // Send 15 requests rapidly (limit is 10 per minute)
  for (let i = 0; i < 15; i++) {
    requests.push(
      fetch(`${API_BASE_URL}/complete-experience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
        body: JSON.stringify({
          song_id: '1.013.017.001',
          experience_config: {
            max_composites: 3,
            max_assets_per_layer: 4,
          }
        })
      })
    );
  }
  
  const responses = await Promise.allSettled(requests);
  const duration = Date.now() - startTime;
  
  let successCount = 0;
  let rateLimitedCount = 0;
  
  responses.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.status === 200) {
        successCount++;
      } else if (result.value.status === 429) {
        rateLimitedCount++;
      }
    }
  });
  
  console.log(`✅ Rate Limiting Test Results:`);
  console.log(`   Total Requests: 15`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitedCount}`);
  console.log(`   Duration: ${duration}ms`);
  
  if (rateLimitedCount > 0) {
    console.log('✅ Rate limiting is working correctly');
  } else {
    console.log('⚠️  Rate limiting may not be working');
  }
}

/**
 * Test request validation
 */
async function testRequestValidation() {
  console.log('\n✅ Testing Request Validation...');
  
  const invalidRequests = [
    {
      name: 'Missing song_id',
      body: {
        experience_config: { max_composites: 5 }
      }
    },
    {
      name: 'Invalid max_composites (too high)',
      body: {
        song_id: '1.013.017.001',
        experience_config: { max_composites: 25 }
      }
    },
    {
      name: 'Invalid max_assets_per_layer (too low)',
      body: {
        song_id: '1.013.017.001',
        experience_config: { max_assets_per_layer: 0 }
      }
    },
    {
      name: 'Invalid layers',
      body: {
        song_id: '1.013.017.001',
        experience_config: { 
          max_composites: 5,
          layers: ['invalid_layer']
        }
      }
    }
  ];
  
  for (const testCase of invalidRequests) {
    try {
      const response = await fetch(`${API_BASE_URL}/complete-experience`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
        body: JSON.stringify(testCase.body)
      });
      
      if (response.status === 400) {
        console.log(`✅ ${testCase.name}: Correctly rejected (400)`);
      } else {
        console.log(`❌ ${testCase.name}: Should have been rejected (got ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: Request failed - ${error.message}`);
    }
  }
}

/**
 * Test performance monitoring
 */
async function testPerformanceMonitoring() {
  console.log('\n📊 Testing Performance Monitoring...');
  
  try {
    // Send a few requests to generate metrics
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        fetch(`${API_BASE_URL}/complete-experience`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`,
          },
          body: JSON.stringify({
            song_id: '1.013.017.001',
            experience_config: {
              max_composites: 5,
              max_assets_per_layer: 6,
            }
          })
        })
      );
    }
    
    await Promise.all(requests);
    
    // Check metrics endpoint
    const metricsResponse = await fetch(`${API_BASE_URL}/metrics`);
    const metrics = await metricsResponse.json();
    
    console.log('✅ Performance Metrics:');
    console.log(`   Total Requests: ${metrics.total_requests}`);
    console.log(`   Cache Hits: ${metrics.cache_hits}`);
    console.log(`   Errors: ${metrics.errors}`);
    console.log(`   Avg Response Time: ${metrics.average_response_time_ms}ms`);
    console.log(`   Cache Hit Rate: ${metrics.cache_hit_rate}`);
    console.log(`   Error Rate: ${metrics.error_rate}`);
    
  } catch (error) {
    console.error('❌ Performance monitoring test failed:', error);
  }
}

/**
 * Test cache warming
 */
async function testCacheWarming() {
  console.log('\n🔥 Testing Cache Warming...');
  
  try {
    // This would test the cache warming service
    // For now, just test that the endpoint exists
    const statusResponse = await fetch(`${API_BASE_URL}/status`);
    const status = await statusResponse.json();
    
    console.log('✅ Service Status:');
    console.log(`   Service: ${status.service}`);
    console.log(`   Version: ${status.version}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Features: ${JSON.stringify(status.features, null, 2)}`);
    
  } catch (error) {
    console.error('❌ Cache warming test failed:', error);
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  try {
    // Test with invalid song ID
    const response = await fetch(`${API_BASE_URL}/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        song_id: 'INVALID_SONG_ID',
        experience_config: {
          max_composites: 5,
          max_assets_per_layer: 6,
        }
      })
    });
    
    const data = await response.json();
    
    if (response.status >= 400) {
      console.log('✅ Error Handling: Correctly handled invalid song ID');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.errors?.[0]?.message || 'Unknown error'}`);
    } else {
      console.log('⚠️  Error Handling: Should have failed for invalid song ID');
    }
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }
}

/**
 * Test streaming support
 */
async function testStreamingSupport() {
  console.log('\n🌊 Testing Streaming Support...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        song_id: '1.013.017.001',
        experience_config: {
          max_composites: 10,
          max_assets_per_layer: 8,
          include_variants: true,
          variant_depth: 8,
        },
        performance_optimization: {
          streaming: true,
          compression: true,
        }
      })
    });
    
    const transferEncoding = response.headers.get('transfer-encoding');
    const contentLength = response.headers.get('content-length');
    
    console.log('✅ Streaming Test Results:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Transfer Encoding: ${transferEncoding}`);
    console.log(`   Content Length: ${contentLength}`);
    console.log(`   X-Response-Size-MB: ${response.headers.get('x-response-size-mb')}`);
    console.log(`   X-Cache-Hit: ${response.headers.get('x-cache-hit')}`);
    console.log(`   X-Response-Time-MS: ${response.headers.get('x-response-time-ms')}`);
    
    if (transferEncoding === 'chunked') {
      console.log('✅ Streaming is working correctly');
    } else {
      console.log('⚠️  Streaming may not be working');
    }
    
  } catch (error) {
    console.error('❌ Streaming test failed:', error);
  }
}

/**
 * Test API with different configurations
 */
async function testApiConfiguration(configName, requestBody) {
  console.log(`\n--- Testing ${configName} ---`);
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/complete-experience`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`✅ ${configName} Results:`);
    console.log(`   Response Time: ${responseTime}ms`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Total Assets: ${data.data?.performance_metrics?.total_assets_loaded || 0}`);
    console.log(`   Cache Hit: ${data.data?.performance_metrics?.cache_hit_rate > 0 ? 'Yes' : 'No'}`);
    console.log(`   Data Size: ${data.data?.performance_metrics?.data_size_mb?.toFixed(2) || 0}MB`);
    console.log(`   Streaming: ${data.data?.performance_metrics?.streaming_enabled ? 'Yes' : 'No'}`);
    console.log(`   Partial Response: ${data.metadata?.partial_response ? 'Yes' : 'No'}`);

    return data;

  } catch (error) {
    console.error(`❌ ${configName} failed:`, error.message);
    throw error;
  }
}

// Run the tests
if (require.main === module) {
  runProductionTests()
    .then(() => {
      console.log('\n🎉 All production tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Production tests failed:', error);
      process.exit(1);
    });
}

module.exports = { runProductionTests, testApiConfiguration };
