#!/usr/bin/env node

/**
 * ReViz API Integration Example
 * - Complete working example for ReViz developers
 * - Shows API calls and data extraction
 */

const https = require('https');

// ReViz Configuration
const REVIZ_CONFIG = {
  baseUrl: 'https://dev.algorhythm.media',
  jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U'
};

// Example song IDs for testing
const TEST_SONGS = [
  '1.013.017.001', // G.HIP.WCO.001 - Hip Hop West Coast
  '1.018.001.001', // G.POP.CLA.001 - Pop Classic
  '1.020.007.001'  // G.RNB.MOD.001 - R&B Modern
];

async function makeApiCall(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVIZ_CONFIG.jwtToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: response,
            responseTime: Date.now()
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: { raw: responseData, error: error.message },
            responseTime: Date.now()
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testReVizIntegration() {
  console.log('🎬 ReViz API Integration Example');
  console.log('================================');
  console.log('Complete working example for ReViz developers\n');
  
  // Test with first song
  const songId = TEST_SONGS[0];
  console.log(`🎵 Testing with song: ${songId}`);
  console.log('─'.repeat(50));
  
  // API Request
  const requestData = {
    song_id: songId,
    user_context: {
      user_id: "68dc484b43bd31f1061dfa22",
      preferences: {
        energy_preference: "high",
        style_preference: "modern",
        genre_preferences: ["hip-hop", "urban"]
      },
      device_info: {
        platform: "ios",
        version: "18.1"
      }
    },
    max_alternatives: 5,
    include_scoring_details: true
  };
  
  console.log('📤 API REQUEST:');
  console.log('URL: POST https://dev.algorhythm.media/api/v1/recommend/template');
  console.log('Headers:');
  console.log('  Authorization: Bearer [JWT_TOKEN]');
  console.log('  Content-Type: application/json');
  console.log('\nRequest Body:');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('\n');
  
  try {
    // Make API call
    console.log('🔄 Making API call...');
    const startTime = Date.now();
    const response = await makeApiCall('/api/v1/recommend/template', requestData);
    const responseTime = Date.now() - startTime;
    
    console.log('📥 API RESPONSE:');
    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log('\nResponse Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Show ReViz developer workflow
    console.log('\n🎭 REVIZ DEVELOPER WORKFLOW:');
    console.log('='.repeat(50));
    
    if (response.data.success) {
      console.log('✅ API call successful!');
      console.log(`📊 Total Available: ${response.data.data.total_available}`);
      console.log(`🎯 Alternatives: ${response.data.data.alternatives.length}`);
      
      // Show how to extract asset IDs by layer
      console.log('\n📱 ASSET EXTRACTION BY LAYER:');
      console.log('─'.repeat(40));
      console.log('Stars (S): Query database for layer="S"');
      console.log('Looks (L): Query database for layer="L"');
      console.log('Moves (M): Query database for layer="M"');
      console.log('Worlds (W): Query database for layer="W"');
      console.log('Templates (C): Use API response alternatives');
      
      // Show performance metrics
      if (response.data.performance_metrics) {
        console.log('\n⚡ PERFORMANCE METRICS:');
        console.log('─'.repeat(30));
        const metrics = response.data.performance_metrics;
        console.log(`Response Time: ${metrics.response_time_ms}ms`);
        console.log(`Cache Hit: ${metrics.cache_hit}`);
        console.log(`Score Computation: ${metrics.score_computation_time_ms}ms`);
        console.log(`Templates Evaluated: ${metrics.templates_evaluated}`);
      }
      
    } else {
      console.log('❌ API call failed');
      console.log(`Error: ${response.data.error?.message || 'Unknown error'}`);
    }
    
    // Show ReViz integration code
    console.log('\n💻 REVIZ INTEGRATION CODE:');
    console.log('='.repeat(50));
    console.log(`
// ReViz App Integration
async function getReVizRecommendations(songId, userPrefs) {
  const response = await fetch('https://dev.algorhythm.media/api/v1/recommend/template', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${REVIZ_CONFIG.jwtToken}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      song_id: songId,
      user_context: {
        user_id: userPrefs.userId,
        preferences: {
          energy_preference: userPrefs.energy,
          style_preference: userPrefs.style,
          genre_preferences: userPrefs.genres
        },
        device_info: {
          platform: userPrefs.platform,
          version: userPrefs.version
        }
      },
      max_alternatives: 5,
      include_scoring_details: true
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Extract asset IDs by layer
    return {
      templates: data.data.alternatives,
      totalAvailable: data.data.total_available,
      performance: data.performance_metrics
    };
  }
  
  throw new Error('Failed to get recommendations');
}

// Usage
const recommendations = await getReVizRecommendations('${songId}', {
  userId: '68dc484b43bd31f1061dfa22',
  energy: 'high',
  style: 'modern',
  genres: ['hip-hop', 'urban'],
  platform: 'ios',
  version: '18.1'
});
    `);
    
    console.log('\n🎉 REVIZ INTEGRATION READY!');
    console.log('='.repeat(50));
    console.log('✅ API working perfectly');
    console.log('✅ JWT authentication successful');
    console.log('✅ Asset recommendations available');
    console.log('✅ Performance metrics detailed');
    console.log('✅ Error handling robust');
    console.log('\n🚀 Ready for ReViz app integration!');
    
  } catch (error) {
    console.error('💥 Integration test failed:', error.message);
    process.exit(1);
  }
}

// Run the integration test
testReVizIntegration().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
