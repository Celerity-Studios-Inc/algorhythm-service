#!/usr/bin/env node

/**
 * Show AlgoRhythm API Data
 * - Displays the exact API call and response
 * - Shows the 5 alternatives data structure
 */

const https = require('https');

async function showApiData() {
  console.log('🎬 AlgoRhythm API Call and Response Data');
  console.log('========================================\n');
  
  // API Request Configuration
  const requestData = {
    song_id: "1.013.017.001",
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
  
  const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U';
  
  console.log('📤 API REQUEST:');
  console.log('─'.repeat(50));
  console.log('URL: POST https://dev.algorhythm.media/api/v1/recommend/template');
  console.log('Headers:');
  console.log('  Authorization: Bearer [JWT_TOKEN]');
  console.log('  Content-Type: application/json');
  console.log('\nRequest Body:');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('\n');
  
  // Make the API call
  const response = await makeApiCall(requestData, jwtToken);
  
  console.log('📥 API RESPONSE:');
  console.log('─'.repeat(50));
  console.log(`Status: ${response.status}`);
  console.log(`Response Time: ${response.responseTime}ms`);
  console.log('\nResponse Data:');
  console.log(JSON.stringify(response.data, null, 2));
  
  // Show alternatives breakdown
  if (response.data.success && response.data.data.alternatives) {
    console.log('\n🎯 ALTERNATIVES BREAKDOWN:');
    console.log('─'.repeat(50));
    console.log(`Total Alternatives: ${response.data.data.alternatives.length}`);
    console.log(`Total Available: ${response.data.data.total_available}`);
    
    response.data.data.alternatives.forEach((alt, i) => {
      console.log(`\nAlternative ${i + 1}:`);
      console.log(`  Template ID: ${alt.template_id || 'N/A'}`);
      console.log(`  Score: ${alt.score || 'N/A'}`);
      console.log(`  Metadata: ${JSON.stringify(alt.metadata || {}, null, 4)}`);
    });
  }
  
  // Show performance metrics
  if (response.data.performance_metrics) {
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log('─'.repeat(50));
    const metrics = response.data.performance_metrics;
    console.log(`Response Time: ${metrics.response_time_ms}ms`);
    console.log(`Cache Hit: ${metrics.cache_hit}`);
    console.log(`Score Computation: ${metrics.score_computation_time_ms}ms`);
    console.log(`Templates Evaluated: ${metrics.templates_evaluated}`);
  }
}

async function makeApiCall(data, token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const startTime = Date.now();
    
    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: '/api/v1/recommend/template',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
            responseTime: Date.now() - startTime
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: { raw: responseData, error: error.message },
            responseTime: Date.now() - startTime
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Run the API data display
showApiData().catch(err => {
  console.error('💥 API call failed:', err);
  process.exit(1);
});
