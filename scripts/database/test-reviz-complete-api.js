#!/usr/bin/env node

/**
 * Test script for ReViz Complete Experience API
 * Demonstrates the new single-call API for complete ReViz experience
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'https://dev.algorhythm.media';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U';

// Test data
const testSongs = [
  '1.013.017.001',  // PUSH 2 START
  '1.018.001.001',  // Savage Love
  '1.018.004.002',  // Another song
  '1.020.007.004',  // Another song
  '1.018.004.001',  // Another song
];

async function testReVizCompleteAPI() {
  console.log('🎬 Testing ReViz Complete Experience API');
  console.log('==========================================');

  for (const songId of testSongs) {
    console.log(`\n🎵 Testing song: ${songId}`);
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      
      const requestData = {
        song_id: songId,
        user_context: {
          user_id: '68dc484b43bd31f1061dfa22',
          preferences: {
            energy_preference: 'high',
            style_preference: 'modern',
            genre_preferences: ['hip-hop', 'urban', 'pop']
          },
          device_info: {
            platform: 'ios',
            version: '18.1'
          }
        },
        experience_config: {
          max_composites: 5,
          max_assets_per_layer: 5,
          include_variants: true,
          variant_depth: 6,
          layers: ['stars', 'looks', 'moves', 'worlds']
        },
        performance_optimization: {
          preload_assets: true,
          cache_strategy: 'aggressive',
          compression: true
        }
      };

      const response = await makeAPIRequest('/api/v1/reviz/complete-experience', requestData);
      const responseTime = Date.now() - startTime;

      if (response.success) {
        console.log(`✅ Success! Response time: ${responseTime}ms`);
        console.log(`📊 Performance Metrics:`);
        console.log(`   • Total assets loaded: ${response.data.performance_metrics.total_assets_loaded}`);
        console.log(`   • Response time: ${response.data.performance_metrics.response_time_ms}ms`);
        console.log(`   • Cache hit rate: ${(response.data.performance_metrics.cache_hit_rate * 100).toFixed(1)}%`);
        console.log(`   • Compression ratio: ${(response.data.performance_metrics.compression_ratio * 100).toFixed(1)}%`);
        
        console.log(`\n🎬 Song Metadata:`);
        console.log(`   • Title: ${response.data.song_metadata.title}`);
        console.log(`   • Artist: ${response.data.song_metadata.artist}`);
        console.log(`   • Genre: ${response.data.song_metadata.genre}`);
        console.log(`   • Energy: ${response.data.song_metadata.energy_level}`);
        console.log(`   • Mood: ${response.data.song_metadata.mood.join(', ')}`);

        console.log(`\n🎭 Composite Videos: ${response.data.composite_videos.length}`);
        response.data.composite_videos.forEach((composite, index) => {
          console.log(`   ${index + 1}. ${composite.composite_name} (Score: ${composite.compatibility_score.toFixed(2)})`);
        });

        console.log(`\n🎨 Layer Assets:`);
        Object.entries(response.data.layer_assets).forEach(([layer, assets]) => {
          console.log(`   • ${layer.toUpperCase()}: ${assets.total_count} assets`);
          console.log(`     - Base assets: ${assets.assets.length}`);
          console.log(`     - Total with variants: ${assets.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0)}`);
        });

        console.log(`\n🔗 Asset Relationships:`);
        console.log(`   • Composite-to-assets mappings: ${Object.keys(response.data.asset_relationships.composite_to_assets).length}`);
        console.log(`   • Base-to-variants mappings: ${Object.keys(response.data.asset_relationships.base_to_variants).length}`);
        console.log(`   • Compatibility matrix entries: ${Object.keys(response.data.asset_relationships.compatibility_matrix).length}`);

        // Calculate total components
        const totalComponents = response.data.layer_assets.stars.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.looks.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.moves.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.worlds.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0);

        console.log(`\n📈 Scale Analysis:`);
        console.log(`   • Composite videos: ${response.data.composite_videos.length}`);
        console.log(`   • Total components: ${totalComponents}`);
        console.log(`   • Components per composite: ${Math.round(totalComponents / response.data.composite_videos.length)}`);
        console.log(`   • Scale factor: ${(totalComponents / 90).toFixed(1)}x current database`);

      } else {
        console.log(`❌ Failed: ${response.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 ReViz Complete Experience API Test Complete!');
  console.log('===============================================');
}

function makeAPIRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseData);
          resolve(parsedResponse);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
if (require.main === module) {
  testReVizCompleteAPI().catch(console.error);
}

module.exports = { testReVizCompleteAPI };
