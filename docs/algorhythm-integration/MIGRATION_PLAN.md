# Algorhythm Integration Migration Plan
**Date**: October 11, 2025  
**Status**: 📋 **MIGRATION PLAN**  
**Backend Team**: NNA Registry Service

---

## 🎯 **MIGRATION OVERVIEW**

### **Goal**
Transform from **export-based integration** to **webhook-based, autonomous Algorhythm service** that maintains its own indexes and operates independently.

### **Current Architecture**
```
NNA Registry → Export APIs → Algorhythm Service → ReViz
     ↓              ↓              ↓
  Static Data   Manual Sync   Limited Data
```

### **Target Architecture**
```
NNA Registry → Webhooks → Algorhythm Service → ReViz
     ↓              ↓              ↓
  Real-time    Auto-sync    Dynamic Indexes
```

---

## 📋 **MIGRATION PHASES**

### **Phase 1: Webhook Infrastructure Setup**
**Duration**: 3-5 days  
**Goal**: Enable webhook processing in Algorhythm service

#### **1.1 Create Webhook Handler in Algorhythm Service**

**Files to Create:**
```
/Users/ajaymadhok/algorhythm-service/src/modules/webhooks/
├── webhook-handler.controller.ts
├── webhook-handler.service.ts
├── webhook-handler.module.ts
├── webhook-security.service.ts
└── types/
    ├── composite-created.payload.ts
    ├── composite-updated.payload.ts
    └── composite-deleted.payload.ts
```

**Implementation:**
```typescript
// webhook-handler.controller.ts
@Controller('webhooks')
export class WebhookHandlerController {
  constructor(
    private readonly webhookHandlerService: WebhookHandlerService,
    private readonly webhookSecurityService: WebhookSecurityService,
  ) {}

  @Post('nna-composite-created')
  async handleCompositeCreated(
    @Body() payload: CompositeCreatedPayload,
    @Headers('x-nna-signature') signature: string,
  ) {
    // Verify webhook signature
    const isValid = await this.webhookSecurityService.verifySignature(
      JSON.stringify(payload),
      signature,
      process.env.NNA_WEBHOOK_SECRET
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    await this.webhookHandlerService.handleCompositeCreated(payload);
  }
}
```

#### **1.2 Update NNA Registry Webhook Configuration**

**Environment Variables to Add:**
```bash
# In NNA Registry environment
ALGORHYTHM_WEBHOOK_URL=https://algorhythm.dev.media/api/webhooks/nna-composite-created
ALGORHYTHM_WEBHOOK_SECRET=shared-secret-key-12345
```

**Update Webhook Service:**
```typescript
// In NNA Registry - algorhythm-webhook.service.ts
@Injectable()
export class AlgorhythmWebhookService {
  private readonly webhookUrl = this.configService.get<string>('ALGORHYTHM_WEBHOOK_URL');
  private readonly webhookSecret = this.configService.get<string>('ALGORHYTHM_WEBHOOK_SECRET');

  async notifyCompositeCreated(composite: Asset) {
    const payload = {
      event: 'composite.created',
      timestamp: new Date().toISOString(),
      data: {
        composite_id: composite._id.toString(),
        name: composite.name,
        song_id: this.extractSongId(composite.name),
        algorhythmMetadata: composite.algorhythmMetadata,
        aggregatedMetadata: composite.aggregatedMetadata,
        gcpStorageUrl: composite.gcpStorageUrl,
        thumbnailUrl: composite.thumbnailUrl,
        description: composite.description,
        components: composite.components,
        createdAt: composite.createdAt,
        updatedAt: composite.updatedAt
      }
    };

    const signature = this.generateSignature(JSON.stringify(payload));
    
    await this.sendWebhook(payload, signature);
  }
}
```

#### **1.3 Test Webhook Processing**

**Test Script:**
```bash
# Test webhook endpoint
curl -X POST https://algorhythm.dev.media/api/webhooks/nna-composite-created \
  -H "Content-Type: application/json" \
  -H "X-NNA-Signature: <signature>" \
  -d '{
    "event": "composite.created",
    "timestamp": "2025-10-11T14:30:00.000Z",
    "data": {
      "composite_id": "test_composite_123",
      "name": "C.FUL.ALL.047:1.018.003.002+...",
      "song_id": "1.018.003.002"
    }
  }'
```

