# 🚨 ReViz API Deployment Fix Guide

## Problem Summary

The ReViz Complete Experience API was deployed but routes are returning 404 errors. The root cause is a **dependency injection error** preventing the module from initializing properly.

**Error:**
```
UnknownDependenciesException: Nest can't resolve dependencies of the 
ReVizCompleteExperienceProductionService (CacheService, NnaRegistryService, 
ScoringService, AnalyticsService, ?, CompositeModel). 

Please make sure that the argument "AssetModel" at index [4] is available 
in the RecommendationsModule context.
```

---

## 🔧 Solution 1: Fix Module Configuration (PRIMARY FIX)

### Problem

The `RecommendationsModule` is missing the `Asset` and `Composite` model registrations in `MongooseModule.forFeature()`.

### Fix

Update `src/modules/recommendations/recommendations.module.ts`:

```typescript
// recommendations.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
import { ReVizCompleteExperienceService } from './reviz-complete-experience.service';
import { ReVizCompleteExperienceController } from './reviz-complete-experience.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { CachingModule } from '../caching/caching.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { AnalyticsModule } from '../analytics/analytics.module';

// Import schemas
import { 
  CompatibilityScore, 
  CompatibilityScoreSchema 
} from '../../models/compatibility-score.schema';
import { 
  RecommendationCache, 
  RecommendationCacheSchema 
} from '../../models/recommendation-cache.schema';

// 🔧 ADD THESE IMPORTS
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Existing schemas
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
      
      // 🔧 ADD THESE TWO LINES
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [
    RecommendationsController, 
    ReVizCompleteExperienceController
  ],
  providers: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService
  ],
  exports: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService
  ],
})
export class RecommendationsModule {}
```

---

## 🔧 Solution 2: Verify Service Injection Tokens

### Problem

The service might be using incorrect injection tokens for the models.

### Verify

Check `src/modules/recommendations/reviz-complete-experience.service.ts`:

```typescript
@Injectable()
export class ReVizCompleteExperienceService {
  constructor(
    private readonly cachingService: CachingService,
    private readonly nnaIntegration: NnaIntegrationService,
    private readonly scoringService: ScoringService,
    private readonly analyticsService: AnalyticsService,
    
    // 🔧 VERIFY: Should use 'Asset.name' not 'Asset'
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    
    // 🔧 VERIFY: Should use 'Composite.name' not 'Composite'
    @InjectModel(Composite.name) private compositeModel: Model<Composite>,
  ) {}
}
```

**Correct Pattern:**
```typescript
@InjectModel(Asset.name) private assetModel: Model<Asset>
```

**Incorrect Pattern:**
```typescript
@InjectModel('Asset') private assetModel: Model<any>
```

---

## 🔧 Solution 3: Check Schema Definitions

### Verify Asset Schema

Check `src/models/asset.schema.ts` has proper export:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Asset extends Document {
  @Prop({ required: true })
  name: string;
  
  @Prop({ required: true })
  layer: string;
  
  // ... other properties
}

// 🔧 VERIFY: Schema is exported
export const AssetSchema = SchemaFactory.createForClass(Asset);

// 🔧 OPTIONAL: Add indexes
AssetSchema.index({ layer: 1, assetType: 1 });
AssetSchema.index({ baseAssetId: 1, assetType: 1 });
```

### Verify Composite Schema

Check `src/models/composite.schema.ts` has proper export:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Composite extends Document {
  @Prop({ required: true })
  compositeId: string;
  
  @Prop({ required: true })
  songId: string;
  
  @Prop()
  components: string[];
  
  // ... other properties
}

// 🔧 VERIFY: Schema is exported
export const CompositeSchema = SchemaFactory.createForClass(Composite);

// 🔧 OPTIONAL: Add indexes
CompositeSchema.index({ songId: 1, compatibilityScore: -1 });
```

---

## 🔧 Solution 4: Verify Model Names Match

### Problem

Model names in different places might not match.

### Check Consistency

**In Module:**
```typescript
{ name: Asset.name, schema: AssetSchema }
```

**In Service:**
```typescript
@InjectModel(Asset.name) private assetModel: Model<Asset>
```

**In Schema:**
```typescript
@Schema({ timestamps: true })
export class Asset extends Document {
  // ...
}
```

All three must use the exact same name: `Asset.name`

---

## 🔧 Solution 5: Alternative - Use String Tokens

If the above solutions don't work, use string tokens consistently:

### In Module:
```typescript
MongooseModule.forFeature([
  { name: 'Asset', schema: AssetSchema },
  { name: 'Composite', schema: CompositeSchema },
])
```

### In Service:
```typescript
constructor(
  @InjectModel('Asset') private assetModel: Model<any>,
  @InjectModel('Composite') private compositeModel: Model<any>,
) {}
```

---

## 📋 Deployment Checklist

After making changes:

### 1. Verify Local Build
```bash
npm run build
```

**Expected:** No errors, successful compilation

### 2. Run Local Tests
```bash
npm run test
```

**Expected:** All tests pass

### 3. Test Locally
```bash
npm run start:dev
```

**Test endpoint:**
```bash
curl -X POST http://localhost:3000/api/v1/reviz/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "song_id": "G.POP.TEN.003",
    "experience_config": {
      "max_composites": 3,
      "max_assets_per_layer": 4
    }
  }'
```

**Expected:** Valid response, not 404

### 4. Commit and Push
```bash
git add .
git commit -m "fix: Add Asset and Composite models to RecommendationsModule"
git push origin main
```

### 5. Monitor CI/CD
- Watch GitHub Actions build
- Verify no compilation errors
- Check deployment logs

### 6. Test Production
```bash
# Test health endpoint
curl https://registry.reviz.dev/health

# Test ReViz endpoint
curl -X POST https://registry.reviz.dev/api/v1/reviz/complete-experience \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'
```

---

## 🔍 Debugging Steps

If issues persist after applying fixes:

### Check Build Logs
```bash
# In GitHub Actions, look for:
"error TS2345: Argument of type..."
"UnknownDependenciesException"
"Cannot resolve dependency"
```

### Check Application Logs
```bash
# SSH into production server
tail -f /var/log/reviz-api/application.log

# Look for:
"Error: Cannot inject..."
"Module initialization failed"
"Dependency resolution error"
```

### Verify Module Initialization Order
```typescript
// In app.module.ts, ensure RecommendationsModule comes AFTER
// modules it depends on:

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ScoringModule,        // First
    CachingModule,        // Second
    AnalyticsModule,      // Third
    RecommendationsModule, // Last - depends on above
  ],
})
export class AppModule {}
```

---

## 🚀 Quick Fix Summary

**For 90% of cases, this single change will fix the issue:**

In `recommendations.module.ts`, add these two lines to `MongooseModule.forFeature()`:

```typescript
{ name: Asset.name, schema: AssetSchema },
{ name: Composite.name, schema: CompositeSchema },
```

And add these imports at the top:

```typescript
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';
```

That's it! The dependency injection will work and routes will be available.

---

## ✅ Success Indicators

After deploying the fix, you should see:

1. ✅ Build completes without errors
2. ✅ Application starts successfully
3. ✅ `/health` endpoint returns 200
4. ✅ `/api/v1/reviz/complete-experience` endpoint returns valid response (not 404)
5. ✅ Application logs show "RecommendationsModule initialized"

---

## 📞 If Still Not Working

Contact the team with:

1. **Full error message** from build logs
2. **Application startup logs** showing module initialization
3. **Screenshot** of CI/CD pipeline failure
4. **Module configuration** from recommendations.module.ts

The issue is almost certainly related to dependency injection, and these logs will help pinpoint the exact cause.
