import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';
import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';

@Injectable()
export class TemplateCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  async getRecommendation(songId: string, userContext: any): Promise<any | null> {
    const key = this.buildRecommendationKey(songId, userContext);
    return await this.cacheService.get(key);
  }

  async setRecommendation(
    songId: string,
    userContext: any,
    recommendation: any,
  ): Promise<boolean> {
    const key = this.buildRecommendationKey(songId, userContext);
    return await this.cacheService.set(
      key,
      recommendation,
      CACHE_TTL.TEMPLATE_RECOMMENDATION,
    );
  }

  async getPopularTemplates(songId: string): Promise<TemplateRecommendation[] | null> {
    const key = `${CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
    return await this.cacheService.get(key);
  }

  async setPopularTemplates(
    songId: string,
    templates: TemplateRecommendation[],
  ): Promise<boolean> {
    const key = `${CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
    return await this.cacheService.set(
      key,
      templates,
      CACHE_TTL.POPULAR_TEMPLATES,
    );
  }

  async invalidateRecommendationsForSong(songId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:*`;
    return await this.cacheService.deletePattern(pattern);
  }

  private buildRecommendationKey(songId: string, userContext: any): string {
    // Create a stable hash of user context for caching
    const contextHash = this.hashUserContext(userContext);
    return `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:${contextHash}`;
  }

  private hashUserContext(userContext: any): string {
    // Simple hash of user context for cache key generation
    const relevant = {
      preferences: userContext.preferences || {},
      platform: userContext.device_info?.platform,
    };
    
    return Buffer.from(JSON.stringify(relevant)).toString('base64').substring(0, 16);
  }
}
