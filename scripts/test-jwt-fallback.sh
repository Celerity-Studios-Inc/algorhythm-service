#!/bin/bash

# Test JWT Fallback Authentication
# This script tests if the JWT fallback mechanism is working correctly

set -e

ALGORHYTHM_URL="https://dev.algorhythm.media"
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM4MmM0MTkyOGJiYzBiMTQyOTc3NTUiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTgyMzUzODIsImV4cCI6MTc1ODMyMTc4Mn0.yUcmoEPK0e_bQQE9setgKlA4v2zLM0TkIiIyKiIF-K8"

echo "🧪 Testing JWT Fallback Authentication"
echo "AlgoRhythm URL: $ALGORHYTHM_URL"
echo "JWT Token: ${JWT_TOKEN:0:50}..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing health check..."
HEALTH_RESPONSE=$(curl -s "$ALGORHYTHM_URL/api/v1/health")
echo "Health Status: $(echo $HEALTH_RESPONSE | jq -r '.status')"
echo ""

# Test 2: JWT Token Verification
echo "2️⃣ Testing JWT token verification..."
JWT_RESPONSE=$(curl -s -X POST "$ALGORHYTHM_URL/api/v1/recommend/template" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.001.001", "user_context": {"user_id": "68c82c41928bbc0b14297755"}}')

echo "JWT Response:"
echo "$JWT_RESPONSE" | jq .
echo ""

# Check if JWT fallback is working
SUCCESS=$(echo "$JWT_RESPONSE" | jq -r '.success // false')
ERROR_MESSAGE=$(echo "$JWT_RESPONSE" | jq -r '.error.message // ""')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ JWT Fallback Authentication: SUCCESS"
    echo "🎯 ReViz Expo developers can now use NNA Registry JWT tokens directly!"
    
    # Extract user information
    USER_ID=$(echo "$JWT_RESPONSE" | jq -r '.data.user.userId // "N/A"')
    EMAIL=$(echo "$JWT_RESPONSE" | jq -r '.data.user.email // "N/A"')
    TOKEN_SOURCE=$(echo "$JWT_RESPONSE" | jq -r '.data.user.tokenSource // "N/A"')
    
    echo "👤 User ID: $USER_ID"
    echo "📧 Email: $EMAIL"
    echo "🔑 Token Source: $TOKEN_SOURCE"
    
elif [[ "$ERROR_MESSAGE" == *"Invalid token from both AlgoRhythm and NNA Registry"* ]]; then
    echo "❌ JWT Fallback Authentication: FAILED"
    echo "🔍 Issue: NNA Registry JWT secret not accessible"
    echo "💡 Solution: Run ./scripts/update-nna-jwt-secret.sh to fix"
    
elif [[ "$ERROR_MESSAGE" == *"NNA Registry JWT secret not configured"* ]]; then
    echo "❌ JWT Fallback Authentication: FAILED"
    echo "🔍 Issue: NNA_REGISTRY_JWT_SECRET environment variable not loaded"
    echo "💡 Solution: Check Cloud Run service configuration"
    
else
    echo "❌ JWT Fallback Authentication: FAILED"
    echo "🔍 Error: $ERROR_MESSAGE"
    echo "💡 Check service logs for more details"
fi

echo ""
echo "📊 Test Summary:"
echo "- Health Check: $(echo $HEALTH_RESPONSE | jq -r '.status')"
echo "- JWT Fallback: $([ "$SUCCESS" = "true" ] && echo "✅ Working" || echo "❌ Failed")"
echo "- Service Status: $(echo $HEALTH_RESPONSE | jq -r '.services.database.status')"
echo ""
