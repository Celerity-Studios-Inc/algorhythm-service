// ====================================================================
// TRENDING FEATURE - IMPLEMENTATION SPECIFICATIONS
// Version 2.0 - NNA Registry Aligned
// ====================================================================

// This file provides complete, production-ready code for implementing
// the trending feature following existing NNA Registry patterns.

// ====================================================================
// 1. MONGODB SCHEMA UPDATES
// ====================================================================

// File: src/models/analytics-event.schema.ts
// NEW FILE - Event tracking for analytics

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AnalyticsEvent extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  assetId: string;

  @Prop({ 
    required: true, 
    enum: ['view', 'like', 'share', 'remix'],
    index: true 
  })
  eventType: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Compound index for efficient aggregation queries
AnalyticsEventSchema.index({ timestamp: -1, assetId: 1, eventType: 1 });

// ====================================================================

// File: src/models/asset.schema.ts
// UPDATE EXISTING FILE - Add engagement metrics and trending score

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ADD these new subdocument schemas

@Schema({ _id: false })
export class EngagementMetrics {
  @Prop({ default: 0, min: 0 })
  viewCount: number;

  @Prop({ default: 0, min: 0 })
  likeCount: number;

  @Prop({ default: 0, min: 0 })
  shareCount: number;

  @Prop({ default: 0, min: 0 })
  remixCount: number;

  @Prop({ type: Date })
  lastUpdated?: Date;
}

export const EngagementMetricsSchema = SchemaFactory.createForClass(EngagementMetrics);

@Schema({ _id: false })
export class TrendingScore {
  @Prop({ default: 0, min: 0, max: 100 })
  score: number;

  @Prop({ default: 0 })
  velocity: number; // Rate of change (can be negative)

  @Prop({ type: Date })
  calculatedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const TrendingScoreSchema = SchemaFactory.createForClass(TrendingScore);

// UPDATE existing Asset schema by ADDING these two fields:

@Schema({ timestamps: true })
export class Asset extends Document {
  // ... all your existing Asset fields ...

  @Prop({ type: EngagementMetricsSchema, default: () => ({}) })
  engagementMetrics: EngagementMetrics;

  @Prop({ type: TrendingScoreSchema })
  trendingScore?: TrendingScore;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

// ADD these indexes to AssetSchema (after SchemaFactory.createForClass)

// For trending queries - CRITICAL for performance
AssetSchema.index({ 
  layer: 1, 
  'trendingScore.score': -1 
});

// For finding assets needing score updates
AssetSchema.index({ 
  'trendingScore.expiresAt': 1 
});

// For engagement-based queries
AssetSchema.index({ 
  'engagementMetrics.lastUpdated': -1 
});

// ====================================================================
// 2. ANALYTICS SERVICE - Event Tracking
// ====================================================================

// File: src/services/analytics.service.ts
// NEW FILE - Handles event tracking

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../models/analytics-event.schema';

export interface TrackEventDto {
  userId: string;
  assetId: string;
  eventType: 'view' | 'like' | 'share' | 'remix';
  metadata?: Record<string, any>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name) 
    private analyticsEventModel: Model<AnalyticsEvent>,
  ) {}

