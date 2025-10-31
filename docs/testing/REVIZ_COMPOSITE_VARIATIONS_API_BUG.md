# ReViz Composite Variations API Bug Report

**Date**: October 30, 2025
**API Endpoint**: `POST /api/v1/reviz/composite/variations`
**Service**: AlgoRhythm Service (dev.algorhythm.media)
**Reported By**: ReViz Developers
**Status**: 🐛 **THREE BUGS CONFIRMED**

---

## 🎯 Summary

The AlgoRhythm `/reviz/composite/variations` endpoint has **THREE critical issues**:

### **Issue #1: Inconsistent current_asset Inclusion** ⚠️
- **Stars layer**: `current_asset` is **NOT** in the `assets` array ❌
- **Other layers** (Looks, Moves, Worlds): `current_asset` **MAY BE** in the `assets` array ⚠️
- **Impact**: Forces layer-specific handling logic

### **Issue #2: Missing Composite Generation Pipeline** 🚫
- When user selects an asset combination that doesn't exist as a composite
- **Current**: Returns `400 composite does not exist` error
- **Expected**: Should trigger composite generation pipeline
- **Impact**: Breaks user workflow for new combinations

### **Issue #3: Circular Variant Relationships** 🔄
- Assets in main `assets` array also appear as variants of each other
- Example: `S.GRL.TEE.004` lists `S.GRL.TEE.002` as variant, and vice versa
- **Impact**: Confusing UX, redundant data, inefficient response size

---

## 📊 Bug Evidence

### **Request from ReViz**:
```json
{
  "composite_id": "9.002.025.558",
  "vary_layers": ["stars", "looks", "moves", "worlds"],
  "assets_per_layer": 5,
  "variants_per_asset": 3
}
```

### **Current Response (Stars Layer - BROKEN)**:
```json
{
  "layer": "stars",
  "current_asset": {
    "asset_name": "S.TEN.YOU.031",
    "nna_address": "2.020.001.031",
    // ... full asset data
  },
  "assets": [
    {
      "asset_name": "S.GRL.TEE.002",  // ← NOT the current asset
      "nna_address": "2.009.001.002"
    },
    {
      "asset_name": "S.TEN.YOU.027",  // ← NOT the current asset
      "nna_address": "2.020.001.027"
    },
    // ... 3 more assets
  ]
}
```

**Problem**: The `current_asset` (`S.TEN.YOU.031`) does **NOT appear** in the `assets` array.

---

## ✅ Expected Behavior

**All layers should follow the same structure**:

```json
{
  "layer": "stars",
  "current_asset": {
    "asset_name": "S.TEN.YOU.031",
    "nna_address": "2.020.001.031",
    // ... full asset data
  },
  "assets": [
    {
      // ✅ FIRST ITEM = current_asset
      "asset_name": "S.TEN.YOU.031",  // ← Same as current_asset
      "nna_address": "2.020.001.031",
      "variants": [...]
    },
    {
      // Other alternative assets
      "asset_name": "S.GRL.TEE.002",
      "nna_address": "2.009.001.002",
      "variants": [...]
    },
    // ... more alternatives
  ]
}
```

**Key requirement**: `current_asset` should **always be the first item** in the `assets` array.

---

## 🔍 Impact on ReViz Frontend

### **Current Situation (Inconsistent)**:

ReViz developers have to write **layer-specific logic**:

```javascript
// BAD: Layer-specific handling required
layers.forEach(layer => {
  if (layer.layer === 'stars') {
    // Special case: current NOT in assets
    const current = layer.current_asset;
    const alternatives = layer.assets;

    renderUI({
      current: current,
      alternatives: alternatives
    });
  } else {
    // Different logic for looks, moves, worlds
    const currentInAssets = layer.assets.find(
      a => a.nna_address === layer.current_asset.nna_address
    );
    const alternatives = layer.assets.filter(
      a => a.nna_address !== layer.current_asset.nna_address
    );

    renderUI({
      current: currentInAssets,
      alternatives: alternatives
    });
  }
});
```

### **After Fix (Consistent)**:

ReViz developers can use **uniform logic**:

