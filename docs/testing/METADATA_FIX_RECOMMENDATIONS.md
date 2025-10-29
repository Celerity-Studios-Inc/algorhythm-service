# 🔧 METADATA FIX RECOMMENDATIONS

**Date**: October 23, 2025  
**Issue**: Metadata not being saved in asset creation  
**Commit**: c85a620 - "Add unified metadata field support to DTO and service"  
**Status**: ❌ **NOT RESOLVED** - Requires immediate backend team action  

---

## 🎯 **ROOT CAUSE IDENTIFIED**

The issue is in the **NNA Registry Service**, not the AlgoRhythm service. The asset creation endpoint `POST /api/v1/assets` is in the NNA Registry service.

**Critical Discovery**: Commit c85a620 likely only added metadata fields to the DTO (to accept the request) but didn't:
1. ✅ Add metadata to the Schema (Mongoose will ignore undefined fields)
2. ✅ Copy metadata in the Service (to actually save it)
3. ✅ Test the fix (no tests checking for metadata in responses)

---

## 🔧 **SPECIFIC FIXES REQUIRED**

### **Fix 1: NNA Registry Schema Update**

**File**: `nna-registry-service/src/schemas/asset.schema.ts`

**Add these fields if missing:**
```typescript
@Schema({ timestamps: true })
export class Asset {
  // ... existing fields ...
  
  @Prop({ type: Object })
  metadata?: any;
  
  @Prop({ type: Object })
  aiMetadata?: any;
  
  // ... other fields ...
}
```

### **Fix 2: NNA Registry DTO Update**

**File**: `nna-registry-service/src/dto/create-asset.dto.ts`

**Add these fields if missing:**
```typescript
export class CreateAssetDto {
  // ... existing fields ...
  
  @IsObject()
  @IsOptional()
  metadata?: any;
  
  @IsObject()
  @IsOptional()
  algorhythmMetadata?: any;
  
  // ... other fields ...
}
```

### **Fix 3: NNA Registry Service Update**

**File**: `nna-registry-service/src/services/assets.service.ts`

**Update the createAsset method:**
```typescript
async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
  // 🔍 DEBUG: Log received metadata
  console.log('📥 Received metadata:', createAssetDto.metadata);
  console.log('📥 Received algorhythmMetadata:', createAssetDto.algorhythmMetadata);
  
  const asset = new this.assetModel({
    // ... existing fields ...
    metadata: createAssetDto.metadata,  // ← ADD THIS LINE
    aiMetadata: createAssetDto.algorhythmMetadata,  // ← ADD THIS LINE
  });
  
  const savedAsset = await asset.save();
  
  // 🔍 DEBUG: Log saved metadata
  console.log('💾 Saved metadata:', savedAsset.metadata);
  console.log('💾 Saved aiMetadata:', savedAsset.aiMetadata);
  
  return savedAsset;
}
```

### **Fix 4: Add Critical Test**

**File**: `nna-registry-service/src/assets/assets.controller.spec.ts`

**Add this test:**
```typescript
describe('Asset Creation with Metadata', () => {
  it('should save and return movesMetadata', async () => {
    const createAssetDto = {
      layer: 'M',
      name: 'M.TIK.CHA.016',
      metadata: {
        movesMetadata: {
          danceStyle: 'Hip-Hop',
          intensity: 'High',
          difficulty: 'Intermediate'
        }
      },
      algorhythmMetadata: {
        performanceContext: ['studio']
      }
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/assets')
      .send(createAssetDto)
      .expect(201);

    // 🔍 CRITICAL CHECKS - These will FAIL if metadata isn't saved
    expect(response.body.data.metadata).toBeDefined();
    expect(response.body.data.metadata.movesMetadata).toBeDefined();
    expect(response.body.data.metadata.movesMetadata.danceStyle).toBe('Hip-Hop');
    expect(response.body.data.metadata.movesMetadata.intensity).toBe('High');
    expect(response.body.data.metadata.movesMetadata.difficulty).toBe('Intermediate');
    
    expect(response.body.data.aiMetadata).toBeDefined();
    expect(response.body.data.aiMetadata.performanceContext).toEqual(['studio']);
  });
});
```

---

## 🧪 **TESTING PROCEDURE**

### **Step 1: Deploy Fixes**
1. Apply all 4 fixes above
2. Deploy NNA Registry service
3. Verify deployment successful

### **Step 2: Test with Debugging**
```bash
# Create test asset with metadata
curl -X POST "https://registry.dev.reviz.dev/api/v1/assets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "layer": "M",
    "name": "M.TIK.CHA.017",
    "metadata": {
      "movesMetadata": {
        "danceStyle": "Hip-Hop",
        "intensity": "High",
        "difficulty": "Intermediate"
      }
    },
    "algorhythmMetadata": {
      "performanceContext": ["studio"]
    }
  }'
```

### **Step 3: Check Logs**
Look for these log messages:
- `📥 Received metadata:` - Should show the metadata object
- `💾 Saved metadata:` - Should show the saved metadata object

### **Step 4: Verify Response**
Response should include:
```json
{
  "data": {
    "_id": "asset_id",
    "metadata": {
      "movesMetadata": {
        "danceStyle": "Hip-Hop",
        "intensity": "High",
        "difficulty": "Intermediate"
      }
    },
    "aiMetadata": {
      "performanceContext": ["studio"]
    }
  }
}
```

### **Step 5: Check Database**
```bash
mongo nna-registry-service-dev
db.assets.findOne({_id: ObjectId("ASSET_ID")})
```

Should show `metadata` and `aiMetadata` fields with the values.

---

## 🚨 **CRITICAL SUCCESS CRITERIA**

The fix is successful when:

1. ✅ **Asset creation succeeds** (HTTP 201)
2. ✅ **Response includes metadata fields** (metadata, aiMetadata)
3. ✅ **Database contains metadata** (direct MongoDB query)
4. ✅ **Debug logs show metadata flow** (received → saved)
5. ✅ **Critical test passes** (metadata assertions pass)
6. ✅ **Frontend can retrieve metadata** (GET request returns metadata)

---

## 📊 **VERIFICATION CHECKLIST**

- [ ] **Schema updated** (metadata, aiMetadata fields added)
- [ ] **DTO updated** (metadata, algorhythmMetadata fields added)
- [ ] **Service updated** (metadata copying implemented)
- [ ] **Debug logs added** (metadata flow tracing)
- [ ] **Critical test added** (metadata assertions)
- [ ] **Service deployed** (NNA Registry service updated)
- [ ] **Test passes** (critical test case passes)
- [ ] **Frontend verified** (metadata appears in responses)

---

## 🎯 **IMMEDIATE ACTION PLAN**

1. **Backend team applies all 4 fixes**
2. **Deploys NNA Registry service**
3. **Runs critical test** (should pass)
4. **Tests with debugging logs** (verify metadata flow)
5. **Checks database directly** (verify metadata saved)
6. **Notifies frontend team** (ready for retesting)
7. **Frontend team retests** (verifies fix works)

---

## 📞 **SUPPORT & CONTACT**

- **NNA Registry Service**: Where the fixes need to be applied
- **AlgoRhythm Service**: Not involved (only receives webhooks)
- **Database**: MongoDB needs to contain metadata fields
- **Testing**: Use the critical test case to verify fix

---

**Status**: ❌ **CRITICAL ISSUE - REQUIRES IMMEDIATE BACKEND ACTION**  
**Timeline**: Fix must be deployed before frontend testing can proceed  
**Priority**: **HIGH** - Blocking all metadata-dependent features
