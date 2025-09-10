// ========================================
// package.json
// ========================================
{
  "name": "algorhythm-recommendation-engine",
  "version": "1.0.0",
  "description": "AI-powered recommendation engine for ReViz's video remixing platform",
  "author": "Celerity Studios Inc.",
  "license": "PROPRIETARY",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "seed": "ts-node scripts/seed-data.ts",
    "migrate": "ts-node scripts/migrate-scores.ts",
    "cache-warmup": "ts-node scripts/cache-warmup.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/mongoose": "^10.0.1",
    "@nestjs/jwt": "^10.1.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.1.8",
    "@nestjs/throttler": "^4.2.1",
    "mongoose": "^7.4.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "ioredis": "^5.3.2",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "winston": "^3.10.0",
    "nest-winston": "^1.9.3",
    "prometheus-client": "^1.15.1",
    "@sentry/node": "^7.60.0",
    "axios": "^1.4.0",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/lodash": "^4.14.195",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}

// ========================================
// src/main.ts
// ========================================
import { existsSync, readFileSync, readdirSync } from 'fs';
import './instrument'; // Sentry initialization
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { swaggerConfig } from './config/swagger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AnalyticsInterceptor } from './common/interceptors/analytics.interceptor';
import { EnvironmentValidationService } from './config/environment-validation';
import { Request, Response, Application } from 'express';

console.log('🚀 AlgoRhythm Recommendation Engine: Starting application...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🔧 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🏭 ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('🔑 PORT:', process.env.PORT);

// Log the MongoDB database in use at startup
const dbUri = process.env.MONGODB_URI;
if (dbUri) {
  const dbName = dbUri.split('/').pop()?.split('?')[0];
  console.log('🗄️  AlgoRhythm connecting to MongoDB database:', dbName);
} else {
  console.warn('⚠️  AlgoRhythm: MONGODB_URI is not set!');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validate environment configuration
  const envValidation = app.get(EnvironmentValidationService);
  envValidation.validateEnvironment();

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS with specific origins based on environment
  const nodeEnv = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production';
  let allowedOrigins: string[];
  
  if (nodeEnv === 'development') {
    allowedOrigins = [
      'https://dev.algorhythm.media',
      'https://registry.dev.reviz.dev',
      'http://localhost:3000',
      'http://localhost:3001',
      'exp://localhost:8081', // Expo dev
    ];
  } else if (nodeEnv === 'staging') {
    allowedOrigins = [
      'https://stg.algorhythm.media',
      'https://registry.stg.reviz.dev',
    ];
  } else {
    allowedOrigins = [
      'https://algorhythm.media',
      'https://registry.reviz.dev',
      'https://reviz.app', // Production mobile app
    ];
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-Context',
      'X-Request-ID',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Response-Time', 'X-Cache-Status'],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AnalyticsInterceptor(),
  );

  // Setup Swagger documentation
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AlgoRhythm API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui.css',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🎵 AlgoRhythm Recommendation Engine running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🎯 Environment: ${nodeEnv}`);
}

bootstrap().catch(error => {
  console.error('💥 Failed to start AlgoRhythm:', error);
  process.exit(1);
});

// ========================================
// src/app.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { NnaIntegrationModule } from './modules/nna-integration/nna-integration.module';
import { CachingModule } from './modules/caching/caching.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { SeedingModule } from './modules/seeding/seeding.module';

// Configuration
import { EnvironmentValidationService } from './config/environment-validation';
import { RedisModule } from './config/redis.config';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),

    // Database connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryWrites: true,
        w: 'majority',
      }),
      inject: [ConfigService],
    }),

    // Redis connection
    RedisModule,

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute per IP
    }]),

    // Logging
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `[${timestamp}] ${level}: [${context}] ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/algorhythm-error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/algorhythm-combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),

    // Feature modules
    AuthModule,
    RecommendationsModule,
    ScoringModule,
    NnaIntegrationModule,
    CachingModule,
    AnalyticsModule,
    HealthModule,
    SeedingModule,
  ],
  providers: [
    EnvironmentValidationService,
  ],
})
export class AppModule {}

// ========================================
// src/config/environment-validation.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentValidationService {
  constructor(private configService: ConfigService) {}

  validateEnvironment(): void {
    const requiredVars = [
      'MONGODB_URI',
      'REDIS_URL',
      'JWT_SECRET',
      'NNA_REGISTRY_BASE_URL',
      'NODE_ENV',
    ];

    const missingVars = requiredVars.filter(
      varName => !this.configService.get(varName)
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }

    console.log('✅ Environment validation passed');
  }
}

// ========================================
// src/config/swagger.config.ts
// ========================================
import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('AlgoRhythm Recommendation Engine')
  .setDescription('AI-powered recommendation engine for ReViz video remixing platform')
  .setVersion('1.0.0')
  .addBearerAuth()
  .addTag('recommendations', 'Template and layer recommendation APIs')
  .addTag('analytics', 'Analytics and tracking APIs')
  .addTag('health', 'Health monitoring APIs')
  .addServer('https://dev.algorhythm.media', 'Development')
  .addServer('https://stg.algorhythm.media', 'Staging')
  .addServer('https://algorhythm.media', 'Production')
  .build();

// ========================================
// src/config/redis.config.ts
// ========================================
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          keyPrefix: 'algorhythm:',
          lazyConnect: true,
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('error', (error) => {
          console.error('❌ Redis connection error:', error);
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

// ========================================
// src/common/constants/compatibility-weights.ts
// ========================================
export const COMPATIBILITY_WEIGHTS = {
  tempo: 0.30,   // BPM matching - most important for music sync
  genre: 0.25,   // Genre alignment - crucial for style consistency
  energy: 0.20,  // Energy level matching - affects user experience
  style: 0.15,   // Visual style coherence - aesthetic consistency
  mood: 0.10,    // Atmosphere/mood matching - subtle but important
} as const;

export const FRESHNESS_BOOST = {
  FIRST_WEEK: 1.20,    // 20% boost for templates < 7 days old
  FIRST_MONTH: 1.10,   // 10% boost for templates < 30 days old
  FIRST_QUARTER: 1.05, // 5% boost for templates < 90 days old
} as const;

export const SCORING_THRESHOLDS = {
  MIN_RECOMMENDATION_SCORE: 0.6,  // Minimum score to recommend
  DIVERSITY_FACTOR: 0.01,          // Random factor for tie-breaking (0-1%)
  MAX_ALTERNATIVES: 10,            // Maximum alternative templates
  MAX_LAYER_VARIATIONS: 8,         // Maximum layer variations
} as const;

// ========================================
// src/common/constants/cache-keys.ts
// ========================================
export const CACHE_KEYS = {
  TEMPLATE_RECOMMENDATION: 'recommendation:template',
  LAYER_VARIATIONS: 'recommendation:variations',
  COMPATIBILITY_SCORES: 'scores:compatibility',
  USER_PREFERENCES: 'user:preferences',
  POPULAR_TEMPLATES: 'popular:templates',
  ANALYTICS_EVENTS: 'analytics:events',
} as const;

export const CACHE_TTL = {
  TEMPLATE_RECOMMENDATION: 300,    // 5 minutes
  LAYER_VARIATIONS: 300,          // 5 minutes
  COMPATIBILITY_SCORES: 86400,    // 24 hours
  USER_PREFERENCES: 3600,         // 1 hour
  POPULAR_TEMPLATES: 1800,        // 30 minutes
  ANALYTICS_EVENTS: 60,           // 1 minute
} as const;

// ========================================
// .env.development
// ========================================
# AlgoRhythm Development Environment Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/algorhythm_dev

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=dev-algorhythm-secret-change-in-production

# NNA Registry Integration
NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev
NNA_REGISTRY_API_KEY=dev-api-key

# Logging
LOG_LEVEL=debug

# Performance
CACHE_DEFAULT_TTL=300
SCORE_COMPUTATION_BATCH_SIZE=1000

# Analytics
ANALYTICS_ENABLED=true
ANALYTICS_BATCH_SIZE=100

# Sentry (optional in development)
SENTRY_DSN=

# ========================================
# README.md
# ========================================
# AlgoRhythm Recommendation Engine

AI-powered recommendation engine for ReViz's video remixing platform. AlgoRhythm powers the "Start with a Song" experience, instantly recommending perfect pre-generated video templates when users select a song.

## 🎯 Features

- **Template Recommendations**: Get best video template for any song (<20ms response time)
- **Layer Variations**: Get alternative stars, looks, moves, and worlds for customization
- **Compatibility Scoring**: Rule-based algorithm with freshness boost and diversity
- **Real-time Analytics**: Track user behavior and recommendation performance
- **Redis Caching**: Multi-tier caching for optimal performance
- **NNA Integration**: Seamless integration with existing NNA Registry infrastructure

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17+
- MongoDB 5.0+
- Redis 7.0+
- NNA Registry Service running

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd algorhythm

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.development

# Update environment variables in .env.development
# - MONGODB_URI: Your MongoDB connection string
# - REDIS_URL: Your Redis connection string  
# - NNA_REGISTRY_BASE_URL: NNA Registry service URL
# - JWT_SECRET: Same as NNA Registry for token compatibility

# Start the development server
npm run start:dev
```

