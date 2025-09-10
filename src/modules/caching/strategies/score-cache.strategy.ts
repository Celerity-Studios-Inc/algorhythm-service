import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';

@Injectable()
export class ScoreCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  async getCompatibilityScore(songId: string, templateId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
    return await this.cacheService.get(key);
  }

  async setCompatibilityScore(
    songId: string,
    templateId: string,
    score: any,
  ): Promise<boolean> {
    const key = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
    return await this.cacheService.set(
      key,
      score,
      CACHE_TTL.COMPATIBILITY_SCORES,
    );
  }

  async getCompatibilityScores(
    songId: string,
    templateIds: string[],
  ): Promise<(any | null)[]> {
    const keys = templateIds.map(templateId => 
      `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`
    );
    
    return await this.cacheService.mget(keys);
  }

  async setCompatibilityScores(
    songId: string,
    scores: Array<{ templateId: string; score: any }>,
  ): Promise<boolean> {
    const keyValuePairs = scores.map(({ templateId, score }) => ({
      key: `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`,
      value: score,
      ttl: CACHE_TTL.COMPATIBILITY_SCORES,
    }));

    return await this.cacheService.mset(keyValuePairs);
  }

  async invalidateScoresForSong(songId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:*`;
    return await this.cacheService.deletePattern(pattern);
  }

  async invalidateScoresForTemplate(templateId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.COMPATIBILITY_SCORES}:*:${templateId}`;
    return await this.cacheService.deletePattern(pattern);
  }
}
