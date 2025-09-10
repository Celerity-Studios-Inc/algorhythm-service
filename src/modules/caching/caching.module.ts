import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { TemplateCacheStrategy } from './strategies/template-cache.strategy';
import { ScoreCacheStrategy } from './strategies/score-cache.strategy';
import { AnalyticsCacheStrategy } from './strategies/analytics-cache.strategy';
import { RedisModule } from '../../config/redis.config';

@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    TemplateCacheStrategy,
    ScoreCacheStrategy,
    AnalyticsCacheStrategy,
  ],
  exports: [CacheService],
})
export class CachingModule {}