```javascript
// GOOD: Consistent handling for all layers
layers.forEach(layer => {
  const current = layer.assets[0];  // Always first
  const alternatives = layer.assets.slice(1);  // Rest are alternatives

  renderUI({
    current: current,  // Highlighted
    alternatives: alternatives  // Can swap to these
  });
});
```

---

## 🔧 Recommended Fix

### **File to Update**:
```
algorhythm-service/src/modules/recommendations/reviz-composite-variations.service.ts
```

### **Method to Fix**:
```typescript
async getLayerVariations(
  composite: any,
  layer: string,
  assetsPerLayer: number,
  variantsPerAsset: number
): Promise<LayerVariation> {

  // 1. Get current asset from composite
  const currentAsset = composite.components.find(c => c.layer === this.getLayerCode(layer));

  if (!currentAsset) {
    throw new Error(`Current ${layer} asset not found in composite`);
  }

  // 2. Fetch alternative assets (request one less since we'll prepend current)
  const alternatives = await this.fetchAlternativeAssets(
    layer,
    currentAsset,
    assetsPerLayer - 1  // ← Request N-1 alternatives
  );

  // 3. ✅ FIX: Always include current_asset as FIRST item in assets array
  const allAssets = [currentAsset, ...alternatives];

  // 4. Add variants for each asset
  const assetsWithVariants = await Promise.all(
    allAssets.map(async asset => ({
      ...this.formatAsset(asset),
      variants: await this.fetchVariants(asset, variantsPerAsset)
    }))
  );

  // 5. Return consistent structure
  return {
    layer: layer,
    current_asset: this.formatAsset(currentAsset),  // Keep for backward compatibility
    assets: assetsWithVariants,  // ✅ Current asset is first
    total_available: await this.countAvailableAssets(layer)
  };
}
```

### **Key Changes**:

1. **Line 3**: Get current asset from composite components
2. **Line 11**: Request `assetsPerLayer - 1` alternatives (not full count)
3. **Line 16**: **Prepend current asset** to alternatives: `[currentAsset, ...alternatives]`
4. **Line 19**: Map all assets (including current) with variants
5. **Result**: Current asset is always first in `assets` array

---

## 🧪 Testing the Fix

### **Test Case 1: Verify Current Asset is First**

```bash
# Request
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/composite/variations" \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "9.002.025.558",
    "vary_layers": ["stars"],
    "assets_per_layer": 5,
    "variants_per_asset": 3
  }'

# Verify response
jq '.data.layers[0]' response.json
```

**Expected**:
```json
{
  "layer": "stars",
  "current_asset": {
    "nna_address": "2.020.001.031",
    "asset_name": "S.TEN.YOU.031"
  },
  "assets": [
    {
      "nna_address": "2.020.001.031",  // ✅ Same as current_asset
      "asset_name": "S.TEN.YOU.031",
      "variants": [...]
    },
    // ... 4 more alternative assets
  ]
}
```

**Verification**:
```bash
# Should return "2.020.001.031" (same for both)
jq '.data.layers[0].current_asset.nna_address' response.json
jq '.data.layers[0].assets[0].nna_address' response.json
```

---

### **Test Case 2: Verify All Layers Consistent**

```bash
# Request all 4 layers
curl -X POST "https://dev.algorhythm.media/api/v1/reviz/composite/variations" \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -H "Content-Type: application/json" \
  -d '{
    "composite_id": "9.002.025.558",
    "vary_layers": ["stars", "looks", "moves", "worlds"],
    "assets_per_layer": 5,
    "variants_per_asset": 3
  }' > response.json

# Verify ALL layers have current_asset as first item
for layer in stars looks moves worlds; do
  echo "Testing $layer layer..."

  current_nna=$(jq -r ".data.layers[] | select(.layer==\"$layer\") | .current_asset.nna_address" response.json)
  first_asset_nna=$(jq -r ".data.layers[] | select(.layer==\"$layer\") | .assets[0].nna_address" response.json)

  if [ "$current_nna" = "$first_asset_nna" ]; then
    echo "  ✅ $layer: current_asset matches first asset"
  else
    echo "  ❌ $layer: MISMATCH - current=$current_nna, first=$first_asset_nna"
  fi
done
```