### **Phase 2: Real-time Index Updates**
**Duration**: 5-7 days  
**Goal**: Implement real-time index updates in Algorhythm service

#### **2.1 Create Real-time Index Service**

**Files to Create:**
```
/Users/ajaymadhok/algorhythm-service/src/modules/indexing/
├── real-time-index.service.ts
├── composite-index.service.ts
├── song-index.service.ts
├── recommendation-index.service.ts
└── index-update.service.ts
```

**Implementation:**
```typescript
// real-time-index.service.ts
@Injectable()
export class RealTimeIndexService {
  constructor(
    private readonly compositeIndexService: CompositeIndexService,
    private readonly songIndexService: SongIndexService,
    private readonly recommendationIndexService: RecommendationIndexService,
  ) {}

  async updateCompositeIndex(composite: CompositeAsset) {
    // Update composite in local index
    await this.compositeIndexService.updateComposite(composite);
    
    // Update song index if needed
    await this.songIndexService.updateSongComposites(composite.song_id);
    
    // Update recommendation index
    await this.recommendationIndexService.updateRecommendations(composite);
    
    this.logger.log(`Updated composite index for: ${composite.composite_id}`);
  }
}
```

#### **2.2 Update Daemon Service**

**Modify Existing Daemon:**
```typescript
// daemon.service.ts
@Injectable()
export class DaemonService {
  constructor(
    private readonly realTimeIndexService: RealTimeIndexService,
    private readonly indexBuilderService: IndexBuilderService,
    // ... existing services
  ) {}

  // Keep existing cron jobs for maintenance
  @Cron(CronExpression.EVERY_HOUR)
  async buildRecommendationIndex() {
    // Now only rebuilds if needed
    const needsRebuild = await this.realTimeIndexService.needsRebuild();
    if (needsRebuild) {
      await this.indexBuilderService.buildRecommendationIndex();
    }
  }
}
```

### **Phase 3: Local Data Store Implementation**
**Duration**: 7-10 days  
**Goal**: Implement local data store for autonomous operation

#### **3.1 Create Local Data Models**

**Files to Create:**
```
/Users/ajaymadhok/algorhythm-service/src/models/
├── composite.schema.ts
├── song.schema.ts
├── asset.schema.ts
├── index-metadata.schema.ts
└── webhook-event.schema.ts
```

**Implementation:**
```typescript
// composite.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Composite {
  @Prop({ required: true, unique: true })
  composite_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  song_id: string;

  @Prop({ type: Object })
  algorhythmMetadata: any;

  @Prop({ type: Object })
  aggregatedMetadata: any;

  @Prop()
  gcpStorageUrl: string;

  @Prop()
  thumbnailUrl: string;

  @Prop()
  description: string;

  @Prop({ type: [Object] })
  components: any[];

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export type CompositeDocument = Composite & Document;
export const CompositeSchema = SchemaFactory.createForClass(Composite);
```

#### **3.2 Create Local Data Service**

**Files to Create:**
```
/Users/ajaymadhok/algorhythm-service/src/modules/data/
├── local-data.service.ts
├── composite-repository.service.ts
├── song-repository.service.ts
├── data-sync.service.ts
└── data-consistency.service.ts
```

**Implementation:**
```typescript
// local-data.service.ts
@Injectable()
export class LocalDataService {
  constructor(
    private readonly compositeRepository: CompositeRepositoryService,
    private readonly songRepository: SongRepositoryService,
    private readonly dataSyncService: DataSyncService,
  ) {}

  async getCompositesBySong(songId: string): Promise<Composite[]> {
    // Query local database first
    const localComposites = await this.compositeRepository.findBySong(songId);
    
    if (localComposites.length > 0) {
      this.logger.debug(`Found ${localComposites.length} local composites for song: ${songId}`);
      return localComposites;
    }
    
    // Fallback to NNA Registry if needed
    this.logger.warn(`No local composites found for song: ${songId}, falling back to NNA Registry`);
    return await this.dataSyncService.syncCompositesFromNNA(songId);
  }
}
```

### **Phase 4: API Endpoint Updates**
**Duration**: 3-5 days  
**Goal**: Update Algorhythm APIs to use local data

#### **4.1 Update Recommendations Controller**

