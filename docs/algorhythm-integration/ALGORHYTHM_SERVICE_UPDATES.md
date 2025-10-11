# Algorhythm Service Updates Required
**Date**: October 11, 2025  
**Status**: 📋 **IMPLEMENTATION PLAN**  
**Target**: Algorhythm Service (`/Users/ajaymadhok/algorhythm-service/`)

---

## 🎯 **OVERVIEW**

This document outlines the changes needed in the Algorhythm service to implement the optimized webhook-based architecture, moving from export-based integration to autonomous operation.

---

## 📊 **CURRENT ALGORHYTHM SERVICE ANALYSIS**

### **Existing Capabilities**
- ✅ **NNA Integration**: HTTP client to fetch data from NNA Registry
- ✅ **Cron Jobs**: Hourly/daily maintenance tasks
- ✅ **Index Building**: Recommendation index construction
- ✅ **Score Computation**: Compatibility and freshness scores
- ✅ **Caching**: Redis-based caching system
- ✅ **Analytics**: Performance monitoring

### **Current Limitations**
- ❌ **Polling-based**: Fetches data on-demand from NNA Registry
- ❌ **No real-time updates**: Stale data between requests
- ❌ **Single source of truth**: Depends on NNA Registry availability
- ❌ **Limited autonomy**: Cannot operate independently

---

## 🚀 **REQUIRED UPDATES**

### **1. Webhook Processing Infrastructure**

#### **1.1 Create Webhook Handler Module**
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

#### **1.2 Webhook Handler Controller**
```typescript
// webhook-handler.controller.ts
import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { WebhookHandlerService } from './webhook-handler.service';
import { WebhookSecurityService } from './webhook-security.service';
import { CompositeCreatedPayload } from './types/composite-created.payload';

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

  @Post('nna-composite-updated')
  async handleCompositeUpdated(
    @Body() payload: CompositeUpdatedPayload,
    @Headers('x-nna-signature') signature: string,
  ) {
    // Similar implementation for updates
  }

  @Post('nna-composite-deleted')
  async handleCompositeDeleted(
    @Body() payload: CompositeDeletedPayload,
    @Headers('x-nna-signature') signature: string,
  ) {
    // Similar implementation for deletions
  }
}
```

#### **1.3 Webhook Security Service**
```typescript
// webhook-security.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSecurityService {
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
```

### **2. Real-time Index Updates**

#### **2.1 Create Real-time Index Service**
```
/Users/ajaymadhok/algorhythm-service/src/modules/indexing/
├── real-time-index.service.ts
├── composite-index.service.ts
├── song-index.service.ts
├── recommendation-index.service.ts
└── index-update.service.ts
```

#### **2.2 Real-time Index Service**
```typescript
// real-time-index.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CompositeIndexService } from './composite-index.service';
import { SongIndexService } from './song-index.service';
import { RecommendationIndexService } from './recommendation-index.service';

@Injectable()
export class RealTimeIndexService {
  private readonly logger = new Logger(RealTimeIndexService.name);

  constructor(
    private readonly compositeIndexService: CompositeIndexService,
    private readonly songIndexService: SongIndexService,
    private readonly recommendationIndexService: RecommendationIndexService,
  ) {}

  async updateCompositeIndex(composite: CompositeAsset) {
    try {
      // Update composite in local index
      await this.compositeIndexService.updateComposite(composite);
      
      // Update song index if needed
      await this.songIndexService.updateSongComposites(composite.song_id);
      
      // Update recommendation index
      await this.recommendationIndexService.updateRecommendations(composite);
      
      this.logger.log(`Updated composite index for: ${composite.composite_id}`);
    } catch (error) {
      this.logger.error(`Failed to update composite index: ${error.message}`);
      throw error;
    }
  }

  async needsRebuild(): Promise<boolean> {
    // Check if index needs rebuilding based on update frequency
    // This can be optimized based on business logic
    return false; // For now, assume real-time updates are sufficient
  }
}
```

### **3. Local Data Store Implementation**

#### **3.1 Create Local Data Models**
```
/Users/ajaymadhok/algorhythm-service/src/models/
├── composite.schema.ts
├── song.schema.ts
├── asset.schema.ts
├── index-metadata.schema.ts
└── webhook-event.schema.ts
```

#### **3.2 Composite Schema**
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

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export type CompositeDocument = Composite & Document;
export const CompositeSchema = SchemaFactory.createForClass(Composite);
```

#### **3.3 Local Data Service**
```
/Users/ajaymadhok/algorhythm-service/src/modules/data/
├── local-data.service.ts
├── composite-repository.service.ts
├── song-repository.service.ts
├── data-sync.service.ts
└── data-consistency.service.ts
```

#### **3.4 Local Data Service Implementation**
```typescript
// local-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CompositeRepositoryService } from './composite-repository.service';
import { SongRepositoryService } from './song-repository.service';
import { DataSyncService } from './data-sync.service';

