# ReViz Quick Test Commands

## 🚀 **Immediate Testing for ReViz Developers**

### **1. Get Authentication Token**
```bash
TOKEN=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}' \
  | jq -r '.data.token')
echo "Token: $TOKEN"
```

### **2. Test Enhanced Template Recommendations**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_reviz"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {
    template_name,
    gcp_storage_url,
    thumbnail_url,
    preview_url,
    synergyScore: .metadata.aggregatedMetadata.synergyScore
  }'
```

### **3. Test Complete Experience - Song-Based**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_song",
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
    layer_assets: (.layer_assets | keys)
  }'
```

### **4. Test Complete Experience - Composite-Specific (NEW!)**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "composite_id": "C.FUL.ALL.047",
    "user_context": {
      "user_id": "test_composite",
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
    synergyScore: .metadata.synergyScore,
    synergyBreakdown: .metadata.synergyBreakdown
  }'
```

### **5. Test Enhanced Metadata Fields**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_metadata"
    }
  }' \
  --max-time 15 | jq '.data.recommendation.metadata.algorhythmMetadata'
```

### **6. Test Synergy Analysis**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_synergy"
    }
  }' \
  --max-time 15 | jq '.data.recommendation.metadata.aggregatedMetadata'
```

### **7. Test Performance**
```bash
time curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_performance"
    }
  }' \
  --max-time 15 > /dev/null
```

## 🎯 **Expected Results**

### **✅ Template Recommendations**
- `gcp_storage_url`: Real GCP URL (not null)
- `thumbnail_url`: Generated from real URL
- `preview_url`: Generated from real URL
- `synergyScore`: Number between 0-100

### **✅ Complete Experience**
- `song_metadata`: Song details
- `composite_count`: > 0 (41 composites available)
- `layer_assets`: ["stars", "looks", "moves", "worlds"]

### **✅ Enhanced Metadata**
- `algorhythmMetadata`: Performance context, target audience, cultural context
- `aggregatedMetadata`: Synergy score and breakdown analysis
- `media`: Duration, file size, resolution, quality score

## 🚨 **Troubleshooting**

### **401 Unauthorized**
```bash
# Re-authenticate
TOKEN=$(curl -s -X POST "https://dev.algorhythm.media/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword"}' \
  | jq -r '.data.token')
```

### **Timeout Errors**
```bash
# Check API health
curl -X GET "https://dev.algorhythm.media/api/v1/health" --max-time 10
```

### **Null URLs**
- This is expected for assets without GCP URLs
- Enhanced metadata will still be available

## 📚 **Full Documentation**
- [Complete Testing Guide](./REVIZ_DEVELOPER_TESTING_GUIDE.md)
- [Enhanced Metadata Guide](./REVIZ_ENHANCED_METADATA_GUIDE.md)
- [API Integration Guide](./REVIZ_API_INTEGRATION_GUIDE_ENHANCED.md)

## 🎉 **Ready to Test!**
Start with these commands to validate the enhanced AlgoRhythm API integration for your ReViz application.
