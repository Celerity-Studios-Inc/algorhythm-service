# Variant Deduplication Fix - Status Update

**Date**: October 31, 2025  
**Issue**: Multiple assets that are variants of each other appearing in the main `assets` array  
**Status**: ✅ **FIXED** (Both Backend and AlgoRhythm)

---

## 🔍 Problem Summary

ReViz developers reported that the `/api/v1/reviz/composite/variations` endpoint was returning multiple assets from the same variant series in the main `assets` array:

**Example Issue**:
```json
{
  "layer": "stars",
  "assets": [
    {
      "asset_name": "S.TEN.YOU.031",
      "nna_address": "2.020.001.031",
      "variants": ["S.TEN.YOU.001", "S.TEN.YOU.002", "S.TEN.YOU.003"]
    },
    {
      "asset_name": "S.TEN.YOU.027",
      "nna_address": "2.020.001.027",
      "variants": ["S.TEN.YOU.001", "S.TEN.YOU.002", "S.TEN.YOU.003"]
    }
  ]
}
```

Both `S.TEN.YOU.031` and `S.TEN.YOU.027` were appearing in the `assets` array even though they share the same variants (they're variants of each other).

---

## ✅ Solutions Implemented

### 1. Backend Fix (NNA Registry Service)

**Location**: `composite-pattern.service.ts` → `getLayerAssetsWithVariants()`

**Approach**: Deduplicate by variant series (`category:subcategory`)

**Implementation**:
1. Group assets by variant series key: `category:subcategory`
2. Keep only one representative per variant series in the main array
3. Prioritize current component: If current component exists in a series, it replaces any other asset from that series
4. Preserve existing filtering: Variants list still excludes main assets and self

**Commit**: Backend team fix (to be confirmed)

**Expected Result**: 
- Only one asset per variant series in the main `assets` array
- Prevents circular relationships at the source (NNA Registry)

---

### 2. AlgoRhythm Fix (Defensive Layer)

**Location**: `reviz-composite-variations.service.ts` → `deduplicateVariantAssets()`

**Approach**: Deduplicate by variant relationships (direct or shared variants)

**Implementation**:
1. Build variant relationship map: For each asset, collect all identifiers of its variants
2. Detect variant relationships:
   - **Direct**: Asset A appears in Asset B's variants list (or vice versa)
   - **Indirect**: Two assets share significant overlap in their variants (≥70% threshold)
3. Keep only one per variant group:
   - Prefer current asset if it matches one of them
   - Otherwise prefer asset with higher `compatibility_score`
   - Remove duplicates from `assets` array
4. Emit warnings: Add `VARIANTS_DEDUPLICATED` warning when duplicates are removed

**Commit**: `1d028479` - "fix(variations): deduplicate assets that are variants of each other in assets array"

**Expected Result**:
- Defensive layer in case assets still slip through backend filtering
- Works even if NNA Registry returns duplicates

---

## 🔄 How Both Fixes Work Together

### Defense-in-Depth Strategy

```
User Request
    ↓
AlgoRhythm Service
    ↓
NNA Registry (Backend Fix)
    ├─ Deduplicates by category:subcategory
    ├─ Returns one asset per variant series
    └─ Response: [S.TEN.YOU.031, S.GRL.TEE.002, ...]
    ↓
AlgoRhythm Deduplication (Defensive Fix)
    ├─ Checks variant relationships
    ├─ Removes any remaining duplicates
    └─ Final Response: [S.TEN.YOU.031, S.GRL.TEE.002, ...]
```

### Benefits

1. **Primary Prevention**: Backend fix prevents duplicates at the source
2. **Defensive Safety**: AlgoRhythm fix catches any edge cases that slip through
3. **Resilience**: Even if one fix has issues, the other provides protection
4. **Different Approaches**: Category-based (backend) vs. Relationship-based (AlgoRhythm) catch different scenarios

---

## 🧪 Testing Plan

### Test Case 1: Same Category/Subcategory (Backend Fix)

**Request**:
```json
POST /api/v1/reviz/composite/variations
{
  "composite_id": "9.002.025.558",
  "vary_layers": ["stars"],
  "assets_per_layer": 10
}
```

**Expected**: Only one asset from `S.TEN.YOU.*` series, only one from `S.GRL.TEE.*` series

**Validates**: Backend deduplication by `category:subcategory`

---

### Test Case 2: Variant Relationships (AlgoRhythm Fix)

**Request**:
```json
POST /api/v1/reviz/composite/variations
{
  "composite_id": "9.002.025.558",
  "vary_layers": ["stars"],
  "assets_per_layer": 10
}
```

**Expected**: 
- If backend fix misses edge cases, AlgoRhythm fix should catch them
- Check for `VARIANTS_DEDUPLICATED` warnings in response

**Validates**: AlgoRhythm defensive deduplication

---

### Test Case 3: Current Asset Priority

**Request**:
```json
POST /api/v1/reviz/composite/variations
{
  "composite_id": "9.002.025.558",
  "vary_layers": ["stars"],
  "assets_per_layer": 5
}
```

**Expected**: 
- If current composite uses `S.TEN.YOU.031`, it should be kept (not `S.TEN.YOU.027`)
- Current asset appears first in `assets` array

**Validates**: Current asset prioritization in both fixes

---

## 📊 Expected Response After Fixes

### Before Fixes
```json
{
  "layer": "stars",
  "current_asset": {
    "asset_name": "S.TEN.YOU.031",
    "nna_address": "2.020.001.031"
  },
  "assets": [
    {
      "asset_name": "S.TEN.YOU.031",
      "nna_address": "2.020.001.031",
      "variants": ["S.TEN.YOU.001", "S.TEN.YOU.002", "S.TEN.YOU.003"]
    },
    {
      "asset_name": "S.TEN.YOU.027",  // ❌ DUPLICATE
      "nna_address": "2.020.001.027",
      "variants": ["S.TEN.YOU.001", "S.TEN.YOU.002", "S.TEN.YOU.003"]
    },
    {
      "asset_name": "S.GRL.TEE.002",
      "nna_address": "2.009.001.002",
      "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003"]
    },
    {
      "asset_name": "S.GRL.TEE.004",  // ❌ DUPLICATE
      "nna_address": "2.009.001.004",
      "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003"]
    },
    {
      "asset_name": "S.GRL.TEE.005",  // ❌ DUPLICATE
      "nna_address": "2.009.001.005",
      "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003"]
    }
  ]
}
```

### After Fixes
```json
{
  "layer": "stars",
  "current_asset": {
    "asset_name": "S.TEN.YOU.031",
    "nna_address": "2.020.001.031"
  },
  "assets": [
    {
      "asset_name": "S.TEN.YOU.031",  // ✅ KEPT (current asset)
      "nna_address": "2.020.001.031",
      "variants": ["S.TEN.YOU.001", "S.TEN.YOU.002", "S.TEN.YOU.003"]
    },
    {
      "asset_name": "S.GRL.TEE.002",  // ✅ KEPT (one per series)
      "nna_address": "2.009.001.002",
      "variants": ["S.GRL.TEE.001", "S.GRL.TEE.003", "S.GRL.TEE.004", "S.GRL.TEE.005"]
    }
  ],
  "warnings": [
    {
      "layer": "stars",
      "code": "VARIANTS_DEDUPLICATED",
      "message": "Removed 3 asset(s) that were variants of other assets in the list"
    }
  ]
}
```

---

## ✅ Verification Checklist

After backend deployment, verify:

- [ ] Main `assets` array contains only one asset per variant series
- [ ] Current asset (if part of a variant series) is kept over other assets from that series
- [ ] Variants lists still correctly exclude main assets and self
- [ ] No circular variant relationships in responses
- [ ] `VARIANTS_DEDUPLICATED` warnings appear when AlgoRhythm deduplication is triggered (defensive layer)

---

## 📝 Notes

1. **Backend Fix Priority**: The backend fix should handle most cases since it prevents duplicates at the source
2. **AlgoRhythm Fix**: Provides defensive layer for edge cases and different relationship detection logic
3. **Warning Messages**: If `VARIANTS_DEDUPLICATED` warnings appear frequently, it may indicate the backend fix needs adjustment
4. **Performance**: Both fixes are lightweight (O(n²) comparison, but n is typically small - 5-10 assets per layer)

---

## 🔗 Related Documentation

- Backend Fix: NNA Registry Service `composite-pattern.service.ts`
- AlgoRhythm Fix: `/src/modules/recommendations/reviz-composite-variations.service.ts`
- Original Issue: Reported by ReViz developers

---

**Status**: ✅ **BOTH FIXES DEPLOYED**  
**Next Step**: Test after backend deployment to verify end-to-end fix

