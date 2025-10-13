import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        // Check if Redis is disabled
        const redisEnabled = configService.get<string>('REDIS_ENABLED');
        if (redisEnabled === 'false') {
          console.log('🔴 Redis is disabled via REDIS_ENABLED=false');
          return null;
        }
        
        const redisUrl = configService.get<string>('REDIS_URL');
        
        if (!redisUrl) {
          console.log('🔴 REDIS_URL environment variable is not set!');
          console.log('🔴 Redis will be disabled - service will use in-memory cache');
          console.log('🔴 Service will start without Redis (graceful degradation)');
          return null; // Don't throw error, just return null
        }
        
        console.log('🔴 Redis URL:', redisUrl.includes('localhost') ? 'fallback-local' : 'cloud-redis');
        console.log('🔴 Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
        
        try {
          const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            keyPrefix: 'algorhythm:',
            lazyConnect: true,
            connectTimeout: 5000, // 5 second timeout
            commandTimeout: 3000,  // 3 second command timeout
          });

          redis.on('connect', () => {
            console.log('✅ Redis connected successfully');
          });

          redis.on('error', (error) => {
            console.warn('⚠️ Redis connection error (non-blocking):', error.message);
            console.warn('⚠️ Service will continue without Redis caching');
          });

          redis.on('ready', () => {
            console.log('✅ Redis is ready for commands');
          });

          redis.on('close', () => {
            console.log('⚠️ Redis connection closed');
          });

          return redis;
        } catch (error) {
          console.warn('⚠️ Redis initialization failed (non-blocking):', error.message);
          console.warn('⚠️ Service will continue without Redis caching');
          return null; // Don't throw error, just return null
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