### Development Server
The server will start on `http://localhost:3000`
- API Documentation: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/v1/health`

## 📚 API Endpoints

### Template Recommendations
```http
POST /api/v1/recommend/template
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "song_id": "G.POP.TEN.001",
  "user_context": {
    "user_id": "user123",
    "preferences": {
      "energy_preference": "high",
      "style_preference": "modern"
    }
  }
}
```

### Layer Variations
```http
POST /api/v1/recommend/variations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "current_template_id": "C.001.001.001",
  "vary_layer": "stars",
  "song_id": "G.POP.TEN.001",
  "limit": 8
}
```

## 🏗️ Architecture

AlgoRhythm follows NestJS best practices with a modular architecture:

- **Recommendations Module**: Core recommendation APIs
- **Scoring Module**: Compatibility scoring algorithms  
- **NNA Integration Module**: Connection to NNA Registry
- **Caching Module**: Redis-based performance optimization
- **Analytics Module**: Event tracking and metrics
- **Auth Module**: JWT authentication (inherited from NNA Registry)

## 🔧 Configuration

Key environment variables:

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/algorhythm_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev

# Optional
LOG_LEVEL=debug
CACHE_DEFAULT_TTL=300
ANALYTICS_ENABLED=true
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📊 Performance

- **Target Response Time**: <20ms P95
- **Cache Hit Rate**: >90%
- **Throughput**: 1000+ requests/second
- **Uptime**: 99.9%

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t algorhythm:latest .

# Run container
docker run -p 3000:3000 algorhythm:latest
```

### Kubernetes
```bash
# Deploy to development
kubectl apply -f k8s/dev/

# Deploy to staging  
kubectl apply -f k8s/staging/

# Deploy to production
kubectl apply -f k8s/production/
```

## 📈 Monitoring

- **Health Check**: `/api/v1/health`
- **Metrics**: Prometheus-compatible metrics at `/metrics`
- **Logs**: Winston logging to files and console
- **Sentry**: Error tracking and performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Proprietary - Celerity Studios Inc.
