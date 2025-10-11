import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
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
import { DaemonModule } from './modules/daemon/daemon.module';

// Configuration
import { EnvironmentValidationService } from './config/environment-validation';
import { RedisModule } from './config/redis.config';

// Error handling and monitoring
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { RateLimitingGuard } from './common/guards/rate-limiting.guard';
import { HealthMonitorService } from './common/services/health-monitor.service';
import { AlgorhythmModule } from './modules/algorhythm/algorhythm.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { IndexingModule } from './modules/indexing/indexing.module';

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

    // Database connection (optional for development)
    ...(process.env.MONGODB_URI ? [MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        console.log('🗄️  MongoDB URI: cloud-database');
        
        return {
          uri: mongoUri,
          retryWrites: true,
          w: 'majority',
        };
      },
      inject: [ConfigService],
    })] : []),

    // Redis connection (optional for development)
    ...(process.env.REDIS_URL ? [RedisModule] : []),

    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute per IP
    }),

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

    // Feature modules (PHASE 2: Re-enable core functionality)
    AuthModule,
    HealthModule, // ✅ FIX: Add health check endpoint
    NnaIntegrationModule, // ✅ RE-ENABLED: NNA Registry API integration
    AlgorhythmModule,
    WebhookModule, // ✅ RE-ENABLED: Webhook endpoints for NNA Registry
    
    // Database-dependent modules (ENABLED for ReViz API)
    RecommendationsModule, // ✅ ENABLED: ReViz Composite API
    // ...(process.env.MONGODB_URI ? [
    //   ScoringModule,
    //   SeedingModule,
    //   DaemonModule,
    //   AnalyticsModule,
    //   HealthModule,
    //   IndexingModule,
    // ] : []),
    
    // Cache module (optional)
    ...(process.env.REDIS_URL ? [CachingModule] : []),
  ],
  providers: [
    EnvironmentValidationService,
    HealthMonitorService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitingGuard,
    },
  ],
})
export class AppModule {}
