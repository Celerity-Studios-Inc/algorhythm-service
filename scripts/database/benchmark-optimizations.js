#!/usr/bin/env node

/**
 * Comprehensive Benchmark for AlgoRhythm Optimizations
 * 
 * This script tests:
 * 1. API response times
 * 2. Cache performance
 * 3. Database query performance
 * 4. Index effectiveness
 * 5. Trigger system performance
 */

const { MongoClient } = require('mongodb');
const https = require('https');
const { performance } = require('perf_hooks');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';

// API configuration
const API_BASE_URL = 'https://dev.algorhythm.media';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjODNlNzRlY2I0YTcwOWEzNGMyNWEiLCJlbWFpbCI6InRlc3QtdXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU5ODU1ODMzLCJleHAiOjE3NTk5NDIyMzN9.5SccUhM8VPfxhfoE3RR6AifN6N7vWJ_0rfoqDXXqQ1U';

class AlgoRhythmBenchmark {
  constructor() {
    this.client = null;
    this.db = null;
    this.results = {
      api_tests: [],
      database_tests: [],
      cache_tests: [],
      index_tests: [],
      trigger_tests: []
    };
  }

  async connect() {
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db('nna-registry-service-dev');
    console.log('🔌 Connected to MongoDB for benchmarking');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async makeApiRequest(songId, testName) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        song_id: songId,
        user_context: {
          user_id: "68e5611bd177f8bb92ea4f38",
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
        },
        timeout: 30000 // 30 second timeout
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          try {
            const response = JSON.parse(data);
            resolve({
              testName,
              songId,
              responseTime: Math.round(responseTime),
              success: response.success,
              alternatives: response.data?.alternatives?.length || 0,
              totalAvailable: response.data?.total_available || 0,
              performanceMetrics: response.performance_metrics,
              statusCode: res.statusCode
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  async testApiPerformance() {
    console.log('\n🚀 Testing API Performance');
    console.log('==========================');

    const testSongs = [
      '1.013.017.001', // Popular song
      '1.018.001.001', // Another song
      '1.018.004.001'  // Third song
    ];

    for (const songId of testSongs) {
      try {
        console.log(`📡 Testing song: ${songId}`);
        const result = await this.makeApiRequest(songId, `API Test ${songId}`);
        this.results.api_tests.push(result);
        
        console.log(`✅ ${result.testName}: ${result.responseTime}ms`);
        console.log(`   Alternatives: ${result.alternatives}, Total: ${result.totalAvailable}`);
        console.log(`   Cache Hit: ${result.performanceMetrics?.cache_hit || 'unknown'}`);
        
      } catch (error) {
        console.log(`❌ ${songId}: ${error.message}`);
        this.results.api_tests.push({
          testName: `API Test ${songId}`,
          songId,
          responseTime: -1,
          success: false,
          error: error.message
        });
      }
    }
  }

  async testDatabasePerformance() {
    console.log('\n🗄️  Testing Database Performance');
    console.log('=================================');

    const assets = this.db.collection('assets');
    const recommendationCache = this.db.collection('recommendation-cache');

    // Test 1: Asset count query
    const startTime = performance.now();
    const assetCount = await assets.countDocuments();
    const countTime = performance.now() - startTime;
    
    console.log(`📊 Asset count query: ${Math.round(countTime)}ms (${assetCount} assets)`);
    this.results.database_tests.push({
      test: 'Asset Count Query',
      time: Math.round(countTime),
      result: assetCount
    });

    // Test 2: Layer-based queries
    const layers = ['G', 'S', 'L', 'M', 'W', 'C'];
    for (const layer of layers) {
      const startTime = performance.now();
      const count = await assets.countDocuments({ layer });
      const queryTime = performance.now() - startTime;
      
      console.log(`📊 ${layer} layer query: ${Math.round(queryTime)}ms (${count} assets)`);
      this.results.database_tests.push({
        test: `${layer} Layer Query`,
        time: Math.round(queryTime),
        result: count
      });
    }

    // Test 3: Recommendation cache
    const startTime3 = performance.now();
    const cacheCount = await recommendationCache.countDocuments();
    const cacheQueryTime = performance.now() - startTime3;
    
    console.log(`📊 Recommendation cache query: ${Math.round(cacheQueryTime)}ms (${cacheCount} entries)`);
    this.results.database_tests.push({
      test: 'Recommendation Cache Query',
      time: Math.round(cacheQueryTime),
      result: cacheCount
    });
  }

  async testIndexPerformance() {
    console.log('\n📇 Testing Index Performance');
    console.log('============================');

    const assets = this.db.collection('assets');

    // Test 1: Compound index query
    const startTime = performance.now();
    const compoundResults = await assets.find({ 
      layer: 'C', 
      category: 'FUL' 
    }).limit(10).toArray();
    const compoundTime = performance.now() - startTime;
    
    console.log(`📊 Compound index query: ${Math.round(compoundTime)}ms (${compoundResults.length} results)`);
    this.results.index_tests.push({
      test: 'Compound Index Query',
      time: Math.round(compoundTime),
      result: compoundResults.length
    });

    // Test 2: Text search query
    const startTime2 = performance.now();
    const textResults = await assets.find({ 
      $text: { $search: 'trendy' } 
    }).limit(10).toArray();
    const textTime = performance.now() - startTime2;
    
    console.log(`📊 Text search query: ${Math.round(textTime)}ms (${textResults.length} results)`);
    this.results.index_tests.push({
      test: 'Text Search Query',
      time: Math.round(textTime),
      result: textResults.length
    });

    // Test 3: NNA address lookup
    const startTime3 = performance.now();
    const addressResults = await assets.find({ 
      nna_address: '1.013.017.001' 
    }).toArray();
    const addressTime = performance.now() - startTime3;
    
    console.log(`📊 NNA address lookup: ${Math.round(addressTime)}ms (${addressResults.length} results)`);
    this.results.index_tests.push({
      test: 'NNA Address Lookup',
      time: Math.round(addressTime),
      result: addressResults.length
    });
  }

  async testCachePerformance() {
    console.log('\n💾 Testing Cache Performance');
    console.log('============================');

    const recommendationCache = this.db.collection('recommendation-cache');

    // Test 1: Cache hit rate
    const startTime = performance.now();
    const cachedRecommendations = await recommendationCache.find({ 
      song_id: '1.013.017.001' 
    }).toArray();
    const cacheTime = performance.now() - startTime;
    
    console.log(`📊 Cache lookup: ${Math.round(cacheTime)}ms (${cachedRecommendations.length} cached recommendations)`);
    this.results.cache_tests.push({
      test: 'Cache Lookup',
      time: Math.round(cacheTime),
      result: cachedRecommendations.length
    });

    // Test 2: Cache expiration check
    const startTime2 = performance.now();
    const expiredCount = await recommendationCache.countDocuments({
      expires_at: { $lt: new Date() }
    });
    const expirationTime = performance.now() - startTime2;
    
    console.log(`📊 Cache expiration check: ${Math.round(expirationTime)}ms (${expiredCount} expired entries)`);
    this.results.cache_tests.push({
      test: 'Cache Expiration Check',
      time: Math.round(expirationTime),
      result: expiredCount
    });
  }

  async testTriggerSystem() {
    console.log('\n⚡ Testing Trigger System');
    console.log('========================');

    // Test 1: Check if trigger system is running
    const startTime = performance.now();
    const performanceMetrics = await this.db.collection('performance-metrics').findOne({});
    const metricsTime = performance.now() - startTime;
    
    console.log(`📊 Performance metrics query: ${Math.round(metricsTime)}ms`);
    if (performanceMetrics) {
      console.log(`📊 Last build: ${performanceMetrics.last_build || 'unknown'}`);
      console.log(`📊 Total assets: ${performanceMetrics.total_assets || 'unknown'}`);
      console.log(`📊 Build trigger: ${performanceMetrics.build_trigger || 'unknown'}`);
    }
    
    this.results.trigger_tests.push({
      test: 'Performance Metrics Query',
      time: Math.round(metricsTime),
      result: performanceMetrics ? 'Found' : 'Not found'
    });

    // Test 2: Check cron job status
    const startTime2 = performance.now();
    const fs = require('fs');
    const stateFile = '/tmp/algorhythm-asset-state.json';
    let stateExists = false;
    let stateData = null;
    
    try {
      if (fs.existsSync(stateFile)) {
        stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        stateExists = true;
      }
    } catch (error) {
      console.log(`⚠️  State file error: ${error.message}`);
    }
    
    const stateTime = performance.now() - startTime2;
    
    console.log(`📊 State file check: ${Math.round(stateTime)}ms`);
    if (stateExists && stateData) {
      console.log(`📊 Last asset count: ${stateData.assetCount || 'unknown'}`);
      console.log(`📊 Last update: ${stateData.lastUpdate || 'unknown'}`);
    } else {
      console.log(`📊 State file: Not found`);
    }
    
    this.results.trigger_tests.push({
      test: 'State File Check',
      time: Math.round(stateTime),
      result: stateExists ? 'Found' : 'Not found'
    });
  }

  generateReport() {
    console.log('\n📊 BENCHMARK REPORT');
    console.log('===================');

    // API Performance Summary
    const apiResults = this.results.api_tests.filter(r => r.responseTime > 0);
    if (apiResults.length > 0) {
      const avgResponseTime = apiResults.reduce((sum, r) => sum + r.responseTime, 0) / apiResults.length;
      const minResponseTime = Math.min(...apiResults.map(r => r.responseTime));
      const maxResponseTime = Math.max(...apiResults.map(r => r.responseTime));
      
      console.log('\n🚀 API Performance:');
      console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
      console.log(`   Min Response Time: ${minResponseTime}ms`);
      console.log(`   Max Response Time: ${maxResponseTime}ms`);
      console.log(`   Success Rate: ${apiResults.length}/${this.results.api_tests.length} (${Math.round(apiResults.length/this.results.api_tests.length*100)}%)`);
    }

    // Database Performance Summary
    const dbResults = this.results.database_tests;
    if (dbResults.length > 0) {
      const avgDbTime = dbResults.reduce((sum, r) => sum + r.time, 0) / dbResults.length;
      console.log('\n🗄️  Database Performance:');
      console.log(`   Average Query Time: ${Math.round(avgDbTime)}ms`);
      console.log(`   Total Assets: ${dbResults.find(r => r.test === 'Asset Count Query')?.result || 'unknown'}`);
      console.log(`   Cache Entries: ${dbResults.find(r => r.test === 'Recommendation Cache Query')?.result || 'unknown'}`);
    }

    // Index Performance Summary
    const indexResults = this.results.index_tests;
    if (indexResults.length > 0) {
      const avgIndexTime = indexResults.reduce((sum, r) => sum + r.time, 0) / indexResults.length;
      console.log('\n📇 Index Performance:');
      console.log(`   Average Index Query Time: ${Math.round(avgIndexTime)}ms`);
    }

    // Cache Performance Summary
    const cacheResults = this.results.cache_tests;
    if (cacheResults.length > 0) {
      const avgCacheTime = cacheResults.reduce((sum, r) => sum + r.time, 0) / cacheResults.length;
      console.log('\n💾 Cache Performance:');
      console.log(`   Average Cache Time: ${Math.round(avgCacheTime)}ms`);
    }

    // Overall Performance Grade
    const allTimes = [
      ...this.results.api_tests.filter(r => r.responseTime > 0).map(r => r.responseTime),
      ...this.results.database_tests.map(r => r.time),
      ...this.results.index_tests.map(r => r.time),
      ...this.results.cache_tests.map(r => r.time)
    ];

    if (allTimes.length > 0) {
      const avgTime = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
      let grade = 'F';
      
      if (avgTime < 100) grade = 'A';
      else if (avgTime < 500) grade = 'B';
      else if (avgTime < 1000) grade = 'C';
      else if (avgTime < 2000) grade = 'D';
      
      console.log('\n🎯 Overall Performance Grade:');
      console.log(`   Average Time: ${Math.round(avgTime)}ms`);
      console.log(`   Grade: ${grade}`);
    }

    console.log('\n✅ Benchmark completed!');
  }

  async run() {
    try {
      await this.connect();
      
      console.log('🔬 AlgoRhythm Optimization Benchmark');
      console.log('====================================');
      
      await this.testApiPerformance();
      await this.testDatabasePerformance();
      await this.testIndexPerformance();
      await this.testCachePerformance();
      await this.testTriggerSystem();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new AlgoRhythmBenchmark();
  benchmark.run()
    .then(() => {
      console.log('✅ Benchmark completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

module.exports = { AlgoRhythmBenchmark };
