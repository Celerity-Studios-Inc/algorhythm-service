# ReViz AlgoRhythm API Testing Guide

## 🎯 Overview
This guide helps ReViz developers test the AlgoRhythm API to ensure it's working correctly with real GCP URLs and proper composite asset recommendations.

## 🔧 Recent Fixes Applied
- ✅ **URL Hallucination Fixed**: API no longer generates fake URLs
- ✅ **Real GCP URLs**: Uses actual canonical URLs from NNA Registry API
- ✅ **C.FUL Composites**: Returns only full composite assets (not partial)
- ✅ **Honest Responses**: Returns `null` when no real URL is available

## 🧪 Testing Checklist

### 1. **Basic API Health Check**
```bash
# Test API endpoint availability
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "1.001.003.001",
    "user_context": {
      "user_id": "test_health_check"
    }
  }' \
  --max-time 15
```

**Expected Result**: Should return a response with `gcp_storage_url`, `thumbnail_url`, and `preview_url` fields (may be `null` if no real URLs available).

### 2. **Test Songs with Composite Assets**
Based on our analysis, these songs have composite assets:

#### **Primary Test Song (41 C.FUL composites)**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "test_song_with_41_composites"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}'
```

#### **Secondary Test Songs**
```bash
# Song with 2 C.FUL composites
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "2.009.001.001",
    "user_context": {
      "user_id": "test_song_with_2_composites"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}'

# Song with 1 C.FUL composite
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "2.009.001.002",
    "user_context": {
      "user_id": "test_song_with_1_composite"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}'
```

### 3. **Test Songs WITHOUT Composite Assets**
These songs should return `null` for GCP URLs:

```bash
# Songs without composite assets (should return null URLs)
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "1.018.004.006",
    "user_context": {
      "user_id": "test_song_without_composites"
    }
  }' \
  --max-time 15 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}'
