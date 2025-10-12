#!/bin/bash

# 🔍 DEPLOYMENT STATUS MONITORING SCRIPT
# Monitors NNA Registry and AlgoRhythm deployments

echo "🔍 MONITORING DEPLOYMENT STATUS"
echo "================================="
echo ""

API_KEY="reviz-dev-30390-13220-4896-9516-9001"
REGISTRY_URL="https://registry.dev.reviz.dev"
ALGORHYTHM_URL="https://dev.algorhythm.media"

echo "📊 NNA Registry Status:"
echo "----------------------"

# Check NNA Registry health
registry_response=$(curl -s -H "x-api-key: $API_KEY" -X GET "$REGISTRY_URL/api/v1/health" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ NNA Registry: Online"
  echo "   Response: $(echo "$registry_response" | jq -r '.status // "healthy"')"
else
  echo "❌ NNA Registry: Offline or deploying"
fi

# Test composite query
echo ""
echo "🔍 Testing composite query..."
composite_response=$(curl -s -H "x-api-key: $API_KEY" -X GET "$REGISTRY_URL/api/v1/assets/composites/by-song/G.POP.TEE.002?limit=5" 2>/dev/null)
if [ $? -eq 0 ]; then
  count=$(echo "$composite_response" | jq '.data | length // 0')
  if [ "$count" -gt 0 ]; then
    echo "✅ Composite Query: Working ($count composites found)"
  else
    echo "⚠️ Composite Query: No composites found (deployment may still be in progress)"
  fi
else
  echo "❌ Composite Query: Failed"
fi

echo ""
echo "📊 AlgoRhythm Service Status:"
echo "-----------------------------"

# Check AlgoRhythm health
algorhythm_response=$(curl -s -H "x-api-key: $API_KEY" -X GET "$ALGORHYTHM_URL/api/health" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ AlgoRhythm Service: Online"
  echo "   Response: $(echo "$algorhythm_response" | jq -r '.status // "healthy"')"
else
  echo "❌ AlgoRhythm Service: Offline or deploying"
fi

# Test template endpoint
echo ""
echo "🔍 Testing template endpoint..."
template_response=$(curl -s -H "x-api-key: $API_KEY" -X POST "$ALGORHYTHM_URL/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "G.POP.TEE.002", "user_context": {"user_id": "test-user"}}' 2>/dev/null)

if [ $? -eq 0 ]; then
  if echo "$template_response" | grep -q "recommendation"; then
    response_time=$(echo "$template_response" | jq '.performance_metrics.response_time_ms // 0')
    echo "✅ Template Endpoint: Working (${response_time}ms)"
  else
    echo "⚠️ Template Endpoint: Responding but no recommendations (may be deployment in progress)"
  fi
else
  echo "❌ Template Endpoint: Failed"
fi

echo ""
echo "🎯 DEPLOYMENT STATUS SUMMARY"
echo "============================"

# Overall status
if [ "$count" -gt 0 ] && echo "$template_response" | grep -q "recommendation"; then
  echo "🎉 READY FOR TESTING!"
  echo "   - NNA Registry: ✅ Fixed and deployed"
  echo "   - AlgoRhythm Service: ✅ Fixed and deployed"
  echo "   - Composite Discovery: ✅ Working"
  echo "   - Template Endpoint: ✅ Working"
  echo ""
  echo "🚀 Next step: Run comprehensive performance testing!"
  echo "   ./scripts/test-template-endpoint-performance.sh"
else
  echo "⏳ DEPLOYMENT IN PROGRESS"
  echo "   - NNA Registry: $(if [ "$count" -gt 0 ]; then echo "✅ Ready"; else echo "⏳ Deploying"; fi)"
  echo "   - AlgoRhythm Service: $(if echo "$template_response" | grep -q "recommendation"; then echo "✅ Ready"; else echo "⏳ Deploying"; fi)"
  echo ""
  echo "🔄 Check again in a few minutes..."
  echo "   ./scripts/monitor-deployment-status.sh"
fi
