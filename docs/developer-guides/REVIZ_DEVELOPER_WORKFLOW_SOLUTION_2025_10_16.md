# 🎯 ReViz Developer Workflow Solution

**Date**: October 16, 2025  
**Status**: ✅ **SOLUTION IDENTIFIED** - New workflow approach for composite recommendations  
**Issue**: Current API doesn't match ReViz developer workflow expectations  

---

## 🎯 **REVIZ DEVELOPER WORKFLOW REQUIREMENTS**

### **Current Issues Identified**
1. **`/reviz/complete-experience`** - Takes `song_id`, returns template + variant assets (working but not optimal)
2. **`/reviz/composite/variations`** - Doesn't work with array of layers, needs redesign
3. **`/reviz/composite/complete-experience`** - Not working as expected

### **Desired Workflow**
1. **User clicks on song** → Mobile app calls `recommend/template` → Gets 1 main + 5 alternate composites
2. **User clicks on composite** → App calls `reviz/composite/variations` → Gets assets for specified layers with variants
3. **Ideal API**: `composite_id` + `layers[]` + `assets_per_layer` + `variants_per_asset`

---

## 💡 **SOLUTION: SONG-BASED COMPOSITE RECOMMENDATIONS**

### **New Approach: Find Composites by Song Component**
Instead of trying to find variations of a specific composite, find **other composites that share the same song component**.

**Logic**: If user likes a composite, show them other composites that use the same song but with different stars, looks, moves, worlds.

---

## 🔍 **CURRENT DATA ANALYSIS**

### **Song Component Analysis**
**Song**: `G.POP.TEE.002` (NNA: `1.018.003.002`)  
**Available Composites**: 100 composites  
**All composites share the same song component** but have different:
- **Stars**: Different S layer assets
- **Looks**: Different L layer assets  
- **Moves**: Different M layer assets
- **Worlds**: Different W layer assets

### **Sample Composites with Same Song**
```json
{
  "composite_1": {
    "id": "68ea2a3b5528304385303b8b",
    "name": "C.FUL.ALL.106:1.018.003.002+2.009.001.001+3.003.010.002+4.022.002.003+5.004.004.002",
    "song": "1.018.003.002",
    "star": "2.009.001.001",
    "look": "3.003.010.002",
    "move": "4.022.002.003",
    "world": "5.004.004.002"
  },
  "composite_2": {
    "id": "68e9a73d86f2f122bdcea253", 
    "name": "C.FUL.ALL.105:1.018.003.002+2.009.001.005+3.003.004.001+4.022.002.003+5.029.007.001",
    "song": "1.018.003.002",
    "star": "2.009.001.005",
    "look": "3.003.004.001", 
    "move": "4.022.002.003",
    "world": "5.029.007.001"
  },
  "composite_3": {
    "id": "68e9a3dc86f2f122bdcea18f",
    "name": "C.FUL.ALL.104:1.018.003.002+2.020.001.035+3.003.002.001+4.022.002.003+5.015.001.003",
    "song": "1.018.003.002",
    "star": "2.020.001.035",
    "look": "3.003.002.001",
    "move": "4.022.002.003", 
    "world": "5.015.001.003"
  }
}
```

---

## 🚀 **PROPOSED SOLUTION**

### **New Endpoint: Composite Recommendations by Song**
```http
POST /api/v1/reviz/composite/recommendations
```

