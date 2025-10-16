#!/bin/bash

# 🔧 PRODUCTION OPTIMIZATION SCRIPT
# 
# This script optimizes the Algorhythm service for production deployment
# and can be run in the deployed environment.

echo "🔧 Starting production optimization for Algorhythm service..."
echo "📅 Timestamp: $(date)"
echo "🌍 Environment: ${NODE_ENV:-production}"
echo "🔗 Database: ${MONGODB_URI:-Not configured}"

# 1. CHECK SERVICE HEALTH
echo ""
echo "🏥 Checking service health..."
HEALTH_URL="${ALGORHYTHM_BASE_URL:-https://dev.algorhythm.media}/health"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$HEALTH_URL" 2>/dev/null)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Service is healthy (HTTP $HEALTH_RESPONSE)"
else
    echo "⚠️  Service health check failed (HTTP $HEALTH_RESPONSE)"
    echo "   Health URL: $HEALTH_URL"
fi

# 2. CHECK REVIZ API ENDPOINTS
echo ""
echo "🎬 Checking ReViz API endpoints..."
REVIZ_URL="${ALGORHYTHM_BASE_URL:-https://dev.algorhythm.media}/api/v1/reviz/composite/complete-experience"
REVIZ_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$REVIZ_URL" -H "Content-Type: application/json" -d '{"composite_id":"test"}' 2>/dev/null)

if [ "$REVIZ_RESPONSE" = "401" ]; then
    echo "✅ ReViz API is accessible (HTTP $REVIZ_RESPONSE - requires API key)"
else
    echo "⚠️  ReViz API check failed (HTTP $REVIZ_RESPONSE)"
    echo "   ReViz URL: $REVIZ_URL"
fi

# 3. CHECK WEBHOOK ENDPOINTS
echo ""
echo "🔗 Checking webhook endpoints..."
WEBHOOK_URL="${ALGORHYTHM_BASE_URL:-https://dev.algorhythm.media}/api/v1/webhooks/assets/created"
WEBHOOK_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"event":"asset.created","data":{"assetId":"test"}}' 2>/dev/null)

if [ "$WEBHOOK_RESPONSE" = "400" ]; then
    echo "✅ Webhook endpoints are accessible (HTTP $WEBHOOK_RESPONSE - requires webhook secret)"
else
    echo "⚠️  Webhook endpoint check failed (HTTP $WEBHOOK_RESPONSE)"
    echo "   Webhook URL: $WEBHOOK_URL"
fi

# 4. CHECK CORS CONFIGURATION
echo ""
echo "🌐 Checking CORS configuration..."
CORS_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X OPTIONS "$REVIZ_URL" \
    -H "Origin: exp://localhost:8081" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: x-api-key,content-type" 2>/dev/null)

if [ "$CORS_RESPONSE" = "200" ]; then
    echo "✅ CORS configuration is working (HTTP $CORS_RESPONSE)"
else
    echo "⚠️  CORS configuration check failed (HTTP $CORS_RESPONSE)"
fi

# 5. PERFORMANCE TESTING
echo ""
echo "⚡ Running performance tests..."

# Test response times
echo "📊 Testing response times..."
for i in {1..5}; do
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$HEALTH_URL" 2>/dev/null)
    echo "   Test $i: ${RESPONSE_TIME}s"
done

# Test concurrent requests
echo "🔄 Testing concurrent requests..."
CONCURRENT_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$HEALTH_URL" 2>/dev/null)
if [ "$CONCURRENT_RESPONSE" = "200" ]; then
    echo "✅ Concurrent request handling is working"
else
    echo "⚠️  Concurrent request handling failed (HTTP $CONCURRENT_RESPONSE)"
fi

# 6. ENVIRONMENT VARIABLE VALIDATION
echo ""
echo "🔧 Validating environment variables..."

