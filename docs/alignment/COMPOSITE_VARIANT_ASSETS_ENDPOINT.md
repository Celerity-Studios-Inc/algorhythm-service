# 🔧 Backend Team Coordination: Composite Variant Assets Endpoint

**Date**: October 16, 2025  
**From**: AlgoRhythm Service Team  
**To**: NNA Registry Service Backend Team  
**Priority**: HIGH - ReViz Developer Request  
**Status**: ⏳ **AWAITING BACKEND IMPLEMENTATION**

---

## 🎯 **REVIZ DEVELOPER REQUEST**

The ReViz developers have identified a critical missing endpoint for composite-specific layer variations. They need:

> **"Variant assets for a specific composite. Not just a song. I provide this endpoint with the exact composite for which I need variant assets and then I display those variant assets to the user. If that is not what you wish to do I can do it the other way, but then there's no point in the user clicking on a specific video to remix. They're just getting random assets for the song and not the specific composite they clicked on"**

## 🔧 **REQUIRED BACKEND ENDPOINT**

### **Endpoint Specification**
```
GET /api/v1/assets/composites/{compositeId}/variants/{layer}
```

### **Purpose**
Get variant assets for a specific layer within a specific composite context, rather than generic song-based assets.

---

## 📝 **DETAILED REQUIREMENTS**

### **1. Endpoint Structure**
```
GET /api/v1/assets/composites/{compositeId}/variants/{layer}
```

**Parameters:**
- `compositeId`: The specific composite ID (e.g., `C.FUL.ALL.001`)
- `layer`: The layer to get variants for (`stars`, `looks`, `moves`, `worlds`)

**Query Parameters:**
- `limit`: Maximum number of variants to return (default: 8, max: 20)
- `exclude_current`: Exclude the current asset in the composite (default: true)
- `compatibility_threshold`: Minimum compatibility score (default: 0.7)

### **2. Request Example**
```bash
GET /api/v1/assets/composites/C.FUL.ALL.001/variants/stars?limit=8&exclude_current=true&compatibility_threshold=0.7
```

### **3. Response Structure**
```json
{
  "success": true,
  "data": {
    "composite_id": "C.FUL.ALL.001",
    "layer": "stars",
    "current_asset": {
      "asset_id": "S.TEN.YOU.001",
      "nna_address": "S.TEN.YOU.001",
      "name": "Emma",
      "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/S.TEN.YOU.001.mp4",
      "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/S.TEN.YOU.001.jpg",
      "metadata": {
        "archetype": "Pop Star",
        "energy": "Medium",
        "gender": "Female",
        "hairColor": "Blonde",
        "musicalStyle": ["Pop"]
      }
    },
    "variants": [
      {
        "asset_id": "S.TEN.YOU.002",
        "nna_address": "S.TEN.YOU.002",
        "name": "Lucy",
        "gcp_storage_url": "https://storage.googleapis.com/algorhythm-assets/stars/S.TEN.YOU.002.mp4",
        "thumbnail_url": "https://storage.googleapis.com/algorhythm-assets/thumbnails/stars/S.TEN.YOU.002.jpg",
        "compatibility_score": 0.87,
        "metadata": {
          "archetype": "Pop Star",
          "energy": "Medium",
          "gender": "Female",
          "hairColor": "Pink",
          "musicalStyle": ["Pop"]
        },
        "scoring_details": {
          "composite_compatibility": 0.85,
          "layer_compatibility": 0.92,
          "style_compatibility": 0.84,
          "energy_compatibility": 0.89
        }
      }
    ],
    "total_available": 8,
    "compatibility_analysis": {
      "composite_style": ["pop", "teen", "energetic"],
      "composite_energy": "medium",
      "composite_mood": ["uplifting", "playful"],
      "matching_criteria": {
        "archetype_match": 0.9,
        "energy_match": 0.8,
        "style_match": 0.85,
        "demographic_match": 0.95
      }
    }
  },
  "metadata": {
    "request_id": "req_1737034567890",
    "timestamp": "2025-10-16T12:34:56.789Z",
    "version": "1.0.0",
    "response_time_ms": 1250
  }
}
```