@Injectable()
export class LocalDataService {
  private readonly logger = new Logger(LocalDataService.name);

  constructor(
    private readonly compositeRepository: CompositeRepositoryService,
    private readonly songRepository: SongRepositoryService,
    private readonly dataSyncService: DataSyncService,
  ) {}

  async getCompositesBySong(songId: string): Promise<Composite[]> {
    try {
      // Query local database first
      const localComposites = await this.compositeRepository.findBySong(songId);
      
      if (localComposites.length > 0) {
        this.logger.debug(`Found ${localComposites.length} local composites for song: ${songId}`);
        return localComposites;
      }
      
      // Fallback to NNA Registry if needed
      this.logger.warn(`No local composites found for song: ${songId}, falling back to NNA Registry`);
      return await this.dataSyncService.syncCompositesFromNNA(songId);
    } catch (error) {
      this.logger.error(`Failed to get composites for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  async getCompositeById(compositeId: string): Promise<Composite | null> {
    try {
      // Query local database first
      const localComposite = await this.compositeRepository.findById(compositeId);
      
      if (localComposite) {
        this.logger.debug(`Found local composite: ${compositeId}`);
        return localComposite;
      }
      
      // Fallback to NNA Registry if needed
      this.logger.warn(`No local composite found: ${compositeId}, falling back to NNA Registry`);
      return await this.dataSyncService.syncCompositeFromNNA(compositeId);
    } catch (error) {
      this.logger.error(`Failed to get composite ${compositeId}: ${error.message}`);
      throw error;
    }
  }
}
```

### **4. Update Existing Services**

#### **4.1 Update Daemon Service**
```typescript
// daemon.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IndexBuilderService } from './index-builder.service';
import { ScoreComputationService } from './score-computation.service';
import { RealTimeIndexService } from '../indexing/real-time-index.service';

@Injectable()
export class DaemonService {
  private readonly logger = new Logger(DaemonService.name);

  constructor(
    private readonly indexBuilderService: IndexBuilderService,
    private readonly scoreComputationService: ScoreComputationService,
    private readonly realTimeIndexService: RealTimeIndexService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async buildRecommendationIndex() {
    this.logger.log('Starting hourly recommendation index build...');
    
    try {
      // Check if index needs rebuilding
      const needsRebuild = await this.realTimeIndexService.needsRebuild();
      
      if (needsRebuild) {
        // Step 1: Update compatibility scores
        await this.scoreComputationService.updateCompatibilityScores();
        
        // Step 2: Build recommendation index
        await this.indexBuilderService.buildRecommendationIndex();
        
        // Step 3: Warm up cache with popular recommendations
        await this.indexBuilderService.warmUpCache();
        
        this.logger.log('Recommendation index build completed successfully');
      } else {
        this.logger.log('Index is up to date, skipping rebuild');
      }
    } catch (error) {
      this.logger.error('Failed to build recommendation index:', error);
    }
  }

  // Keep existing cron jobs for maintenance
  @Cron('0 */6 * * *') // Every 6 hours
  async updateFreshnessScores() {
    this.logger.log('Updating freshness scores...');
    
    try {
      await this.scoreComputationService.updateFreshnessScores();
      this.logger.log('Freshness scores updated successfully');
    } catch (error) {
      this.logger.error('Failed to update freshness scores:', error);
    }
  }
}
```

#### **4.2 Update Recommendations Controller**
```typescript
// recommendations.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { LocalDataService } from '../data/local-data.service';
import { RecommendationService } from './recommendation.service';

@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(
    private readonly localDataService: LocalDataService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get('templates/:songId')
  async getTemplatesBySong(@Param('songId') songId: string) {
    try {
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
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get templates',
        song_id: songId
      };
    }
  }
}
```

### **5. Update App Module**

#### **5.1 Add New Modules to App Module**
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
// ... existing imports
import { WebhookHandlerModule } from './modules/webhooks/webhook-handler.module';
import { RealTimeIndexModule } from './modules/indexing/real-time-index.module';
import { LocalDataModule } from './modules/data/local-data.module';

@Module({
  imports: [
    // ... existing imports
    WebhookHandlerModule,
    RealTimeIndexModule,
    LocalDataModule,
    // ... other modules
  ],
  // ... rest of module configuration
})
export class AppModule {}
```

---

## 🔧 **ENVIRONMENT CONFIGURATION**

### **Environment Variables to Add**
```bash
# Webhook Configuration
NNA_WEBHOOK_SECRET=shared-secret-key-12345
NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev
NNA_REGISTRY_API_KEY=your-api-key

# Local Data Store Configuration
MONGODB_URI=mongodb://localhost:27017/algorhythm
REDIS_URL=redis://localhost:6379

# Performance Configuration
INDEX_UPDATE_BATCH_SIZE=100
CACHE_TTL_SECONDS=3600
FALLBACK_ENABLED=true
```

### **Database Configuration**
```typescript
// config/database.config.ts
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const DatabaseConfig = MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const mongoUri = configService.get<string>('MONGODB_URI');
    
    return {
      uri: mongoUri,
      retryWrites: true,
      w: 'majority',
    };
  },
  inject: [ConfigService],
});
```

---

## 🧪 **TESTING REQUIREMENTS**

### **Unit Tests**
```typescript
// webhook-handler.service.spec.ts
describe('WebhookHandlerService', () => {
  it('should handle composite created webhook', async () => {
    const payload = {
      event: 'composite.created',
      data: { composite_id: 'test_123', song_id: '1.018.003.002' }
    };
    
    await service.handleCompositeCreated(payload);
    
    expect(mockRealTimeIndexService.updateCompositeIndex).toHaveBeenCalled();
  });
});
```

### **Integration Tests**
```typescript
// webhook-handler.integration.spec.ts
describe('Webhook Handler Integration', () => {
  it('should process webhook and update local data', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/nna-composite-created')
      .send(webhookPayload)
      .expect(200);
    
    // Verify local data was updated
    const composites = await localDataService.getCompositesBySong('1.018.003.002');
    expect(composites.length).toBeGreaterThan(0);
  });
});
```

---

## 📊 **PERFORMANCE OPTIMIZATIONS**

### **Database Indexes**
```typescript
// performance-optimization.service.ts
@Injectable()
export class PerformanceOptimizationService {
  async optimizeIndexes() {
    // Create database indexes for common queries
    await this.compositeModel.createIndex({ song_id: 1 });
    await this.compositeModel.createIndex({ composite_id: 1 });
    await this.compositeModel.createIndex({ createdAt: -1 });
    await this.compositeModel.createIndex({ lastUpdated: -1 });
    
    // Optimize cache settings
    await this.cacheService.optimizeCache();
  }
}
```

### **Caching Strategy**
```typescript
// caching.service.ts
@Injectable()
export class CachingService {
  async getCompositesBySong(songId: string): Promise<Composite[]> {
    const cacheKey = `composites:song:${songId}`;
    
    // Try cache first
    let composites = await this.cacheService.get(cacheKey);
    
    if (!composites) {
      // Fetch from database
      composites = await this.compositeRepository.findBySong(songId);
      
      // Cache for 1 hour
      await this.cacheService.set(cacheKey, composites, 3600);
    }
    
    return composites;
  }
}
```

---

## 📚 **DOCUMENTATION UPDATES**

### **Files to Create in Algorhythm Service**
1. **`docs/webhook-integration.md`** - Webhook setup guide
2. **`docs/local-data-store.md`** - Local data implementation
3. **`docs/performance-optimization.md`** - Performance tuning
4. **`docs/testing-guide.md`** - Testing strategy
5. **`docs/deployment-guide.md`** - Deployment instructions

### **Files to Update**
1. **`README.md`** - Update with new architecture
2. **`package.json`** - Add new dependencies
3. **`docker-compose.yml`** - Update for new services
4. **`Dockerfile`** - Update for new requirements

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Webhook Infrastructure**
- [ ] Create webhook handler module
- [ ] Implement webhook security service
- [ ] Add webhook endpoints to app module
- [ ] Test webhook processing
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
- [ ] Test API compatibility
- [ ] Validate response formats
- [ ] Performance test API endpoints

### **Phase 5: Optimization**
- [ ] Implement performance optimizations
- [ ] Add database indexes
- [ ] Optimize caching strategy
- [ ] Monitor system performance
- [ ] Update documentation

---

## 🎯 **CONCLUSION**

### **Key Changes Required**
1. **Webhook Processing**: Handle real-time updates from NNA Registry
2. **Local Data Store**: Maintain autonomous data store
3. **Real-time Indexes**: Update indexes in real-time
4. **API Updates**: Use local data instead of NNA Registry
5. **Performance Optimization**: Optimize for local data access

### **Benefits of Updates**
- **Autonomous Operation**: Algorhythm service operates independently
- **Real-time Updates**: No stale data, immediate updates
- **Better Performance**: Local data access, optimized indexes
- **Fault Tolerance**: Works even if NNA Registry is down
- **Scalability**: Independent scaling, optimized for use cases

### **Implementation Timeline**
- **Total Duration**: 25-35 days
- **Phase 1**: 3-5 days (Webhook Infrastructure)
- **Phase 2**: 5-7 days (Real-time Index Updates)
- **Phase 3**: 7-10 days (Local Data Store)
- **Phase 4**: 3-5 days (API Updates)
- **Phase 5**: 5-7 days (Optimization)

**🎯 These updates will transform the Algorhythm service into a fully dynamic, autonomous system that maintains its own indexes and operates independently of NNA Registry exports.**
