# 🚨 CRITICAL METADATA DEBUGGING GUIDE

**Date**: October 23, 2025  
**Issue**: Metadata not being saved in asset creation  
**Commit**: c85a620 - "Add unified metadata field support to DTO and service"  
**Status**: ❌ **NOT RESOLVED** - Metadata still not being saved  

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **The Problem**
- ✅ Asset creation succeeds (HTTP 201)
- ✅ Asset is created in database
- ❌ **Metadata fields are completely missing from response**
- ❌ **Metadata fields are completely missing from database**

### **Critical Discovery**
The issue is in the **NNA Registry Service**, not the AlgoRhythm service. The AlgoRhythm service only receives webhooks from NNA Registry.

**Asset Creation Flow:**
```
Frontend → NNA Registry Service → Database
                ↓
        Webhook → AlgoRhythm Service (receives notification)
```

---

## 🔧 **STEP-BY-STEP DEBUGGING GUIDE**

### **Step 1: Verify NNA Registry Service Schema**

**File**: `nna-registry-service/src/schemas/asset.schema.ts`

**Check if schema has metadata fields:**
```typescript
@Schema({ timestamps: true })
export class Asset {
  // ... other fields ...
  
  @Prop({ type: Object })
  metadata?: any;  // ← MUST EXIST
  
  @Prop({ type: Object })
  aiMetadata?: any;  // ← MUST EXIST
  
  // ... other fields ...
}
```

**❌ If missing**: Add these fields to the schema
**✅ If present**: Move to Step 2

### **Step 2: Verify NNA Registry Service DTO**

**File**: `nna-registry-service/src/dto/create-asset.dto.ts`

**Check if DTO accepts metadata:**
```typescript
export class CreateAssetDto {
  // ... other fields ...
  
  @IsObject()
  @IsOptional()
  metadata?: any;  // ← MUST EXIST
  
  @IsObject()
  @IsOptional()
  algorhythmMetadata?: any;  // ← MUST EXIST
  
  // ... other fields ...
}
```

**❌ If missing**: Add these fields to the DTO
**✅ If present**: Move to Step 3

### **Step 3: Verify NNA Registry Service Implementation**

**File**: `nna-registry-service/src/services/assets.service.ts`

**Check if service saves metadata:**
```typescript
async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
  const asset = new this.assetModel({
    // ... other fields ...
    metadata: createAssetDto.metadata,  // ← MUST EXIST
    aiMetadata: createAssetDto.algorhythmMetadata,  // ← MUST EXIST
  });
  
  return await asset.save();
}
```

**❌ If missing**: Add these lines to save metadata
**✅ If present**: Move to Step 4

### **Step 4: Add Debugging Logs**

**Add logging to verify metadata flow:**

```typescript
async createAsset(createAssetDto: CreateAssetDto): Promise<Asset> {
  // 🔍 DEBUG: Log received metadata
  console.log('📥 Received metadata:', createAssetDto.metadata);
  console.log('📥 Received algorhythmMetadata:', createAssetDto.algorhythmMetadata);
  
  const asset = new this.assetModel({
    // ... other fields ...
    metadata: createAssetDto.metadata,
    aiMetadata: createAssetDto.algorhythmMetadata,
  });
  
  const savedAsset = await asset.save();
  
  // 🔍 DEBUG: Log saved metadata
  console.log('💾 Saved metadata:', savedAsset.metadata);
  console.log('💾 Saved aiMetadata:', savedAsset.aiMetadata);
  
  return savedAsset;
}
```

### **Step 5: Test with Debugging**

**Create test asset with metadata:**
```bash
curl -X POST "https://registry.dev.reviz.dev/api/v1/assets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "layer": "M",
    "name": "M.TIK.CHA.014",
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

**Check logs for:**
- `📥 Received metadata:` - Should show the metadata object
- `💾 Saved metadata:` - Should show the saved metadata object

### **Step 6: Check Database Directly**

**Connect to MongoDB:**
```bash
mongo nna-registry-service-dev
```

**Query the created asset:**
```javascript
db.assets.findOne({_id: ObjectId("ASSET_ID_FROM_RESPONSE")})
```

**Check if document has:**
- `metadata` field
- `aiMetadata` field
- The values you sent (Hip-Hop, High, Intermediate)

---

## 🧪 **CRITICAL TEST TO ADD**

**File**: `nna-registry-service/src/assets/assets.controller.spec.ts`

```typescript
describe('Asset Creation with Metadata', () => {
  it('should save and return movesMetadata', async () => {
    const createAssetDto = {
      layer: 'M',
      name: 'M.TIK.CHA.015',
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

    // 🔍 CRITICAL CHECKS
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

**This test will FAIL if metadata isn't being saved, proving the bug exists.**

---

## 🔍 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: Schema Missing Fields**
**Problem**: Schema doesn't have `metadata` or `aiMetadata` fields
**Solution**: Add fields to schema:
```typescript
@Prop({ type: Object })
metadata?: any;

@Prop({ type: Object })
aiMetadata?: any;
```

### **Issue 2: DTO Missing Fields**
**Problem**: DTO doesn't accept metadata fields
**Solution**: Add fields to DTO:
```typescript
@IsObject()
@IsOptional()
metadata?: any;

@IsObject()
@IsOptional()
algorhythmMetadata?: any;
```

### **Issue 3: Service Not Saving Fields**
**Problem**: Service doesn't copy metadata to database
**Solution**: Add metadata copying in service:
```typescript
const asset = new this.assetModel({
  // ... other fields ...
  metadata: createAssetDto.metadata,
  aiMetadata: createAssetDto.algorhythmMetadata,
});
```

### **Issue 4: Response Filtering**
**Problem**: Metadata saved but filtered from response
**Solution**: Check response serialization and ensure metadata is included

---

## 📊 **VERIFICATION CHECKLIST**

- [ ] **Schema has metadata fields** (`metadata`, `aiMetadata`)
- [ ] **DTO accepts metadata fields** (`metadata`, `algorhythmMetadata`)
- [ ] **Service saves metadata fields** (copies from DTO to model)
- [ ] **Debug logs show metadata flow** (received → saved)
- [ ] **Database contains metadata** (direct MongoDB query)
- [ ] **Response includes metadata** (API response has fields)
- [ ] **Test passes** (critical test added and passing)

---

## 🚨 **IMMEDIATE ACTION REQUIRED**

1. **Backend team checks NNA Registry service** (not AlgoRhythm)
2. **Verifies schema, DTO, and service implementation**
3. **Adds debugging logs to trace metadata flow**
4. **Tests with the critical test case**
5. **Fixes any missing pieces**
6. **Redeploys NNA Registry service**
7. **Notifies frontend team to retest**

---

## 📞 **SUPPORT**

- **NNA Registry Service**: Where asset creation happens
- **AlgoRhythm Service**: Only receives webhooks (not the issue)
- **Database**: Check MongoDB directly for metadata fields
- **Logs**: Add debugging logs to trace metadata flow

---

**Status**: ❌ **CRITICAL ISSUE - METADATA NOT BEING SAVED**  
**Next Steps**: Backend team must investigate NNA Registry service implementation  
**Timeline**: Fix required before frontend testing can proceed