---

## 🎯 **KEY DIFFERENCES FROM EXISTING ENDPOINTS**

### **❌ Current Song-Based Approach**
```
GET /api/v1/assets/composites/by-song/{songId}
```
**Problem**: Returns all composites for a song, not variants for a specific composite.

### **✅ Required Composite-Based Approach**
```
GET /api/v1/assets/composites/{compositeId}/variants/{layer}
```
**Solution**: Returns variant assets for a specific layer within a specific composite context.

---

## 🔍 **COMPATIBILITY SCORING REQUIREMENTS**

### **1. Composite Context Analysis**
The endpoint should analyze the composite to understand:
- **Style**: What style/theme the composite has
- **Energy**: High, medium, or low energy level
- **Mood**: Uplifting, romantic, energetic, etc.
- **Demographics**: Target audience, age group, etc.

### **2. Layer-Specific Compatibility**
For each layer, consider:
- **Stars**: Archetype, energy, gender, style compatibility
- **Looks**: Style category, occasion, formality compatibility
- **Moves**: Dance style, difficulty, energy compatibility
- **Worlds**: Environment type, mood, lighting compatibility

### **3. Scoring Algorithm**
```typescript
interface CompatibilityScore {
  composite_compatibility: number;  // How well it fits the composite's style
  layer_compatibility: number;     // How well it fits the layer type
  style_compatibility: number;    // Style/theme matching
  energy_compatibility: number;   // Energy level matching
  overall_score: number;          // Weighted average
}
```

---

## 🚀 **IMPLEMENTATION PRIORITIES**

### **Phase 1: Core Functionality** (HIGH PRIORITY)
1. **✅ Endpoint Creation**: `GET /api/v1/assets/composites/{compositeId}/variants/{layer}`
2. **✅ Composite Lookup**: Get composite by ID with all components
3. **✅ Current Asset Identification**: Find current asset in the specified layer
4. **✅ Variant Retrieval**: Get compatible assets for the layer
5. **✅ Basic Compatibility Scoring**: Simple scoring algorithm

### **Phase 2: Enhanced Scoring** (MEDIUM PRIORITY)
1. **✅ Advanced Compatibility Analysis**: Multi-factor scoring
2. **✅ Composite Style Analysis**: Extract style, energy, mood from composite
3. **✅ Layer-Specific Logic**: Different scoring for each layer type
4. **✅ Performance Optimization**: Caching and query optimization

### **Phase 3: Advanced Features** (LOW PRIORITY)
1. **✅ User Preference Integration**: Personalization based on user context
2. **✅ Machine Learning Scoring**: AI-powered compatibility scoring
3. **✅ Real-time Updates**: Dynamic scoring based on current trends

---

## 📊 **PERFORMANCE REQUIREMENTS**

### **Response Time**
- **Target**: < 1 second
- **Acceptable**: < 2 seconds
- **Timeout**: 5 seconds

### **Caching Strategy**
- **Composite Data**: Cache for 30 minutes
- **Compatibility Scores**: Cache for 1 hour
- **Layer Assets**: Cache for 15 minutes

### **Database Optimization**
- **Indexes**: Composite ID, layer type, compatibility scores
- **Query Optimization**: Efficient composite and asset lookups
- **Batch Processing**: Process multiple variants in parallel

---

## 🔧 **TECHNICAL SPECIFICATIONS**

### **Authentication**
- **Header**: `x-api-key: reviz-dev-30390-13220-4896-9516-9001`
- **Rate Limiting**: 100 requests per minute per API key

### **Error Handling**
```json
{
  "success": false,
  "error": {
    "code": "COMPOSITE_NOT_FOUND",
    "message": "Composite C.FUL.ALL.001 not found",
    "details": "The specified composite ID does not exist in the database"
  },
  "metadata": {
    "request_id": "req_1737034567890",
    "timestamp": "2025-10-16T12:34:56.789Z"
  }
}
```

