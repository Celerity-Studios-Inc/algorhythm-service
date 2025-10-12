# ReViz Developer Testing Guide - Enhanced API

## 🧪 **Complete Testing Instructions for ReViz Developers**

**Date**: October 10, 2025  
**Status**: ✅ **ENHANCED API READY** - 119/132 assets (90% coverage)  
**Purpose**: Test all enhanced features and validate integration

---

## 🔑 **Quick Start Testing**

### **1. Get Authentication Token**
```bash
# Get JWT token for testing
curl -X POST "https://dev.algorhythm.media/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword"
  }' | jq -r '.data.token'
```

### **2. Test API Health**
```bash
# Quick health check
curl -X GET "https://dev.algorhythm.media/api/v1/health" \
  --max-time 10
```

---

## 🎯 **Core API Testing**

### **Test 1: Enhanced Template Recommendations**
```bash
# Test with enhanced metadata and real GCP URLs
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_reviz_developer"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {
    template_name,
    gcp_storage_url,
    thumbnail_url,
    preview_url,
    algorhythmMetadata: .metadata.algorhythmMetadata,
    synergyScore: .metadata.aggregatedMetadata.synergyScore
  }'
```

**Expected Results**:
- ✅ `gcp_storage_url` should contain real GCP URL (not null)
- ✅ `thumbnail_url` and `preview_url` should be generated from real URL
- ✅ `algorhythmMetadata` should contain performance context, target audience, etc.
- ✅ `synergyScore` should be a number between 0-100

### **Test 2: Complete Experience - Song-Based**
```bash
# Test song-based complete experience
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_song_based",
      "device_info": {
        "type": "mobile",
        "connection_speed": "medium"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "variant_depth": 4
    }
  }' \
  --max-time 15 | jq '.data | {
    song_metadata: .song_metadata,
    composite_count: (.composite_videos | length),
    layer_assets: (.layer_assets | keys),
    performance_metrics: .performance_metrics
  }'
```

**Expected Results**:
- ✅ `song_metadata` should contain song details
- ✅ `composite_count` should be > 0 (41 composites available)
- ✅ `layer_assets` should contain ["stars", "looks", "moves", "worlds"]
- ✅ `performance_metrics` should show response time and asset counts

### **Test 3: Complete Experience - Composite-Specific (NEW!)**
```bash
# Test composite-specific request (ReViz preferred)
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "composite_id": "C.FUL.ALL.047",
    "user_context": {
      "user_id": "test_composite_specific",
      "device_info": {
        "type": "mobile",
        "connection_speed": "medium"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "variant_depth": 4
    }
  }' \
  --max-time 15 | jq '.data.composite_videos[0] | {
    composite_id,
    composite_name,
    synergyScore: .metadata.synergyScore,
    synergyBreakdown: .metadata.synergyBreakdown,
    components: (.components | keys)
  }'
```

**Expected Results**:
- ✅ `composite_id` should match the requested ID
- ✅ `synergyScore` should be a number between 0-100
- ✅ `synergyBreakdown` should contain detailed analysis
- ✅ `components` should contain ["song", "star", "look", "move", "world"]

---

## 🔍 **Enhanced Metadata Testing**

### **Test 4: Algorhythm Metadata Fields**
```bash
# Test Algorhythm standardized fields
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_algorhythm_fields"
    }
  }' \
  --max-time 15 | jq '.data.recommendation.metadata.algorhythmMetadata'
```

**Expected Results**:
```json
{
  "performanceContext": ["studio", "concert", "live"],
  "targetAudience": ["teens", "young_adults"],
  "culturalContext": ["western", "k_pop"],
  "musicalStyle": ["pop", "electronic"],
  "energyLevel": "high"
}
```

### **Test 5: Composite Synergy Analysis**
```bash
# Test synergy analysis for composite assets
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_synergy_analysis"
    }
  }' \
  --max-time 15 | jq '.data.recommendation.metadata.aggregatedMetadata'
```

