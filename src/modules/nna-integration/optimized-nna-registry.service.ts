import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CacheService } from '../caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class OptimizedNnaRegistryService {
  private readonly logger = new Logger(OptimizedNnaRegistryService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.baseUrl = this.configService.get<string>('NNA_REGISTRY_BASE_URL') || 'https://registry.dev.reviz.dev';
    this.apiKey = this.configService.get<string>('NNA_REGISTRY_API_KEY') || 'fallback-api-key';
    
    // 🔍 ADD DEBUG LOG
    this.logger.log(`🔍 [INIT] NNA Registry URL: ${this.baseUrl}`);
    this.logger.log(`🔍 [INIT] OptimizedNnaRegistryService initialized`);
  }

  /**
   * 🚀 OPTIMIZED: Batch fetch composites for multiple songs
   */
  async getBatchCompositesForSongs(songIds: string[]): Promise<Map<string, any[]>> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Batch fetching composites for ${songIds.length} songs`);

    // Check cache first
    const cachedResults = await this.cacheService.getBatchComposites(songIds);
    const uncachedSongs = songIds.filter(songId => !cachedResults.has(songId));
    
    if (uncachedSongs.length === 0) {
      this.logger.debug(`✅ All songs cached, returning in ${Date.now() - startTime}ms`);
      return cachedResults;
    }

    // Batch API call for uncached songs
    const batchResults = new Map<string, any[]>();
    
    // Use individual calls since batch endpoint doesn't exist yet
    const individualResults = await this.getIndividualComposites(uncachedSongs);
    individualResults.forEach((composites, songId) => {
      batchResults.set(songId, composites);
    });

    // Merge cached and batch results
    const finalResults = new Map([...cachedResults, ...batchResults]);
    
    this.logger.debug(`✅ Batch fetch completed in ${Date.now() - startTime}ms`);
    return finalResults;
  }

  /**
   * 🚀 OPTIMIZED: Single song composite fetch with caching
   */
  async getCompositesForSong(songId: string): Promise<any[]> {
    const startTime = Date.now();
    
    // Check cache first
    const cached = await this.cacheService.getCompositesForSong(songId);
    if (cached) {
      this.logger.debug(`✅ Cache hit for song ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    // 🚀 OPTIMIZED: Use our new optimized endpoint for 9ms response time
    const url = `${this.baseUrl}/api/v1/assets/composites/by-song/${songId}`;
    
    try {
      this.logger.log(`🔍 [API CALL] Calling NNA Registry: ${url}`);
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            limit: 100,
            compositeType: 'full',
            includeMetadata: true,
          },
          timeout: 2000, // Reduced timeout since optimized endpoint is 9ms
        })
      );

      if (response.data?.success && response.data?.data) {
        const composites = response.data.data;
        const duration = Date.now() - startTime;
        
        // Cache the results
        await this.cacheService.setCompositesForSong(songId, composites);
        
        this.logger.log(`✅ [API CALL] Success! ${composites.length} composites in ${duration}ms`);
        return composites;
      } else {
        this.logger.warn(`⚠️ [API CALL] No data in response for ${songId}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ [API CALL] Failed after ${duration}ms: ${error.message}`);
      this.logger.error(`❌ [API CALL] URL was: ${url}`);
      this.logger.error(`❌ [API CALL] Error: ${error.stack}`);
    }

    return [];
  }

  /**
   * 🚀 OPTIMIZED: Batch fetch with individual fallback
   */
  private async getIndividualComposites(songIds: string[]): Promise<Map<string, any[]>> {
    const results = new Map<string, any[]>();
    
    // Process in parallel with limited concurrency
    const concurrency = 5;
    const chunks = this.chunkArray(songIds, concurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (songId) => {
        try {
          const composites = await this.getCompositesForSong(songId);
          return { songId, composites };
        } catch (error) {
          this.logger.warn(`Failed to fetch composites for ${songId}: ${error.message}`);
          return { songId, composites: [] };
        }
      });
      
      const chunkResults = await Promise.allSettled(promises);
      chunkResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.songId, result.value.composites);
        }
      });
    }
    
    return results;
  }

  /**
   * 🚀 OPTIMIZED: Pre-compute scores for popular songs
   */
  async precomputeScoresForPopularSongs(songIds: string[]): Promise<void> {
    this.logger.log(`🚀 Pre-computing scores for ${songIds.length} popular songs`);
    
    const batchComposites = await this.getBatchCompositesForSongs(songIds);
    
    for (const [songId, composites] of batchComposites) {
      if (composites.length > 0) {
        // Pre-compute and cache scores
        await this.precomputeScoresForSong(songId, composites);
      }
    }
  }

  private async precomputeScoresForSong(songId: string, composites: any[]): Promise<void> {
    // This will be implemented with the scoring service
    // For now, just cache the composites
    const cacheKey = `${CACHE_KEYS.PRE_COMPUTED_SCORES}:${songId}`;
    await this.cacheService.set(cacheKey, composites, CACHE_TTL.PRE_COMPUTED_SCORES);
  }

  private getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
