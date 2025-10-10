#!/usr/bin/env node

/**
 * Collect Performance Metrics
 * Gathers system performance data for monitoring
 */

const fs = require('fs');
const path = require('path');

async function collectPerformanceMetrics() {
  const timestamp = new Date().toISOString();
  const metrics = {
    timestamp,
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      node_version: process.version
    },
    api: {
      health_check: await checkApiHealth(),
      response_times: await measureResponseTimes()
    }
  };
  
  // Save metrics to file
  const metricsFile = path.join(__dirname, '..', 'logs', 'performance-metrics.json');
  const existingMetrics = fs.existsSync(metricsFile) ? JSON.parse(fs.readFileSync(metricsFile, 'utf8')) : [];
  existingMetrics.push(metrics);
  
  // Keep only last 24 hours of metrics
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMetrics = existingMetrics.filter(m => new Date(m.timestamp) > oneDayAgo);
  
  fs.writeFileSync(metricsFile, JSON.stringify(recentMetrics, null, 2));
  console.log('📈 Performance metrics collected and saved');
}

async function checkApiHealth() {
  try {
    const response = await fetch('https://dev.algorhythm.media/api/v1/health');
    return {
      status: response.status,
      ok: response.ok,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function measureResponseTimes() {
  const tests = [
    { name: 'health', url: 'https://dev.algorhythm.media/api/v1/health' },
    { name: 'recommend', url: 'https://dev.algorhythm.media/api/v1/recommend/template' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const start = Date.now();
    try {
      const response = await fetch(test.url, {
        method: test.name === 'recommend' ? 'POST' : 'GET',
        headers: test.name === 'recommend' ? {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc'
        } : {}
      });
      const end = Date.now();
      
      results.push({
        endpoint: test.name,
        response_time_ms: end - start,
        status: response.status,
        ok: response.ok
      });
    } catch (error) {
      results.push({
        endpoint: test.name,
        response_time_ms: -1,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

collectPerformanceMetrics();
