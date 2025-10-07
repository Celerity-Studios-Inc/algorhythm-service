# Trending Feature - Developer Quick Start Guide

**Version**: 2.0 (NNA Registry Aligned)  
**Target Audience**: ReViz Developers  
**Estimated Setup Time**: 2-3 hours  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (30 Minutes)](#quick-start-30-minutes)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing Guide](#testing-guide)
6. [Deployment Checklist](#deployment-checklist)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

### What is the Trending Feature?

The Trending Feature tracks user engagement (views, likes, shares, remixes) and calculates trending scores to highlight popular songs in ReViz. This is an **NNA Registry feature**, NOT part of AlgoRhythm.

### Architecture at a Glance

```
User Action → Analytics → Aggregation Job → Trending Score → Cached API
   (Real-time)    (10min)       (30min)        (5min cache)
```

### Key Components

| Component | Purpose | Update Frequency |
|-----------|---------|------------------|
| **AnalyticsService** | Track user events | Real-time |
| **MetricsAggregationJob** | Sum up events into metrics | Every 10 minutes |
| **TrendingScoreJob** | Calculate trending scores | Every 30 minutes |
| **TrendingController** | API endpoints | On-demand (cached) |
| **CacheService** | Redis caching | 5-minute TTL |

---

## Prerequisites

### Required Tools

- Node.js 18+
- TypeScript 5+
- NestJS 10+
- MongoDB 6+
- Redis 7+

### Required Knowledge

- NestJS dependency injection
- MongoDB schema design
- Redis caching basics
- Background job scheduling (cron)

### Environment Setup

```bash
# 1. Ensure MongoDB is running
mongosh --eval "db.runCommand({ ping: 1 })"

# 2. Ensure Redis is running
redis-cli ping
# Expected: PONG

# 3. Install dependencies (if not already)
npm install @nestjs/mongoose @nestjs/schedule ioredis
npm install -D @types/ioredis
```

---

## Quick Start (30 Minutes)

### Step 1: Add Environment Variables (2 minutes)

```bash
# Add to .env file

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Trending Configuration (optional - these are defaults)
TRENDING_WEIGHT_VIEWS=1
TRENDING_WEIGHT_LIKES=5
TRENDING_WEIGHT_SHARES=10
TRENDING_WEIGHT_REMIXES=20
TRENDING_RECENCY_DECAY_DAYS=30
TRENDING_MIN_ENGAGEMENT=10
```

### Step 2: Create Schema Files (5 minutes)

**File: `src/models/analytics-event.schema.ts`** (NEW)

Copy the entire AnalyticsEvent schema from **Artifact 2** (Implementation Specifications), Section 1.

**File: `src/models/asset.schema.ts`** (UPDATE)

Add these two fields to your existing Asset schema:

```typescript
@Prop({ type: EngagementMetricsSchema, default: () => ({}) })
engagementMetrics: EngagementMetrics;

@Prop({ type: TrendingScoreSchema })
trendingScore?: TrendingScore;
```

And add the subdocument schemas (EngagementMetrics, TrendingScore) above the Asset schema. See **Artifact 2, Section 1** for complete code.

**Add indexes** after `SchemaFactory.createForClass(Asset)`:

```typescript
AssetSchema.index({ layer: 1, 'trendingScore.score': -1 });
AssetSchema.index({ 'trendingScore.expiresAt': 1 });
AssetSchema.index({ 'engagementMetrics.lastUpdated': -1 });
```

### Step 3: Create Service Files (10 minutes)

Create these three new service files by copying from **Artifact 2**:

1. **`src/services/analytics.service.ts`** - Copy from Section 2
2. **`src/services/trending.service.ts`** - Copy from Section 3
3. **`src/services/cache.service.ts`** - Copy from Section 4

### Step 4: Create Controller (3 minutes)

**File: `src/controllers/trending.controller.ts`** (NEW)

Copy the entire TrendingController from **Artifact 2, Section 5**.

### Step 5: Create Background Jobs (5 minutes)

Create these two job files:

1. **`src/jobs/metrics-aggregation.job.ts`** - Copy from Section 6
2. **`src/jobs/trending-score.job.ts`** - Copy from Section 6

### Step 6: Create Module (3 minutes)

**File: `src/modules/trending.module.ts`** (NEW)

Copy the TrendingModule from **Artifact 2, Section 7**.

### Step 7: Register Module (2 minutes)

**File: `src/app.module.ts`** (UPDATE)

```typescript
import { TrendingModule } from './modules/trending.module';

@Module({
  imports: [
    // ... your existing imports ...
    TrendingModule,
  ],
})
export class AppModule {}
```

### Step 8: Run Migrations (Optional)

If you have existing assets, add default values:

```typescript
// Run this script once to initialize existing assets
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Asset } from './models/asset.schema';

async function initializeExistingAssets() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const assetModel = app.get(getModelToken(Asset.name));

  const result = await assetModel.updateMany(
    { engagementMetrics: { $exists: false } },
    {
      $set: {
        engagementMetrics: {
          viewCount: 0,
          likeCount: 0,
          shareCount: 0,
          remixCount: 0,
        },
      },
    },
  );

  console.log(`Initialized ${result.modifiedCount} existing assets`);
  await app.close();
}

initializeExistingAssets();
```

### Step 9: Test It! (5 minutes)

```bash
# 1. Start your application
npm run start:dev

# 2. Track an event
curl -X POST http://localhost:3000/api/assets/track-event \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "some-song-id",
    "eventType": "view"
  }'

# 3. Wait 10 minutes for aggregation job, or trigger manually

# 4. Get trending songs
curl http://localhost:3000/api/assets/trending?layer=songs&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step-by-Step Implementation

### Phase 1: Schema Setup (Day 1, Morning)

#### Task 1.1: Create AnalyticsEvent Schema

```bash
# Create new file
touch src/models/analytics-event.schema.ts
```

Copy the schema from **Artifact 2, Section 1**. This tracks individual user events.

**Key Points:**
- Uses `@Schema({ timestamps: true })` for automatic createdAt/updatedAt
- Has compound index on `(timestamp, assetId, eventType)` for efficient queries
- Stores optional metadata for future analytics needs

**Verify:**
```bash
# Check MongoDB indexes after startup
mongosh
> use nna_registry_db
> db.analyticevents.getIndexes()
```

#### Task 1.2: Update Asset Schema

Open `src/models/asset.schema.ts` and:

1. Add EngagementMetrics subdocument (before Asset schema)
2. Add TrendingScore subdocument (before Asset schema)
3. Add two new fields to Asset schema
4. Add three new indexes after SchemaFactory.createForClass()

**Verify:**
```bash
# Check Asset indexes
mongosh
> use nna_registry_db
> db.assets.getIndexes()
# Should see indexes on trendingScore.score and engagementMetrics
```

#### Task 1.3: Run Migration (if needed)

If you have existing assets, run the migration script from Quick Start Step 8.

**Verify:**
```bash
mongosh
> db.assets.findOne({ layer: 'songs' })
# Should see engagementMetrics field with default values
```

---

### Phase 2: Service Layer (Day 1, Afternoon)

#### Task 2.1: Implement AnalyticsService

```bash
touch src/services/analytics.service.ts
```

Copy from **Artifact 2, Section 2**.

**Key Methods:**
- `trackEvent()` - Fire-and-forget event tracking
- `getRecentEvents()` - Used by aggregation job
- `getAssetMetrics()` - Real-time metrics for specific assets

**Test Manually:**
```typescript
// In your controller or test file
await analyticsService.trackEvent({
  userId: 'test-user-123',
  assetId: 'test-song-456',
  eventType: 'view',
});

// Check database
// Should see new record in analyticevents collection
```

#### Task 2.2: Implement TrendingService

```bash
touch src/services/trending.service.ts
```

Copy from **Artifact 2, Section 3**.

**Key Methods:**
- `calculateTrendingScore()` - Core scoring algorithm
- `updateTrendingScores()` - Batch update all assets
- `getTrendingAssets()` - Query sorted trending list

**Test Manually:**
```typescript
// In your test file
const mockAsset = {
  _id: 'test',
  layer: 'songs',
  createdAt: new Date(),
  engagementMetrics: {
    viewCount: 100,
    likeCount: 20,
    shareCount: 5,
    remixCount: 2,
  },
};

const score = trendingService.calculateTrendingScore(mockAsset as any);
console.log('Trending score:', score); // Should be > 0
```

#### Task 2.3: Implement CacheService

```bash
touch src/services/cache.service.ts
```

Copy from **Artifact 2, Section 4**.

**Test Redis Connection:**
```typescript
// In your test file
const testKey = 'test:key';
await cacheService.set(testKey, { hello: 'world' }, 60);
const value = await cacheService.get(testKey);
console.log(value); // Should be { hello: 'world' }

await cacheService.del(testKey);
```

---

### Phase 3: API Layer (Day 2, Morning)

#### Task 3.1: Create TrendingController

```bash
touch src/controllers/trending.controller.ts
```

Copy from **Artifact 2, Section 5**.

**Endpoints:**
1. `GET /api/assets/trending` - Get trending list (cached)
2. `POST /api/assets/track-event` - Track user event
3. `GET /api/assets/:id/trending-score` - Get specific score

**Test with cURL:**
```bash
# 1. Track a view event
curl -X POST http://localhost:3000/api/assets/track-event \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "670a1b2c3d4e5f6a7b8c9d0e",
    "eventType": "view"
  }'

# 2. Get trending (should be cached after first request)
curl http://localhost:3000/api/assets/trending?layer=songs&limit=20 \
  -H "Authorization: Bearer $JWT_TOKEN"

# 3. Get specific asset score
curl http://localhost:3000/api/assets/670a1b2c3d4e5f6a7b8c9d0e/trending-score \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### Phase 4: Background Jobs (Day 2, Afternoon)

#### Task 4.1: Create MetricsAggregationJob

```bash
touch src/jobs/metrics-aggregation.job.ts
```

Copy from **Artifact 2, Section 6**.

**How It Works:**
- Runs every 10 minutes
- Fetches events from last 10 minutes
- Groups by assetId and eventType
- Updates Asset.engagementMetrics using `$inc`

**Test Manually:**
```typescript
// In your test file or controller
// 1. Track some events
await analyticsService.trackEvent({
  userId: 'user-1',
  assetId: 'song-123',
  eventType: 'view',
});

// 2. Wait 10 minutes OR trigger job manually
await metricsAggregationJob.aggregateMetrics();

// 3. Check asset
const asset = await assetModel.findById('song-123');
console.log(asset.engagementMetrics);
// Should see viewCount: 1
```

#### Task 4.2: Create TrendingScoreJob

```bash
touch src/jobs/trending-score.job.ts
```

Copy from **Artifact 2, Section 6**.

**How It Works:**
- Runs every 30 minutes
- Calculates scores for all songs
- Updates Asset.trendingScore
- Invalidates Redis cache

**Test Manually:**
```typescript
// Trigger job
await trendingScoreJob.updateScores();

// Check scores
const songs = await assetModel
  .find({ layer: 'songs' })
  .sort({ 'trendingScore.score': -1 })
  .limit(10);

songs.forEach(song => {
  console.log(`${song.title}: ${song.trendingScore.score}`);
});
```

---

### Phase 5: Module Configuration (Day 3, Morning)

#### Task 5.1: Create TrendingModule

```bash
touch src/modules/trending.module.ts
```

Copy from **Artifact 2, Section 7**.

**What It Does:**
- Registers all services and controllers
- Imports MongooseModule for schemas
- Imports ScheduleModule for cron jobs
- Exports TrendingService and AnalyticsService for other modules

#### Task 5.2: Register in AppModule

Update `src/app.module.ts`:

```typescript
import { TrendingModule } from './modules/trending.module';

@Module({
  imports: [
    // ... existing imports ...
    TrendingModule,
  ],
})
export class AppModule {}
```

**Verify:**
```bash
npm run start:dev
# Should see logs:
# [NestApplication] Nest application successfully started
# [TrendingService] Initialized with config: {...}
# [CacheService] Connected to Redis
```

---

## Testing Guide

### Unit Tests

#### Test TrendingService.calculateTrendingScore()

```typescript
// src/services/trending.service.spec.ts

import { Test } from '@nestjs/testing';
import { TrendingService } from './trending.service';
import { getModelToken } from '@nestjs/mongoose';
import { Asset } from '../models/asset.schema';
import { ConfigService } from '@nestjs/config';
import { MongoDBMonitor } from '../monitors/mongodb.monitor';

describe('TrendingService', () => {
  let service: TrendingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TrendingService,
        {
          provide: getModelToken(Asset.name),
          useValue: {}, // Mock
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
        {
          provide: MongoDBMonitor,
          useValue: {
            recordQueryTime: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrendingService>(TrendingService);
  });

  describe('calculateTrendingScore', () => {
    it('should calculate correct score for high engagement', () => {
      const asset = {
        _id: 'test',
        layer: 'songs',
        createdAt: new Date(),
        engagementMetrics: {
          viewCount: 1000,
          likeCount: 100,
          shareCount: 50,
          remixCount: 10,
        },
      } as any;

      const score = service.calculateTrendingScore(asset);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score to newer assets', () => {
      const newAsset = {
        _id: 'new',
        layer: 'songs',
        createdAt: new Date(), // Now
        engagementMetrics: {
          viewCount: 100,
          likeCount: 10,
          shareCount: 5,
          remixCount: 1,
        },
      } as any;

      const oldAsset = {
        _id: 'old',
        layer: 'songs',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        engagementMetrics: {
          viewCount: 100,
          likeCount: 10,
          shareCount: 5,
          remixCount: 1,
        },
      } as any;

      const newScore = service.calculateTrendingScore(newAsset);
      const oldScore = service.calculateTrendingScore(oldAsset);

      expect(newScore).toBeGreaterThan(oldScore);
    });

    it('should return 0 for asset with no metrics', () => {
      const asset = {
        _id: 'test',
        layer: 'songs',
        createdAt: new Date(),
      } as any;

      const score = service.calculateTrendingScore(asset);
      expect(score).toBe(0);
    });
  });
});
```

#### Test AnalyticsService.trackEvent()

```typescript
// src/services/analytics.service.spec.ts

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getModelToken(AnalyticsEvent.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should track event without throwing', async () => {
    await expect(
      service.trackEvent({
        userId: 'user-1',
        assetId: 'asset-1',
        eventType: 'view',
      }),
    ).resolves.not.toThrow();

    expect(mockModel.create).toHaveBeenCalled();
  });

  it('should not throw on database error', async () => {
    mockModel.create.mockRejectedValue(new Error('DB Error'));

    await expect(
      service.trackEvent({
        userId: 'user-1',
        assetId: 'asset-1',
        eventType: 'view',
      }),
    ).resolves.not.toThrow();
  });
});
```

### Integration Tests

#### Test TrendingController

```typescript
// src/controllers/trending.controller.e2e.spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('TrendingController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token (implement based on your auth system)
    authToken = 'test-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/assets/trending', () => {
    it('should return trending songs', () => {
      return request(app.getHttpServer())
        .get('/api/assets/trending?layer=songs&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body).toHaveProperty('metadata');
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .get('/api/assets/trending?layer=songs&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });

    it('should use cache on second request', async () => {
      // First request
      const res1 = await request(app.getHttpServer())
        .get('/api/assets/trending?layer=songs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res1.body.metadata.cached).toBe(false);

      // Second request (should be cached)
      const res2 = await request(app.getHttpServer())
        .get('/api/assets/trending?layer=songs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res2.body.metadata.cached).toBe(true);
    });
  });

  describe('POST /api/assets/track-event', () => {
    it('should track view event', () => {
      return request(app.getHttpServer())
        .post('/api/assets/track-event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId: '670a1b2c3d4e5f6a7b8c9d0e',
          eventType: 'view',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
        });
    });

    it('should validate event type', () => {
      return request(app.getHttpServer())
        .post('/api/assets/track-event')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetId: '670a1b2c3d4e5f6a7b8c9d0e',
          eventType: 'invalid',
        })
        .expect(400);
    });
  });
});
```

### Manual Testing Checklist

```bash
# 1. Track events
curl -X POST http://localhost:3000/api/assets/track-event \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assetId": "SONG_ID", "eventType": "view"}'

# 2. Wait 10 minutes or trigger job manually

# 3. Check engagement metrics in MongoDB
mongosh
> db.assets.findOne({ _id: ObjectId("SONG_ID") }).engagementMetrics

# 4. Wait 30 minutes or trigger trending job

# 5. Check trending scores
> db.assets.find({ layer: 'songs' }).sort({ 'trendingScore.score': -1 }).limit(10)

# 6. Test API endpoint
curl http://localhost:3000/api/assets/trending?layer=songs&limit=10 \
  -H "Authorization: Bearer $JWT_TOKEN"

# 7. Verify caching
curl http://localhost:3000/api/assets/trending?layer=songs&limit=10 \
  -H "Authorization: Bearer $JWT_TOKEN"
# Check metadata.cached should be true on second request

# 8. Check Redis
redis-cli
> KEYS trending:*
> GET trending:songs:10
> TTL trending:songs:10
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (`npm test`)
- [ ] All integration tests passing (`npm run test:e2e`)
- [ ] MongoDB indexes created
- [ ] Redis instance provisioned
- [ ] Environment variables configured
- [ ] Code reviewed and approved

### Deployment Steps

1. **Deploy Redis**
   ```bash
   # On your cloud provider (AWS, GCP, Azure)
   # Or using Docker:
   docker run -d \
     --name redis-trending \
     -p 6379:6379 \
     redis:7-alpine
   ```

2. **Update Environment Variables**
   ```bash
   # Production .env
   REDIS_HOST=your-redis-host.com
   REDIS_PORT=6379
   REDIS_PASSWORD=your-secure-password
   
   TRENDING_WEIGHT_VIEWS=1
   TRENDING_WEIGHT_LIKES=5
   TRENDING_WEIGHT_SHARES=10
   TRENDING_WEIGHT_REMIXES=20
   ```

3. **Run Database Migration**
   ```bash
   # SSH into production server
   npm run migration:trending:init
   ```

4. **Deploy Application**
   ```bash
   npm run build
   npm run start:prod
   ```

5. **Verify Background Jobs**
   ```bash
   # Check logs for job execution
   tail -f logs/application.log | grep "MetricsAggregationJob\|TrendingScoreJob"
   
   # Should see:
   # [MetricsAggregationJob] Starting metrics aggregation...
   # [TrendingScoreJob] Starting trending score update...
   ```

### Post-Deployment

- [ ] Verify API endpoint responds: `GET /api/assets/trending`
- [ ] Track test event: `POST /api/assets/track-event`
- [ ] Check Redis contains cached data: `redis-cli KEYS trending:*`
- [ ] Monitor application logs for errors
- [ ] Check MongoDB performance (indexes are used)
- [ ] Verify background jobs run on schedule

### Monitoring

```typescript
// Add these metrics to your monitoring dashboard

// 1. API Performance
GET /api/assets/trending
- Response time (target: <50ms cached, <200ms uncached)
- Cache hit rate (target: >95%)

// 2. Background Job Performance
MetricsAggregationJob
- Execution time (target: <5 minutes)
- Events processed per run
- Assets updated per run

TrendingScoreJob
- Execution time (target: <5 minutes)
- Assets scored per run

// 3. Database Performance
MongoDB
- Query time for trending endpoint
- Index usage (should always use indexes)

Redis
- Memory usage
- Cache hit/miss ratio
- Connection count
```

---

## Troubleshooting

### Issue: Background jobs not running

**Symptoms:**
- Logs show no job execution
- Engagement metrics not updating

**Solutions:**
1. Check ScheduleModule is imported in TrendingModule
2. Verify cron expressions: `@Cron(CronExpression.EVERY_10_MINUTES)`
3. Check server timezone: `TZ=UTC node dist/main.js`
4. Manually trigger jobs to test:
   ```typescript
   await metricsAggregationJob.aggregateMetrics();
   await trendingScoreJob.updateScores();
   ```

### Issue: Trending endpoint slow (>200ms)

**Symptoms:**
- API responses take >200ms even when cached

**Solutions:**
1. Verify Redis is running: `redis-cli ping`
2. Check cache hit rate in logs
3. Verify MongoDB indexes:
   ```javascript
   db.assets.getIndexes()
   // Should see index on { layer: 1, 'trendingScore.score': -1 }
   ```
4. Use explain to check query plan:
   ```javascript
   db.assets.find({ layer: 'songs', 'trendingScore.score': { $gt: 0 } })
     .sort({ 'trendingScore.score': -1 })
     .limit(50)
     .explain('executionStats')
   ```

### Issue: Trending scores always 0

**Symptoms:**
- All songs have trendingScore.score = 0

**Solutions:**
1. Check engagement metrics exist:
   ```javascript
   db.assets.findOne({ layer: 'songs' }).engagementMetrics
   ```
2. Verify MetricsAggregationJob ran:
   ```javascript
   db.assets.find({ 'engagementMetrics.lastUpdated': { $exists: true } })
   ```
3. Manually trigger score update:
   ```typescript
   await trendingScoreJob.updateScores();
   ```
4. Check scoring weights in environment variables

### Issue: Redis connection errors

**Symptoms:**
- Logs show "Redis error: Connection refused"
- Cache not working

**Solutions:**
1. Verify Redis is running: `redis-cli ping`
2. Check connection config in `.env`:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```
3. Test connection manually:
   ```bash
   redis-cli -h localhost -p 6379 -a your-password ping
   ```
4. Check firewall rules allow connection to Redis port

### Issue: Event tracking not working

**Symptoms:**
- No records in AnalyticsEvent collection
- Engagement metrics never update

**Solutions:**
1. Check AnalyticsService is properly injected
2. Verify MongoDB write permissions
3. Check logs for error messages
4. Test directly:
   ```typescript
   await analyticsService.trackEvent({
     userId: 'test',
     assetId: 'test',
     eventType: 'view',
   });
   ```
5. Query database:
   ```javascript
   db.analyticevents.find().sort({ timestamp: -1 }).limit(5)
   ```

---

## FAQ

### Q: How often are trending scores updated?

**A:** Trending scores are recalculated every 30 minutes by the TrendingScoreJob. Engagement metrics are aggregated every 10 minutes.

### Q: Can I change the scoring weights?

**A:** Yes, update these environment variables:
```
TRENDING_WEIGHT_VIEWS=1
TRENDING_WEIGHT_LIKES=5
TRENDING_WEIGHT_SHARES=10
TRENDING_WEIGHT_REMIXES=20
```

### Q: How long are API responses cached?

**A:** 5 minutes by default. You can change this in TrendingController:
```typescript
await this.cacheService.set(cacheKey, results, 300); // 300 seconds = 5 min
```

### Q: Can I manually refresh trending scores?

**A:** Yes, you can trigger the job programmatically:
```typescript
// In a controller or admin endpoint
@Post('admin/refresh-trending')
async refreshTrending() {
  await this.trendingScoreJob.updateScores();
  return { success: true };
}
```

### Q: What happens if Redis goes down?

**A:** The application continues to work but without caching. API responses will be slower (200ms instead of 50ms) as they'll always query MongoDB. The CacheService is designed to fail gracefully.

### Q: How do I add trending for other layers (not just songs)?

**A:** Update TrendingScoreJob to process multiple layers:
```typescript
const layers = ['songs', 'stars', 'looks', 'moves', 'worlds'];

for (const layer of layers) {
  await this.trendingService.updateTrendingScores(layer);
}
```

### Q: Can I get real-time trending (not cached)?

**A:** Yes, add a query parameter:
```typescript
@Get('trending')
async getTrending(
  @Query('nocache') nocache: string,
  // ... other params
) {
  if (nocache === 'true') {
    // Skip cache lookup
    const results = await this.trendingService.getTrendingAssets(...);
    return { data: results, cached: false };
  }
  // ... normal cached flow
}
```

### Q: How do I see trending for a specific time period?

**A:** This requires extending the schema and scoring logic to track historical scores. For MVP, trending shows the current top songs. Future enhancement could add time-based queries.

### Q: Will this work with AlgoRhythm?

**A:** Yes! This is a standalone NNA Registry feature, but AlgoRhythm can optionally consume the trending data via REST API to boost recommendations for trending songs. See **Artifact 1** for integration patterns.

---

## Next Steps

After implementing the trending feature:

1. **Monitor Performance**
   - Watch API response times
   - Check background job completion
   - Monitor Redis memory usage
   - Track cache hit rates

2. **Gather User Feedback**
   - Are trending results relevant?
   - Do users engage with trending songs?
   - Is the freshness (30-min updates) acceptable?

3. **Consider Enhancements**
   - Personalized trending (per user)
   - Trending by genre/category
   - Historical trending data
   - Trending velocity alerts ("rising fast")

4. **Optional AlgoRhythm Integration**
   - Use trending data to boost recommendations
   - See **Artifact 1, Section 10** for integration guide

---

**Need Help?**

- Check the implementation specs in **Artifact 2**
- Review the architecture in **Artifact 1**
- Search project knowledge for related patterns
- Ask questions in team channels

**Happy coding! 🚀**