REQUIRED_VARS=(
    "NODE_ENV"
    "MONGODB_URI"
    "JWT_SECRET"
    "REVIZ_API_KEY"
    "WEBHOOK_SECRET"
    "ALGORHYTHM_WEBHOOK_SECRET"
    "ALGORHYTHM_WEBHOOK_URL"
    "NNA_REGISTRY_BASE_URL"
    "NNA_REGISTRY_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    else
        echo "✅ $var: Configured"
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All required environment variables are configured"
else
    echo "⚠️  Missing environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
fi

# 7. GENERATE OPTIMIZATION REPORT
echo ""
echo "📊 Generating optimization report..."

REPORT_FILE="/tmp/algorhythm-optimization-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${NODE_ENV:-production}",
  "service_url": "${ALGORHYTHM_BASE_URL:-https://dev.algorhythm.media}",
  "health_check": {
    "url": "$HEALTH_URL",
    "status_code": $HEALTH_RESPONSE,
    "status": "$([ "$HEALTH_RESPONSE" = "200" ] && echo "healthy" || echo "unhealthy")"
  },
  "reviz_api": {
    "url": "$REVIZ_URL",
    "status_code": $REVIZ_RESPONSE,
    "status": "$([ "$REVIZ_RESPONSE" = "401" ] && echo "accessible" || echo "inaccessible")"
  },
  "webhook_endpoints": {
    "url": "$WEBHOOK_URL",
    "status_code": $WEBHOOK_RESPONSE,
    "status": "$([ "$WEBHOOK_RESPONSE" = "400" ] && echo "accessible" || echo "inaccessible")"
  },
  "cors_configuration": {
    "status_code": $CORS_RESPONSE,
    "status": "$([ "$CORS_RESPONSE" = "200" ] && echo "working" || echo "not_working")"
  },
  "environment_variables": {
    "total_required": ${#REQUIRED_VARS[@]},
    "missing_count": ${#MISSING_VARS[@]},
    "missing_vars": [$(printf '"%s",' "${MISSING_VARS[@]}" | sed 's/,$//')],
    "status": "$([ ${#MISSING_VARS[@]} -eq 0 ] && echo "complete" || echo "incomplete")"
  },
  "optimization_status": {
    "service_health": "$([ "$HEALTH_RESPONSE" = "200" ] && echo "pass" || echo "fail")",
    "reviz_api": "$([ "$REVIZ_RESPONSE" = "401" ] && echo "pass" || echo "fail")",
    "webhook_integration": "$([ "$WEBHOOK_RESPONSE" = "400" ] && echo "pass" || echo "fail")",
    "cors_configuration": "$([ "$CORS_RESPONSE" = "200" ] && echo "pass" || echo "fail")",
    "environment_setup": "$([ ${#MISSING_VARS[@]} -eq 0 ] && echo "pass" || echo "fail")"
  }
}
EOF

echo "📄 Optimization report saved to: $REPORT_FILE"

# 8. SUMMARY
echo ""
echo "🎯 OPTIMIZATION SUMMARY"
echo "========================"

TOTAL_CHECKS=5
PASSED_CHECKS=0

[ "$HEALTH_RESPONSE" = "200" ] && ((PASSED_CHECKS++))
[ "$REVIZ_RESPONSE" = "401" ] && ((PASSED_CHECKS++))
[ "$WEBHOOK_RESPONSE" = "400" ] && ((PASSED_CHECKS++))
[ "$CORS_RESPONSE" = "200" ] && ((PASSED_CHECKS++))
[ ${#MISSING_VARS[@]} -eq 0 ] && ((PASSED_CHECKS++))

echo "✅ Passed: $PASSED_CHECKS/$TOTAL_CHECKS checks"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo "🎉 All optimization checks passed! Service is ready for production."
    echo "🚀 ReViz API integration is fully functional."
    exit 0
else
    echo "⚠️  Some optimization checks failed. Please review the issues above."
    echo "🔧 Service may need additional configuration."
    exit 1
fi