  /**
   * Track a user interaction event
   * Fire-and-forget pattern - doesn't block user experience
   */
  async trackEvent(dto: TrackEventDto): Promise<void> {
    try {
      await this.analyticsEventModel.create({
        userId: dto.userId,
        assetId: dto.assetId,
        eventType: dto.eventType,
        metadata: dto.metadata || {},
        timestamp: new Date(),
      });

      this.logger.debug(
        `Tracked ${dto.eventType} event: user=${dto.userId}, asset=${dto.assetId}`
      );
    } catch (error) {
      // Log error but don't throw - analytics failures shouldn't break UX
      this.logger.error(
        `Failed to track event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Bulk track multiple events (for batch processing)
   */
  async trackEventsBatch(events: TrackEventDto[]): Promise<void> {
    try {
      await this.analyticsEventModel.insertMany(
        events.map(e => ({
          ...e,
          metadata: e.metadata || {},
          timestamp: new Date(),
        })),
        { ordered: false }, // Continue even if some fail
      );

      this.logger.log(`Batch tracked ${events.length} events`);
    } catch (error) {
      this.logger.error(
        `Failed to batch track events: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get events from the last N minutes
   * Used by aggregation job
   */
  async getRecentEvents(
    minutes: number,
    filters?: {
      eventTypes?: string[];
      assetIds?: string[];
    },
  ): Promise<AnalyticsEvent[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const query: any = { timestamp: { $gte: since } };
    
    if (filters?.eventTypes?.length) {
      query.eventType = { $in: filters.eventTypes };
    }
    
    if (filters?.assetIds?.length) {
      query.assetId = { $in: filters.assetIds };
    }

    return this.analyticsEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Get aggregated metrics for specific assets
   * Useful for real-time queries
   */
  async getAssetMetrics(
    assetIds: string[],
    since?: Date,
  ): Promise<Map<string, Record<string, number>>> {
    const query: any = { assetId: { $in: assetIds } };
    if (since) {
      query.timestamp = { $gte: since };
    }

    const events = await this.analyticsEventModel.find(query).exec();

    const metrics = new Map<string, Record<string, number>>();
    
    for (const event of events) {
      if (!metrics.has(event.assetId)) {
        metrics.set(event.assetId, {
          views: 0,
          likes: 0,
          shares: 0,
          remixes: 0,
        });
      }
      
      const assetMetrics = metrics.get(event.assetId)!;
      assetMetrics[`${event.eventType}s`] = 
        (assetMetrics[`${event.eventType}s`] || 0) + 1;
    }

    return metrics;
  }
}

// ====================================================================
// 3. TRENDING SERVICE - Score Calculation
// ====================================================================

// File: src/services/trending.service.ts
// NEW FILE - Core trending logic

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../models/asset.schema';
import { MongoDBMonitor } from '../monitors/mongodb.monitor'; // Your existing monitor

export interface TrendingConfig {
  weights: {
    views: number;
    likes: number;
    shares: number;
    remixes: number;
  };
  recencyDecayDays: number;
  minEngagementThreshold: number;
}

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);
  private readonly config: TrendingConfig;

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private configService: ConfigService,
    private mongoMonitor: MongoDBMonitor, // Use existing monitor
  ) {
    // Load configuration (with sensible defaults)
    this.config = {
      weights: {
        views: this.configService.get('TRENDING_WEIGHT_VIEWS', 1),
        likes: this.configService.get('TRENDING_WEIGHT_LIKES', 5),
        shares: this.configService.get('TRENDING_WEIGHT_SHARES', 10),
        remixes: this.configService.get('TRENDING_WEIGHT_REMIXES', 20),
      },
      recencyDecayDays: this.configService.get('TRENDING_RECENCY_DECAY_DAYS', 30),
      minEngagementThreshold: this.configService.get('TRENDING_MIN_ENGAGEMENT', 10),
    };
  }

  /**
   * Calculate trending score for a single asset
   * Returns value between 0-100
   */
  calculateTrendingScore(asset: Asset): number {
    try {
      const metrics = asset.engagementMetrics;
      if (!metrics) return 0;

      // 1. Calculate weighted engagement score
      const totalEngagement = 
        (metrics.viewCount * this.config.weights.views) +
        (metrics.likeCount * this.config.weights.likes) +
        (metrics.shareCount * this.config.weights.shares) +
        (metrics.remixCount * this.config.weights.remixes);

      // Normalize to 0-100 scale (logarithmic to prevent overflow)
      const engagementScore = Math.min(100, 
        Math.log10(totalEngagement + 1) * 10
      );

      // 2. Apply recency boost (newer = higher)
      const daysSinceCreated = 
        (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(
        0.1, 
        1 - (daysSinceCreated / this.config.recencyDecayDays)
      );

      // 3. Apply velocity boost (fast growth = higher)
      const velocityBoost = asset.trendingScore?.velocity 
        ? 1 + Math.min(0.5, asset.trendingScore.velocity / 100)
        : 1;

      // 4. Calculate final score
      let finalScore = engagementScore * recencyBoost * velocityBoost;

      // 5. Apply minimum threshold
      if (totalEngagement < this.config.minEngagementThreshold) {
        finalScore *= 0.5; // Penalize low engagement
      }

      return Math.min(100, Math.max(0, finalScore));
    } catch (error) {
      this.logger.error(
        `Error calculating score for asset ${asset._id}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Update trending scores for all assets in a layer
   * Called by background job
   */
  async updateTrendingScores(layer: string = 'songs'): Promise<number> {
    this.logger.log(`Starting trending score update for layer: ${layer}`);
    const startTime = Date.now();

    try {
      // Monitor query performance
      const queryStart = Date.now();
      
      const assets = await this.assetModel
        .find({ layer })
        .select('_id engagementMetrics trendingScore createdAt')
        .lean()
        .exec();

      const queryTime = Date.now() - queryStart;
      this.mongoMonitor.recordQueryTime('asset.find', queryTime);
      
      this.logger.log(`Found ${assets.length} ${layer} assets (${queryTime}ms)`);

      if (assets.length === 0) {
        return 0;
      }

      // Process in batches to avoid memory issues
      const BATCH_SIZE = 100;
      let updatedCount = 0;

      for (let i = 0; i < assets.length; i += BATCH_SIZE) {
        const batch = assets.slice(i, i + BATCH_SIZE);
        
        const updateOps = batch.map(asset => {
          const score = this.calculateTrendingScore(asset as any);
          const previousScore = asset.trendingScore?.score || 0;
          const velocity = score - previousScore;

          return {
            updateOne: {
              filter: { _id: asset._id },
              update: {
                $set: {
                  'trendingScore.score': score,
                  'trendingScore.velocity': velocity,
                  'trendingScore.calculatedAt': new Date(),
                  'trendingScore.expiresAt': new Date(
                    Date.now() + 30 * 60 * 1000
                  ), // 30 min cache
                },
              },
            },
          };
        });

        const updateResult = await this.assetModel.bulkWrite(updateOps);
        updatedCount += updateResult.modifiedCount;

        this.logger.debug(
          `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(assets.length / BATCH_SIZE)}`
        );
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `Trending score update complete: ${updatedCount}/${assets.length} assets updated in ${totalTime}ms`
      );

      return updatedCount;
    } catch (error) {
      this.logger.error(
        `Failed to update trending scores: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to update trending scores',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trending assets (with optional caching)
   * Returns sorted list of assets by trending score
   */
  async getTrendingAssets(
    layer: string = 'songs',
    limit: number = 50,
  ): Promise<Asset[]> {
    try {
      const queryStart = Date.now();

      const assets = await this.assetModel
        .find({
          layer,
          'trendingScore.score': { $gt: 0 },
        })
        .sort({ 'trendingScore.score': -1 })
        .limit(limit)
        .exec();

      const queryTime = Date.now() - queryStart;
      this.mongoMonitor.recordQueryTime('trending.getTrendingAssets', queryTime);

      this.logger.debug(
        `Retrieved ${assets.length} trending ${layer} (${queryTime}ms)`
      );

      return assets;
    } catch (error) {
      this.logger.error(
        `Failed to get trending assets: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to fetch trending assets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trending score for a specific asset
   */
  async getAssetTrendingScore(assetId: string): Promise<number> {
    const asset = await this.assetModel
      .findById(assetId)
      .select('trendingScore')
      .exec();

    return asset?.trendingScore?.score || 0;
  }
}

// ====================================================================
// 4. CACHE SERVICE - Redis Integration
// ====================================================================

// File: src/services/cache.service.ts
// NEW FILE - Redis caching

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTTL: number = 300; // 5 minutes

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`, error.stack);
    });
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(
        `Cache get failed for key "${key}": ${error.message}`,
        error.stack,
      );
      return null; // Fail gracefully
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(
    key: string,
    value: any,
    ttlSeconds: number = this.defaultTTL,
  ): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );

      this.logger.debug(`Cached key "${key}" with TTL ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(
        `Cache set failed for key "${key}": ${error.message}`,
        error.stack,
      );
      // Don't throw - caching failures shouldn't break functionality
    }
  }

  /**
   * Delete cached value(s) by pattern
   */
  async del(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redis.del(...keys);
      this.logger.debug(`Deleted ${deletedCount} keys matching "${pattern}"`);
      
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Cache delete failed for pattern "${pattern}": ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Cache exists check failed for key "${key}": ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ keys: number; memory: string }> {
    try {
      const keys = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return { keys, memory };
    } catch (error) {
      this.logger.error(`Failed to get cache stats: ${error.message}`);
      return { keys: 0, memory: 'unknown' };
    }
  }
}

// ====================================================================
// 5. TRENDING CONTROLLER - API Endpoints
// ====================================================================

// File: src/controllers/trending.controller.ts
// NEW FILE - REST API endpoints

import { 
  Controller, 
  Get, 
  Post,
  Query, 
  Body,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TrendingService } from '../services/trending.service';
import { AnalyticsService } from '../services/analytics.service';
import { CacheService } from '../services/cache.service';
import { CurrentUser } from '../decorators/current-user.decorator';

export interface TrackEventRequestDto {
  assetId: string;
  eventType: 'view' | 'like' | 'share' | 'remix';
  metadata?: Record<string, any>;
}

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class TrendingController {
  private readonly logger = new Logger(TrendingController.name);

  constructor(
    private trendingService: TrendingService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
  ) {}

  /**
   * GET /api/assets/trending?layer=songs&limit=50
   * Get trending assets with caching
   */
  @Get('trending')
  async getTrending(
    @Query('layer') layer: string = 'songs',
    @Query('limit') limit: string = '50',
  ) {
    try {
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const cacheKey = `trending:${layer}:${parsedLimit}`;

      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return {
          success: true,
          data: cached,
          metadata: {
            cached: true,
            timestamp: new Date(),
            count: (cached as any[]).length,
          },
        };
      }

      // Cache miss - query database
      this.logger.debug(`Cache miss: ${cacheKey} - querying database`);
      const results = await this.trendingService.getTrendingAssets(
        layer,
        parsedLimit,
      );

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, results, 300);

      return {
        success: true,
        data: results,
        metadata: {
          cached: false,
          timestamp: new Date(),
          count: results.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get trending assets: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch trending assets',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/assets/track-event
   * Track user interaction event
   */
  @Post('track-event')
  async trackEvent(
    @CurrentUser() user: any,
    @Body() dto: TrackEventRequestDto,
  ) {
    try {
      await this.analyticsService.trackEvent({
        userId: user.id,
        assetId: dto.assetId,
        eventType: dto.eventType,
        metadata: dto.metadata,
      });

      return {
        success: true,
        message: 'Event tracked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to track event: ${error.message}`,
        error.stack,
      );
      // Don't throw - analytics failures shouldn't break UX
      return {
        success: false,
        message: 'Failed to track event',
      };
    }
  }

  /**
   * GET /api/assets/:id/trending-score
   * Get trending score for specific asset
   */
  @Get(':id/trending-score')
  async getAssetTrendingScore(@Param('id') assetId: string) {
    try {
      const score = await this.trendingService.getAssetTrendingScore(assetId);

      return {
        success: true,
        data: {
          assetId,
          score,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get trending score: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          error: 'Failed to fetch trending score',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// ====================================================================
// 6. BACKGROUND JOBS
// ====================================================================

// File: src/jobs/metrics-aggregation.job.ts
// NEW FILE - Aggregates analytics events into asset metrics

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from '../models/asset.schema';
import { AnalyticsService } from '../services/analytics.service';

@Injectable()
export class MetricsAggregationJob {
  private readonly logger = new Logger(MetricsAggregationJob.name);
  private isRunning = false;

  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Run every 10 minutes to aggregate recent analytics events
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async aggregateMetrics() {
    if (this.isRunning) {
      this.logger.warn('Previous aggregation still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting metrics aggregation...');
    const startTime = Date.now();

    try {
      // Get events from last 10 minutes
      const events = await this.analyticsService.getRecentEvents(10);

      if (events.length === 0) {
        this.logger.log('No recent events to aggregate');
        return;
      }

      this.logger.log(`Processing ${events.length} events`);

      // Group events by assetId
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

        const metrics = metricsByAsset.get(event.assetId)!;
        
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

      // Bulk update assets
      const bulkOps = Array.from(metricsByAsset.entries()).map(
        ([assetId, metrics]) => ({
          updateOne: {
            filter: { _id: assetId },
            update: {
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
          },
        }),
      );

      const result = await this.assetModel.bulkWrite(bulkOps);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Metrics aggregation complete: ${result.modifiedCount} assets updated in ${duration}ms`
      );
    } catch (error) {
      this.logger.error(
        `Metrics aggregation failed: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }
}

// ====================================================================

// File: src/jobs/trending-score.job.ts
// NEW FILE - Updates trending scores and invalidates cache

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrendingService } from '../services/trending.service';
import { CacheService } from '../services/cache.service';

@Injectable()
export class TrendingScoreJob {
  private readonly logger = new Logger(TrendingScoreJob.name);
  private isRunning = false;

  constructor(
    private trendingService: TrendingService,
    private cacheService: CacheService,
  ) {}

  /**
   * Run every 30 minutes to update trending scores
   */
  @Cron('*/30 * * * *')
  async updateScores() {
    if (this.isRunning) {
      this.logger.warn('Previous score update still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting trending score update...');
    const startTime = Date.now();

    try {
      // Update scores for all layers that need trending
      const layers = ['songs']; // Add more layers as needed
      
      for (const layer of layers) {
        const updatedCount = await this.trendingService.updateTrendingScores(layer);
        this.logger.log(`Updated ${updatedCount} ${layer} assets`);
      }

      // Invalidate cache
      const deletedKeys = await this.cacheService.del('trending:*');
      this.logger.log(`Invalidated ${deletedKeys} cache entries`);

      const duration = Date.now() - startTime;
      this.logger.log(`Trending score update complete in ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `Trending score update failed: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }
}

// ====================================================================
// 7. MODULE CONFIGURATION
// ====================================================================

// File: src/modules/trending.module.ts
// NEW FILE - Module definition

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Asset, AssetSchema } from '../models/asset.schema';
import { AnalyticsEvent, AnalyticsEventSchema } from '../models/analytics-event.schema';
import { TrendingController } from '../controllers/trending.controller';
import { TrendingService } from '../services/trending.service';
import { AnalyticsService } from '../services/analytics.service';
import { CacheService } from '../services/cache.service';
import { MetricsAggregationJob } from '../jobs/metrics-aggregation.job';
import { TrendingScoreJob } from '../jobs/trending-score.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
  ],
  controllers: [TrendingController],
  providers: [
    TrendingService,
    AnalyticsService,
    CacheService,
    MetricsAggregationJob,
    TrendingScoreJob,
  ],
  exports: [TrendingService, AnalyticsService],
})
export class TrendingModule {}

// ====================================================================
// 8. ENVIRONMENT VARIABLES
// ====================================================================

/*
Add these to your .env file:

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Trending Configuration
TRENDING_WEIGHT_VIEWS=1
TRENDING_WEIGHT_LIKES=5
TRENDING_WEIGHT_SHARES=10
TRENDING_WEIGHT_REMIXES=20
TRENDING_RECENCY_DECAY_DAYS=30
TRENDING_MIN_ENGAGEMENT=10
*/

// ====================================================================
// IMPLEMENTATION CHECKLIST
// ====================================================================

/*
□ Step 1: Schema Updates
  □ Add AnalyticsEvent schema
  □ Update Asset schema with engagementMetrics and trendingScore
  □ Add indexes to Asset schema
  □ Run migration to add fields to existing assets

□ Step 2: Services
  □ Implement AnalyticsService
  □ Implement TrendingService
  □ Implement CacheService
  □ Add environment variables

□ Step 3: Background Jobs
  □ Implement MetricsAggregationJob
  □ Implement TrendingScoreJob
  □ Test job execution locally

□ Step 4: API Layer
  □ Implement TrendingController
  □ Add authentication guards
  □ Test endpoints with Postman/Thunder Client

□ Step 5: Module Configuration
  □ Create TrendingModule
  □ Import into AppModule
  □ Test dependency injection

□ Step 6: Testing
  □ Unit tests for TrendingService.calculateTrendingScore()
  □ Unit tests for AnalyticsService
  □ Integration tests for API endpoints
  □ Load testing for trending queries

□ Step 7: Deployment
  □ Deploy Redis instance
  □ Update environment variables
  □ Run database migration
  □ Monitor performance metrics
*/