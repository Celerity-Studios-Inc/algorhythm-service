#!/usr/bin/env node

/**
 * ReViz Developer Workflow Test
 * Simulates real-world ReViz developer usage of the V2.0 API
 * Tests all endpoints as a ReViz developer would use them
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.ALGORHYTHM_BASE_URL || 'https://dev.algorhythm.media';
const JWT_TOKEN = process.env.JWT_TOKEN || 'test-jwt-token';

// Test configurations for different ReViz developer scenarios
const testScenarios = {
  mobile: {
    song_id: 'G.POP.TEN.003',
    user_context: {
      user_id: 'reviz_dev_001',
      device_info: {
        type: 'mobile',
        connection_speed: 'medium',
        screen_resolution: '1080x1920',
        platform: 'ios'
      }
    },
    experience_config: {
      max_composites: 3,
      max_assets_per_layer: 4,
      include_variants: true,
      variant_depth: 4
    }
  },
  desktop: {
    song_id: 'G.HIP.WCO.001',
    user_context: {
      user_id: 'reviz_dev_002',
      preferences: {
        energy_preference: 'high',
        style_preference: 'modern'
      },
      device_info: {
        type: 'desktop',
        connection_speed: 'fast',
        screen_resolution: '1920x1080',
        platform: 'web'
      }
    },
    experience_config: {
      max_composites: 10,
      max_assets_per_layer: 8,
      include_variants: true,
      variant_depth: 6
    }
  },
  kpop: {
    song_id: 'G.POP.KPO.001',
    user_context: {
      user_id: 'reviz_kpop_fan',
      preferences: {
        energy_preference: 'high',
        style_preference: 'trendy',
        cultural_preference: 'k_pop'
      },
      device_info: {
        type: 'mobile',
        connection_speed: 'fast',
        platform: 'android'
      }
    },
    experience_config: {
      max_composites: 5,
      max_assets_per_layer: 6,
      include_variants: true,
      variant_depth: 5
    }
  }
};

class ReVizDeveloperTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'User-Agent': 'ReViz-Developer-Test/1.0',
          ...options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
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
      
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async testSwaggerDocumentation() {
    console.log('🔍 Test 1: Swagger Documentation Access');
    console.log('========================================');
    
    try {
      // Test Swagger UI
      const swaggerUI = await this.makeRequest(`${BASE_URL}/api/docs`);
      console.log(`✅ Swagger UI: ${swaggerUI.status === 200 ? 'Available' : 'Not Available'}`);
      
      // Test Swagger JSON
      const swaggerJSON = await this.makeRequest(`${BASE_URL}/api/docs-json`);
      console.log(`✅ Swagger JSON: ${swaggerJSON.status === 200 ? 'Available' : 'Not Available'}`);
      
      if (swaggerJSON.status === 200) {
        try {
          const swaggerData = JSON.parse(swaggerJSON.data);
          console.log(`📋 API Version: ${swaggerData.info?.version || 'Unknown'}`);
          console.log(`📋 API Title: ${swaggerData.info?.title || 'Unknown'}`);
          
          // Check for V2.0 ReViz endpoints
          const revizEndpoint = swaggerData.paths?.['/api/v1/reviz/complete-experience'];
          const healthEndpoint = swaggerData.paths?.['/api/v1/health'];
          
          console.log(`📋 ReViz Endpoint: ${revizEndpoint ? '✅ Available' : '❌ Missing'}`);
          console.log(`📋 Health Endpoint: ${healthEndpoint ? '✅ Available' : '❌ Missing'}`);
          
          if (revizEndpoint) {
            console.log(`📋 ReViz Methods: ${Object.keys(revizEndpoint).join(', ')}`);
            console.log(`📋 ReViz Description: ${revizEndpoint.post?.summary || 'No description'}`);
          }
          
          return {
            success: true,
            version: swaggerData.info?.version,
            hasReVizEndpoint: !!revizEndpoint,
            hasHealthEndpoint: !!healthEndpoint
          };
        } catch (e) {
          console.log(`❌ Swagger Parse Error: ${e.message}`);
          return { success: false, error: e.message };
        }
      }
      
      return { success: false, error: 'Swagger JSON not available' };
    } catch (error) {
      console.log(`❌ Swagger Test Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testHealthCheck() {
    console.log('\n🔍 Test 2: Health Check');
    console.log('========================');
    
    try {
      const startTime = Date.now();
      const healthResponse = await this.makeRequest(`${BASE_URL}/api/v1/health`);
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Status: ${healthResponse.status}`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      
      if (healthResponse.status === 200) {
        try {
          const healthData = JSON.parse(healthResponse.data);
          console.log(`📊 Health Data: ${JSON.stringify(healthData, null, 2)}`);
          
          return {
            success: true,
            status: healthResponse.status,
            responseTime,
            data: healthData
          };
        } catch (e) {
          console.log(`📊 Health Response: ${healthResponse.data}`);
          return {
            success: true,
            status: healthResponse.status,
            responseTime,
            data: healthResponse.data
          };
        }
      } else {
        console.log(`❌ Health Check Failed: ${healthResponse.data}`);
        return { success: false, status: healthResponse.status, error: healthResponse.data };
      }
    } catch (error) {
      console.log(`❌ Health Check Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testReVizCompleteExperience(scenarioName, config) {
    console.log(`\n🔍 Test 3: ReViz Complete Experience - ${scenarioName.toUpperCase()}`);
    console.log('='.repeat(50 + scenarioName.length));
    
    try {
      const startTime = Date.now();
      const revizResponse = await this.makeRequest(`${BASE_URL}/api/v1/reviz/complete-experience`, {
        method: 'POST',
        body: config
      });
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Status: ${revizResponse.status}`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📊 Content-Type: ${revizResponse.contentType}`);
      
      if (revizResponse.status === 200) {
        try {
          const revizData = JSON.parse(revizResponse.data);
          
          // Analyze V2.0 GCP URL architecture
          const hasGcpUrls = this.analyzeGcpUrls(revizData);
          const hasPerformanceMetrics = this.analyzePerformanceMetrics(revizData);
          const hasLayerData = this.analyzeLayerData(revizData);
          
          console.log(`🎯 GCP URL Architecture: ${hasGcpUrls ? '✅ Working' : '❌ Missing'}`);
          console.log(`📈 Performance Metrics: ${hasPerformanceMetrics ? '✅ Working' : '❌ Missing'}`);
          console.log(`🎨 Layer Data: ${hasLayerData ? '✅ Working' : '❌ Missing'}`);
          
          // Show key metrics
          if (revizData.performance_metrics) {
            console.log(`⚡ Cache Hit: ${revizData.performance_metrics.cache_hit || 'Unknown'}`);
            console.log(`📦 Response Size: ${revizData.performance_metrics.response_size_bytes || 'Unknown'} bytes`);
            console.log(`🔄 Database Queries: ${revizData.performance_metrics.database_queries || 'Unknown'}`);
          }
          
          return {
            success: true,
            status: revizResponse.status,
            responseTime,
            hasGcpUrls,
            hasPerformanceMetrics,
            hasLayerData,
            data: revizData
          };
        } catch (e) {
          console.log(`❌ ReViz Parse Error: ${e.message}`);
          console.log(`📊 Raw Response: ${revizResponse.data.substring(0, 200)}...`);
          return { success: false, error: e.message, rawData: revizResponse.data };
        }
      } else if (revizResponse.status === 401) {
        console.log(`🔐 Authentication Required: ${revizResponse.data}`);
        return { success: false, status: revizResponse.status, error: 'Authentication required' };
      } else {
        console.log(`❌ ReViz API Error: ${revizResponse.data}`);
        return { success: false, status: revizResponse.status, error: revizResponse.data };
      }
    } catch (error) {
      console.log(`❌ ReViz Test Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  analyzeGcpUrls(data) {
    if (!data || !data.layer_assets) return false;
    
    let gcpUrlCount = 0;
    let totalAssets = 0;
    
    Object.values(data.layer_assets).forEach(layer => {
      if (layer.assets) {
        layer.assets.forEach(asset => {
          totalAssets++;
          if (asset.gcpStorageUrl || asset.thumbnailUrl || asset.previewUrl) {
            gcpUrlCount++;
          }
        });
      }
    });
    
    const gcpUrlPercentage = totalAssets > 0 ? Math.round((gcpUrlCount / totalAssets) * 100) : 0;
    console.log(`📊 GCP URLs: ${gcpUrlCount}/${totalAssets} assets (${gcpUrlPercentage}%)`);
    
    return gcpUrlPercentage > 50; // Consider working if >50% have GCP URLs
  }

  analyzePerformanceMetrics(data) {
    return !!(data.performance_metrics && 
              (data.performance_metrics.response_time_ms || 
               data.performance_metrics.cache_hit !== undefined ||
               data.performance_metrics.response_size_bytes));
  }

  analyzeLayerData(data) {
    return !!(data.layer_assets && 
              Object.keys(data.layer_assets).length > 0);
  }

  async runAllTests() {
    console.log('🚀 REVIZ DEVELOPER WORKFLOW TEST');
    console.log('=================================');
    console.log(`📍 Testing: ${BASE_URL}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`🔐 JWT Token: ${JWT_TOKEN.substring(0, 20)}...`);
    console.log('');

    const results = {
      swagger: await this.testSwaggerDocumentation(),
      health: await this.testHealthCheck(),
      scenarios: {}
    };

    // Test each scenario
    for (const [scenarioName, config] of Object.entries(testScenarios)) {
      results.scenarios[scenarioName] = await this.testReVizCompleteExperience(scenarioName, config);
    }

    // Generate summary
    this.generateSummary(results);
    
    return results;
  }

  generateSummary(results) {
    console.log('\n📊 REVIZ DEVELOPER TEST SUMMARY');
    console.log('=================================');
    
    const totalTests = 1 + 1 + Object.keys(testScenarios).length; // swagger + health + scenarios
    let passedTests = 0;
    
    if (results.swagger.success) passedTests++;
    if (results.health.success) passedTests++;
    
    Object.values(results.scenarios).forEach(scenario => {
      if (scenario.success) passedTests++;
    });
    
    console.log(`🎯 Overall Success: ${passedTests}/${totalTests} tests passed`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('');
    
    console.log('📋 Test Results:');
    console.log(`   Swagger Documentation: ${results.swagger.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Health Check: ${results.health.success ? '✅ PASS' : '❌ FAIL'}`);
    
    Object.entries(results.scenarios).forEach(([scenario, result]) => {
      console.log(`   ${scenario.toUpperCase()} Scenario: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      if (result.success && result.responseTime) {
        console.log(`     Response Time: ${result.responseTime}ms`);
        console.log(`     GCP URLs: ${result.hasGcpUrls ? '✅' : '❌'}`);
        console.log(`     Performance Metrics: ${result.hasPerformanceMetrics ? '✅' : '❌'}`);
      }
    });
    
    console.log('');
    console.log('🎯 V2.0 Architecture Status:');
    
    const hasWorkingReViz = Object.values(results.scenarios).some(s => s.success);
    const hasGcpUrls = Object.values(results.scenarios).some(s => s.hasGcpUrls);
    const hasPerformanceMetrics = Object.values(results.scenarios).some(s => s.hasPerformanceMetrics);
    
    console.log(`   ReViz API: ${hasWorkingReViz ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`   GCP URL Architecture: ${hasGcpUrls ? '✅ WORKING' : '❌ NOT WORKING'}`);
    console.log(`   Performance Metrics: ${hasPerformanceMetrics ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
    if (hasWorkingReViz && hasGcpUrls && hasPerformanceMetrics) {
      console.log('\n🎉 V2.0 REVIZ API IS FULLY OPERATIONAL!');
      console.log('   Ready for ReViz developer integration! 🚀');
    } else {
      console.log('\n⚠️  V2.0 REVIZ API NEEDS ATTENTION');
      console.log('   Some features may not be working properly.');
    }
    
    console.log('\n💡 Next Steps for ReViz Developers:');
    console.log('   1. Use the Swagger UI at /api/docs for interactive testing');
    console.log('   2. Implement JWT authentication in your ReViz app');
    console.log('   3. Test with different user contexts and device types');
    console.log('   4. Monitor performance metrics for optimization');
    console.log('   5. Use GCP URLs for efficient asset loading');
  }
}

// Run the tests
async function main() {
  const tester = new ReVizDeveloperTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ ReViz Developer Test Failed:', error.message);
    process.exit(1);
  });
}

module.exports = ReVizDeveloperTester;

