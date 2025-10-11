# 🚀 **PHASE 2: REAL-TIME INDEX UPDATES IMPLEMENTATION**

## 🎯 **PHASE OVERVIEW**

**Duration**: 5-7 days  
**Goal**: Automatically update Algorhythm indexes when assets change  
**Priority**: High - Core functionality for autonomous operation

## 📋 **IMPLEMENTATION TASKS**

### **Task 2.1: Event Queue System (Day 1-2)**

#### **2.1.1 Create Event Queue Service**
```typescript
// src/modules/events/event-queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventQueueService {
  private readonly logger = new Logger(EventQueueService.name);

  constructor(
    @InjectQueue('asset-events') private assetEventQueue: Queue,
    @InjectQueue('composite-events') private compositeEventQueue: Queue,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for asset events
    this.eventEmitter.on('asset.created', async (event) => {
      await this.queueAssetEvent('asset.created', event);
    });

    this.eventEmitter.on('asset.updated', async (event) => {
      await this.queueAssetEvent('asset.updated', event);
    });

    this.eventEmitter.on('composite.created', async (event) => {
      await this.queueCompositeEvent('composite.created', event);
    });
  }

  async queueAssetEvent(eventType: string, eventData: any): Promise<void> {
    try {
      await this.assetEventQueue.add(eventType, eventData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log(`✅ Queued asset event: ${eventType} for ${eventData.assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue asset event: ${error.message}`);
      throw error;
    }
  }

  async queueCompositeEvent(eventType: string, eventData: any): Promise<void> {
    try {
      await this.compositeEventQueue.add(eventType, eventData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      this.logger.log(`✅ Queued composite event: ${eventType} for ${eventData.compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue composite event: ${error.message}`);
      throw error;
    }
  }
}
```

#### **2.1.2 Create Event Processors**
```typescript
// src/modules/events/processors/asset-event.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { IndexService } from '../../indexing/index.service';
import { CacheService } from '../../cache/cache.service';

@Processor('asset-events')
export class AssetEventProcessor {
  private readonly logger = new Logger(AssetEventProcessor.name);

  constructor(
    private readonly indexService: IndexService,
    private readonly cacheService: CacheService
  ) {}

  @Process('asset.created')
  async handleAssetCreated(job: Job) {
    const { assetId, asset, timestamp } = job.data;
    
    try {
      this.logger.log(`🔄 Processing asset created: ${assetId}`);

      // Update search index
      await this.indexService.addAssetToIndex(asset);

      // Update cache
      await this.cacheService.setAsset(assetId, asset);

      // Update metadata index
      await this.indexService.updateMetadataIndex(asset);

      this.logger.log(`✅ Asset created processed: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset created: ${error.message}`);
      throw error;
    }
  }

  @Process('asset.updated')
  async handleAssetUpdated(job: Job) {
    const { assetId, asset, timestamp } = job.data;
    
    try {
      this.logger.log(`🔄 Processing asset updated: ${assetId}`);

      // Update search index
      await this.indexService.updateAssetInIndex(asset);

      // Update cache
      await this.cacheService.setAsset(assetId, asset);

      // Update metadata index
      await this.indexService.updateMetadataIndex(asset);

      this.logger.log(`✅ Asset updated processed: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process asset updated: ${error.message}`);
      throw error;
    }
  }
}
```

```typescript
// src/modules/events/processors/composite-event.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { IndexService } from '../../indexing/index.service';
import { CacheService } from '../../cache/cache.service';

@Processor('composite-events')
export class CompositeEventProcessor {
  private readonly logger = new Logger(CompositeEventProcessor.name);

  constructor(
    private readonly indexService: IndexService,
    private readonly cacheService: CacheService
  ) {}

  @Process('composite.created')
  async handleCompositeCreated(job: Job) {
    const { compositeId, composite, components, timestamp } = job.data;
    
    try {
      this.logger.log(`🔄 Processing composite created: ${compositeId}`);

      // Update composite index
      await this.indexService.addCompositeToIndex(composite);

      // Update component relationships
      await this.indexService.updateComponentRelationships(composite, components);

      // Update cache
      await this.cacheService.setComposite(compositeId, composite);

      // Update template recommendations
      await this.indexService.updateTemplateIndex(composite);

      this.logger.log(`✅ Composite created processed: ${compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process composite created: ${error.message}`);
      throw error;
    }
  }
}
```

### **Task 2.2: Index Management System (Day 2-4)**

#### **2.2.1 Create Index Service**
```typescript
// src/modules/indexing/index.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IndexService {
  private readonly logger = new Logger(IndexService.name);
  private readonly assetIndex = 'algorhythm-assets';
  private readonly compositeIndex = 'algorhythm-composites';
  private readonly metadataIndex = 'algorhythm-metadata';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService
  ) {}

  async addAssetToIndex(asset: any): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: this.assetIndex,
        id: asset._id || asset.id,
        body: {
          ...asset,
          indexedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`✅ Asset added to index: ${asset._id || asset.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to add asset to index: ${error.message}`);
      throw error;
    }
  }

  async updateAssetInIndex(asset: any): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: this.assetIndex,
        id: asset._id || asset.id,
        body: {
          doc: {
            ...asset,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`✅ Asset updated in index: ${asset._id || asset.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update asset in index: ${error.message}`);
      throw error;
    }
  }

  async addCompositeToIndex(composite: any): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: this.compositeIndex,
        id: composite._id || composite.id,
        body: {
          ...composite,
          indexedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`✅ Composite added to index: ${composite._id || composite.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to add composite to index: ${error.message}`);
      throw error;
    }
  }

  async updateComponentRelationships(composite: any, components: any[]): Promise<void> {
    try {
      // Update component relationships in index
      for (const component of components) {
        await this.elasticsearchService.update({
          index: this.assetIndex,
          id: component._id || component.id,
          body: {
            script: {
              source: `
                if (ctx._source.composites == null) {
                  ctx._source.composites = [];
                }
                if (!ctx._source.composites.contains(params.compositeId)) {
                  ctx._source.composites.add(params.compositeId);
                }
              `,
              params: {
                compositeId: composite._id || composite.id,
              },
            },
          },
        });
      }

      this.logger.log(`✅ Component relationships updated for composite: ${composite._id || composite.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update component relationships: ${error.message}`);
      throw error;
    }
  }

  async updateMetadataIndex(asset: any): Promise<void> {
    try {
      // Extract metadata for indexing
      const metadata = this.extractMetadata(asset);

      await this.elasticsearchService.index({
        index: this.metadataIndex,
        id: `${asset._id || asset.id}-metadata`,
        body: {
          assetId: asset._id || asset.id,
          ...metadata,
          indexedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`✅ Metadata indexed for asset: ${asset._id || asset.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to index metadata: ${error.message}`);
      throw error;
    }
  }

  async updateTemplateIndex(composite: any): Promise<void> {
    try {
      // Update template recommendations based on composite
      const templates = await this.generateTemplateRecommendations(composite);

      for (const template of templates) {
        await this.elasticsearchService.index({
          index: 'algorhythm-templates',
          id: template.id,
          body: {
            ...template,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      this.logger.log(`✅ Template index updated for composite: ${composite._id || composite.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to update template index: ${error.message}`);
      throw error;
    }
  }

  private extractMetadata(asset: any): any {
    return {
      layer: asset.layer,
      category: asset.category,
      subcategory: asset.subcategory,
      tags: asset.tags || [],
      metadata: asset.aiMetadata || {},
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  private async generateTemplateRecommendations(composite: any): Promise<any[]> {
    // Generate template recommendations based on composite
    // This would include logic for creating template suggestions
    return [];
  }
}
```

#### **2.2.2 Create Index Configuration**
```typescript
// src/modules/indexing/index-config.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class IndexConfigService {
  private readonly logger = new Logger(IndexConfigService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async createIndexes(): Promise<void> {
    try {
      // Create asset index
      await this.createAssetIndex();
      
      // Create composite index
      await this.createCompositeIndex();
      
      // Create metadata index
      await this.createMetadataIndex();
      
      // Create template index
      await this.createTemplateIndex();

      this.logger.log('✅ All indexes created successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to create indexes: ${error.message}`);
      throw error;
    }
  }

  private async createAssetIndex(): Promise<void> {
    const indexName = 'algorhythm-assets';
    
    const exists = await this.elasticsearchService.indices.exists({
      index: indexName,
    });

    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              name: { type: 'keyword' },
              layer: { type: 'keyword' },
              category: { type: 'keyword' },
              subcategory: { type: 'keyword' },
              tags: { type: 'keyword' },
              description: { type: 'text' },
              gcpStorageUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              indexedAt: { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });

      this.logger.log(`✅ Created asset index: ${indexName}`);
    }
  }

  private async createCompositeIndex(): Promise<void> {
    const indexName = 'algorhythm-composites';
    
    const exists = await this.elasticsearchService.indices.exists({
      index: indexName,
    });

    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              name: { type: 'keyword' },
              compositeType: { type: 'keyword' },
              components: { type: 'keyword' },
              layers: { type: 'keyword' },
              tags: { type: 'keyword' },
              description: { type: 'text' },
              gcpStorageUrl: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              indexedAt: { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });

      this.logger.log(`✅ Created composite index: ${indexName}`);
    }
  }

  private async createMetadataIndex(): Promise<void> {
    const indexName = 'algorhythm-metadata';
    
    const exists = await this.elasticsearchService.indices.exists({
      index: indexName,
    });

    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              assetId: { type: 'keyword' },
              layer: { type: 'keyword' },
              category: { type: 'keyword' },
              subcategory: { type: 'keyword' },
              tags: { type: 'keyword' },
              metadata: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              indexedAt: { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });

      this.logger.log(`✅ Created metadata index: ${indexName}`);
    }
  }

  private async createTemplateIndex(): Promise<void> {
    const indexName = 'algorhythm-templates';
    
    const exists = await this.elasticsearchService.indices.exists({
      index: indexName,
    });

    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              templateId: { type: 'keyword' },
              songId: { type: 'keyword' },
              name: { type: 'keyword' },
              description: { type: 'text' },
              tags: { type: 'keyword' },
              metadata: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });

      this.logger.log(`✅ Created template index: ${indexName}`);
    }
  }
}
```

### **Task 2.3: Cache Management (Day 4-5)**

#### **2.3.1 Create Cache Service**
```typescript
// src/modules/cache/cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly assetPrefix = 'asset:';
  private readonly compositePrefix = 'composite:';
  private readonly metadataPrefix = 'metadata:';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async setAsset(assetId: string, asset: any, ttl: number = 3600): Promise<void> {
    try {
      const key = `${this.assetPrefix}${assetId}`;
      await this.redis.setex(key, ttl, JSON.stringify(asset));
      this.logger.log(`✅ Asset cached: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cache asset: ${error.message}`);
      throw error;
    }
  }

  async getAsset(assetId: string): Promise<any | null> {
    try {
      const key = `${this.assetPrefix}${assetId}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`❌ Failed to get cached asset: ${error.message}`);
      return null;
    }
  }

  async setComposite(compositeId: string, composite: any, ttl: number = 3600): Promise<void> {
    try {
      const key = `${this.compositePrefix}${compositeId}`;
      await this.redis.setex(key, ttl, JSON.stringify(composite));
      this.logger.log(`✅ Composite cached: ${compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to cache composite: ${error.message}`);
      throw error;
    }
  }

  async getComposite(compositeId: string): Promise<any | null> {
    try {
      const key = `${this.compositePrefix}${compositeId}`;
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`❌ Failed to get cached composite: ${error.message}`);
      return null;
    }
  }

  async invalidateAsset(assetId: string): Promise<void> {
    try {
      const key = `${this.assetPrefix}${assetId}`;
      await this.redis.del(key);
      this.logger.log(`✅ Asset cache invalidated: ${assetId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to invalidate asset cache: ${error.message}`);
      throw error;
    }
  }

  async invalidateComposite(compositeId: string): Promise<void> {
    try {
      const key = `${this.compositePrefix}${compositeId}`;
      await this.redis.del(key);
      this.logger.log(`✅ Composite cache invalidated: ${compositeId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to invalidate composite cache: ${error.message}`);
      throw error;
    }
  }
}
```

### **Task 2.4: Module Configuration (Day 5-7)**

#### **2.4.1 Create Event Module**
```typescript
// src/modules/events/event.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventQueueService } from './event-queue.service';
import { AssetEventProcessor } from './processors/asset-event.processor';
import { CompositeEventProcessor } from './processors/composite-event.processor';
import { IndexModule } from '../indexing/index.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    BullModule.registerQueue(
      { name: 'asset-events' },
      { name: 'composite-events' }
    ),
    IndexModule,
    CacheModule,
  ],
  providers: [
    EventQueueService,
    AssetEventProcessor,
    CompositeEventProcessor,
  ],
  exports: [EventQueueService],
})
export class EventModule {}
```

#### **2.4.2 Create Index Module**
```typescript
// src/modules/indexing/index.module.ts
import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IndexService } from './index.service';
import { IndexConfigService } from './index-config.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE'),
        auth: {
          username: configService.get<string>('ELASTICSEARCH_USERNAME'),
          password: configService.get<string>('ELASTICSEARCH_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [IndexService, IndexConfigService],
  exports: [IndexService, IndexConfigService],
})
export class IndexModule {}
```

## 🧪 **TESTING IMPLEMENTATION**

### **Test Event Processing**
```typescript
// test/event-processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AssetEventProcessor } from '../src/modules/events/processors/asset-event.processor';
import { IndexService } from '../src/modules/indexing/index.service';
import { CacheService } from '../src/modules/cache/cache.service';

describe('AssetEventProcessor', () => {
  let processor: AssetEventProcessor;
  let indexService: IndexService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetEventProcessor,
        {
          provide: IndexService,
          useValue: {
            addAssetToIndex: jest.fn(),
            updateAssetInIndex: jest.fn(),
            updateMetadataIndex: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            setAsset: jest.fn(),
            getAsset: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<AssetEventProcessor>(AssetEventProcessor);
    indexService = module.get<IndexService>(IndexService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should process asset created event', async () => {
    const job = {
      data: {
        assetId: 'test-asset-id',
        asset: { name: 'Test Asset' },
        timestamp: new Date().toISOString(),
      },
    } as any;

    await processor.handleAssetCreated(job);

    expect(indexService.addAssetToIndex).toHaveBeenCalledWith(job.data.asset);
    expect(cacheService.setAsset).toHaveBeenCalledWith(job.data.assetId, job.data.asset);
  });
});
```

## 📊 **SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ Event queue processes asset events
- ✅ Index updates happen in real-time
- ✅ Cache management works correctly
- ✅ Error handling and retry mechanisms

### **Performance Requirements**
- ✅ Event processing time < 5 seconds
- ✅ Index update time < 2 seconds
- ✅ Cache hit rate > 95%
- ✅ Queue processing rate > 100 events/minute

### **Reliability Requirements**
- ✅ Event deduplication works
- ✅ Retry mechanisms handle failures
- ✅ Error logging and monitoring
- ✅ Graceful degradation on failures

## 🚀 **NEXT STEPS**

1. **Implement event queue system** (Day 1-2)
2. **Create index management** (Day 2-4)
3. **Build cache management** (Day 4-5)
4. **Configure modules** (Day 5-7)
5. **Test and validate** (Day 7)

**🎯 Phase 2 completion will provide real-time index updates and autonomous asset monitoring for the Algorhythm service.**