**Expected Output**:
```
Testing stars layer...
  ✅ stars: current_asset matches first asset
Testing looks layer...
  ✅ looks: current_asset matches first asset
Testing moves layer...
  ✅ moves: current_asset matches first asset
Testing worlds layer...
  ✅ worlds: current_asset matches first asset
```

---

### **Test Case 3: Verify Assets Count**

```bash
# Request 5 assets per layer
# Should return: 1 current + 4 alternatives = 5 total

jq '.data.layers[] | {layer: .layer, count: (.assets | length)}' response.json
```

**Expected**:
```json
{"layer": "stars", "count": 5}
{"layer": "looks", "count": 5}
{"layer": "moves", "count": 5}
{"layer": "worlds", "count": 5}
```

---

## 📋 Acceptance Criteria

Before marking this bug as fixed, verify:

- [ ] ✅ `current_asset` appears as **first item** in `assets` array for **all layers**
- [ ] ✅ `current_asset.nna_address === assets[0].nna_address` for all layers
- [ ] ✅ Total assets count matches `assets_per_layer` parameter
- [ ] ✅ All layers return consistent structure (no layer-specific logic needed)
- [ ] ✅ ReViz frontend can use uniform rendering logic
- [ ] ✅ Backward compatibility maintained (kept `current_asset` field)

---

## ⏰ Timeline

**Priority**: MEDIUM (blocking ReViz UX implementation)

**Estimated Effort**:
- Code fix: 30 minutes
- Testing: 30 minutes
- Deployment: 1 hour
- **Total**: ~2 hours

**Recommended deployment**: Next AlgoRhythm service deployment

---

## 🔗 Related Files

### **AlgoRhythm Service Files**:
```
algorhythm-service/src/modules/recommendations/reviz-composite-variations.service.ts
algorhythm-service/src/modules/recommendations/reviz-composite-variations.controller.ts
algorhythm-service/src/modules/recommendations/dto/reviz-composite-variation.dto.ts
```

### **ReViz Frontend (Temporary Workaround)**:

Until AlgoRhythm fixes the API, ReViz can use this workaround:

```javascript
// File: src/services/algorhythmService.js

function normalizeLayerResponse(layer) {
  const current = layer.current_asset;

  // Check if current is already in assets
  const currentInAssets = layer.assets.find(
    a => a.nna_address === current.nna_address
  );

  if (currentInAssets) {
    // Already correct - return as-is
    return layer;
  } else {
    // Bug: current NOT in assets - manually prepend
    return {
      ...layer,
      assets: [current, ...layer.assets]
    };
  }
}

// Usage
const response = await fetchCompositeVariations(compositeId);
const normalizedLayers = response.data.layers.map(normalizeLayerResponse);
```

---

## 📞 Stakeholders

### **AlgoRhythm Team**:
- **Action**: Fix `reviz-composite-variations.service.ts`
- **Timeline**: 2 hours
- **Priority**: Medium (blocking ReViz UX work)

### **ReViz Developers**:
- **Action**: Use workaround until fixed (see above)
- **Follow-up**: Test after AlgoRhythm deploys fix
- **Priority**: High (needed for Complete Remix Experience)

### **Backend Team**:
- **Action**: None (issue is in AlgoRhythm service, not Backend)
- **Status**: Not affected

---

## 📝 ReViz Developer's Original Question

**Question**: "Do I append the current_asset to the list of assets and variants? or will that current_asset also be in the list of assets and variants?"

**Answer**:

