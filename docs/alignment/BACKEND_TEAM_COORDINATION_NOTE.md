# 🔧 Backend Team Coordination Note

**Date**: October 16, 2025  
**From**: AlgoRhythm Service Team  
**To**: NNA Registry Service Backend Team  
**Priority**: HIGH - ReViz Developer Request  

---

## 🎯 **QUICK SUMMARY**

The ReViz developers need a new endpoint for **composite-specific layer variations**. They want to get variant assets for a specific composite (not just a song) to maintain the composite context when users click on a specific video to remix.

## 🔧 **REQUIRED ENDPOINT**

```
GET /api/v1/assets/composites/{compositeId}/variants/{layer}
```

**Example**: `GET /api/v1/assets/composites/C.FUL.ALL.001/variants/stars`

## 📋 **WHAT WE NEED**

1. **Composite Lookup**: Get composite by ID with all components
2. **Current Asset Detection**: Find current asset in the specified layer
3. **Variant Retrieval**: Get compatible assets for the layer
4. **Compatibility Scoring**: Score variants based on composite context
5. **Real GCP URLs**: All URLs should be actual GCP storage URLs

## 📊 **RESPONSE FORMAT**

```json
{
  "success": true,
  "data": {
    "composite_id": "C.FUL.ALL.001",
    "layer": "stars",
    "current_asset": { /* current asset in the composite */ },
    "variants": [ /* compatible variant assets */ ],
    "total_available": 8,
    "compatibility_analysis": { /* scoring details */ }
  }
}
```

## 🎯 **KEY DIFFERENCE**

- **❌ Current**: Song-based → random assets for the song
- **✅ Needed**: Composite-based → variants for the specific composite

## 📞 **COORDINATION**

- **Full Requirements**: See `/docs/alignment/COMPOSITE_VARIANT_ASSETS_ENDPOINT.md`
- **Timeline**: ASAP (ReViz developers waiting)
- **Priority**: HIGH

---

**🎉 This will solve the ReViz developer request for composite-specific layer variations!**
