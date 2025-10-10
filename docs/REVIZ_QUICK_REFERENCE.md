# ReViz AlgoRhythm API - Quick Reference

## 🚀 **API Endpoint**
```
POST https://dev.algorhythm.media/api/v1/recommend/template
```

## 🔑 **Authentication**
```javascript
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc';
```

## 📤 **Request Format**
```javascript
{
  "song_id": "1.018.003.002",  // Song with 41 composite assets
  "user_context": {
    "user_id": "unique_user_id"
  }
}
```

## 📥 **Response Format**
```javascript
{
  "success": true,
  "data": {
    "recommendation": {
      "template_name": "C.FUL.ALL.047",
      "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003.mp4",
      "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003.jpg",
      "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.047:1.018.003.002+2.020.001.031+3.003.002.001+4.022.002.003+5.015.001.003_preview.mp4",
      "components": {
        "song_id": "1.018.003.002",
        "star_id": "2.020.001.031",
        "look_id": "3.003.002.001",
        "move_id": "4.022.002.003",
        "world_id": "5.015.001.003"
      },
      "metadata": {
        "media": {
          "duration_seconds": 30,
          "resolution": "1080p",
          "format": "mp4",
          "quality_score": 0.9
        }
      }
    },
    "total_available": 132
  }
}
```

## 🧪 **Quick Test**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/recommend/template" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU2ZDJlNjFkNGFmNGVhMTc1MTYwNzMiLCJlbWFpbCI6ImFqYXlAY2VsZXJpdHkuc3R1ZGlvIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjAwMzI3NjgsImV4cCI6MTc2MDExOTE2OH0.ZbfDFY36gpwY-mL5FBM23JlOcZB0BoDCZZju4S9Onzc" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test_$(date +%s)"}}' \
  --max-time 15 | jq '.data.recommendation | {template_name, gcp_storage_url, thumbnail_url, preview_url}'
```

## 🎯 **Songs with Composite Assets**
- **1.018.003.002**: 41 C.FUL composites ✅ (Primary test song)
- **2.009.001.001**: 2 C.FUL + 1 C.PAR composites ✅
- **2.009.001.002**: 1 C.FUL composite ✅

## ❌ **Songs WITHOUT Composite Assets**
- 1.018.004.006, 1.001.003.001, 1.002.002.001, etc.
- These will return `null` for GCP URLs (which is correct!)

## 🔧 **Recent Fixes**
- ✅ **No more fake URLs**: Real canonical URLs only
- ✅ **C.FUL composites only**: High-quality full videos
- ✅ **Honest responses**: `null` when no assets available
- ✅ **Media metadata**: Duration, resolution, quality info

## 📚 **Full Documentation**
- **[ReViz API Integration Guide](./REVIZ_API_INTEGRATION_GUIDE.md)** - Complete integration guide
- **[ReViz Testing Guide](./REVIZ_TESTING_GUIDE.md)** - Comprehensive testing instructions

## 🚨 **Important Notes**
1. **Use unique user_id** for each request to avoid caching
2. **Check for null URLs** - indicates no composite assets for that song
3. **Real URLs only** - no more hallucinated fake URLs
4. **C.FUL composites** - only full composite videos returned
5. **Response time** - should be under 5 seconds

## 🎉 **Ready for Production!**
The API is fully operational with 132 assets and real GCP URLs! 🚀