Yes, **the current_asset SHOULD be in the assets array** (but it's currently NOT due to this bug in the AlgoRhythm API).

**Short-term (Workaround)**: Use the `normalizeLayerResponse()` function above to manually prepend `current_asset` to the `assets` array.

**Long-term (After Fix)**: Once AlgoRhythm fixes their API, `current_asset` will always be the first item in the `assets` array, and you can remove the workaround.

**Recommended**: Use the workaround now, and test without it after AlgoRhythm deploys the fix.

---

## 🐛 ISSUE #2: Missing Composite Generation Pipeline

### **Problem**

When a user selects an asset combination that doesn't exist as a composite yet, the API returns a `400 Bad Request` error instead of triggering composite generation.

**Current Behavior:**
```bash
# User clicks on a new combination of assets
POST /api/v1/reviz/composite/variations
{
  "composite_id": "9.002.XXX.XXX",  // Composite doesn't exist yet
  "vary_layers": ["stars"]
}

# Response
HTTP 400 Bad Request
{
  "error": "Composite does not exist"
}
```

**Expected Behavior:**
```bash
# Same request
POST /api/v1/reviz/composite/variations

# Response Option A: Queue composite generation
HTTP 202 Accepted
{
  "status": "generating",
  "composite_id": "9.002.XXX.XXX",
  "estimated_time_seconds": 30,
  "check_status_url": "/api/v1/composite/status/9.002.XXX.XXX"
}

# Response Option B: Immediate generation (if fast enough)
HTTP 201 Created
{
  "status": "created",
  "composite_id": "9.002.XXX.XXX",
  "data": { /* full composite data */ }
}
```

### **Impact**

- **Blocks ReViz workflow**: Users can't create new composites from the app
- **Poor UX**: Error message instead of "generating..." status
- **Missing feature**: Expected pipeline integration not working

### **Recommended Fix**

**File**: `algorhythm-service/src/modules/recommendations/reviz-composite-variations.service.ts`

```typescript
async getCompositeVariations(request: ReVizCompositeVariationDto) {
  try {
    // Try to fetch existing composite
    const composite = await this.nnaRegistry.getCompositeById(request.composite_id);

    // Composite exists - return variations
    return this.buildVariationsResponse(composite, request);

  } catch (error) {
    if (error.status === 404) {
      // ✅ FIX: Composite doesn't exist - trigger generation

      // Option A: Queue generation and return status
      const generationJob = await this.compositeGeneration.queueGeneration({
        composite_id: request.composite_id,
        // ... extract components from composite_id
      });

      return {
        status: 'generating',
        composite_id: request.composite_id,
        estimated_time_seconds: 30,
        job_id: generationJob.id,
        check_status_url: `/api/v1/composite/status/${generationJob.id}`
      };

      // Option B: Generate immediately (if fast < 5s)
      // const newComposite = await this.compositeGeneration.generateNow(request.composite_id);
      // return this.buildVariationsResponse(newComposite, request);
    }

    throw error;
  }
}
```

### **Questions for AlgoRhythm Team**

1. Does composite generation pipeline already exist?
2. What's the average generation time? (determines sync vs async)
3. Should we queue or generate immediately?

---

## 🐛 ISSUE #3: Circular Variant Relationships

### **Problem**

Assets in the main `assets` array also appear as variants of each other, creating confusing circular relationships.

**Example from Response:**

```json
{
  "layer": "stars",
  "assets": [
    {
      "asset_id": "68e735835d018de8e1806e07",
      "asset_name": "S.GRL.TEE.004",
      "nna_address": "2.009.001.004",
      "variants": [
        {
          "variant_name": "S.GRL.TEE.001",
          "nna_address": "2.009.001.001"
        },
        {
          "variant_name": "S.GRL.TEE.002",  // ← Also in main assets array
          "nna_address": "2.009.001.002"
        },
        {
          "variant_name": "S.GRL.TEE.003",
          "nna_address": "2.009.001.003"
        }
      ]
    },
    {
      "asset_id": "68e70a35be623bf1d7076d70",
      "asset_name": "S.GRL.TEE.002",  // ← This is a main asset
      "nna_address": "2.009.001.002",
      "variants": [
        {
          "variant_name": "S.GRL.TEE.001",
          "nna_address": "2.009.001.001"
        },
        {
          "variant_name": "S.GRL.TEE.003",
          "nna_address": "2.009.001.003"
        },
        {
          "variant_name": "S.GRL.TEE.004",  // ← Also in main assets array (circular!)
          "nna_address": "2.009.001.004"
        }
      ]
    }
  ]
}
```

**Analysis:**
- `S.GRL.TEE.004` is in main `assets` array
- `S.GRL.TEE.002` is in main `assets` array
- `S.GRL.TEE.004` lists `S.GRL.TEE.002` as a variant
- `S.GRL.TEE.002` lists `S.GRL.TEE.004` as a variant
- **Result**: Circular/redundant relationship

### **Impact**

1. **Confusing UX**: User sees same assets in multiple places
2. **Inefficient**: Response size bloated with duplicate data
3. **Unclear semantics**: What's the difference between "asset" and "variant"?

### **Expected Behavior**

**Option A: Variants should NOT include assets from main array**

```json
{
  "assets": [
    {
      "asset_name": "S.GRL.TEE.004",
      "nna_address": "2.009.001.004",
      "variants": [
        // ✅ Only variants NOT in main assets array
        {
          "variant_name": "S.GRL.TEE.001",
          "nna_address": "2.009.001.001"
        },
        {
          "variant_name": "S.GRL.TEE.003",
          "nna_address": "2.009.001.003"
        }
        // ❌ S.GRL.TEE.002 excluded (it's in main assets)
      ]
    },
    {
      "asset_name": "S.GRL.TEE.002",
      "nna_address": "2.009.001.002",
      "variants": [
        {
          "variant_name": "S.GRL.TEE.001",
          "nna_address": "2.009.001.001"
        },
        {
          "variant_name": "S.GRL.TEE.003",
          "nna_address": "2.009.001.003"
        }
        // ❌ S.GRL.TEE.004 excluded (it's in main assets)
      ]
    }
  ]
}
```

**Option B: Clarify the semantic difference**

If there's a valid reason for this structure, document it:
- What does "asset" mean?
- What does "variant" mean?
- Why can they overlap?

### **Recommended Fix**

**File**: `algorhythm-service/src/modules/recommendations/reviz-composite-variations.service.ts`

```typescript
async buildVariationsResponse(composite, request) {
  const layers = [];

  for (const layerName of request.vary_layers) {
    const currentAsset = this.getCurrentAsset(composite, layerName);
    const mainAssets = await this.getMainAssets(layerName, request.assets_per_layer);

    // Get main asset IDs for filtering
    const mainAssetIds = new Set(mainAssets.map(a => a.nna_address));

    // Add variants for each main asset
    const assetsWithVariants = await Promise.all(
      mainAssets.map(async asset => {
        const allVariants = await this.getVariants(asset, request.variants_per_asset + 10);

        // ✅ FIX: Filter out variants that are in main assets array
        const filteredVariants = allVariants
          .filter(v => !mainAssetIds.has(v.nna_address))  // Exclude main assets
          .filter(v => v.nna_address !== asset.nna_address)  // Exclude self
          .slice(0, request.variants_per_asset);  // Limit to requested count

        return {
          ...asset,
          variants: filteredVariants
        };
      })
    );

    layers.push({
      layer: layerName,
      current_asset: currentAsset,
      assets: assetsWithVariants
    });
  }

  return { layers };
}
```

**Key changes:**
1. Collect all main asset IDs into a Set
2. Filter variants to exclude any that are in main assets array
3. Also exclude self (asset shouldn't be variant of itself)

### **Test Case**

```bash
# After fix
jq '.data.layers[0].assets[] | {
  asset: .asset_name,
  variants: [.variants[].variant_name]
}' response.json
```

**Expected Output:**
```json
{
  "asset": "S.GRL.TEE.004",
  "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003"]
}
{
  "asset": "S.GRL.TEE.002",
  "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003"]
}
```

**Verification**: No asset in `assets` array should appear in any `variants` array.

---

## 📊 Updated Summary

### **Three Bugs to Fix**

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| #1: current_asset not in assets array | MEDIUM | 30 min | UX consistency |
| #2: Missing composite generation | HIGH | 2-4 hours | Blocking feature |
| #3: Circular variant relationships | LOW | 30 min | UX clarity |

### **Total Effort**: 3-5 hours

### **Recommended Order**:
1. Fix #2 first (blocking user workflow)
2. Fix #1 (enables frontend development)
3. Fix #3 (polish UX)

---

**Report Date**: October 30, 2025
**Reporter**: ReViz Development Team
**Bug Owner**: AlgoRhythm Team
**Status**: 🐛 **OPEN** - THREE BUGS IDENTIFIED
**Priority**: HIGH (Issue #2 is blocking)
**Total Effort**: 3-5 hours