**Request Body:**
```json
{
  "composite_id": "68ea2a3b5528304385303b8b",
  "layers": ["stars", "looks", "moves", "worlds"],
  "assets_per_layer": 5,
  "variants_per_asset": 3,
  "exclude_current": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_composite": {
      "composite_id": "68ea2a3b5528304385303b8b",
      "song_component": "1.018.003.002"
    },
    "recommended_composites": [
      {
        "composite_id": "68e9a73d86f2f122bdcea253",
        "composite_name": "C.FUL.ALL.105:1.018.003.002+2.009.001.005+3.003.004.001+4.022.002.003+5.029.007.001",
        "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.105:1.018.003.002+2.009.001.005+3.003.004.001+4.022.002.003+5.029.007.001.mp4",
        "compatibility_score": 0.8,
        "layer_differences": {
          "stars": "2.009.001.005",
          "looks": "3.003.004.001",
          "worlds": "5.029.007.001"
        }
      }
    ],
    "layer_assets": {
      "stars": {
        "layer_type": "stars",
        "total_available": 16,
        "assets": [
          {
            "asset_id": "2.009.001.005",
            "asset_name": "S.GRL.TEE.005",
            "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/S/GRL/TEE/S.GRL.TEE.005.mp4",
            "compatibility_score": 0.8,
            "variants": [
              {
                "variant_id": "2.009.001.006",
                "variant_name": "S.GRL.TEE.006",
                "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/S/GRL/TEE/S.GRL.TEE.006.mp4"
              }
            ]
          }
        ]
      },
      "looks": {
        "layer_type": "looks",
        "total_available": 16,
        "assets": [
          {
            "asset_id": "3.003.004.001",
            "asset_name": "L.CAS.CHI.001",
            "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/L/CAS/CHI/L.CAS.CHI.001.mp4",
            "compatibility_score": 0.8,
            "variants": []
          }
        ]
      }
    },
    "performance_metrics": {
      "response_time_ms": 8500,
      "composites_evaluated": 100,
      "assets_loaded": 64
    }
  }
}
```

---

## 🔧 **IMPLEMENTATION APPROACH**

### **Step 1: Extract Song Component from Composite**
1. Get composite by ID
2. Extract the song component (G layer)
3. Use song component to find all other composites

### **Step 2: Find Related Composites**
1. Query NNA Registry: `/api/v1/assets/composites/by-song/{song_id}`
2. Filter out the original composite
3. Group by layer differences
4. Score and rank by compatibility

### **Step 3: Extract Layer Assets**
1. For each requested layer, get all unique assets from related composites
2. For each asset, find variants (similar assets in same category)
3. Return organized by layer with variants

### **Step 4: Return Structured Response**
1. Original composite info
2. Recommended composites with layer differences
3. Layer assets with variants
4. Performance metrics

---

## 🎯 **REVIZ DEVELOPER WORKFLOW**

### **Updated Workflow**
1. **User clicks on song** → `GET /api/v1/recommend/templates` → Gets 1 main + 5 alternate composites
2. **User clicks on composite** → `POST /api/v1/reviz/composite/recommendations` → Gets related composites + layer assets with variants
3. **User selects new assets** → App can create new composite combinations

### **Benefits**
- ✅ **Logical workflow**: Find composites with same song, different other layers
- ✅ **Efficient data**: Only return relevant assets and variants
- ✅ **Scalable**: Can handle large numbers of composites
- ✅ **User-friendly**: Matches user mental model of "remixing" a song

---

## 🚀 **NEXT STEPS**

### **Immediate Actions**
1. **Implement new endpoint**: `POST /api/v1/reviz/composite/recommendations`
2. **Test with real data**: Use existing composites to verify workflow
3. **Update documentation**: Provide new API examples
4. **ReViz integration**: Test with mobile app workflow

### **Technical Implementation**
1. **Extract song component** from composite ID
2. **Query related composites** using song component
3. **Group and organize** layer assets with variants
4. **Return structured response** matching ReViz needs

---

## 🎉 **CONCLUSION**

This approach solves the ReViz developer workflow issues by:

- ✅ **Using song component** to find related composites (logical approach)
- ✅ **Providing layer assets** with variants for remixing
- ✅ **Matching user workflow** of song → composite → remix
- ✅ **Efficient data structure** for mobile app consumption

**This is the correct approach for the ReViz developer workflow!** 🚀

---

**Status**: ✅ **SOLUTION IDENTIFIED**  
**Next Phase**: Implementation of new endpoint  
**ReViz Integration**: Ready for new workflow  

**🎯 Ready to implement the song-based composite recommendation approach!** 🏁
