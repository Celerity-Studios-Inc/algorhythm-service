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
