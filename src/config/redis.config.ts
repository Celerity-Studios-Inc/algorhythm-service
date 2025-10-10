import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        console.log('🔴 Redis URL:', redisUrl.includes('localhost') ? 'fallback-local' : 'cloud-redis');
        
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
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
