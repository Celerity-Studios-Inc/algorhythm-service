# 🔄 ReViz API Migration Guide: V1.0 → V2.0
## **Transitioning to GCP URL-Based Architecture**

**Version**: 2.0  
**Date**: October 8, 2025  
**Migration Difficulty**: ⭐⭐ Moderate (2-3 days)  
**Breaking Changes**: Yes (response structure)

---

## 📊 **Migration Overview**

### **What's Changing**

```
┌──────────────────────────────────────────────────────────────┐
│              V1.0 → V2.0 MIGRATION SUMMARY                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Component           V1.0                V2.0                 │
│ ─────────────       ─────────────       ─────────────        │
│ Response Size       50-100MB            2-5MB (95% ↓)       │
│ Asset Data          Embedded binary     GCP URLs            │
│ Response Time       3-5s                200-500ms (90% ↓)   │
│ Loading Pattern     Sequential          Parallel CDN        │
│ Streaming           Required            Not needed          │
│ Mobile Support      Poor                Excellent           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### **Benefits of Migration**

✅ **95% smaller API responses** - Critical for mobile  
✅ **90% faster response times** - Better UX  
✅ **Global CDN performance** - 20-50ms asset loading  
✅ **No streaming complexity** - Simpler client code  
✅ **Better offline support** - Cache URLs, download assets  
✅ **Lower bandwidth costs** - Pay only for viewed assets

---

## 🎯 **Step-by-Step Migration**

### **Phase 1: Database Preparation** (Day 1, Morning)

#### **1.1 Verify GCP URL Fields**

Check if all assets have GCP URL fields:

```bash
# Connect to MongoDB
mongosh "mongodb://your-connection-string"

# Check assets without GCP URLs
db.assets.countDocuments({ 
  gcpStorageUrl: { $exists: false } 
})

# If count > 0, migration needed
```

#### **1.2 Run Migration Script**

```typescript
// migrate-to-gcp-urls.ts
import { Asset } from './models/asset.schema';
import { Composite } from './models/composite.schema';

async function migrateAssetsToGCPURLs() {
  console.log('Starting GCP URL migration...');
  
  // Find assets without GCP URLs
  const assetsToMigrate = await Asset.find({
    $or: [
      { gcpStorageUrl: { $exists: false } },
      { thumbnailUrl: { $exists: false } },
      { previewUrl: { $exists: false } }
    ]
  });
  
  console.log(`Found ${assetsToMigrate.length} assets to migrate`);
  
  for (const asset of assetsToMigrate) {
    try {
      // Pattern: https://storage.googleapis.com/reviz-assets/{layer}/{id}/{type}.ext
      const baseUrl = `https://storage.googleapis.com/reviz-assets/${asset.layer.toLowerCase()}s/${asset.name}`;
      
      // Set GCP URLs
      asset.gcpStorageUrl = asset.fileUrl || `${baseUrl}/full.mp4`;
      asset.thumbnailUrl = `${baseUrl}/thumb.jpg`;
      asset.previewUrl = `${baseUrl}/preview.mp4`;
      
      await asset.save();
      console.log(`✓ Migrated: ${asset.name}`);
    } catch (error) {
      console.error(`✗ Failed: ${asset.name}`, error.message);
    }
  }
  
  console.log('Migration complete!');
}

// Run migration
migrateAssetsToGCPURLs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

Run it:
```bash
npm run ts-node scripts/migrate-to-gcp-urls.ts
```

#### **1.3 Verify Migration**

```bash
# Check all assets now have URLs
db.assets.countDocuments({ 
  gcpStorageUrl: { $exists: true },
  thumbnailUrl: { $exists: true },
  previewUrl: { $exists: true }
})

# Should equal total asset count
db.assets.countDocuments({})
```

---

### **Phase 2: Code Updates** (Day 1, Afternoon)

#### **2.1 Update Module Configuration**

**File:** `src/modules/recommendations/recommendations.module.ts`

```typescript
// BEFORE (V1.0) - Missing Asset/Composite models
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
    ]),
    // ... other imports
  ],
})

// AFTER (V2.0) - Add Asset/Composite models
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },              // ← ADD THIS
      { name: Composite.name, schema: CompositeSchema },      // ← ADD THIS
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
    ]),
    // ... other imports
  ],
})
```

