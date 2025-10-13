// src/modules/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { OptimizedNnaRegistryModule } from '@nna-registry/optimized';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ScoringService } from './scoring.service';
import { AnalyticsService } from './analytics.service';

/**
 * AlgoRhythm Recommendations Module
 * 
 * Core module providing AI-powered video template recommendations.
 * 
 * Key Features:
 * - Template recommendations for songs
 * - Layer variation suggestions
 * - Composite template information
 * - Redis caching for sub-50ms responses
 * - Analytics tracking
 * 
 * Performance Targets:
 * - Cold start: <500ms
 * - Warm cache: <50ms  
 * - Cache hit rate: >80%
 * 
 * Dependencies:
 * - OptimizedNnaRegistryModule: Fast database queries (8ms avg)
 * - Redis: Caching layer
 * - ConfigModule: Environment configuration
 * 
 * @version 2.0.0 - FIXED: Now using OptimizedNnaRegistryModule
 */
@Module({
  imports: [
    // ✅ CRITICAL FIX: Import OptimizedNnaRegistryModule instead of legacy
    OptimizedNnaRegistryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Database connection from NNA Registry
        database: {
          host: configService.get('NNA_DB_HOST'),
          port: configService.get('NNA_DB_PORT'),
          database: configService.get('NNA_DB_NAME'),
          username: configService.get('NNA_DB_USER'),
          password: configService.get('NNA_DB_PASSWORD'),
          ssl: configService.get('NNA_DB_SSL') === 'true',
        },
        
        // Enable query caching at service level
        enableQueryCache: true,
        
        // Connection pool settings for performance
        connectionPool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        },
        
        // Enable performance logging in development
        logQueries: configService.get('NODE_ENV') === 'development',
        
        // Enable query timing metrics
        enableMetrics: true,
      }),
    }),

    // ✅ Redis Cache Configuration
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          password: configService.get('REDIS_PASSWORD'),
          database: configService.get('REDIS_DB', 0),
          
          // Connection settings
          ttl: 86400, // Default TTL: 24 hours (in seconds)
          
          // Retry strategy for resilience
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          
          // Enable offline queue for better reliability
          enableOfflineQueue: true,
          
          // Connection timeout
          connectTimeout: 10000,
        }),
        
        // Cache key prefix for namespacing
        prefix: 'algorhythm:',
        
        // Enable cache compression for large payloads
        compress: true,
        
        // Maximum cache size (in bytes) - 100MB
        max: 100 * 1024 * 1024,
      }),
    }),

    // ✅ Configuration module
    ConfigModule,
  ],

  controllers: [
    RecommendationsController,
  ],

  providers: [
    // Core services
    RecommendationsService,
    ScoringService,
    AnalyticsService,
    
    // Performance monitoring
    {
      provide: 'PERFORMANCE_MONITOR',
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get('ENABLE_PERFORMANCE_MONITORING') === 'true',
        slowQueryThreshold: configService.get('SLOW_QUERY_THRESHOLD_MS', 100),
        alertOnSlowQuery: configService.get('ALERT_ON_SLOW_QUERY') === 'true',
      }),
      inject: [ConfigService],
    },
    
    // Cache monitoring
    {
      provide: 'CACHE_MONITOR',
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get('ENABLE_CACHE_MONITORING') === 'true',
        targetHitRate: configService.get('CACHE_TARGET_HIT_RATE', 0.8),
        alertOnLowHitRate: configService.get('ALERT_ON_LOW_CACHE_HIT_RATE') === 'true',
      }),
      inject: [ConfigService],
    },
  ],

  exports: [
    // Export services for use in other modules if needed
    RecommendationsService,
    ScoringService,
  ],
})
export class RecommendationsModule {
  constructor(
    private readonly configService: ConfigService,
  ) {
    // Log module initialization in development
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('✅ RecommendationsModule initialized');
      console.log('  - OptimizedNnaRegistryModule: Enabled');
      console.log('  - Redis Cache: Enabled');
      console.log('  - Performance Monitoring: Enabled');
    }
  }
}

/**
 * Environment Variables Required:
 * 
 * NNA Registry Database:
 * - NNA_DB_HOST: Database host (default: localhost)
 * - NNA_DB_PORT: Database port (default: 5432)
 * - NNA_DB_NAME: Database name
 * - NNA_DB_USER: Database username
 * - NNA_DB_PASSWORD: Database password
 * - NNA_DB_SSL: Enable SSL (true/false)
 * 
 * Redis Cache:
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 * 
 * Monitoring:
 * - ENABLE_PERFORMANCE_MONITORING: Enable performance tracking (true/false)
 * - SLOW_QUERY_THRESHOLD_MS: Threshold for slow query alerts (default: 100)
 * - ALERT_ON_SLOW_QUERY: Alert on slow queries (true/false)
 * - ENABLE_CACHE_MONITORING: Enable cache monitoring (true/false)
 * - CACHE_TARGET_HIT_RATE: Target cache hit rate (default: 0.8)
 * - ALERT_ON_LOW_CACHE_HIT_RATE: Alert on low cache hit rate (true/false)
 * 
 * Example .env file:
 * 
 * ```env
 * # NNA Registry Database
 * NNA_DB_HOST=localhost
 * NNA_DB_PORT=5432
 * NNA_DB_NAME=nna_registry
 * NNA_DB_USER=algorhythm_user
 * NNA_DB_PASSWORD=secure_password
 * NNA_DB_SSL=false
 * 
 * # Redis Cache
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 * REDIS_PASSWORD=
 * REDIS_DB=0
 * 
 * # Monitoring
 * ENABLE_PERFORMANCE_MONITORING=true
 * SLOW_QUERY_THRESHOLD_MS=100
 * ALERT_ON_SLOW_QUERY=true
 * ENABLE_CACHE_MONITORING=true
 * CACHE_TARGET_HIT_RATE=0.8
 * ALERT_ON_LOW_CACHE_HIT_RATE=true
 * 
 * # Application
 * NODE_ENV=development
 * PORT=3000
 * ```
 */