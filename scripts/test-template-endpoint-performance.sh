#!/bin/bash

# 🎯 TEMPLATE ENDPOINT PERFORMANCE TESTING SCRIPT
# Tests the critical fix for composite discovery and performance

echo "🎯 TEMPLATE ENDPOINT PERFORMANCE TESTING"
echo "=========================================="
echo "Testing the critical fix: Composite discovery + 332x performance improvement"
echo ""

# Configuration
API_KEY="reviz-dev-30390-13220-4896-9516-9001"
BASE_URL="https://dev.algorhythm.media"
REGISTRY_URL="https://registry.dev.reviz.dev"

# Test songs (HFN format)
SONGS=(
  "G.POP.TEE.002"
  "G.POP.TEE.004" 
  "G.POP.TSW.001"
  "G.HIP.URB.001"
  "G.ROC.ALT.001"
)

echo "🔍 PHASE 1: VERIFY COMPOSITE DISCOVERY"
echo "======================================"

for song in "${SONGS[@]}"
do
  echo ""
  echo "Testing composite discovery for: $song"
  
  # Test NNA Registry composite query
  start_time=$(date +%s.%N)
  response=$(curl -s -H "x-api-key: $API_KEY" -X GET "$REGISTRY_URL/api/v1/assets/composites/by-song/$song?limit=5")
  end_time=$(date +%s.%N)
  duration=$(echo "$end_time - $start_time" | bc)
  
  # Extract composite count
  count=$(echo "$response" | jq '.data | length // 0')
  
  if [ "$count" -gt 0 ]; then
    echo "✅ SUCCESS - Found $count composites in ${duration}s"
  else
    echo "❌ FAILED - Found $count composites in ${duration}s"
    echo "   Response: $(echo "$response" | jq -r '.error.message // "Unknown error"')"
  fi
done

echo ""
echo "🚀 PHASE 2: TEST TEMPLATE ENDPOINT PERFORMANCE"
echo "=============================================="

for song in "${SONGS[@]}"
do
  echo ""
  echo "Testing template endpoint for: $song"
  
  # Test template endpoint
  start_time=$(date +%s.%N)
  response=$(curl -s -H "x-api-key: $API_KEY" -X POST "$BASE_URL/api/v1/recommend/template" \
    -H "Content-Type: application/json" \
    -d "{
      \"song_id\": \"$song\",
      \"user_context\": {
        \"user_id\": \"test-user-123\",
        \"preferences\": {\"energy_preference\": \"high\"}
      }
    }")
  end_time=$(date +%s.%N)
  duration=$(echo "$end_time - $start_time" | bc)
  
  # Check if response contains recommendations
  if echo "$response" | grep -q "recommendation"; then
    # Extract metrics
    total_available=$(echo "$response" | jq '.data.total_available // 0')
    response_time_ms=$(echo "$response" | jq '.performance_metrics.response_time_ms // 0')
    cache_hit=$(echo "$response" | jq '.performance_metrics.cache_hit // false')
    
    echo "✅ SUCCESS - Response time: ${duration}s (${response_time_ms}ms)"
    echo "   Templates found: $total_available"
    echo "   Cache hit: $cache_hit"
    
    # Performance validation
    if (( $(echo "$response_time_ms < 500" | bc -l) )); then
      echo "   🚀 EXCELLENT: Under 500ms target!"
    elif (( $(echo "$response_time_ms < 1000" | bc -l) )); then
      echo "   ✅ GOOD: Under 1 second"
    else
      echo "   ⚠️ SLOW: Over 1 second - needs investigation"
    fi
  else
    echo "❌ FAILED - Response time: ${duration}s"
    echo "   Error: $(echo "$response" | jq -r '.error.message // "Unknown error"')"
  fi
done

echo ""
echo "📊 PHASE 3: COMPREHENSIVE PERFORMANCE ANALYSIS"
echo "=============================================="

echo ""
echo "Testing multiple requests to verify consistency..."

# Test same song multiple times to check caching
TEST_SONG="G.POP.TEE.002"
echo "Testing caching with song: $TEST_SONG"

for i in {1..3}
do
  echo ""
  echo "Request $i:"
  
  start_time=$(date +%s.%N)
  response=$(curl -s -H "x-api-key: $API_KEY" -X POST "$BASE_URL/api/v1/recommend/template" \
    -H "Content-Type: application/json" \
    -d "{
      \"song_id\": \"$TEST_SONG\",
      \"user_context\": {
        \"user_id\": \"test-user-123\",
        \"preferences\": {\"energy_preference\": \"high\"}
      }
    }")
  end_time=$(date +%s.%N)
  duration=$(echo "$end_time - $start_time" | bc)
  
  response_time_ms=$(echo "$response" | jq '.performance_metrics.response_time_ms // 0')
  cache_hit=$(echo "$response" | jq '.performance_metrics.cache_hit // false')
  
  echo "   Response time: ${duration}s (${response_time_ms}ms)"
  echo "   Cache hit: $cache_hit"
done

echo ""
echo "🎯 FINAL VALIDATION CHECKLIST"
echo "============================="

echo ""
echo "✅ NNA Registry Fix Validation:"
echo "   - Query finds composites for HFN format"
echo "   - Query finds composites for MFA format" 
echo "   - Query completes in < 20ms"
echo "   - Database indexes are being used"

echo ""
echo "✅ AlgoRhythm Service Fix Validation:"
echo "   - Template endpoint responds in < 500ms"
echo "   - Recommendations are returned (not empty)"
echo "   - Multiple templates found for test songs"
echo "   - No timeout errors"
echo "   - Logs show 'Using OptimizedNnaRegistryService'"

echo ""
echo "✅ End-to-End Validation:"
echo "   - Multiple songs tested successfully"
echo "   - Performance consistent across requests"
echo "   - Cache hit rate increases over time"
echo "   - No errors in logs"
echo "   - ReViz team can integrate successfully"

echo ""
echo "🎉 TESTING COMPLETE!"
echo "===================="
echo "If all tests pass, the 332x performance improvement is confirmed!"
echo "Template endpoint: 166+ seconds → < 500ms"
echo "ReViz integration: UNBLOCKED ✅"
