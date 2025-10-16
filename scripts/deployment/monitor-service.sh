#!/bin/bash

# AlgoRhythm Service Monitoring Script
# Continuously monitors service health and performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${1:-"https://dev.algorhythm.dev"}
INTERVAL=${2:-30} # seconds
LOG_FILE="monitoring.log"

echo -e "${BLUE}🔍 AlgoRhythm Service Monitor${NC}"
echo "Monitoring: $BASE_URL"
echo "Interval: ${INTERVAL}s"
echo "Log file: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo "================================================"

# Function to check health
check_health() {
  local start_time=$(date +%s%3N)
  local response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BASE_URL/api/v1/health")
  local end_time=$(date +%s%3N)
  local response_time=$((end_time - start_time))
  
  if [ "$response" = "200" ]; then
    local status=$(jq -r '.status' /tmp/health_response.json 2>/dev/null || echo "unknown")
    local db_status=$(jq -r '.services.database' /tmp/health_response.json 2>/dev/null || echo "unknown")
    local cache_status=$(jq -r '.services.cache' /tmp/health_response.json 2>/dev/null || echo "unknown")
    local nna_status=$(jq -r '.services.nna_registry' /tmp/health_response.json 2>/dev/null || echo "unknown")
    
    echo -e "${GREEN}✅ HEALTHY${NC} | Response: ${response_time}ms | DB: $db_status | Cache: $cache_status | NNA: $nna_status"
    echo "$(date): HEALTHY - Response: ${response_time}ms - DB: $db_status - Cache: $cache_status - NNA: $nna_status" >> "$LOG_FILE"
  else
    echo -e "${RED}❌ UNHEALTHY${NC} | HTTP: $response | Response: ${response_time}ms"
    echo "$(date): UNHEALTHY - HTTP: $response - Response: ${response_time}ms" >> "$LOG_FILE"
  fi
}

# Function to check performance
check_performance() {
  local start_time=$(date +%s%3N)
  local response=$(curl -s -w "%{http_code}" -o /tmp/perf_response.json "$BASE_URL/api/v1/analytics/performance")
  local end_time=$(date +%s%3N)
  local response_time=$((end_time - start_time))
  
  if [ "$response" = "200" ]; then
    local avg_response=$(jq -r '.avg_response_time' /tmp/perf_response.json 2>/dev/null || echo "N/A")
    local cache_hit_rate=$(jq -r '.cache_hit_rate' /tmp/perf_response.json 2>/dev/null || echo "N/A")
    
    echo -e "${BLUE}📊 Performance${NC} | Avg: ${avg_response}ms | Cache Hit: ${cache_hit_rate}"
  else
    echo -e "${RED}❌ Performance check failed${NC} | HTTP: $response"
  fi
}

# Function to check daemon status
check_daemon() {
  local response=$(curl -s -w "%{http_code}" -o /tmp/daemon_response.json "$BASE_URL/api/v1/daemon/stats")
  
  if [ "$response" = "200" ]; then
    local status=$(jq -r '.status' /tmp/daemon_response.json 2>/dev/null || echo "unknown")
    local last_build=$(jq -r '.lastIndexBuild' /tmp/daemon_response.json 2>/dev/null || echo "N/A")
    
    echo -e "${YELLOW}🤖 Daemon${NC} | Status: $status | Last Build: $last_build"
  else
    echo -e "${RED}❌ Daemon check failed${NC} | HTTP: $response"
  fi
}

# Main monitoring loop
while true; do
  echo -e "\n$(date '+%Y-%m-%d %H:%M:%S')"
  echo "----------------------------------------"
  
  check_health
  check_performance
  check_daemon
  
  echo "----------------------------------------"
  sleep "$INTERVAL"
done
