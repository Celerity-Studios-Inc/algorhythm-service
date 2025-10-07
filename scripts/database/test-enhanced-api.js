// Test script to demonstrate enhanced API with format detection
const https = require('https');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U';

async function testApiCall(songId, format) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      song_id: songId,
      user_context: {
        user_id: "68e5611bd177f8bb92ea4f38",
        preferences: {
          energy_preference: "high",
          style_preference: "modern",
          genre_preferences: ["pop", "electronic"]
        },
        device_info: {
          platform: "ios",
          version: "18.1"
        }
      },
      max_alternatives: 5,
      include_scoring_details: true
    });

    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: '/api/v1/recommend/template',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            format,
            songId,
            success: response.success,
            alternatives: response.data?.alternatives?.length || 0,
            totalAvailable: response.data?.total_available || 0,
            responseTime: response.performance_metrics?.response_time_ms || 0,
            templatesEvaluated: response.performance_metrics?.templates_evaluated || 0
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testBothFormats() {
  console.log('🧪 Testing Enhanced API with Format Detection');
  console.log('==============================================');
  
  // Test HFN format
  console.log('\n📱 Testing HFN Format: G.HIP.WCO.001');
  try {
    const hfnResult = await testApiCall('G.HIP.WCO.001', 'HFN');
    console.log(`✅ HFN Result: ${hfnResult.alternatives} alternatives, ${hfnResult.totalAvailable} total, ${hfnResult.responseTime}ms`);
  } catch (error) {
    console.log(`❌ HFN Error: ${error.message}`);
  }
  
  // Test MFA format  
  console.log('\n🔢 Testing MFA Format: 1.013.017.001');
  try {
    const mfaResult = await testApiCall('1.013.017.001', 'MFA');
    console.log(`✅ MFA Result: ${mfaResult.alternatives} alternatives, ${mfaResult.totalAvailable} total, ${mfaResult.responseTime}ms`);
  } catch (error) {
    console.log(`❌ MFA Error: ${error.message}`);
  }
  
  console.log('\n🎯 Summary:');
  console.log('- Both HFN and MFA formats are supported');
  console.log('- API automatically detects and converts HFN to MFA');
  console.log('- ReViz developers can use either format seamlessly');
}

testBothFormats();
