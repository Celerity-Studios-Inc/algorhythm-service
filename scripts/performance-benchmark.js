#!/usr/bin/env node

/**
 * AlgoRhythm Performance Benchmark Suite
 * Tests P95 < 2s target with real API calls
 */

const https = require('https');
const { performance } = require('perf_hooks');

const API_BASE = 'https://dev.algorhythm.media';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';

// Test scenarios
const testScenarios = [
  {
    name: 'Template Recommendation - HFN Format',
    endpoint: '/api/v1/recommend/template',
    method: 'POST',
    data: {
      song_id: '1.018.003.002',
      user_context: { user_id: 'benchmark_user' },
      max_alternatives: 5
    }
  },
  {
    name: 'Template Recommendation - MFA Format',
    endpoint: '/api/v1/recommend/template', 
    method: 'POST',
    data: {
      song_id: '1018003002',
      user_context: { user_id: 'benchmark_user' },
      max_alternatives: 5
    }
  },
  {
    name: 'Health Check',
    endpoint: '/api/health',
    method: 'GET',
    data: null
  },
  {
    name: 'Legacy Path (410 Gone)',
    endpoint: '/api/v1/algorhythm/recommend/template',
    method: 'POST', 
    data: {
      song_id: '1.018.003.002',
      user_context: { user_id: 'benchmark_user' }
    }
  }
];

async function makeRequest(scenario) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const postData = scenario.data ? JSON.stringify(scenario.data) : null;
    
    const options = {
      hostname: 'dev.algorhythm.media',
      port: 443,
      path: scenario.endpoint,
      method: scenario.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'User-Agent': 'AlgoRhythm-Benchmark/1.0'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          scenario: scenario.name,
          statusCode: res.statusCode,
          responseTime: Math.round(responseTime),
          success: res.statusCode >= 200 && res.statusCode < 300,
          headers: res.headers,
          dataLength: data.length
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      reject({
        scenario: scenario.name,
        error: error.message,
        responseTime: Math.round(responseTime),
        success: false
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject({
        scenario: scenario.name,
        error: 'Request timeout after 5s',
        responseTime: 5000,
        success: false
      });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function runBenchmark() {
  console.log('🚀 AlgoRhythm Performance Benchmark Suite');
  console.log('==========================================\n');
  
  const results = [];
  const iterations = 10; // Run each test 10 times
  
  for (const scenario of testScenarios) {
    console.log(`📊 Testing: ${scenario.name}`);
    console.log(`   Endpoint: ${scenario.method} ${scenario.endpoint}`);
    
    const scenarioResults = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await makeRequest(scenario);
        scenarioResults.push(result);
        
        if (result.success) {
          console.log(`   ✅ Run ${i + 1}: ${result.responseTime}ms (${result.statusCode})`);
        } else {
          console.log(`   ❌ Run ${i + 1}: ${result.responseTime}ms (${result.statusCode}) - ${result.error || 'Failed'}`);
        }
      } catch (error) {
        console.log(`   ❌ Run ${i + 1}: ${error.responseTime}ms - ${error.error}`);
        scenarioResults.push(error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    results.push({
      scenario: scenario.name,
      results: scenarioResults
    });
    
    console.log('');
  }
  
  // Calculate statistics
  console.log('📈 PERFORMANCE ANALYSIS');
  console.log('======================\n');
  
  for (const test of results) {
    const successfulResults = test.results.filter(r => r.success);
    const responseTimes = successfulResults.map(r => r.responseTime);
    
    if (responseTimes.length === 0) {
      console.log(`❌ ${test.scenario}: No successful requests`);
      continue;
    }
    
    responseTimes.sort((a, b) => a - b);
    
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
    
    const successRate = (successfulResults.length / test.results.length) * 100;
    
    console.log(`📊 ${test.scenario}:`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}% (${successfulResults.length}/${test.results.length})`);
    console.log(`   Response Times:`);
    console.log(`     Min: ${min}ms`);
    console.log(`     Avg: ${Math.round(avg)}ms`);
    console.log(`     P50: ${p50}ms`);
    console.log(`     P95: ${p95}ms ${p95 <= 2000 ? '✅' : '❌'} (Target: <2000ms)`);
    console.log(`     P99: ${p99}ms`);
    console.log(`     Max: ${max}ms`);
    
    // Performance tier assessment
    let tier = '❌ Needs Optimization';
    if (p95 <= 2000) tier = '🚀 Excellent';
    else if (p95 <= 5000) tier = '⚠️ Good';
    
    console.log(`   Performance Tier: ${tier}\n`);
  }
  
  // Overall assessment
  const allP95s = results
    .map(r => r.results.filter(res => res.success).map(res => res.responseTime))
    .filter(times => times.length > 0)
    .map(times => {
      times.sort((a, b) => a - b);
      return times[Math.floor(times.length * 0.95)];
    });
  
  const overallP95 = Math.max(...allP95s);
  
  console.log('🎯 OVERALL PERFORMANCE ASSESSMENT');
  console.log('================================');
  console.log(`P95 Response Time: ${overallP95}ms ${overallP95 <= 2000 ? '✅ TARGET ACHIEVED' : '❌ TARGET MISSED'}`);
  console.log(`Target: < 2000ms (2 seconds)`);
  
  if (overallP95 <= 2000) {
    console.log('🎉 AlgoRhythm service meets performance targets!');
  } else {
    console.log('⚠️ AlgoRhythm service needs optimization to meet P95 < 2s target');
  }
}

// Run the benchmark
runBenchmark().catch(console.error);
