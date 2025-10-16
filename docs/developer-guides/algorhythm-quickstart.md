# AlgoRhythm Quick Implementation Guide

## Phase 1: Initial Setup (Day 1)

### 1.1 Project Initialization
```bash
# Create AlgoRhythm service
npx @nestjs/cli new algorhythm-service --package-manager npm
cd algorhythm-service

# Install dependencies matching NNA Registry
npm install @nestjs/mongoose mongoose
npm install redis ioredis
npm install @nestjs/swagger swagger-ui-express
npm install class-validator class-transformer
npm install @nestjs/config
npm install winston @nestjs/winston
```

### 1.2 Environment Configuration
```env
# .env.development
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://localhost:27017/algorhythm-dev
REDIS_HOST=localhost
REDIS_PORT=6379
NNA_REGISTRY_API=http://localhost:3000/api
JWT_SECRET=same-as-nna-registry
```

### 1.3 Module Structure
```
src/
├── recommendations/
│   ├── recommendations.module.ts
│   ├── recommendations.controller.ts
│   ├── recommendations.service.ts
│   └── dto/
│       ├── recommend-template.dto.ts
│       └── recommend-variations.dto.ts
├── scoring/
│   ├── scoring.module.ts
│   ├── scoring.service.ts
│   └── scoring.constants.ts
├── nna-integration/
│   ├── nna-integration.module.ts
│   ├── nna-registry.service.ts
│   └── interfaces/
├── caching/
│   ├── caching.module.ts
│   └── redis.service.ts
└── analytics/
    ├── analytics.module.ts
    └── analytics.service.ts
```

## Phase 2: Core Implementation (Day 2-3)

### 2.1 Recommendation Controller
```typescript
// recommendations.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { RecommendTemplateDto } from './dto/recommend-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('recommendations')
@Controller('api/v1/recommend')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post('template')
  @ApiOperation({ summary: 'Get template recommendations for a song' })
  async recommendTemplate(@Body() dto: RecommendTemplateDto) {
    return this.recommendationsService.recommendTemplate(dto);
  }

  @Post('variations')
  @ApiOperation({ summary: 'Get layer variations for customization' })
  async recommendVariations(@Body() dto: RecommendVariationsDto) {
    return this.recommendationsService.recommendVariations(dto);
  }
}
```

### 2.2 Scoring Service
```typescript
// scoring.service.ts
import { Injectable } from '@nestjs/common';
import { SCORING_WEIGHTS } from './scoring.constants';

@Injectable()
export class ScoringService {
  calculateCompatibilityScore(
    song: SongMetadata,
    template: CompositeAsset,
  ): number {
    let score = 0;
    
    // Tempo matching (30%)
    if (this.isTempoCompatible(song.bpm, template.tempo)) {
      score += SCORING_WEIGHTS.TEMPO;
    }
    
    // Genre matching (25%)
    if (this.isGenreCompatible(song.genre, template.genre)) {
      score += SCORING_WEIGHTS.GENRE;
    }
    
    // Energy matching (20%)
    if (song.energy === template.energy) {
      score += SCORING_WEIGHTS.ENERGY;
    }
    
    // Style matching (15%)
    if (this.isStyleCompatible(song.mood, template.style)) {
      score += SCORING_WEIGHTS.STYLE;
    }
    
    // Mood matching (10%)
    if (song.mood === template.mood) {
      score += SCORING_WEIGHTS.MOOD;
    }
    
    // Apply freshness boost
    score += this.calculateFreshnessBoost(template.createdAt);
    
    return Math.min(score, 100);
  }

  private calculateFreshnessBoost(createdAt: Date): number {
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 7) return 20;  // First week: 20% boost
    if (ageInDays <= 30) return 10; // First month: 10% boost
    if (ageInDays <= 90) return 5;  // First 3 months: 5% boost
    return 0;
  }
}
```

### 2.3 Redis Caching Implementation
```typescript
// redis.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis;
  
  constructor(private configService: ConfigService) {}
  
  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    });
  }
  
  async getCachedRecommendations(key: string): Promise<any> {
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedRecommendations(
    key: string,
    data: any,
    ttl: number = 3600,
  ): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(data));
  }
  
  generateCacheKey(songId: string, userId?: string): string {
    return userId 
      ? `recommendations:${songId}:${userId}`
      : `recommendations:${songId}:default`;
  }
}
```

## Phase 3: Testing & Optimization (Day 4)

### 3.1 Performance Test Suite
```typescript
// test/performance/recommendations.perf.test.ts
describe('Recommendations Performance', () => {
  it('should respond within 20ms for cached requests', async () => {
    const start = Date.now();
    
    const response = await request(app.getHttpServer())
      .post('/api/v1/recommend/template')
      .send({
        songId: 'G.POP.MIL.001',
        userId: 'test-user',
      });
    
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(20);
  });
});
```

### 3.2 Load Testing Script
```bash
# load-test.sh
#!/bin/bash

echo "🚀 Running AlgoRhythm load tests..."

# Test recommendation endpoint
artillery quick \
  --count 100 \
  --num 1000 \
  -p '{"songId": "G.POP.MIL.001"}' \
  http://localhost:3002/api/v1/recommend/template

echo "✅ Load testing complete"
```

## Phase 4: Integration & Deployment (Day 5)

### 4.1 Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["node", "dist/main"]
```

### 4.2 Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: algorhythm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: algorhythm
  template:
    metadata:
      labels:
        app: algorhythm
    spec:
      containers:
      - name: algorhythm
        image: algorhythm:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

## Success Metrics Dashboard

```typescript
// analytics/metrics.ts
export const ALGORHYTHM_METRICS = {
  recommendations: {
    responseTime: histogram({
      name: 'algorhythm_response_time',
      help: 'Response time in milliseconds',
      buckets: [10, 20, 50, 100, 200, 500],
    }),
    cacheHitRate: gauge({
      name: 'algorhythm_cache_hit_rate',
      help: 'Cache hit rate percentage',
    }),
    compatibilityScore: histogram({
      name: 'algorhythm_compatibility_score',
      help: 'Distribution of compatibility scores',
      buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    }),
  },
};
```

## Quick Validation Checklist

- [ ] Service starts without errors
- [ ] Can connect to NNA Registry API
- [ ] Redis caching works
- [ ] Response time < 20ms for cached requests
- [ ] JWT authentication works
- [ ] Swagger documentation accessible
- [ ] Health check endpoint responds
- [ ] Metrics endpoint exposes data
