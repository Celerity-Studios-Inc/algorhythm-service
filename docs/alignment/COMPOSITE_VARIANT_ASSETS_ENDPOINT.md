# Composite-Specific Variant Assets Endpoint

## 🎯 **Problem Statement**

**ReViz Developer Request:**
> "As I mentioned previously I'm requesting variant assets for a specific composite. Not just a song. So we built this endpoint specifically for this purpose. I provide this endpoint with the exact composite for which I need variant assets and then I display those variant assets to the user. If that is not what you wish to do I can do it the other way, but then there's no point in the user clicking on a specific video to remix. They're just getting random assets for the song and not the specific composite they clicked on"

## 🔍 **Current State Analysis**

### **What We Have ✅**
- ✅ **Composite by ID**: `GET /api/v1/assets/composites/by-id/{compositeId}`
- ✅ **Composites by Song**: `GET /api/v1/assets/composites/by-song/{songId}`
- ✅ **Layer Assets by Song**: `GET /api/v1/assets/layers/by-song/{songId}/algorhythm`

### **What We're Missing ❌**
- ❌ **Composite-Specific Variant Assets**: Get variant assets for a specific composite's components
- ❌ **Component-Specific Variants**: Get variants for each component in a composite

## 🎯 **Required Endpoint**

### **GET /api/v1/assets/composites/{compositeId}/variants**

**Purpose**: Get variant assets for all components in a specific composite

**Request**:
```http
GET /api/v1/assets/composites/9.002.025.106/variants
```

**Response**:
```json
{
  "success": true,
  "data": {
    "composite_id": "9.002.025.106",
    "composite_name": "C.FUL.ALL.106",
    "components": {
      "star": {
        "base_asset": {
          "asset_id": "2.009.002.018",
          "nna_address": "2.009.002.018",
          "name": "Taylor Swift Base",
          "layer": "S",
          "category": "POP",
          "subcategory": "TSW"
        },
        "variants": [
          {
            "asset_id": "2.009.002.018-V01",
            "nna_address": "2.009.002.018-V01",
            "name": "Taylor Swift - Blue Dress",
            "variant_name": "Blue Dress",
            "base_asset_id": "2.009.002.018",
            "layer": "S",
            "category": "POP",
            "subcategory": "TSW",
            "media": {
              "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V01/thumb.jpg",
              "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V01/preview.mp4",
              "full_asset_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V01/full.mp4"
            },
            "compatibility_score": 0.95
          },
          {
            "asset_id": "2.009.002.018-V02",
            "nna_address": "2.009.002.018-V02",
            "name": "Taylor Swift - Red Dress",
            "variant_name": "Red Dress",
            "base_asset_id": "2.009.002.018",
            "layer": "S",
            "category": "POP",
            "subcategory": "TSW",
            "media": {
              "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V02/thumb.jpg",
              "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V02/preview.mp4",
              "full_asset_url": "https://storage.googleapis.com/nna_registry_assets_dev/stars/2.009.002.018-V02/full.mp4"
            },
            "compatibility_score": 0.92
          }
        ]
      },
      "look": {
        "base_asset": {
          "asset_id": "3.003.001.001",
          "nna_address": "3.003.001.001",
          "name": "Casual Look Base",
          "layer": "L",
          "category": "POP",
          "subcategory": "CAS"
        },
        "variants": [
          {
            "asset_id": "3.003.001.001-V01",
            "nna_address": "3.003.001.001-V01",
            "name": "Casual Look - Summer",
            "variant_name": "Summer",
            "base_asset_id": "3.003.001.001",
            "layer": "L",
            "category": "POP",
            "subcategory": "CAS",
            "media": {
              "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/looks/3.003.001.001-V01/thumb.jpg",
              "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/looks/3.003.001.001-V01/preview.mp4",
              "full_asset_url": "https://storage.googleapis.com/nna_registry_assets_dev/looks/3.003.001.001-V01/full.mp4"
            },
            "compatibility_score": 0.88
          }
        ]
      },
      "move": {
        "base_asset": {
          "asset_id": "4.022.002.003",
          "nna_address": "4.022.002.003",
          "name": "Dance Move Base",
          "layer": "M",
          "category": "POP",
          "subcategory": "DAN"
        },
        "variants": [
          {
            "asset_id": "4.022.002.003-V01",
            "nna_address": "4.022.002.003-V01",
            "name": "Dance Move - Fast",
            "variant_name": "Fast",
            "base_asset_id": "4.022.002.003",
            "layer": "M",
            "category": "POP",
            "subcategory": "DAN",
            "media": {
              "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/moves/4.022.002.003-V01/thumb.jpg",
              "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/moves/4.022.002.003-V01/preview.mp4",
              "full_asset_url": "https://storage.googleapis.com/nna_registry_assets_dev/moves/4.022.002.003-V01/full.mp4"
            },
            "compatibility_score": 0.90
          }
        ]
      },
      "world": {
        "base_asset": {
          "asset_id": "5.015.001.001",
          "nna_address": "5.015.001.001",
          "name": "Concert World Base",
          "layer": "W",
          "category": "POP",
          "subcategory": "CON"
        },
        "variants": [
          {
            "asset_id": "5.015.001.001-V01",
            "nna_address": "5.015.001.001-V01",
            "name": "Concert World - Night",
            "variant_name": "Night",
            "base_asset_id": "5.015.001.001",
            "layer": "W",
            "category": "POP",
            "subcategory": "CON",
            "media": {
              "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/worlds/5.015.001.001-V01/thumb.jpg",
              "preview_url": "https://storage.googleapis.com/nna_registry_assets_dev/worlds/5.015.001.001-V01/preview.mp4",
              "full_asset_url": "https://storage.googleapis.com/nna_registry_assets_dev/worlds/5.015.001.001-V01/full.mp4"
            },
            "compatibility_score": 0.87
          }
        ]
      }
    },
    "total_variants": 5,
    "query_time_ms": 245
  },
  "metadata": {
    "composite_id": "9.002.025.106",
    "total_time": 245,
    "optimization": "EXCELLENT"
  }
}
```

