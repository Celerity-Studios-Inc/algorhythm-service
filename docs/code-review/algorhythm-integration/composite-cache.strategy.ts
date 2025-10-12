import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';

@Injectable()
export class CompositeCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  /**
   * Cache composite queries for fast retrieval
   */
  async getCompositesForSong(songId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.COMPOSITE_QUERIES}:song:${songId}`;
    return await this.cacheService.get(key);
  }

  async setCompositesForSong(songId: string, composites: any[]): Promise<boolean> {
    const key = `${CACHE_KEYS.COMPOSITE_QUERIES}:song:${songId}`;
    return await this.cacheService.set(key, composites, CACHE_TTL.COMPOSITE_QUERIES);
  }

  /**
   * Cache template recommendations with pre-computed scores
   */
  async getTemplateRecommendations(songId: string, userId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:${userId}`;
    return await this.cacheService.get(key);
  }

  async setTemplateRecommendations(songId: string, userId: string, recommendations: any): Promise<boolean> {
    const key = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:${userId}`;
    return await this.cacheService.set(key, recommendations, CACHE_TTL.TEMPLATE_RECOMMENDATION);
  }

  /**
   * Batch cache operations for multiple songs
   */
  async getBatchComposites(songIds: string[]): Promise<Map<string, any[]>> {
    const keys = songIds.map(songId => `${CACHE_KEYS.COMPOSITE_QUERIES}:song:${songId}`);
    const results = await this.cacheService.mget(keys);
    
    const resultMap = new Map<string, any[]>();
    songIds.forEach((songId, index) => {
      if (results[index]) {
        resultMap.set(songId, results[index]);
      }
    });
    
    return resultMap;
  }

  async setBatchComposites(compositesBySong: Map<string, any[]>): Promise<boolean> {
    const keyValuePairs = Array.from(compositesBySong.entries()).map(([songId, composites]) => ({
      key: `${CACHE_KEYS.COMPOSITE_QUERIES}:song:${songId}`,
      value: composites,
      ttl: CACHE_TTL.COMPOSITE_QUERIES,
    }));

    return await this.cacheService.mset(keyValuePairs);
  }

  /**
   * Cache invalidation
   */
  async invalidateSongCache(songId: string): Promise<number> {
    const patterns = [
      `${CACHE_KEYS.COMPOSITE_QUERIES}:song:${songId}`,
      `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:*`,
    ];
    
    let deletedCount = 0;
    for (const pattern of patterns) {
      deletedCount += await this.cacheService.deletePattern(pattern);
    }
    
    return deletedCount;
  }

  /**
   * Cache warming for popular songs
   */
  async warmCacheForPopularSongs(songIds: string[]): Promise<void> {
    // This will be called during off-peak hours to pre-populate cache
    for (const songId of songIds) {
      // Pre-fetch and cache composites for popular songs
      // Implementation will be added in the service layer
    }
  }
}