### **Error Codes**
- `COMPOSITE_NOT_FOUND`: Composite ID doesn't exist
- `LAYER_NOT_FOUND`: Layer type not supported
- `NO_VARIANTS_AVAILABLE`: No compatible variants found
- `INVALID_PARAMETERS`: Invalid query parameters

---

## 🧪 **TESTING REQUIREMENTS**

### **Test Cases**
1. **Valid Composite**: `C.FUL.ALL.001` with `stars` layer
2. **Invalid Composite**: Non-existent composite ID
3. **Invalid Layer**: Unsupported layer type
4. **Edge Cases**: Composite with no variants, single variant, many variants
5. **Performance**: Large composite with many components

### **Test Data**
```bash
# Test composite IDs
C.FUL.ALL.001  # Full composite with all layers
C.PAR.2LA.003  # Partial composite
C.EMPTY.001    # Empty composite (no components)

# Test layers
stars, looks, moves, worlds
```

---

## 📋 **DELIVERY CHECKLIST**

### **Backend Team Deliverables**
- [ ] **Endpoint Implementation**: `GET /api/v1/assets/composites/{compositeId}/variants/{layer}`
- [ ] **Composite Lookup**: Get composite by ID with components
- [ ] **Current Asset Detection**: Identify current asset in layer
- [ ] **Variant Retrieval**: Get compatible layer assets
- [ ] **Compatibility Scoring**: Score variants based on composite context
- [ ] **Error Handling**: Proper error responses and status codes
- [ ] **Performance Optimization**: Caching and query optimization
- [ ] **Documentation**: API documentation and examples
- [ ] **Testing**: Unit tests and integration tests

### **AlgoRhythm Team Deliverables**
- [ ] **Frontend Integration**: Update service to call new endpoint
- [ ] **Error Handling**: Handle backend errors gracefully
- [ ] **Caching**: Implement client-side caching
- [ ] **Testing**: End-to-end testing with real data
- [ ] **Documentation**: Update API documentation

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ **Composite-Specific**: Returns variants for the exact composite requested
- ✅ **Layer-Aware**: Returns variants for the specified layer only
- ✅ **Compatibility Scoring**: Variants scored based on composite context
- ✅ **Real GCP URLs**: All URLs are actual GCP storage URLs
- ✅ **Performance**: Sub-2-second response times

### **User Experience**
- ✅ **Contextual**: User clicks composite → gets variants for that composite
- ✅ **Relevant**: All variants maintain the composite's style and theme
- ✅ **Fast**: Quick response times for smooth user experience
- ✅ **Reliable**: Consistent results with proper error handling

---

## 📞 **COORDINATION CONTACTS**

### **AlgoRhythm Team**
- **Primary**: Claude (AI Assistant)
- **Backup**: Development Team
- **Communication**: GitHub Issues, Slack, Email

### **Backend Team**
- **Primary**: NNA Registry Service Team
- **Communication**: GitHub Issues, Slack, Email
- **Repository**: NNA Registry Service Repository

---

## 🚀 **NEXT STEPS**

### **Immediate Actions**
1. **Backend Team**: Review requirements and provide implementation timeline
2. **AlgoRhythm Team**: Prepare frontend integration code
3. **Coordination**: Schedule regular check-ins for progress updates

### **Timeline**
- **Week 1**: Backend endpoint implementation
- **Week 2**: Integration and testing
- **Week 3**: Performance optimization and deployment
- **Week 4**: End-to-end testing and documentation

---

**🎉 This endpoint will provide exactly what ReViz developers need: composite-specific layer variations that maintain the context of the user's clicked composite for proper remixing experience!**

**Last Updated**: October 16, 2025  
**Status**: ⏳ **AWAITING BACKEND IMPLEMENTATION**  
**Priority**: HIGH - ReViz Developer Request