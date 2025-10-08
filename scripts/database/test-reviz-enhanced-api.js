#!/usr/bin/env node

/**
 * Enhanced ReViz Complete Experience API Test
 * Demonstrates the improved single-call API with bulk loading, error resilience, and performance optimizations
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'https://dev.algorhythm.media';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U';

// Test scenarios
const testScenarios = [
  {
    name: 'Mobile Optimized (Small)',
    request: {
      song_id: '1.013.017.001',
      user_context: {
        user_id: '68dc484b43bd31f1061dfa22',
        device_info: {
          type: 'mobile',
          connection_speed: 'medium',
          screen_resolution: '1080x1920'
        }
      },
      experience_config: {
        max_composites: 3,
        max_assets_per_layer: 4,
        include_variants: true,
        variant_depth: 4,
        layers: ['stars', 'looks', 'moves', 'worlds']
      },
      performance_optimization: {
        preload_assets: false,
        cache_strategy: 'aggressive',
        compression: true,
        streaming: false
      }
    }
  },
  {
    name: 'Desktop Full Experience (Medium)',
    request: {
      song_id: '1.018.001.001',
      user_context: {
        user_id: '68dc484b43bd31f1061dfa22',
        preferences: {
          preferred_genres: ['pop', 'dance'],
          favorite_styles: ['vibrant', 'energetic'],
          excluded_assets: []
        },
        device_info: {
          type: 'desktop',
          connection_speed: 'fast',
          screen_resolution: '2560x1440'
        }
      },
      experience_config: {
        max_composites: 5,
        max_assets_per_layer: 6,
        include_variants: true,
        variant_depth: 6,
        layers: ['stars', 'looks', 'moves', 'worlds']
      },
      performance_optimization: {
        preload_assets: true,
        cache_strategy: 'balanced',
        compression: true,
        streaming: false
      }
    }
  },
  {
    name: 'Large Scale Experience (Streaming)',
    request: {
      song_id: '1.020.007.004',
      user_context: {
        user_id: '68dc484b43bd31f1061dfa22',
        preferences: {
          preferred_genres: ['hip-hop', 'urban', 'pop'],
          favorite_styles: ['modern', 'trendy'],
          excluded_assets: []
        },
        device_info: {
          type: 'desktop',
          connection_speed: 'fast',
          screen_resolution: '4K'
        }
      },
      experience_config: {
        max_composites: 10,
        max_assets_per_layer: 8,
        include_variants: true,
        variant_depth: 8,
        layers: ['stars', 'looks', 'moves', 'worlds']
      },
      performance_optimization: {
        preload_assets: true,
        cache_strategy: 'aggressive',
        compression: true,
        streaming: true
      }
    }
  }
];

async function testEnhancedReVizAPI() {
  console.log('🎬 Testing Enhanced ReViz Complete Experience API');
  console.log('==================================================');

  for (const scenario of testScenarios) {
    console.log(`\n📱 Testing: ${scenario.name}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      
      // Make API request
      const response = await makeAPIRequest('/api/v1/reviz/complete-experience', scenario.request);
      const responseTime = Date.now() - startTime;

      if (response.success) {
        console.log(`✅ Success! Response time: ${responseTime}ms`);
        
        // Performance Analysis
        console.log(`\n📊 Performance Metrics:`);
        console.log(`   • Total assets loaded: ${response.data.performance_metrics.total_assets_loaded}`);
        console.log(`   • Response time: ${response.data.performance_metrics.response_time_ms}ms`);
        console.log(`   • Cache hit rate: ${(response.data.performance_metrics.cache_hit_rate * 100).toFixed(1)}%`);
        console.log(`   • Compression ratio: ${(response.data.performance_metrics.compression_ratio * 100).toFixed(1)}%`);
        console.log(`   • Data size: ${response.data.performance_metrics.data_size_mb?.toFixed(2) || 'N/A'} MB`);
        console.log(`   • Streaming enabled: ${response.data.performance_metrics.streaming_enabled ? 'Yes' : 'No'}`);
        
        // Song Metadata
        console.log(`\n🎵 Song Metadata:`);
        console.log(`   • Title: ${response.data.song_metadata.song_name}`);
        console.log(`   • Artist: ${response.data.song_metadata.artist_name}`);
        console.log(`   • Genre: ${response.data.song_metadata.genre}`);
        console.log(`   • Energy: ${response.data.song_metadata.energy_level}`);
        console.log(`   • Mood: ${response.data.song_metadata.mood}`);
        console.log(`   • Duration: ${response.data.song_metadata.duration_seconds}s`);

        // Composite Videos
        console.log(`\n🎬 Composite Videos: ${response.data.composite_videos.length}`);
        response.data.composite_videos.forEach((composite, index) => {
          console.log(`   ${index + 1}. ${composite.composite_name} (Score: ${composite.compatibility_score}/100, Rank: ${composite.ranking})`);
          console.log(`      • Components: ${composite.components.star.asset_name}, ${composite.components.look.asset_name}, ${composite.components.move.asset_name}, ${composite.components.world.asset_name}`);
          console.log(`      • Media: ${composite.media.duration_seconds}s, ${composite.media.resolution}, ${composite.media.file_size_mb}MB`);
          console.log(`      • Metadata: ${composite.metadata.mood}, ${composite.metadata.energy_level}, ${composite.metadata.style}`);
          if (composite.analytics) {
            console.log(`      • Analytics: ${composite.analytics.view_count} views, ${composite.analytics.share_count} shares, ${composite.analytics.trending_score} trending`);
          }
        });

        // Layer Assets Analysis
        console.log(`\n🎨 Layer Assets Analysis:`);
        Object.entries(response.data.layer_assets).forEach(([layer, assets]) => {
          console.log(`   • ${layer.toUpperCase()}: ${assets.total_count} base assets`);
          console.log(`     - Total with variants: ${assets.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0)}`);
          console.log(`     - Average variants per base: ${(assets.assets.reduce((sum, asset) => sum + asset.variants.length, 0) / assets.assets.length).toFixed(1)}`);
          console.log(`     - Has variants: ${assets.assets.filter(asset => asset.hasVariants).length}/${assets.assets.length}`);
          
          // Show sample assets
          console.log(`     - Sample assets:`);
          assets.assets.slice(0, 2).forEach((asset, index) => {
            console.log(`       ${index + 1}. ${asset.base_asset.asset_name} (${asset.variants.length} variants)`);
            console.log(`          • Compatibility: Song ${asset.compatibility.with_song}/100, Composite ${asset.compatibility.with_composite}/100`);
            console.log(`          • Media: ${asset.base_asset.media.file_size_mb}MB, ${asset.base_asset.media.format}`);
            if (asset.base_asset.analytics) {
              console.log(`          • Analytics: ${asset.base_asset.analytics.usage_count} uses, ${asset.base_asset.analytics.popularity_score} popularity`);
            }
          });
        });

        // Asset Relationships
        console.log(`\n🔗 Asset Relationships:`);
        console.log(`   • Composite-to-assets mappings: ${Object.keys(response.data.asset_relationships.composite_to_assets).length}`);
        console.log(`   • Base-to-variants mappings: ${Object.keys(response.data.asset_relationships.base_to_variants).length}`);
        console.log(`   • Compatibility matrix entries: ${Object.keys(response.data.asset_relationships.compatibility_matrix).length}`);
        
        // Show sample compatibility scores
        const matrix = response.data.asset_relationships.compatibility_matrix;
        const assetIds = Object.keys(matrix);
        if (assetIds.length > 0) {
          const sampleAsset = assetIds[0];
          const compatibilities = Object.entries(matrix[sampleAsset]).slice(0, 3);
          console.log(`   • Sample compatibilities for ${sampleAsset}:`);
          compatibilities.forEach(([otherAsset, score]) => {
            console.log(`     - ${otherAsset}: ${score}/100`);
          });
        }

        // Scale Analysis
        const totalComponents = response.data.layer_assets.stars.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.looks.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.moves.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0) +
                               response.data.layer_assets.worlds.assets.reduce((sum, asset) => sum + 1 + asset.variants.length, 0);

        console.log(`\n📈 Scale Analysis:`);
        console.log(`   • Composite videos: ${response.data.composite_videos.length}`);
        console.log(`   • Total components: ${totalComponents}`);
        console.log(`   • Components per composite: ${Math.round(totalComponents / response.data.composite_videos.length)}`);
        console.log(`   • Scale factor: ${(totalComponents / 90).toFixed(1)}x current database`);
        console.log(`   • Estimated 3M scale: ${Math.round((totalComponents / 90) * 3000000).toLocaleString()} components`);

        // Performance Evaluation
        console.log(`\n⚡ Performance Evaluation:`);
        const performance = response.data.performance_metrics;
        if (performance.response_time_ms < 200) {
          console.log(`   ✅ Excellent: ${performance.response_time_ms}ms < 200ms target`);
        } else if (performance.response_time_ms < 500) {
          console.log(`   ✅ Good: ${performance.response_time_ms}ms < 500ms target`);
        } else if (performance.response_time_ms < 1000) {
          console.log(`   ⚠️ Acceptable: ${performance.response_time_ms}ms < 1s target`);
        } else {
          console.log(`   ❌ Slow: ${performance.response_time_ms}ms > 1s target`);
        }

        if (performance.cache_hit_rate > 0.8) {
          console.log(`   ✅ Excellent cache hit rate: ${(performance.cache_hit_rate * 100).toFixed(1)}%`);
        } else if (performance.cache_hit_rate > 0.5) {
          console.log(`   ✅ Good cache hit rate: ${(performance.cache_hit_rate * 100).toFixed(1)}%`);
        } else {
          console.log(`   ⚠️ Low cache hit rate: ${(performance.cache_hit_rate * 100).toFixed(1)}%`);
        }

        if (performance.compression_ratio < 0.5) {
          console.log(`   ✅ Excellent compression: ${(performance.compression_ratio * 100).toFixed(1)}% of original size`);
        } else if (performance.compression_ratio < 0.7) {
          console.log(`   ✅ Good compression: ${(performance.compression_ratio * 100).toFixed(1)}% of original size`);
        } else {
          console.log(`   ⚠️ Limited compression: ${(performance.compression_ratio * 100).toFixed(1)}% of original size`);
        }

      } else {
        console.log(`❌ Failed: ${response.message || 'Unknown error'}`);
        if (response.errors) {
          response.errors.forEach(error => {
            console.log(`   • ${error.code}: ${error.message}`);
          });
        }
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test API status endpoints
  console.log('\n🔍 Testing API Status Endpoints');
  console.log('─'.repeat(40));

  try {
    const healthResponse = await makeAPIRequest('/api/v1/reviz/health', {}, 'POST');
    console.log(`✅ Health Check: ${healthResponse.status}`);
  } catch (error) {
    console.log(`❌ Health Check failed: ${error.message}`);
  }

  try {
    const statusResponse = await makeAPIRequest('/api/v1/reviz/status', {}, 'POST');
    console.log(`✅ Status Check: ${statusResponse.status}`);
    console.log(`   • Performance: ${statusResponse.performance.average_response_time_ms}ms avg, ${(statusResponse.performance.cache_hit_rate * 100).toFixed(1)}% cache hit`);
    console.log(`   • Capabilities: Streaming ${statusResponse.capabilities.streaming ? '✅' : '❌'}, Compression ${statusResponse.capabilities.compression ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`❌ Status Check failed: ${error.message}`);
  }

  console.log('\n🎉 Enhanced ReViz Complete Experience API Test Complete!');
  console.log('==========================================================');
}

function makeAPIRequest(endpoint, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: endpoint,
      method: method,
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

    if (method === 'POST') {
      req.write(postData);
    }
    req.end();
  });
}

// Run the test
if (require.main === module) {
  testEnhancedReVizAPI().catch(console.error);
}

module.exports = { testEnhancedReVizAPI };
