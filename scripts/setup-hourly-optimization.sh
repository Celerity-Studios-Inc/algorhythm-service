#!/bin/bash

# Setup Hourly AlgoRhythm Optimization and Testing
# This script sets up cron jobs to run every hour for:
# - Asset monitoring and analysis
# - Performance testing
# - Cache optimization
# - Composite asset validation

echo "🚀 Setting up hourly AlgoRhythm optimization and testing..."

# Create the hourly optimization script
cat > /Users/ajaymadhok/algorhythm-service/scripts/hourly-optimization.sh << 'EOF'
#!/bin/bash

# Hourly AlgoRhythm Optimization and Testing
# Runs every hour to monitor, test, and optimize the system

LOG_FILE="/Users/ajaymadhok/algorhythm-service/logs/hourly-optimization.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 🔄 Starting hourly AlgoRhythm optimization..." >> $LOG_FILE

# Change to project directory
cd /Users/ajaymadhok/algorhythm-service

# 1. Asset Monitoring and Analysis
echo "[$DATE] 📊 Running asset analysis..." >> $LOG_FILE
node scripts/database/monitor-asset-metadata.js >> $LOG_FILE 2>&1

# 2. Performance Testing
echo "[$DATE] ⚡ Running performance tests..." >> $LOG_FILE
node scripts/test-v2-optimized-performance.js >> $LOG_FILE 2>&1

# 3. API Health Check
echo "[$DATE] 🏥 Checking API health..." >> $LOG_FILE
curl -s "https://dev.algorhythm.media/api/v1/health" | jq . >> $LOG_FILE 2>&1

# 4. ReViz API Testing
echo "[$DATE] 🎯 Testing ReViz API with GCP URLs..." >> $LOG_FILE
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "1.001.003.001",
    "user_context": {
      "user_id": "hourly_test_' + $(date +%s) + '"
    }
  }' \
  --max-time 30 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}' >> $LOG_FILE 2>&1

# 5. Cache Optimization
echo "[$DATE] 🧹 Optimizing caches..." >> $LOG_FILE
node scripts/cache-warmup.ts >> $LOG_FILE 2>&1

# 6. Composite Asset Validation
echo "[$DATE] ✅ Validating composite assets..." >> $LOG_FILE
node scripts/validate-composite-assets.js >> $LOG_FILE 2>&1

# 7. Performance Metrics Collection
echo "[$DATE] 📈 Collecting performance metrics..." >> $LOG_FILE
node scripts/collect-performance-metrics.js >> $LOG_FILE 2>&1

echo "[$DATE] ✅ Hourly optimization completed" >> $LOG_FILE
EOF

# Make the script executable
chmod +x /Users/ajaymadhok/algorhythm-service/scripts/hourly-optimization.sh

# Create composite asset validation script
cat > /Users/ajaymadhok/algorhythm-service/scripts/validate-composite-assets.js << 'EOF'
#!/usr/bin/env node

/**
 * Validate Composite Assets
 * Checks for C.FUL composites and validates GCP URLs
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService';
const DB_NAME = 'nna-registry-service-dev';

async function validateCompositeAssets() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const assets = db.collection('assets');
    
    console.log('🔍 Validating composite assets...');
    
    // Check C.FUL composites
    const cFulComposites = await assets.find({ 
      name: { $regex: /^C\.FUL\./ } 
    }).toArray();
    
    console.log(`📊 Found ${cFulComposites.length} C.FUL composites`);
    
    // Check C.PAR composites
    const cParComposites = await assets.find({ 
      name: { $regex: /^C\.PAR\./ } 
    }).toArray();
    
    console.log(`📊 Found ${cParComposites.length} C.PAR composites`);
    
    // Validate GCP URLs
    const compositesWithGcpUrls = cFulComposites.filter(composite => 
      composite.gcpStorageUrl && composite.gcpStorageUrl.includes('storage.googleapis.com')
    );
    
    console.log(`✅ ${compositesWithGcpUrls.length}/${cFulComposites.length} C.FUL composites have GCP URLs`);
    
    // Log any issues
    const compositesWithoutGcpUrls = cFulComposites.filter(composite => 
      !composite.gcpStorageUrl || !composite.gcpStorageUrl.includes('storage.googleapis.com')
    );
    
    if (compositesWithoutGcpUrls.length > 0) {
      console.log(`⚠️  ${compositesWithoutGcpUrls.length} C.FUL composites missing GCP URLs:`);
      compositesWithoutGcpUrls.forEach(composite => {
        console.log(`   - ${composite.name} (${composite.nna_address})`);
      });
    }
    
    console.log('✅ Composite asset validation completed');
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
  } finally {
    await client.close();
  }
}

validateCompositeAssets();
EOF

# Create performance metrics collection script
cat > /Users/ajaymadhok/algorhythm-service/scripts/collect-performance-metrics.js << 'EOF'
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
EOF

# Make scripts executable
chmod +x /Users/ajaymadhok/algorhythm-service/scripts/validate-composite-assets.js
chmod +x /Users/ajaymadhok/algorhythm-service/scripts/collect-performance-metrics.js

# Set up the cron job to run every hour
echo "⏰ Setting up hourly cron job..."

# Remove any existing hourly jobs
crontab -l 2>/dev/null | grep -v "hourly-optimization" | crontab -

# Add the new hourly job
(crontab -l 2>/dev/null; echo "0 * * * * /Users/ajaymadhok/algorhythm-service/scripts/hourly-optimization.sh") | crontab -

echo "✅ Hourly optimization cron job set up successfully!"
echo "📅 Cron job will run every hour at minute 0"
echo "📝 Logs will be saved to: /Users/ajaymadhok/algorhythm-service/logs/hourly-optimization.log"

# Show current cron jobs
echo "📋 Current cron jobs:"
crontab -l

echo "🎯 Hourly AlgoRhythm optimization setup complete!"