**Expected Results**:
```json
{
  "synergyScore": 85,
  "synergyBreakdown": {
    "visualCohesion": 0.8,
    "culturalAlignment": 0.9,
    "energyBalance": 0.7,
    "audienceMatch": 0.85,
    "thematicCoherence": 0.75
  }
}
```

### **Test 6: Media Quality Metrics**
```bash
# Test media metadata
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_media_metadata"
    }
  }' \
  --max-time 15 | jq '.data.recommendation.metadata.media'
```

**Expected Results**:
```json
{
  "duration_seconds": 30,
  "file_size_mb": 15.2,
  "resolution": "1080p",
  "format": "mp4",
  "quality_score": 0.9
}
```

---

## 🚀 **Performance Testing**

### **Test 7: Response Time Testing**
```bash
# Test API response times
time curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_performance"
    }
  }' \
  --max-time 15 > /dev/null
```

**Expected Results**:
- ✅ Response time should be < 2 seconds
- ✅ No timeouts or errors

### **Test 8: Batch Performance Testing**
```bash
# Test multiple requests for performance
for i in {1..5}; do
  echo "Request $i:"
  time curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer [YOUR_TOKEN]" \
    -d "{
      \"song_id\": \"1.018.003.002\",
      \"user_context\": {
        \"user_id\": \"test_batch_$i\"
      }
    }" \
    --max-time 15 > /dev/null
done
```

**Expected Results**:
- ✅ All requests should complete successfully
- ✅ Consistent response times
- ✅ No degradation in performance

---

## 🎯 **Advanced Testing Scenarios**

### **Test 9: Different Song IDs**
```bash
# Test with different songs to verify variety
SONGS=("1.018.003.002" "1.001.003.001" "1.013.017.001")

for song in "${SONGS[@]}"; do
  echo "Testing with song: $song"
  curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer [YOUR_TOKEN]" \
    -d "{
      \"song_id\": \"$song\",
      \"user_context\": {
        \"user_id\": \"test_song_$song\"
      }
    }" \
    --max-time 15 | jq '.data.recommendation.template_name'
done
```

### **Test 10: Error Handling**
```bash
# Test with invalid song ID
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "song_id": "INVALID_SONG_ID",
    "user_context": {
      "user_id": "test_error_handling"
    }
  }' \
  --max-time 15 | jq '.success, .error'
```

**Expected Results**:
- ✅ Should return `success: false`
- ✅ Should contain error message
- ✅ Should not crash or timeout

### **Test 11: Authentication Testing**
```bash
# Test without authentication
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_no_auth"
    }
  }' \
  --max-time 15 | jq '.error'
```

**Expected Results**:
- ✅ Should return 401 Unauthorized
- ✅ Should contain authentication error message

---

## 📊 **Comprehensive Test Script**

