#!/bin/bash
# Test ReViz Composite Variations API Fixes
# Issues: #1 (current_asset), #2 (generation), #3 (circular variants)

set -e

TOKEN=$(cat /tmp/nna_jwt_token.txt 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  echo "❌ No JWT token found. Run: ./scripts/testing/generate-jwt-token.sh new"
  exit 1
fi

API_KEY="reviz-dev-30390-13220-4896-9516-9001"
ALGORHYTHM_BASE="https://dev.algorhythm.media/api/v1"

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Testing ReViz Composite Variations API Fixes                       ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Issues to verify:"
echo "  #1: current_asset should be first in assets array (Backend fix)"
echo "  #2: Missing composite should trigger generation (AlgoRhythm fix)"
echo "  #3: No circular variants (Backend fix)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Issue #1 - current_asset in assets array"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test with existing composite
curl -s -X POST "$ALGORHYTHM_BASE/reviz/composite/variations" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "9.002.025.558",
    "vary_layers": ["stars"],
    "assets_per_layer": 5,
    "variants_per_asset": 3
  }' > /tmp/reviz_test1.json

echo "Testing Stars layer..."
CURRENT_NNA=$(jq -r '.data.layers[0].current_asset.nna_address' /tmp/reviz_test1.json)
FIRST_ASSET_NNA=$(jq -r '.data.layers[0].assets[0].nna_address' /tmp/reviz_test1.json)

echo "  current_asset.nna_address: $CURRENT_NNA"
echo "  assets[0].nna_address: $FIRST_ASSET_NNA"

if [ "$CURRENT_NNA" = "$FIRST_ASSET_NNA" ]; then
  echo "  ✅ PASS - current_asset is first in assets array"
  ISSUE1_STATUS="✅ FIXED"
else
  echo "  ❌ FAIL - current_asset NOT first in assets array"
  ISSUE1_STATUS="❌ NOT FIXED"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Issue #2 - Composite generation for missing composite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test with component IDs (composite might not exist)
echo "Requesting composite with component IDs..."
curl -s -X POST "$ALGORHYTHM_BASE/reviz/composite/variations" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "1.018.003.002+2.009.001.001+3.003.010.002",
    "vary_layers": ["stars"],
    "assets_per_layer": 3,
    "variants_per_asset": 2
  }' > /tmp/reviz_test2.json 2>&1

HTTP_STATUS=$(cat /tmp/reviz_test2.json | grep -o '"statusCode":[0-9]*' | head -1 | cut -d':' -f2 || echo "200")
SUCCESS=$(jq -r '.success // false' /tmp/reviz_test2.json 2>/dev/null)
HAS_DATA=$(jq -r '.data != null' /tmp/reviz_test2.json 2>/dev/null)

echo "  HTTP Status: $HTTP_STATUS"
echo "  Success: $SUCCESS"
echo "  Has data: $HAS_DATA"

if [ "$SUCCESS" = "true" ] && [ "$HAS_DATA" = "true" ]; then
  echo "  ✅ PASS - Composite generation working (returned data)"
  ISSUE2_STATUS="✅ FIXED"
elif [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "404" ]; then
  echo "  ❌ FAIL - Still returning error instead of generating"
  ISSUE2_STATUS="❌ NOT FIXED"
else
  echo "  ⚠️  UNCLEAR - Unexpected response (check manually)"
  ISSUE2_STATUS="⚠️ UNCLEAR"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Issue #3 - No circular variants"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use test 1 response (existing composite)
echo "Checking for circular variant relationships..."

# Get all main asset IDs
MAIN_ASSETS=$(jq -r '.data.layers[0].assets[].nna_address' /tmp/reviz_test1.json 2>/dev/null)

# Check each main asset's variants
CIRCULAR_FOUND=0
for MAIN_ASSET in $MAIN_ASSETS; do
  # Get variants for this main asset
  VARIANTS=$(jq -r ".data.layers[0].assets[] | select(.nna_address==\"$MAIN_ASSET\") | .variants[]?.nna_address" /tmp/reviz_test1.json 2>/dev/null)

  # Check if any variant is also a main asset
  for VARIANT in $VARIANTS; do
    if echo "$MAIN_ASSETS" | grep -q "$VARIANT"; then
      echo "  ⚠️  Found circular: $MAIN_ASSET has variant $VARIANT (which is also a main asset)"
      CIRCULAR_FOUND=1
    fi
  done
done

if [ $CIRCULAR_FOUND -eq 0 ]; then
  echo "  ✅ PASS - No circular variants found"
  ISSUE3_STATUS="✅ FIXED"
else
  echo "  ❌ FAIL - Circular variants still exist"
  ISSUE3_STATUS="❌ NOT FIXED"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: All layers consistency (Issue #1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test all 4 layers
curl -s -X POST "$ALGORHYTHM_BASE/reviz/composite/variations" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "9.002.025.558",
    "vary_layers": ["stars", "looks", "moves", "worlds"],
    "assets_per_layer": 3,
    "variants_per_asset": 2
  }' > /tmp/reviz_test4.json

ALL_LAYERS_PASS=1
for LAYER in stars looks moves worlds; do
  CURRENT_NNA=$(jq -r ".data.layers[] | select(.layer==\"$LAYER\") | .current_asset.nna_address" /tmp/reviz_test4.json 2>/dev/null)
  FIRST_ASSET_NNA=$(jq -r ".data.layers[] | select(.layer==\"$LAYER\") | .assets[0].nna_address" /tmp/reviz_test4.json 2>/dev/null)

  if [ "$CURRENT_NNA" = "$FIRST_ASSET_NNA" ] && [ -n "$CURRENT_NNA" ]; then
    echo "  ✅ $LAYER: current_asset matches first asset"
  else
    echo "  ❌ $LAYER: MISMATCH (current=$CURRENT_NNA, first=$FIRST_ASSET_NNA)"
    ALL_LAYERS_PASS=0
  fi
done

if [ $ALL_LAYERS_PASS -eq 1 ]; then
  echo ""
  echo "  ✅ PASS - All layers consistent"
else
  echo ""
  echo "  ❌ FAIL - Some layers still inconsistent"
fi

echo ""

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  TEST SUMMARY                                                        ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Issue #1 (current_asset in assets): $ISSUE1_STATUS"
echo "Issue #2 (composite generation): $ISSUE2_STATUS"
echo "Issue #3 (circular variants): $ISSUE3_STATUS"
echo ""

# Overall status
if [ "$ISSUE1_STATUS" = "✅ FIXED" ] && [ "$ISSUE2_STATUS" = "✅ FIXED" ] && [ "$ISSUE3_STATUS" = "✅ FIXED" ]; then
  echo "🎉 ALL ISSUES FIXED!"
  exit 0
elif [ "$ISSUE1_STATUS" = "❌ NOT FIXED" ] || [ "$ISSUE2_STATUS" = "❌ NOT FIXED" ] || [ "$ISSUE3_STATUS" = "❌ NOT FIXED" ]; then
  echo "⚠️  SOME ISSUES REMAIN"
  exit 1
else
  echo "ℹ️  MIXED RESULTS - Manual verification needed"
  exit 2
fi