## 🔧 **Implementation Plan**

### **Step 1: Add Method to OptimizedCompositeQueryService**

```typescript
/**
 * Get variant assets for a specific composite's components
 */
async getCompositeVariants(compositeId: string): Promise<{
  composite_id: string;
  composite_name: string;
  components: {
    star: ComponentVariants;
    look: ComponentVariants;
    move: ComponentVariants;
    world: ComponentVariants;
  };
  total_variants: number;
  query_time_ms: number;
}> {
  const startTime = Date.now();
  
  try {
    // 1. Get the composite by ID
    const composite = await this.getCompositeById(compositeId);
    if (!composite) {
      throw new Error(`Composite not found: ${compositeId}`);
    }
    
    // 2. Extract components from composite
    const components = composite.components || [];
    
    // 3. Get variants for each component
    const componentVariants = {
      star: await this.getComponentVariants(components, 'S'),
      look: await this.getComponentVariants(components, 'L'),
      move: await this.getComponentVariants(components, 'M'),
      world: await this.getComponentVariants(components, 'W')
    };
    
    // 4. Calculate total variants
    const totalVariants = Object.values(componentVariants).reduce((total, comp) => {
      return total + (comp.variants?.length || 0);
    }, 0);
    
    const queryTime = Date.now() - startTime;
    
    return {
      composite_id: compositeId,
      composite_name: composite.name,
      components: componentVariants,
      total_variants: totalVariants,
      query_time_ms: queryTime
    };
    
  } catch (error) {
    this.logger.error(`❌ [COMPOSITE VARIANTS] Failed for ${compositeId}:`, error);
    throw error;
  }
}

/**
 * Get variants for a specific component layer
 */
private async getComponentVariants(components: any[], layer: string): Promise<ComponentVariants> {
  // Find the component for this layer
  const component = components.find(comp => comp.layer === layer);
  if (!component) {
    return {
      base_asset: null,
      variants: []
    };
  }
  
  // Get the base asset
  const baseAsset = await this.assetModel.findById(component._id).lean();
  if (!baseAsset) {
    return {
      base_asset: null,
      variants: []
    };
  }
  
  // Get variants for this base asset
  const variants = await this.assetModel.find({
    base_asset_id: component._id,
    asset_type: 'variant',
    layer: layer
  }).lean();
  
  return {
    base_asset: {
      asset_id: baseAsset._id,
      nna_address: baseAsset.nna_address,
      name: baseAsset.name,
      layer: baseAsset.layer,
      category: baseAsset.category,
      subcategory: baseAsset.subcategory
    },
    variants: variants.map(variant => ({
      asset_id: variant._id,
      nna_address: variant.nna_address,
      name: variant.name,
      variant_name: variant.variant_name,
      base_asset_id: variant.base_asset_id,
      layer: variant.layer,
      category: variant.category,
      subcategory: variant.subcategory,
      media: {
        thumbnail_url: this.buildUrl(variant, 'thumb.jpg'),
        preview_url: this.buildUrl(variant, 'preview.mp4'),
        full_asset_url: this.buildUrl(variant, 'full.mp4')
      },
      compatibility_score: variant.compatibility_score || 0.8
    }))
  };
}
```

