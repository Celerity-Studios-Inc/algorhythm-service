import axios from 'axios';

const NNA_BASE_URL = 'https://registry.dev.reviz.dev';
const API_KEY = 'reviz-dev-30390-13220-4896-9516-9001';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

async function testNNAIntegration(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🚀 Starting NNA Registry Integration Tests...\n');

  // Test 1: Get Composites by Song
  console.log('Test 1: Get Composites by Song');
  const test1Start = Date.now();
  try {
    const response = await axios.get(
      `${NNA_BASE_URL}/api/v1/assets/composites/by-song/1.018.003.002`,
      { 
        headers: { 'x-api-key': API_KEY },
        timeout: 5000 
      }
    );
    const test1Duration = Date.now() - test1Start;
    
    const compositeCount = response.data.length;
    console.log(`✅ Success: ${compositeCount} composites found`);
    console.log(`⏱️  Response time: ${test1Duration}ms`);
    console.log(`📊 Performance: ${Math.round(compositeCount / (test1Duration / 1000))} composites/second\n`);
    
    results.push({
      name: 'Get Composites by Song',
      success: true,
      duration: test1Duration,
      details: { compositeCount, sample: response.data[0] }
    });
  } catch (error) {
    const test1Duration = Date.now() - test1Start;
    console.log(`❌ Failed: ${error.message}\n`);
    results.push({
      name: 'Get Composites by Song',
      success: false,
      duration: test1Duration,
      error: error.message
    });
  }

  // Test 2: Verify Data Structure
  console.log('Test 2: Verify Data Structure');
  const test2Start = Date.now();
  try {
    const response = await axios.get(
      `${NNA_BASE_URL}/api/v1/assets/composites/by-song/1.018.003.002`,
      { 
        headers: { 'x-api-key': API_KEY },
        timeout: 5000 
      }
    );
    
    const composite = response.data[0];
    const requiredFields = ['nna_address', 'components', 'gcpStorageUrl', 'name'];
    const missingFields = requiredFields.filter(field => !(field in composite));
    
    const test2Duration = Date.now() - test2Start;
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields present');
      console.log(`📋 Fields: ${requiredFields.join(', ')}\n`);
      results.push({
        name: 'Verify Data Structure',
        success: true,
        duration: test2Duration,
        details: { requiredFields, sampleData: composite }
      });
    } else {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}\n`);
      results.push({
        name: 'Verify Data Structure',
        success: false,
        duration: test2Duration,
        error: `Missing fields: ${missingFields.join(', ')}`
      });
    }
  } catch (error) {
    const test2Duration = Date.now() - test2Start;
    console.log(`❌ Failed: ${error.message}\n`);
    results.push({
      name: 'Verify Data Structure',
      success: false,
      duration: test2Duration,
      error: error.message
    });
  }

  // Test 3: Performance Benchmark
  console.log('Test 3: Performance Benchmark (10 requests)');
  const test3Start = Date.now();
  const durations: number[] = [];
  
  try {
    for (let i = 0; i < 10; i++) {
      const reqStart = Date.now();
      await axios.get(
        `${NNA_BASE_URL}/api/v1/assets/composites/by-song/1.018.003.002`,
        { 
          headers: { 'x-api-key': API_KEY },
          timeout: 5000 
        }
      );
      durations.push(Date.now() - reqStart);
    }
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`✅ Benchmark complete`);
    console.log(`📊 Average: ${avgDuration.toFixed(0)}ms`);
    console.log(`📊 Min: ${minDuration}ms`);
    console.log(`📊 Max: ${maxDuration}ms\n`);
    
    results.push({
      name: 'Performance Benchmark',
      success: true,
      duration: Date.now() - test3Start,
      details: { avgDuration, minDuration, maxDuration, allDurations: durations }
    });
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    results.push({
      name: 'Performance Benchmark',
      success: false,
      duration: Date.now() - test3Start,
      error: error.message
    });
  }

  // Test 4: Health Check
  console.log('Test 4: NNA Registry Health Check');
  const test4Start = Date.now();
  try {
    const response = await axios.get(`${NNA_BASE_URL}/health`, { timeout: 3000 });
    const test4Duration = Date.now() - test4Start;
    
    console.log(`✅ Health check passed`);
    console.log(`⏱️  Response time: ${test4Duration}ms`);
    console.log(`📊 Status:`, response.data.status, '\n');
    
    results.push({
      name: 'Health Check',
      success: true,
      duration: test4Duration,
      details: response.data
    });
  } catch (error) {
    const test4Duration = Date.now() - test4Start;
    console.log(`❌ Failed: ${error.message}\n`);
    results.push({
      name: 'Health Check',
      success: false,
      duration: test4Duration,
      error: error.message
    });
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! NNA Registry integration is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
  }
  
  return results;
}

// Run tests
testNNAIntegration()
  .then(results => {
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
