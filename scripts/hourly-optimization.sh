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
  -d "{\"song_id\": \"1.001.003.001\", \"user_context\": {\"user_id\": \"hourly_test_$(date +%s)\"}}" \
  --max-time 30 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}' >> $LOG_FILE 2>&1

# 5. Cache Optimization
echo "[$DATE] 🧹 Optimizing caches..." >> $LOG_FILE
npx ts-node scripts/cache-warmup.ts >> $LOG_FILE 2>&1 || echo "Cache warmup skipped (TypeScript not available)" >> $LOG_FILE

# 6. Composite Asset Validation
echo "[$DATE] ✅ Validating composite assets..." >> $LOG_FILE
node scripts/validate-composite-assets.js >> $LOG_FILE 2>&1

# 7. Performance Metrics Collection
echo "[$DATE] 📈 Collecting performance metrics..." >> $LOG_FILE
node scripts/collect-performance-metrics.js >> $LOG_FILE 2>&1

echo "[$DATE] ✅ Hourly optimization completed" >> $LOG_FILE