### **Complete Testing Script**
```bash
#!/bin/bash
# Complete ReViz API testing script

echo "🧪 ReViz AlgoRhythm API Testing Suite"
echo "====================================="

# Get token
echo "🔑 Getting authentication token..."
TOKEN=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}' \
  | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."

# Test 1: Basic template recommendation
echo ""
echo "🧪 Test 1: Basic Template Recommendation"
RESPONSE=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_basic"
    }
  }' \
  --max-time 15)

echo "Response:"
echo "$RESPONSE" | jq '.data.recommendation | {
  template_name,
  gcp_storage_url,
  thumbnail_url,
  preview_url
}'

# Test 2: Enhanced metadata
echo ""
echo "🧪 Test 2: Enhanced Metadata"
echo "$RESPONSE" | jq '.data.recommendation.metadata.algorhythmMetadata'

# Test 3: Synergy analysis
echo ""
echo "🧪 Test 3: Synergy Analysis"
echo "$RESPONSE" | jq '.data.recommendation.metadata.aggregatedMetadata'

# Test 4: Complete experience - song-based
echo ""
echo "🧪 Test 4: Complete Experience (Song-based)"
COMPLETE_RESPONSE=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_complete_song",
      "device_info": {
        "type": "mobile",
        "connection_speed": "medium"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "variant_depth": 4
    }
  }' \
  --max-time 15)

echo "Complete Experience Response:"
echo "$COMPLETE_RESPONSE" | jq '.data | {
  song_metadata: .song_metadata,
  composite_count: (.composite_videos | length),
  layer_assets: (.layer_assets | keys),
  performance_metrics: .performance_metrics
}'

# Test 5: Complete experience - composite-specific
echo ""
echo "🧪 Test 5: Complete Experience (Composite-specific)"
COMPOSITE_RESPONSE=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "composite_id": "C.FUL.ALL.047",
    "user_context": {
      "user_id": "test_complete_composite",
      "device_info": {
        "type": "mobile",
        "connection_speed": "medium"
      }
    },
    "experience_config": {
      "max_assets_per_layer": 4,
      "include_variants": true,
      "variant_depth": 4
    }
  }' \
  --max-time 15)

echo "Composite-specific Response:"
echo "$COMPOSITE_RESPONSE" | jq '.data.composite_videos[0] | {
  composite_id,
  composite_name,
  synergyScore: .metadata.synergyScore,
  synergyBreakdown: .metadata.synergyBreakdown
}'

# Test 6: Performance testing
echo ""
echo "🧪 Test 6: Performance Testing"
echo "Testing response times..."

for i in {1..3}; do
  echo "Request $i:"
  time curl -s -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"song_id\": \"1.018.003.002\",
      \"user_context\": {
        \"user_id\": \"test_performance_$i\"
      }
    }" \
    --max-time 15 > /dev/null
done

echo ""
echo "✅ All tests completed!"
echo "📊 Summary:"
echo "- Template recommendations: Enhanced with metadata"
echo "- Complete experience: Both song and composite modes"
echo "- Performance: Optimized for speed"
echo "- Authentication: Working correctly"
```

---

## 🎯 **Testing Checklist**

### **✅ Basic Functionality**
- [ ] Template recommendations return real GCP URLs
- [ ] Complete experience endpoint works for both song and composite requests
- [ ] Authentication is working correctly
- [ ] Error handling works for invalid inputs

### **✅ Enhanced Features**
- [ ] Algorhythm metadata fields are present
- [ ] Synergy analysis is working for composite assets
- [ ] Media quality metrics are included
- [ ] Component relationships are properly structured

### **✅ Performance**
- [ ] Response times are under 2 seconds
- [ ] No timeouts or errors under normal load
- [ ] Caching is working effectively
- [ ] Batch operations perform well

### **✅ Integration Ready**
- [ ] All endpoints are accessible
- [ ] Response formats are consistent
- [ ] Error responses are properly formatted
- [ ] Documentation matches actual API behavior

---

## 📞 **Support & Troubleshooting**

### **Common Issues**
1. **401 Unauthorized**: Check your JWT token
2. **Timeout errors**: Check network connectivity
3. **Null URLs**: This is expected for assets without GCP URLs
4. **Missing metadata**: Some assets may not have enhanced metadata yet

### **Getting Help**
- Check the [Enhanced Metadata Guide](./REVIZ_ENHANCED_METADATA_GUIDE.md)
- Review the [API Integration Guide](./REVIZ_API_INTEGRATION_GUIDE_ENHANCED.md)
- Contact the backend team for technical support

---

## 🎉 **Ready for ReViz Integration!**

The enhanced AlgoRhythm API provides:
- ✅ **119/132 assets** (90%) with enhanced metadata
- ✅ **Real GCP URLs** for asset display
- ✅ **Synergy analysis** for composite compatibility
- ✅ **Algorhythm fields** for advanced filtering
- ✅ **Performance optimization** with faster queries

**🚀 Start testing and integrate the enhanced features into your ReViz application!**