#### **2.2 Update Service Injection**

**File:** `src/modules/recommendations/reviz-complete-experience.service.ts`

```typescript
// BEFORE (V1.0) - String tokens
constructor(
  @InjectModel('Asset') private assetModel: Model<any>,
  @InjectModel('Composite') private compositeModel: Model<any>,
) {}

// AFTER (V2.0) - Proper model tokens
import { Asset } from '../../models/asset.schema';
import { Composite } from '../../models/composite.schema';

constructor(
  @InjectModel(Asset.name) private assetModel: Model<Asset>,
  @InjectModel(Composite.name) private compositeModel: Model<Composite>,
) {}
```

#### **2.3 Update Aggregation Pipeline**

**File:** `src/modules/recommendations/reviz-complete-experience.service.ts`

```typescript
// BEFORE (V1.0) - Includes all data
private async getLayerAssetsOptimized(request: ReVizCompleteRequest) {
  const pipeline = [
    { $match: { layer: { $in: layers }, assetType: 'base' } },
    {
      $group: {
        _id: '$layer',
        assets: { 
          $push: {
            id: '$_id',
            name: '$name',
            metadata: '$metadata',         // ← Large object
            fileData: '$fileData',         // ← Binary data
            thumbnail: '$thumbnail',       // ← Binary data
            preview: '$preview'            // ← Binary data
          }
        }
      }
    }
  ];
  return await this.assetModel.aggregate(pipeline);
}

// AFTER (V2.0) - Only URLs
private async getLayerAssetsOptimized(request: ReVizCompleteRequest) {
  const pipeline = [
    { $match: { layer: { $in: layers }, assetType: 'base' } },
    {
      $group: {
        _id: '$layer',
        assets: { 
          $push: {
            asset_id: '$_id',
            name: '$name',
            nna_address: '$nna_address',
            
            // ✅ Only URLs, no binary data
            gcpStorageUrl: '$gcpStorageUrl',
            thumbnailUrl: '$thumbnailUrl',
            previewUrl: '$previewUrl',
            
            // Lightweight metadata only
            compatibility_score: '$compatibilityScore',
            trending_score: '$trendingScore.score',
            tags: '$tags'
          }
        }
      }
    }
  ];
  return await this.assetModel.aggregate(pipeline);
}
```

#### **2.4 Update Variant Loading**

```typescript
// BEFORE (V1.0) - All fields
const variants = await this.assetModel.find({
  baseAssetId: { $in: baseAssetIds }
}).lean();

// AFTER (V2.0) - Only URL fields
const variants = await this.assetModel.find({
  baseAssetId: { $in: baseAssetIds }
})
.select('_id name nna_address gcpStorageUrl thumbnailUrl previewUrl compatibilityScore tags')
.lean();
```

#### **2.5 Remove Streaming Logic**

```typescript
// BEFORE (V1.0) - Streaming needed for large responses
@Post('complete-experience')
async getCompleteExperience(@Query('stream') stream?: string) {
  if (stream === 'true' || this.shouldUseStreaming(request)) {
    return this.handleStreamingResponse(request, res);
  }
  // ...
}

// AFTER (V2.0) - No streaming needed (responses always small)
@Post('complete-experience')
async getCompleteExperience() {
  const result = await this.service.getCompleteExperience(request);
  return result;  // Simple! No streaming complexity
}
```

---

### **Phase 3: Testing** (Day 2, Morning)

#### **3.1 Unit Tests**

