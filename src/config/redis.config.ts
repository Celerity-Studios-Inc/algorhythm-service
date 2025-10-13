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
          console.error('❌ REDIS_URL environment variable is not set!');
          console.error('❌ Please ensure REDIS_URL is loaded from Secret Manager');
          
          // Only allow localhost fallback in development
          if (process.env.NODE_ENV === 'development' && process.env.ALLOW_LOCALHOST_REDIS === 'true') {
            console.warn('⚠️ Using localhost Redis fallback for development');
            const fallbackUrl = 'redis://localhost:6379';
            console.log('🔴 Redis URL (fallback):', fallbackUrl);
            return new Redis(fallbackUrl, {
              maxRetriesPerRequest: 3,
              keyPrefix: 'algorhythm:',
              lazyConnect: true,
            });
          }
          
          throw new Error('REDIS_URL environment variable is required');
        }
        
        console.log('🔴 Redis URL:', redisUrl.includes('localhost') ? 'fallback-local' : 'cloud-redis');
        console.log('🔴 Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
        
        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          keyPrefix: 'algorhythm:',
          lazyConnect: true,
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('error', (error) => {
          console.error('❌ Redis connection error:', error);
          console.error('❌ Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
        });

        redis.on('ready', () => {
          console.log('✅ Redis is ready for commands');
        });

        redis.on('close', () => {
          console.log('⚠️ Redis connection closed');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