**Modify Existing Controller:**
```typescript
// recommendations.controller.ts
@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(
    private readonly localDataService: LocalDataService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get('templates/:songId')
  async getTemplatesBySong(@Param('songId') songId: string) {
    // Now uses local data store
    const composites = await this.localDataService.getCompositesBySong(songId);
    
    if (composites.length === 0) {
      return {
        success: false,
        error: 'No templates available',
        song_id: songId
      };
    }

    return {
      success: true,
      song_id: songId,
      templates: composites.map(composite => ({
        template_id: composite.composite_id,
        name: composite.name,
        gcpStorageUrl: composite.gcpStorageUrl,
        thumbnailUrl: composite.thumbnailUrl,
        algorhythmMetadata: composite.algorhythmMetadata,
        aggregatedMetadata: composite.aggregatedMetadata
      }))
    };
  }
}
```

### **Phase 5: Cleanup and Optimization**
**Duration**: 5-7 days  
**Goal**: Remove export dependencies and optimize performance

#### **5.1 Remove Export APIs from NNA Registry**

**Files to Remove:**
```
src/modules/assets/
├── algorhythm-export.controller.ts          # Remove
├── algorhythm-export-legacy.controller.ts  # Remove
└── services/
    ├── algorhythm-webhook.service.ts        # Keep for webhooks
    ├── algorhythm-sync.service.ts          # Remove
    └── algorhythm-data-transformer.service.ts # Remove
```

**Update Assets Module:**
```typescript
// assets.module.ts
@Module({
  // Remove AlgorhythmExportController and AlgorhythmSyncService
  controllers: [AssetsController], // Remove export controllers
  providers: [
    AssetsService,
    // ... other services
    AlgorhythmWebhookService, // Keep webhook service
    // Remove AlgorhythmSyncService and AlgorhythmDataTransformerService
  ],
})
```

#### **5.2 Optimize Algorhythm Service Performance**

**Performance Optimizations:**
```typescript
// performance-optimization.service.ts
@Injectable()
export class PerformanceOptimizationService {
  async optimizeIndexes() {
    // Create database indexes for common queries
    await this.compositeModel.createIndex({ song_id: 1 });
    await this.compositeModel.createIndex({ composite_id: 1 });
    await this.compositeModel.createIndex({ createdAt: -1 });
    
    // Optimize cache settings
    await this.cacheService.optimizeCache();
  }
}
```

---

## 🧪 **TESTING STRATEGY**

### **Phase 1 Testing: Webhook Processing**
```bash
# Test webhook endpoint
curl -X POST https://algorhythm.dev.media/api/webhooks/nna-composite-created \
  -H "Content-Type: application/json" \
  -H "X-NNA-Signature: <signature>" \
  -d '{"event": "composite.created", "data": {...}}'

# Verify webhook processing
curl https://algorhythm.dev.media/api/v1/recommendations/templates/1.018.003.002
```

### **Phase 2 Testing: Real-time Updates**
```bash
# Create composite in NNA Registry
curl -X POST https://registry.dev.reviz.dev/api/assets \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "C.FUL.ALL.999", "layer": "C", ...}'

# Verify real-time update in Algorhythm
curl https://algorhythm.dev.media/api/v1/recommendations/templates/1.018.003.002
```

### **Phase 3 Testing: Local Data Store**
```bash
# Test local data access
curl https://algorhythm.dev.media/api/v1/recommendations/templates/1.018.003.002

# Test fallback to NNA Registry
# (Simulate local data store empty)
curl https://algorhythm.dev.media/api/v1/recommendations/templates/1.999.999.999
```

### **Phase 4 Testing: API Compatibility**
```bash
# Test ReViz integration
curl https://algorhythm.dev.media/api/v1/recommendations/templates/1.018.003.002

# Verify response format matches ReViz expectations
```

---

## 📊 **ROLLBACK STRATEGY**

### **Rollback Plan**
1. **Keep export APIs** during transition period
2. **Monitor webhook processing** for errors
3. **Validate data consistency** between systems
4. **Have fallback mechanism** to export APIs if needed

### **Rollback Triggers**
- Webhook processing errors > 5%
- Data inconsistency between systems
- Performance degradation > 20%
- ReViz integration failures