```typescript
// test/reviz-complete-experience.service.spec.ts
describe('ReVizCompleteExperienceService - V2.0', () => {
  
  it('should return only GCP URLs, not binary data', async () => {
    const result = await service.getCompleteExperience({
      song_id: 'G.POP.TEN.003',
      experience_config: { max_composites: 3 }
    });
    
    // Check response has URLs
    expect(result.data.layer_assets.stars.assets[0].media).toHaveProperty('thumbnail_url');
    expect(result.data.layer_assets.stars.assets[0].media).toHaveProperty('preview_url');
    expect(result.data.layer_assets.stars.assets[0].media).toHaveProperty('full_asset_url');
    
    // Check no binary data
    expect(result.data.layer_assets.stars.assets[0]).not.toHaveProperty('fileData');
    expect(result.data.layer_assets.stars.assets[0]).not.toHaveProperty('thumbnail');
  });
  
  it('should have response size < 5MB', async () => {
    const result = await service.getCompleteExperience({
      song_id: 'G.POP.TEN.003',
      experience_config: { 
        max_composites: 10,
        max_assets_per_layer: 8
      }
    });
    
    const responseSize = Buffer.byteLength(JSON.stringify(result));
    expect(responseSize).toBeLessThan(5 * 1024 * 1024); // 5MB
  });
  
  it('should include performance metrics with response size', async () => {
    const result = await service.getCompleteExperience({
      song_id: 'G.POP.TEN.003',
      experience_config: { max_composites: 5 }
    });
    
    expect(result.data.performance_metrics).toHaveProperty('response_size_bytes');
    expect(result.data.performance_metrics).toHaveProperty('assets_from_cdn');
  });
});
```

#### **3.2 Integration Tests**

```bash
# Test API endpoint
curl -X POST https://registry.dev.reviz.dev/api/v1/reviz/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "song_id": "G.POP.TEN.003",
    "experience_config": {
      "max_composites": 5,
      "max_assets_per_layer": 6
    }
  }' | jq '.data.layer_assets.stars.assets[0].media'

# Expected output: GCP URLs
{
  "thumbnail_url": "https://storage.googleapis.com/...",
  "preview_url": "https://storage.googleapis.com/...",
  "full_asset_url": "https://storage.googleapis.com/..."
}
```

#### **3.3 Performance Tests**

```typescript
// test/performance.spec.ts
describe('Performance - V2.0', () => {
  
  it('should respond in < 500ms', async () => {
    const start = Date.now();
    
    await service.getCompleteExperience({
      song_id: 'G.POP.TEN.003',
      experience_config: { max_composites: 5 }
    });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  it('should have cache hit rate > 90% for popular songs', async () => {
    // Warm up cache
    await service.getCompleteExperience({ song_id: 'G.POP.TEN.003' });
    
    // Second call should hit cache
    const result = await service.getCompleteExperience({ song_id: 'G.POP.TEN.003' });
    
    expect(result.data.performance_metrics.cache_hit_rate).toBeGreaterThan(0.9);
  });
});
```

---

### **Phase 4: Client Updates** (Day 2, Afternoon)

#### **4.1 Update Client SDK**

```typescript
// client/reviz-client.ts

// BEFORE (V1.0) - Expected embedded data
interface AssetDetail {
  asset_id: string;
  name: string;
  fileData: Buffer;      // ← Binary data
  thumbnail: Buffer;     // ← Binary data
}

// AFTER (V2.0) - Expect URLs
interface AssetDetail {
  asset_id: string;
  name: string;
  media: {
    thumbnail_url: string;    // ← URL
    preview_url: string;      // ← URL
    full_asset_url: string;   // ← URL
  };
}

// Update usage
class ReVizClient {
  async getCompleteExperience(config) {
    const response = await this.api.post('/complete-experience', config);
    
    // V2.0: Load assets from URLs
    const assets = response.data.layer_assets.stars.assets;
    await this.loadAssetsFromURLs(assets);
    
    return response;
  }
  
  private async loadAssetsFromURLs(assets: AssetDetail[]) {
    // Load thumbnails in parallel from CDN
    await Promise.all(
      assets.map(asset => 
        Image.prefetch(asset.media.thumbnail_url)
      )
    );
  }
}
```

#### **4.2 Update Loading Strategy**

```typescript
// client/asset-loader.ts

// BEFORE (V1.0) - Data already in response
function renderAssets(response) {
  response.data.layer_assets.stars.assets.forEach(asset => {
    const thumbnail = Buffer.from(asset.thumbnail, 'base64');
    displayImage(thumbnail);
  });
}

// AFTER (V2.0) - Load from URLs
async function renderAssets(response) {
  // Step 1: Show thumbnails immediately
  await loadThumbnails(response);
  
  // Step 2: Load previews in background
  loadPreviews(response);
  
  // Step 3: Load full assets on-demand
  setupOnDemandLoading(response);
}

async function loadThumbnails(response) {
  const assets = response.data.layer_assets.stars.assets;
  
  // Load in parallel from CDN
  await Promise.all(
    assets.map(asset =>
      Image.prefetch(asset.media.thumbnail_url)
    )
  );
  
  // Render immediately
  assets.forEach(asset => {
    displayImage(asset.media.thumbnail_url);
  });
}
```

