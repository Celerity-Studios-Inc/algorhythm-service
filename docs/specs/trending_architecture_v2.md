# 🔥 Trending Songs Feature - Complete Architecture

**Version**: 2.0 (NNA Registry Aligned)  
**Date**: October 6, 2025  
**Target**: Post Layer Testing Completion  
**Estimated Effort**: 2-3 weeks  

---

## ⚠️ CRITICAL ARCHITECTURE CLARIFICATION

**Trending is an NNA Registry Feature, NOT AlgoRhythm**

- **Trending Service**: Lives in NNA Registry backend (`nna-registry/`)
- **AlgoRhythm**: Separate recommendation microservice (`algorhythm/`) that MAY consume trending data later
- **Integration**: Trending provides data; AlgoRhythm can optionally use it for recommendations

This implementation follows **existing NNA Registry patterns**:
- NestJS patterns from `assets.service.ts`
- MongoDB schema conventions from `asset.schema.ts`  
- Logger, error handling, and DI patterns from your codebase
- MongoDBMonitor for performance tracking

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MongoDB Schema Updates](#mongodb-schema-updates)
3. [Data Flow](#data-flow)
4. [Service Layer](#service-layer)
5. [API Layer](#api-layer)
6. [Background Jobs](#background-jobs)
7. [Caching Strategy](#caching-strategy)
8. [Performance Considerations](#performance-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Future: AlgoRhythm Integration](#future-algorhythm-integration)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      NNA REGISTRY                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. EVENT TRACKING                                  │    │
│  │     User Action → AnalyticsService → MongoDB       │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  2. METRIC AGGREGATION (Every 10 min)              │    │
│  │     Raw Events → Compute Metrics → Update Assets   │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  3. TRENDING SCORE CALCULATION (Every 30 min)      │    │
│  │     Engagement + Recency + Velocity → Score        │    │
│  └────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  4. API RESPONSE (Cached)                          │    │
│  │     GET /assets/trending → Return Top Songs        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌─────────────────────────────────────┐
         │  FUTURE: AlgoRhythm (Optional)      │
         │  Consumes trending data for         │
         │  improved recommendations           │
         └─────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**
   - Event tracking separate from metric computation
   - Metric computation separate from trending calculation
   - Background jobs for heavy lifting

2. **Performance First**
   - Aggressive caching (Redis)
   - Precomputed scores
   - Indexed queries only

3. **Follow Existing Patterns**
   - Use `@Injectable()` services with Logger
   - Use MongoDB `@Prop()` decorators
   - Use `HttpException` for errors
   - Use existing AssetsService patterns

---

## MongoDB Schema Updates

### Current Asset Schema Analysis

```typescript
// From your existing asset.schema.ts:
// ✅ Has: version, tags, createdAt, layer, metadata
// ❌ Missing: engagement metrics, trending scores
```

### Add Engagement Tracking

```typescript
// File: src/models/asset.schema.ts
// ADD these subdocuments to existing Asset schema

@Schema({ _id: false })
export class EngagementMetrics {
  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  shareCount: number;

  @Prop({ default: 0 })
  remixCount: number;

  @Prop({ type: Date })
  lastUpdated: Date;
}

export const EngagementMetricsSchema = SchemaFactory.createForClass(EngagementMetrics);

@Schema({ _id: false })
export class TrendingScore {
  @Prop({ default: 0, min: 0, max: 100 })
  score: number;

  @Prop({ default: 0 })
  velocity: number; // Change rate over time

  @Prop({ type: Date })
  calculatedAt: Date;

  @Prop({ type: Date })
  expiresAt: Date; // Cache invalidation
}

export const TrendingScoreSchema = SchemaFactory.createForClass(TrendingScore);

// UPDATE existing Asset schema
@Schema({ timestamps: true })
export class Asset extends Document {
  // ... existing fields ...

  @Prop({ type: EngagementMetricsSchema, default: () => ({}) })
  engagementMetrics: EngagementMetrics;

  @Prop({ type: TrendingScoreSchema })
  trendingScore?: TrendingScore;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

// Add indexes for trending queries
AssetSchema.index({ 
  'trendingScore.score': -1, 
  'engagementMetrics.lastUpdated': -1 
});

AssetSchema.index({ 
  layer: 1, 
  'trendingScore.score': -1 
});
```

---

## Data Flow

### Event Tracking Flow

```typescript
// User performs action (view, like, share, remix)
//   ↓
// Frontend sends event to Analytics API
//   ↓
// AnalyticsService.trackEvent() saves raw event
//   ↓
// MongoDB stores event with timestamp
```

### Metric Computation Flow (Every 10 minutes)

```typescript
// Background Job: MetricsAggregationJob
//   ↓
// Query recent events (last 10 min)
//   ↓
// Group by assetId and count by eventType
//   ↓
// Update Asset.engagementMetrics
//   ↓
// Set engagementMetrics.lastUpdated = now
```

### Trending Score Flow (Every 30 minutes)

```typescript
// Background Job: TrendingScoreJob
//   ↓
// Query assets where layer = 'songs'
//   ↓
// For each asset: calculateTrendingScore()
//   - Base score from engagement metrics
//   - Recency boost (newer = higher)
//   - Velocity boost (fast growth = higher)
//   ↓
// Update Asset.trendingScore
//   ↓
// Cache top 50 results in Redis
```

### API Response Flow

```typescript
// Client: GET /api/assets/trending?layer=songs
//   ↓
// Check Redis cache for 'trending:songs'
//   ↓
// If cached: Return immediately (<10ms)
// If not: Query MongoDB (with index) + cache result
//   ↓
// Return top 50 trending songs
```

---

## Service Layer

### AnalyticsService (Event Tracking)

```typescript
// File: src/services/analytics.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../models/analytics-event.schema';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name) 
    private analyticsEventModel: Model<AnalyticsEvent>,
  ) {}

  async trackEvent(
    userId: string,
    assetId: string,
    eventType: 'view' | 'like' | 'share' | 'remix',
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.analyticsEventModel.create({
        userId,
        assetId,
        eventType,
        metadata,
        timestamp: new Date(),
      });

      this.logger.log(`Tracked ${eventType} event for asset ${assetId}`);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`, error.stack);
      // Don't throw - analytics failures shouldn't break user experience
    }
  }

  async getRecentEvents(
    minutes: number,
    eventTypes?: string[],
  ): Promise<AnalyticsEvent[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const query: any = { timestamp: { $gte: since } };
    if (eventTypes?.length) {
      query.eventType = { $in: eventTypes };
    }

    return this.analyticsEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .exec();
  }
}
```

### TrendingService (Score Calculation)

```typescript
// File: src/services/trending.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../models/asset.schema';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  // Scoring weights (configurable)
  private readonly WEIGHTS = {
    views: 1,
    likes: 5,
    shares: 10,
    remixes: 20,
  };

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private analyticsService: AnalyticsService,
    private configService: ConfigService,
  ) {}

  /**
   * Calculate trending score for a single asset
   * Score = (weighted engagement) * recency boost * velocity boost
   */
  calculateTrendingScore(asset: Asset): number {
    const metrics = asset.engagementMetrics;
    if (!metrics) return 0;

    // 1. Base engagement score (0-100)
    const engagementScore = Math.min(100,
      (metrics.viewCount * this.WEIGHTS.views) +
      (metrics.likeCount * this.WEIGHTS.likes) +
      (metrics.shareCount * this.WEIGHTS.shares) +
      (metrics.remixCount * this.WEIGHTS.remixes)
    ) / 100;

    // 2. Recency boost (newer assets get higher scores)
    const daysSinceCreated = 
      (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0.1, 1 - (daysSinceCreated / 30)); // Decay over 30 days

    // 3. Velocity boost (fast growth = higher score)
    const velocityBoost = asset.trendingScore?.velocity 
      ? 1 + (asset.trendingScore.velocity / 100)
      : 1;

    const finalScore = engagementScore * recencyBoost * velocityBoost;
    return Math.min(100, Math.max(0, finalScore));
  }

  /**
   * Update trending scores for all songs (background job)
   */
  async updateTrendingScores(): Promise<void> {
    this.logger.log('Starting trending score update...');

    try {
      // Get all song assets
      const songs = await this.assetModel
        .find({ layer: 'songs' })
        .select('_id engagementMetrics trendingScore createdAt')
        .exec();

      this.logger.log(`Found ${songs.length} songs to process`);

      // Process in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (song) => {
            const score = this.calculateTrendingScore(song);
            
            // Calculate velocity (change from last score)
            const previousScore = song.trendingScore?.score || 0;
            const velocity = score - previousScore;

            await this.assetModel.updateOne(
              { _id: song._id },
              {
                $set: {
                  'trendingScore.score': score,
                  'trendingScore.velocity': velocity,
                  'trendingScore.calculatedAt': new Date(),
                  'trendingScore.expiresAt': new Date(Date.now() + 30 * 60 * 1000), // 30 min
                },
              },
            );
          }),
        );

        this.logger.log(`Processed batch ${i / batchSize + 1}/${Math.ceil(songs.length / batchSize)}`);
      }

      this.logger.log('Trending score update complete');
    } catch (error) {
      this.logger.error(`Failed to update trending scores: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get trending assets (with caching)
   */
  async getTrendingAssets(
    layer: string = 'songs',
    limit: number = 50,
  ): Promise<Asset[]> {
    return this.assetModel
      .find({
        layer,
        'trendingScore.score': { $gt: 0 },
      })
      .sort({ 'trendingScore.score': -1 })
      .limit(limit)
      .exec();
  }
}
```

---

## API Layer

### TrendingController

```typescript
// File: src/controllers/trending.controller.ts

import { 
  Controller, 
  Get, 
  Query, 
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TrendingService } from '../services/trending.service';
import { CacheService } from '../services/cache.service';

@Controller('assets/trending')
@UseGuards(JwtAuthGuard)
export class TrendingController {
  private readonly logger = new Logger(TrendingController.name);

  constructor(
    private trendingService: TrendingService,
    private cacheService: CacheService,
  ) {}

  /**
   * GET /api/assets/trending?layer=songs&limit=50
   */
  @Get()
  async getTrending(
    @Query('layer') layer: string = 'songs',
    @Query('limit') limit: string = '50',
  ) {
    try {
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const cacheKey = `trending:${layer}:${parsedLimit}`;

      // Check cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return {
          data: cached,
          cached: true,
          timestamp: new Date(),
        };
      }

      // Cache miss - fetch from database
      this.logger.log(`Cache miss for ${cacheKey} - querying database`);
      const results = await this.trendingService.getTrendingAssets(
        layer,
        parsedLimit,
      );

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, results, 300);

      return {
        data: results,
        cached: false,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get trending assets: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to fetch trending assets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

---

## Background Jobs

### MetricsAggregationJob (Every 10 minutes)

```typescript
// File: src/jobs/metrics-aggregation.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from '../models/asset.schema';
import { AnalyticsService } from '../services/analytics.service';

@Injectable()
export class MetricsAggregationJob {
  private readonly logger = new Logger(MetricsAggregationJob.name);

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private analyticsService: AnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async aggregateMetrics() {
    this.logger.log('Starting metrics aggregation...');

    try {
      // Get events from last 10 minutes
      const events = await this.analyticsService.getRecentEvents(10);

      // Group by assetId and eventType
      const metricsByAsset = new Map<string, any>();

      for (const event of events) {
        if (!metricsByAsset.has(event.assetId)) {
          metricsByAsset.set(event.assetId, {
            views: 0,
            likes: 0,
            shares: 0,
            remixes: 0,
          });
        }

        const metrics = metricsByAsset.get(event.assetId);
        
        switch (event.eventType) {
          case 'view':
            metrics.views++;
            break;
          case 'like':
            metrics.likes++;
            break;
          case 'share':
            metrics.shares++;
            break;
          case 'remix':
            metrics.remixes++;
            break;
        }
      }

      // Update assets with aggregated metrics
      const updates = Array.from(metricsByAsset.entries()).map(
        ([assetId, metrics]) =>
          this.assetModel.updateOne(
            { _id: assetId },
            {
              $inc: {
                'engagementMetrics.viewCount': metrics.views,
                'engagementMetrics.likeCount': metrics.likes,
                'engagementMetrics.shareCount': metrics.shares,
                'engagementMetrics.remixCount': metrics.remixes,
              },
              $set: {
                'engagementMetrics.lastUpdated': new Date(),
              },
            },
          ),
      );

      await Promise.all(updates);

      this.logger.log(
        `Metrics aggregation complete: Updated ${updates.length} assets`,
      );
    } catch (error) {
      this.logger.error(
        `Metrics aggregation failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
```

### TrendingScoreJob (Every 30 minutes)

```typescript
// File: src/jobs/trending-score.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrendingService } from '../services/trending.service';
import { CacheService } from '../services/cache.service';

@Injectable()
export class TrendingScoreJob {
  private readonly logger = new Logger(TrendingScoreJob.name);

  constructor(
    private trendingService: TrendingService,
    private cacheService: CacheService,
  ) {}

  @Cron('*/30 * * * *') // Every 30 minutes
  async updateScores() {
    this.logger.log('Starting trending score update...');

    try {
      // Update all trending scores
      await this.trendingService.updateTrendingScores();

      // Invalidate cache
      await this.cacheService.del('trending:songs:*');

      this.logger.log('Trending score update complete');
    } catch (error) {
      this.logger.error(
        `Trending score update failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
```

---

## Caching Strategy

### Redis Implementation

```typescript
// File: src/services/cache.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis.Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get failed for ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      this.logger.error(`Cache set failed for ${key}: ${error.message}`);
    }
  }

  async del(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete failed for ${pattern}: ${error.message}`);
    }
  }
}
```

---

## Performance Considerations

### Database Indexes

```typescript
// Required indexes for optimal performance:

// 1. Trending queries
AssetSchema.index({ 
  'trendingScore.score': -1, 
  'engagementMetrics.lastUpdated': -1 
});

// 2. Layer-specific trending
AssetSchema.index({ 
  layer: 1, 
  'trendingScore.score': -1 
});

// 3. Analytics events (for aggregation)
AnalyticsEventSchema.index({ 
  timestamp: -1, 
  assetId: 1 
});
```

### Performance Targets

- **API Response Time**: <50ms (cached), <200ms (uncached)
- **Background Jobs**: Complete within 5 minutes
- **Cache Hit Rate**: >95%
- **Database Load**: <10% increase

---

## Testing Strategy

### Unit Tests

```typescript
// Example: trending.service.spec.ts

describe('TrendingService', () => {
  describe('calculateTrendingScore', () => {
    it('should calculate correct score for high engagement', () => {
      const asset = createMockAsset({
        engagementMetrics: {
          viewCount: 1000,
          likeCount: 100,
          shareCount: 50,
          remixCount: 10,
        },
        createdAt: new Date(),
      });

      const score = service.calculateTrendingScore(asset);
      expect(score).toBeGreaterThan(50);
    });

    it('should apply recency boost to new assets', () => {
      const newAsset = createMockAsset({
        createdAt: new Date(),
      });
      const oldAsset = createMockAsset({
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      expect(service.calculateTrendingScore(newAsset))
        .toBeGreaterThan(service.calculateTrendingScore(oldAsset));
    });
  });
});
```

### Integration Tests

```typescript
// Example: trending.controller.spec.ts

describe('TrendingController', () => {
  it('should return cached results when available', async () => {
    await cacheService.set('trending:songs:50', mockResults, 300);

    const response = await request(app.getHttpServer())
      .get('/assets/trending?layer=songs')
      .expect(200);

    expect(response.body.cached).toBe(true);
    expect(response.body.data).toEqual(mockResults);
  });
});
```

---

## Future: AlgoRhythm Integration

### When Ready to Integrate

AlgoRhythm (the separate recommendation service) can optionally consume trending data:

```typescript
// In AlgoRhythm service (future):

async getRecommendations(songId: string) {
  // 1. Get template recommendations (existing logic)
  const templates = await this.getTemplateRecommendations(songId);

  // 2. OPTIONAL: Boost trending songs
  const trendingSongs = await this.nnaRegistryClient.get(
    '/assets/trending?layer=songs&limit=50'
  );
  
  const trendingSongIds = new Set(trendingSongs.data.map(s => s._id));

  // 3. Apply trending boost to recommendations
  templates.forEach(template => {
    if (trendingSongIds.has(template.songId)) {
      template.score *= 1.2; // 20% boost for trending songs
    }
  });

  return templates;
}
```

**Key Points:**
- AlgoRhythm integration is OPTIONAL
- Trending works standalone in NNA Registry
- Integration happens via REST API calls
- No tight coupling between services

---

## Summary

### What Gets Built

1. ✅ **MongoDB Schema Updates** - Add engagement and trending fields to Asset
2. ✅ **AnalyticsService** - Track user events (views, likes, shares, remixes)
3. ✅ **TrendingService** - Calculate trending scores using weighted formula
4. ✅ **TrendingController** - REST API with caching
5. ✅ **Background Jobs** - Metric aggregation (10min) and score updates (30min)
6. ✅ **CacheService** - Redis caching for performance
7. ✅ **Tests** - Unit and integration tests

### What You Get

- **Trending songs API** ready for frontend consumption
- **Real-time engagement tracking** with 10-minute freshness
- **Performance optimized** with Redis caching
- **Scalable architecture** using background jobs
- **Optional AlgoRhythm integration** when ready

### Implementation Order

1. Week 1: Schema updates + AnalyticsService + basic tests
2. Week 2: TrendingService + background jobs + integration tests
3. Week 3: API endpoints + caching + documentation + deployment

---

**Ready to implement?** Start with schema updates and analytics tracking, then build up to trending calculations.