### **Step 2: Add Controller Endpoint**

```typescript
@Get('by-id/:compositeId/variants')
@ApiOperation({
  summary: 'Get variant assets for a specific composite',
  description: 'Returns variant assets for all components in a specific composite - optimized for ReViz developers'
})
@ApiParam({
  name: 'compositeId',
  description: 'Composite ID (MongoDB ObjectId), NNA address (e.g., 9.002.025.106), or composite name (e.g., C.FUL.ALL.106)',
  example: '9.002.025.106'
})
async getCompositeVariants(@Param('compositeId') compositeId: string) {
  const startTime = Date.now();
  
  try {
    this.logger.log(`🔍 [COMPOSITE VARIANTS] Getting variants for composite: ${compositeId}`);
    
    const result = await this.optimizedCompositeQueryService.getCompositeVariants(compositeId);
    
    const totalTime = Date.now() - startTime;
    
    this.logger.log(`✅ [COMPOSITE VARIANTS] Found ${result.total_variants} variants in ${totalTime}ms`);
    
    return {
      success: true,
      data: result,
      metadata: {
        composite_id: compositeId,
        total_time: totalTime,
        optimization: totalTime < 500 ? 'EXCELLENT' : totalTime < 1000 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
      }
    };
    
  } catch (error) {
    this.logger.error(`❌ [COMPOSITE VARIANTS] Failed for ${compositeId}:`, error);
    throw error;
  }
}
```

## 🎯 **Usage for ReViz Developers**

### **Current Workflow (Problematic)**
```typescript
// 1. User clicks on composite "9.002.025.106"
// 2. ReViz gets random variants for song "1.018.003.002"
// 3. User sees variants that don't match the composite they clicked on
```

### **New Workflow (Correct)**
```typescript
// 1. User clicks on composite "9.002.025.106"
// 2. ReViz calls GET /api/v1/assets/composites/9.002.025.106/variants
// 3. ReViz gets variants specifically for that composite's components
// 4. User sees variants that match the composite they clicked on
```

## 🚀 **Implementation Priority**

### **HIGH PRIORITY - Implement Immediately**
This endpoint is **critical** for the ReViz user experience because:

1. **User Intent**: Users click on a specific composite to remix it
2. **Context Preservation**: Variants should be relevant to that specific composite
3. **User Experience**: Random variants break the user's mental model

### **Implementation Timeline**
- **Day 1**: Implement service method
- **Day 2**: Add controller endpoint
- **Day 3**: Test with ReViz developers
- **Day 4**: Deploy to production

## 🧪 **Testing Strategy**

### **Test Cases**
1. **Valid Composite ID**: Should return variants for all components
2. **Invalid Composite ID**: Should return 404 error
3. **Composite with No Variants**: Should return empty variants arrays
4. **Performance**: Should respond within 1 second
5. **Data Format**: Should match ReViz expectations

### **Test Data**
```typescript
// Test composite with known variants
const testCompositeId = '9.002.025.106'; // C.FUL.ALL.106
const expectedVariants = {
  star: 2, // Should have 2 star variants
  look: 1, // Should have 1 look variant
  move: 1, // Should have 1 move variant
  world: 1  // Should have 1 world variant
};
```

## 🎯 **Success Criteria**

### **Functional Requirements**
- ✅ **Composite-Specific**: Returns variants for the specific composite's components
- ✅ **Component-Based**: Groups variants by component layer (star, look, move, world)
- ✅ **Complete Data**: Includes all necessary fields for ReViz integration
- ✅ **Performance**: Responds within 1 second

### **ReViz Developer Requirements**
- ✅ **User Intent**: Variants match the composite the user clicked on
- ✅ **Context Preservation**: No random variants from other composites
- ✅ **Easy Integration**: Simple API call with clear response format
- ✅ **Reliable**: Consistent response format and error handling

---

**Implementation Date**: October 16, 2025  
**Status**: Ready for Implementation  
**Priority**: HIGH (Critical for ReViz UX)  
**Estimated Effort**: 1 day
