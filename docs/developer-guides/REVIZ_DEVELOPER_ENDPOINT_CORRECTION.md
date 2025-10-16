# 🚨 **CRITICAL: ReViz Developers Using Wrong Endpoint**

**Date**: October 16, 2025  
**Issue**: ReViz developers are calling the wrong endpoint and getting fallback data  
**Solution**: Use the correct endpoint that returns real NNA Registry data

---

## 🚨 **THE PROBLEM**

ReViz developers are calling:
```
❌ WRONG: /api/v1/reviz/composite/complete-experience
```

This endpoint:
- Has a **5-second timeout**
- Returns **fallback data** when it times out
- Uses **mock GCP URLs** like `https://storage.googleapis.com/algorhythm-assets/...`
- Is designed for **composite-specific requests** (not song-based)

---

## ✅ **THE SOLUTION**

ReViz developers should call:
```
✅ CORRECT: /api/v1/reviz/complete-experience
```

This endpoint:
- Has **no timeout issues**
- Returns **real data** from NNA Registry
- Uses **real GCP URLs** like `https://storage.googleapis.com/nna_registry_assets_dev/...`
- Is designed for **song-based requests** (what ReViz needs)

---

## 🔧 **CORRECTED REQUEST**

### **Current (Wrong) Request:**
```json
{
  "composite_id": "1.018.003.002",
  "experience_config": {
    "max_assets_per_layer": 5,
    "include_variants": true,
    "variant_depth": 5,
    "layers": ["stars", "looks", "moves", "worlds"]
  }
}
```

### **Corrected Request:**
```json
{
  "song_id": "1.018.003.002",
  "user_context": {
    "user_id": "68e873349349582aa05d1e93"
  },
  "experience_config": {
    "max_assets_per_layer": 5,
    "include_variants": true,
    "variant_depth": 5,
    "layers": ["stars", "looks", "moves", "worlds"]
  }
}
```

---

## 📊 **COMPARISON**

### **Wrong Endpoint Response (Fallback Data):**
```json
{
  "composite_info": {
    "composite_id": "1.018.003.002",
    "composite_name": "Composite 1.018.003.002",
    "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/composites/1.018.003.002.mp4",
    "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/1.018.003.002.jpg"
  },
  "layer_assets": {
    "stars": {
      "assets": [
        {
          "asset_id": "1.018.003.002_star_fallback",
          "asset_name": "Fallback Star Asset",
          "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/fallback_star.mp4"
        }
      ]
    }
  },
  "metadata": {
    "fallback_reason": "Request timeout after 5 seconds"
  }
}
```

### **Correct Endpoint Response (Real Data):**
```json
{
  "song_metadata": {
    "song_id": "1.018.003.002",
    "song_name": "Song 1.018.003.002"
  },
  "composite_videos": [
    {
      "composite_id": "68ea2a3b5528304385303b8b",
      "composite_name": "C.FUL.ALL.106:1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.003+5.004.004.002",
      "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.106:1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.003+5.004.004.002.mp4",
      "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/thumb.jpg"
    }
  ],
  "layer_assets": {
    "stars": {
      "assets": [
        {
          "asset_id": "2.009.001.001",
          "asset_name": "S.GRL.TEE.001",
          "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/..."
        }
      ]
    }
  }
}
```

---

## 🎯 **KEY DIFFERENCES**

| Aspect | Wrong Endpoint | Correct Endpoint |
|--------|----------------|------------------|
| **URL** | `/reviz/composite/complete-experience` | `/reviz/complete-experience` |
| **Request** | `composite_id` | `song_id` |
| **Data Source** | Fallback data | Real NNA Registry |
| **GCP URLs** | Mock URLs | Real GCP URLs |
| **Timeout** | 5 seconds | No timeout issues |
| **Response Time** | 50ms (fallback) | 8.3 seconds (real data) |
| **Data Quality** | Generic fallback | Real assets and variations |

---

## 🚀 **IMMEDIATE ACTION REQUIRED**

### **For ReViz Developers:**

1. **Change the endpoint URL** from `/reviz/composite/complete-experience` to `/reviz/complete-experience`
2. **Change the request parameter** from `composite_id` to `song_id`
3. **Add `user_context`** with `user_id`
4. **Test with the corrected request**

### **Corrected cURL Command:**
```bash
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/complete-experience" \
  -H "Content-Type: application/json" \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "68e873349349582aa05d1e93"
    },
    "experience_config": {
      "max_assets_per_layer": 5,
      "include_variants": true,
      "variant_depth": 5,
      "layers": ["stars", "looks", "moves", "worlds"]
    }
  }'
```

---

## ✅ **EXPECTED RESULTS**

After using the correct endpoint, ReViz developers will get:
- ✅ **Real composite videos** with actual NNA Registry data
- ✅ **Real layer assets** with actual asset names and IDs
- ✅ **Real GCP URLs** from NNA Registry storage
- ✅ **Real asset relationships** and compatibility matrix
- ✅ **No fallback data** or mock responses

---

## 📞 **SUPPORT**

If ReViz developers need help with the endpoint change, they can:
1. Check the Swagger documentation at `https://dev.algorhythm.media/api/docs`
2. Contact the AlgoRhythm team for integration support
3. Use the debug endpoints to verify the correct endpoint is working

---

**🎯 The issue is simply using the wrong endpoint. The correct endpoint works perfectly with real data!**