```

**Expected Result**: Should return `null` for all GCP URL fields.

### 4. **Verify Real vs Fake URLs**

#### **❌ OLD (Hallucinated) URLs (Should NOT appear):**
```
https://storage.googleapis.com/nna_registry_assets_dev/composites/9.002.025.017/full.mp4
https://storage.googleapis.com/nna_registry_assets_dev/composites/9.002.025.017/thumb.jpg
https://storage.googleapis.com/nna_registry_assets_dev/composites/9.002.025.017/preview.mp4
```

#### **✅ NEW (Real Canonical) URLs (Should appear when available):**
```
https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003.mp4
https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003.jpg
https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003_preview.mp4
```

### 5. **Test Response Structure**
```bash
# Get full response structure
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{
    "song_id": "1.001.003.001",
    "user_context": {
      "user_id": "test_full_response"
    }
  }' \
  --max-time 15 | jq '.'
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "recommendation": {
      "template_id": "...",
      "template_name": "C.FUL.ALL.XXX",
      "nna_address": "9.002.025.XXX",
      "compatibility_score": 0.8,
      "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/...", // Real URL or null
      "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/...", // Real URL or null
      "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/...", // Real URL or null
      "components": {
        "song_id": "1.001.003.001",
        "star_id": "2.009.002.018",
        "look_id": "3.003.001.001",
        "move_id": "4.022.002.003",
        "world_id": "5.015.001.001"
      },
      "metadata": {
        "created_at": "2025-10-10T...",
        "tags": ["nna-layer-G", "nna-layer-S", "nna-layer-L", "nna-layer-M", "nna-layer-W"],
        "description": "...",
        "media": {
          "duration_seconds": 30,
          "file_size_mb": 15.2,
          "resolution": "1080p",
          "format": "mp4",
          "quality_score": 0.9
        }
      },
      "scoring_details": {
        "tempo_score": 0.8,
        "genre_score": 0.8,
        "energy_score": 0.8,
        "style_score": 0.8,
        "mood_score": 0.8,
        "base_score": 0.8,
        "freshness_boost": 1.0,
        "final_score": 0.8
      }
    },
    "alternatives": [...],
    "total_available": 132
  },
  "performance_metrics": {
    "response_time_ms": 2000,
    "cache_hit": false,
    "score_computation_time_ms": 50,
    "templates_evaluated": 132
  },
  "metadata": {
    "timestamp": "2025-10-10T...",
    "request_id": "req_...",
    "version": "1.0.0"
  }
}
```

## 🎯 Key Testing Points

### ✅ **What to Verify:**
1. **No Fake URLs**: Should not see URLs like `/composites/9.002.025.XXX/`
2. **Real Canonical URLs**: Should see URLs like `/C/FUL/ALL/C.FUL.ALL.XXX:...`
3. **Null Values**: When no composite assets exist, URLs should be `null`
4. **C.FUL Only**: All returned templates should be C.FUL (full) composites
5. **Response Time**: Should be under 5 seconds
6. **Error Handling**: Should handle invalid song IDs gracefully

### ❌ **What Should NOT Happen:**
1. **Fake URL Generation**: No hallucinated URLs
2. **C.PAR Composites**: No partial composite assets
3. **Timeout Errors**: Should not timeout on valid requests
4. **Empty Responses**: Should always return some data structure

## 🚀 ReViz Integration Testing

### **JavaScript Test Function:**
```javascript
async function testAlgoRhythmAPI(songId, testName) {
  try {
    const response = await fetch('https://dev.algorhythm.media/api/v1/recommend/template', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        song_id: songId,
        user_context: {
          user_id: `test_${testName}_${Date.now()}`
        }
      })
    });
    
    const data = await response.json();
    
    console.log(`🧪 Test: ${testName}`);
    console.log(`📊 Response:`, {
      success: data.success,
      template_name: data.data?.recommendation?.template_name,
      gcp_storage_url: data.data?.recommendation?.gcp_storage_url,
      thumbnail_url: data.data?.recommendation?.thumbnail_url,
      preview_url: data.data?.recommendation?.preview_url,
      total_available: data.data?.total_available
    });
    
    // Verify no fake URLs
    const hasFakeUrls = data.data?.recommendation?.gcp_storage_url?.includes('/composites/');
    if (hasFakeUrls) {
      console.error('❌ FAKE URL DETECTED:', data.data.recommendation.gcp_storage_url);
    } else {
      console.log('✅ No fake URLs detected');
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Test failed: ${testName}`, error.message);
    return null;
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting AlgoRhythm API Tests...\n');
  
  // Test songs with composite assets
  await testAlgoRhythmAPI('1.018.003.002', 'song_with_41_composites');
  await testAlgoRhythmAPI('2.009.001.001', 'song_with_2_composites');
  await testAlgoRhythmAPI('2.009.001.002', 'song_with_1_composite');
  
  // Test songs without composite assets
  await testAlgoRhythmAPI('1.018.004.006', 'song_without_composites');
  await testAlgoRhythmAPI('1.001.003.001', 'song_without_composites_2');
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runAllTests();
```

## 📊 Current Database Status

### **Songs WITH Composite Assets (3/14):**
- **1.018.003.002**: 41 C.FUL composites ✅ (Primary test song)
- **2.009.001.001**: 2 C.FUL + 1 C.PAR composites ✅
- **2.009.001.002**: 1 C.FUL composite ✅

### **Songs WITHOUT Composite Assets (10/14):**
- G.POP.TEE.003 (1.018.003.003)
- G.POP.DAN.006 (1.018.004.006)
- G.AFR.AMA.001 (1.001.003.001)
- G.POP.DAN.005 (1.018.004.005)
- G.ASI.KPO.001 (1.002.002.001)
- G.RNB.MOD.002 (1.020.007.002)
- G.POP.DAN.004 (1.018.004.004)
- G.RNB.MOD.001 (1.020.007.001)
- G.SOC.TIK.001 (1.022.001.001)
- G.POP.DAN.003 (1.018.004.003)
- G.POP.DAN.002 (1.018.004.002)
- G.POP.DAN.001 (1.018.004.001)
- G.POP.TEE.001 (1.018.003.001)

## 🎉 Success Criteria

The API is working correctly when:
1. ✅ **No fake URLs** are returned
2. ✅ **Real canonical URLs** are used when available
3. ✅ **Null values** are returned when no composite assets exist
4. ✅ **C.FUL composites only** are returned
5. ✅ **Response times** are under 5 seconds
6. ✅ **Error handling** works for invalid inputs

## 📞 Support

If you encounter issues:
1. Check the GitHub Actions deployment status
2. Verify the JWT token is valid
3. Test with different song IDs
4. Check the response structure matches expectations

**Happy Testing! 🚀**