### **Rollback Steps**
1. **Disable webhook processing** in Algorhythm service
2. **Revert to export APIs** in NNA Registry
3. **Update Algorhythm APIs** to use export endpoints
4. **Investigate and fix** issues
5. **Re-enable webhook processing** after fixes

---

## 📈 **SUCCESS METRICS**

### **Performance Metrics**
- **Response time**: < 200ms for template requests
- **Data freshness**: < 1 minute for new composites
- **Availability**: > 99.9% uptime
- **Error rate**: < 0.1% for webhook processing

### **Functional Metrics**
- **Data consistency**: 100% between NNA Registry and Algorhythm
- **Webhook processing**: > 99% success rate
- **Local data coverage**: > 95% of queries served from local store
- **Fallback usage**: < 5% of queries require NNA Registry fallback

### **Business Metrics**
- **ReViz integration**: No breaking changes
- **Developer experience**: Improved API performance
- **System reliability**: Reduced dependencies
- **Maintenance overhead**: Reduced manual sync requirements

---

## 📚 **DOCUMENTATION UPDATES**

### **Files to Update**
1. **`ARCHITECTURE_OPTIMIZATION_ANALYSIS.md`** - Architecture analysis
2. **`MIGRATION_PLAN.md`** - This migration plan
3. **`WEBHOOK_IMPLEMENTATION_GUIDE.md`** - Webhook setup guide
4. **`LOCAL_DATA_STORE_GUIDE.md`** - Local data implementation
5. **`PERFORMANCE_OPTIMIZATION_GUIDE.md`** - Performance tuning

### **Files to Create**
1. **`ALGORHYTHM_SERVICE_UPDATES.md`** - Changes needed in Algorhythm service
2. **`NNA_REGISTRY_CLEANUP.md`** - What to remove from NNA Registry
3. **`TESTING_STRATEGY.md`** - How to test the new architecture
4. **`DEPLOYMENT_STRATEGY.md`** - How to deploy the changes
5. **`ROLLBACK_PLAN.md`** - How to rollback if needed

---

## ✅ **MIGRATION CHECKLIST**

### **Phase 1: Webhook Infrastructure**
- [ ] Create webhook handler in Algorhythm service
- [ ] Implement webhook security and validation
- [ ] Update NNA Registry webhook configuration
- [ ] Test webhook processing with sample data
- [ ] Validate webhook signature verification

### **Phase 2: Real-time Index Updates**
- [ ] Create real-time index service
- [ ] Implement composite index updates
- [ ] Update daemon service for real-time processing
- [ ] Test real-time index updates
- [ ] Validate data consistency

### **Phase 3: Local Data Store**
- [ ] Create local data models
- [ ] Implement local data service
- [ ] Create data sync service
- [ ] Test local data access
- [ ] Validate fallback to NNA Registry

### **Phase 4: API Updates**
- [ ] Update recommendations controller
- [ ] Update other API endpoints
- [ ] Test API compatibility with ReViz
- [ ] Validate response formats
- [ ] Performance test API endpoints

### **Phase 5: Cleanup**
- [ ] Remove export APIs from NNA Registry
- [ ] Remove webhook notifications from NNA Registry
- [ ] Optimize Algorhythm service performance
- [ ] Update documentation
- [ ] Monitor system performance

---

## 🎯 **CONCLUSION**

### **Migration Benefits**
1. **Performance**: 50% faster responses, real-time updates
2. **Reliability**: Fault tolerance, autonomous operation
3. **Scalability**: Independent scaling, optimized indexes
4. **Maintainability**: Simpler architecture, better separation of concerns

### **Migration Timeline**
- **Total Duration**: 25-35 days
- **Phase 1**: 3-5 days (Webhook Infrastructure)
- **Phase 2**: 5-7 days (Real-time Index Updates)
- **Phase 3**: 7-10 days (Local Data Store)
- **Phase 4**: 3-5 days (API Updates)
- **Phase 5**: 5-7 days (Cleanup and Optimization)

### **Risk Mitigation**
- **Parallel implementation** during transition
- **Comprehensive testing** at each phase
- **Rollback strategy** if issues arise
- **Performance monitoring** throughout migration

**🎯 The migration will transform Algorhythm service into a fully dynamic, autonomous system that maintains its own indexes and operates independently of NNA Registry exports.**