---

### **Phase 5: Deployment** (Day 3)

#### **5.1 Deploy to Development**

```bash
# Build
npm run build

# Test locally
npm run start:dev

# Deploy to dev
git push origin develop

# Monitor deployment
kubectl logs -f deployment/reviz-api-dev
```

#### **5.2 Verify Development**

```bash
# Health check
curl https://registry.dev.reviz.dev/api/v1/reviz/health

# Test endpoint
curl -X POST https://registry.dev.reviz.dev/api/v1/reviz/complete-experience \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d '{"song_id":"G.POP.TEN.003","experience_config":{"max_composites":3}}'
```

#### **5.3 Deploy to Staging**

```bash
# Merge to staging
git checkout staging
git merge develop
git push origin staging

# Verify staging
curl https://registry.stg.reviz.dev/api/v1/reviz/health
```

#### **5.4 Deploy to Production**

```bash
# Final checks
npm run test
npm run test:e2e

# Merge to main
git checkout main
git merge staging
git push origin main

# Monitor production
kubectl logs -f deployment/reviz-api-prod
```

---

## 🔍 **Verification Checklist**

### **Database**
- [ ] All assets have `gcpStorageUrl` field
- [ ] All assets have `thumbnailUrl` field
- [ ] All assets have `previewUrl` field
- [ ] Migration script completed successfully

### **Code**
- [ ] Module configuration includes Asset/Composite models
- [ ] Service uses proper model injection
- [ ] Aggregation pipelines select URL fields only
- [ ] Streaming logic removed
- [ ] Type definitions updated for URLs

### **Testing**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance tests show <500ms response
- [ ] Response sizes <5MB
- [ ] No binary data in responses

### **Client**
- [ ] Client SDK updated for URLs
- [ ] Loading strategy implemented
- [ ] Progressive loading works
- [ ] CDN prefetching works

### **Deployment**
- [ ] Development deployed and tested
- [ ] Staging deployed and tested
- [ ] Production deployed and tested
- [ ] Monitoring shows expected metrics

---

## 🚨 **Rollback Plan**

If issues occur, rollback is straightforward:

```bash
# Rollback deployment
kubectl rollout undo deployment/reviz-api-prod

# Verify rollback
curl https://registry.reviz.dev/api/v1/reviz/health

# If needed, restore previous code
git revert HEAD
git push origin main
```

**Note:** Database changes (adding GCP URL fields) are non-destructive and don't need rollback.

---

## 📊 **Success Metrics**

Monitor these metrics post-migration:

```
┌──────────────────────────────────────────────────────────────┐
│              POST-MIGRATION SUCCESS METRICS                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Metric                Before (V1.0)    After (V2.0)         │
│ ──────────────        ───────────────   ─────────────        │
│ API Response Size     50-100MB          2-5MB               │
│ API Response Time     3-5s              200-500ms           │
│ Time to Interactive   5-7s              300-600ms           │
│ Cache Hit Rate        50-60%            90%+                │
│ CDN Hit Rate          N/A               95%+                │
│ Mobile Performance    Poor              Excellent           │
│ Error Rate            <5%               <1%                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 💡 **Tips & Best Practices**

1. **Test thoroughly in dev/staging** before production
2. **Monitor metrics** during and after migration
3. **Keep V1.0 available** for rollback if needed
4. **Update documentation** for clients
5. **Communicate changes** to all stakeholders

---

## 📞 **Support**

If you encounter issues:

1. **Check logs**: `kubectl logs -f deployment/reviz-api-{env}`
2. **Verify database**: Run verification queries
3. **Test API**: Use curl commands from this guide
4. **Contact team**: support@celerity.studio

---

**Migration should take 2-3 days with proper testing. The benefits are worth it!** 🚀
