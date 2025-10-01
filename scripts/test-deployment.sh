#!/bin/bash

# AlgoRhythm Service Deployment Testing Script
# Tests all endpoints and functionality across environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("dev" "staging" "prod")
BASE_URLS=(
  "https://dev.algorhythm.dev"
  "https://stg.algorhythm.dev" 
  "https://prod.algorhythm.dev"
)

# Test data
TEST_SONG_ID="test-song-123"
TEST_USER_ID="test-user-456"
TEST_TEMPLATE_ID="test-template-789"

echo -e "${BLUE}🧪 AlgoRhythm Service Deployment Testing${NC}"
echo "================================================"

# Function to test an endpoint
test_endpoint() {
  local url=$1
  local method=${2:-GET}
  local data=${3:-""}
  local expected_status=${4:-200}
  
  echo -n "Testing $method $url... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X POST -H "Content-Type: application/json" -d "$data" "$url")
  fi
  
  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    return 0
  else
    echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
    cat /tmp/response.json
    return 1
  fi
}

# Function to test environment
test_environment() {
  local env=$1
  local base_url=$2
  
  echo -e "\n${YELLOW}🔍 Testing $env environment: $base_url${NC}"
  echo "----------------------------------------"
  
  # Health check
  test_endpoint "$base_url/api/v1/health"
  
  # Analytics endpoints
  test_endpoint "$base_url/api/v1/analytics/events"
  test_endpoint "$base_url/api/v1/analytics/metrics"
  test_endpoint "$base_url/api/v1/analytics/performance"
  
  # Recommendations endpoint
  test_endpoint "$base_url/api/v1/recommendations" "POST" '{"song_id":"'$TEST_SONG_ID'","user_id":"'$TEST_USER_ID'","limit":5}'
  
  # Daemon endpoints (if accessible)
  test_endpoint "$base_url/api/v1/daemon/stats"
  
  # Caching endpoints
  test_endpoint "$base_url/api/v1/cache/stats"
  
  echo -e "${GREEN}✅ $env environment tests completed${NC}"
}

# Function to test daemon functionality
test_daemon() {
  local base_url=$1
  
  echo -e "\n${YELLOW}🤖 Testing Daemon Functionality${NC}"
  echo "----------------------------------------"
  
  # Check daemon stats
  echo "Checking daemon status..."
  curl -s "$base_url/api/v1/daemon/stats" | jq '.'
  
  # Trigger manual index build (if accessible)
  echo -e "\nTriggering manual index build..."
  curl -s -X POST "$base_url/api/v1/daemon/trigger-index-build" | jq '.'
  
  # Trigger score update
  echo -e "\nTriggering score update..."
  curl -s -X POST "$base_url/api/v1/daemon/trigger-score-update" | jq '.'
  
  # Warm cache
  echo -e "\nWarming cache..."
  curl -s -X POST "$base_url/api/v1/daemon/warm-cache" | jq '.'
}

# Function to test NNA Registry integration
test_nna_integration() {
  local base_url=$1
  
  echo -e "\n${YELLOW}🔗 Testing NNA Registry Integration${NC}"
  echo "----------------------------------------"
  
  # Test asset fetching
  echo "Testing asset fetching..."
  curl -s "$base_url/api/v1/nna/assets/test-address" | jq '.'
  
  # Test search functionality
  echo -e "\nTesting search functionality..."
  curl -s "$base_url/api/v1/nna/search?q=test" | jq '.'
}

# Function to test caching
test_caching() {
  local base_url=$1
  
  echo -e "\n${YELLOW}💾 Testing Caching System${NC}"
  echo "----------------------------------------"
  
  # Get cache stats
  echo "Cache statistics:"
  curl -s "$base_url/api/v1/cache/stats" | jq '.'
  
  # Test cache operations
  echo -e "\nTesting cache operations..."
  curl -s -X POST "$base_url/api/v1/cache/set" -H "Content-Type: application/json" -d '{"key":"test-key","value":"test-value","ttl":60}' | jq '.'
  curl -s "$base_url/api/v1/cache/get/test-key" | jq '.'
}

# Function to test analytics
test_analytics() {
  local base_url=$1
  
  echo -e "\n${YELLOW}📊 Testing Analytics System${NC}"
  echo "----------------------------------------"
  
  # Track an event
  echo "Tracking test event..."
  curl -s -X POST "$base_url/api/v1/analytics/events" -H "Content-Type: application/json" -d '{
    "event_type": "recommendation_viewed",
    "user_id": "'$TEST_USER_ID'",
    "song_id": "'$TEST_SONG_ID'",
    "template_id": "'$TEST_TEMPLATE_ID'",
    "metadata": {"test": true}
  }' | jq '.'
  
  # Get analytics metrics
  echo -e "\nGetting analytics metrics..."
  curl -s "$base_url/api/v1/analytics/metrics" | jq '.'
  
  # Get performance metrics
  echo -e "\nGetting performance metrics..."
  curl -s "$base_url/api/v1/analytics/performance" | jq '.'
}

# Main testing function
main() {
  echo "Starting comprehensive testing..."
  
  # Test each environment
  for i in "${!ENVIRONMENTS[@]}"; do
    env="${ENVIRONMENTS[$i]}"
    base_url="${BASE_URLS[$i]}"
    
    test_environment "$env" "$base_url"
    
    # Additional tests for dev environment
    if [ "$env" = "dev" ]; then
      test_daemon "$base_url"
      test_nna_integration "$base_url"
      test_caching "$base_url"
      test_analytics "$base_url"
    fi
  done
  
  echo -e "\n${GREEN}🎉 All tests completed!${NC}"
  echo "================================================"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ jq is required but not installed. Please install jq first.${NC}"
  exit 1
fi

# Run main function
main "$@"
