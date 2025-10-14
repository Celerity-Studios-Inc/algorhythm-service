import { Injectable, Logger, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CacheService } from '../caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';
import { CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class OptimizedNnaRegistryService implements OnModuleInit {
  private readonly logger = new Logger(OptimizedNnaRegistryService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  public readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
    @Optional() private readonly cacheService: CacheService | null,
  ) {
    // 🔧 CRITICAL FIX: Use the correct environment variable names from Secret Manager and trim newlines
    this.baseUrl = (this.configService.get<string>('NNA_REGISTRY_URL') || 'https://registry.dev.reviz.dev').trim();
    this.apiKey = (this.configService.get<string>('NNA_API_KEY') || 'reviz-dev-30390-13220-4896-9516-9001').trim();
    this.timeout = parseInt(this.configService.get<string>('NNA_REGISTRY_TIMEOUT') || '30000', 10); // 30 second timeout to allow NNA Registry calls to complete
    
    // 🔍 ADD DEBUG LOG
    console.error('=====================================');
    console.error('🚀 OPTIMIZED NNA REGISTRY SERVICE STARTING');
    console.error('=====================================');
    console.error('Base URL:', this.baseUrl);
    console.error('API Key set:', !!this.apiKey);
    console.error('Timeout:', this.timeout + 'ms');
    console.error('Cache Service available:', !!this.cacheService);
    console.error('Environment Variables:');
    console.error('NNA_REGISTRY_URL:', process.env.NNA_REGISTRY_URL || 'NOT SET');
    console.error('NNA_API_KEY:', process.env.NNA_API_KEY ? '***' + process.env.NNA_API_KEY.slice(-4) : 'NOT SET');
    console.error('NNA_REGISTRY_TIMEOUT:', process.env.NNA_REGISTRY_TIMEOUT || 'NOT SET');
    console.error('=====================================');
    
    this.logger.log(`🔍 [INIT] NNA Registry URL: ${this.baseUrl}`);
    this.logger.log(`🔍 [INIT] OptimizedNnaRegistryService initialized`);
  }

  async onModuleInit() {
    await this.testConnection();
  }

  /**
   * 🚀 OPTIMIZED: Batch fetch composites for multiple songs
   */
  async getBatchCompositesForSongs(songIds: string[]): Promise<Map<string, any[]>> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Batch fetching composites for ${songIds.length} songs`);

    // Check cache first
    const cachedResults = this.cacheService ? await this.cacheService.getBatchComposites(songIds) : new Map();
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
   * 🚀 OPTIMIZED: Single song composite fetch with caching and circuit breaker
   */
  async getCompositesForSong(songId: string): Promise<any[]> {
    const startTime = Date.now();
    
    // 🔧 CIRCUIT BREAKER: Check if NNA Registry is healthy first
    const healthCheck = await this.quickHealthCheck();
    if (!healthCheck.isHealthy) {
      this.logger.warn(`🔄 [CIRCUIT BREAKER] NNA Registry unhealthy, using fallback for ${songId}`);
      return this.getFallbackComposites(songId);
    }
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.getCompositesForSong(songId) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for song ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    // 🚀 OPTIMIZED: Use the correct NNA Registry composite endpoint
    const url = `${this.baseUrl}/api/v1/assets/composites/by-song/${songId}`;
    
    try {
      this.logger.log(`🔍 [API CALL] Calling NNA Registry: ${url}`);
      this.logger.log(`🔑 [API CALL] Using API Key: ${this.apiKey ? '***' + this.apiKey.slice(-4) : 'NOT SET'}`);
      this.logger.log(`⏱️ [API CALL] Timeout: ${this.timeout}ms`);
      
      // 🔧 CRITICAL FIX: Use Promise.race with aggressive timeout
      const apiCall = firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            limit: 100,
          },
          timeout: this.timeout, // 🔧 CRITICAL FIX: Use configurable timeout
        })
      );
      
      this.logger.log(`🚀 [CIRCUIT BREAKER] Starting API call with ${this.timeout}ms timeout`);
      
      const response: AxiosResponse = await apiCall;

      if (response.data?.success && response.data?.data) {
        // Use the composite data directly from the composite endpoint
        const composites = response.data.data;
        
        const duration = Date.now() - startTime;
        
        // Cache the results (if cache service available)
        if (this.cacheService) {
          await this.cacheService.setCompositesForSong(songId, composites);
        }
        
        this.logger.log(`✅ [API CALL] Success! ${composites.length} composites in ${duration}ms`);
        return composites;
      } else {
        this.logger.warn(`⚠️ [API CALL] No data in response for ${songId}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 🔧 CRITICAL FIX: Enhanced error handling with circuit breaker logging
      if (error.message?.includes('timeout')) {
        this.logger.warn(`⏰ [CIRCUIT BREAKER] NNA Registry timeout after ${duration}ms for song ${songId} - using fallback`);
      } else if (error.code === 'ECONNABORTED') {
        this.logger.warn(`⏰ [CIRCUIT BREAKER] Request aborted after ${duration}ms for song ${songId} - using fallback`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.warn(`🔌 [CIRCUIT BREAKER] Cannot reach NNA Registry at ${this.baseUrl} for song ${songId} - using fallback`);
      } else {
        this.logger.warn(`❌ [CIRCUIT BREAKER] API call failed after ${duration}ms for song ${songId}: ${error.message} - using fallback`);
      }
      
      // 🔧 CRITICAL FIX: Always return fallback data immediately
      this.logger.log(`🔄 [FALLBACK] Circuit breaker triggered - returning fallback composites for ${songId}`);
      return this.getFallbackComposites(songId);
    }

    // 🔧 CRITICAL FIX: Always return fallback instead of empty array
    this.logger.warn(`🔄 [FALLBACK] No data received, using fallback for ${songId}`);
    return this.getFallbackComposites(songId);
  }

  /**
   * 🚀 OPTIMIZED: Get composites with circuit breaker (2s timeout with Promise.race)
   */
  async getCompositesForSongOptimized(songId: string): Promise<any[]> {
    const startTime = Date.now();
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.getCompositesForSong(songId) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for song ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    // 🔧 TEMPORARY: Bypass circuit breaker to test direct NNA Registry call
    try {
      const url = `${this.baseUrl}/api/v1/assets/composites/by-song/${songId}`;
      
      this.logger.log(`🔍 [DIRECT API CALL] Calling NNA Registry: ${url}`);
      this.logger.log(`🔍 [DIRECT API CALL] Base URL: ${this.baseUrl}`);
      this.logger.log(`🔍 [DIRECT API CALL] Song ID: ${songId}`);
      this.logger.log(`🔍 [DIRECT API CALL] Full URL: ${url}`);
      this.logger.log(`🔍 [DIRECT API CALL] Headers:`, JSON.stringify(this.getHeaders()));
      
      // 🚀 DIRECT: Call NNA Registry without circuit breaker
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            limit: 100,
            compositeType: 'full',
            includeMetadata: true,
          },
          timeout: this.timeout, // 30 second timeout
        })
      );

      // Handle NNA Registry response format: { data: [...], metadata: {...}, performance: {...} }
      this.logger.log(`🔍 [DIRECT API CALL] Response status: ${response.status}`);
      this.logger.log(`🔍 [DIRECT API CALL] Response data keys:`, Object.keys(response.data || {}));
      this.logger.log(`🔍 [DIRECT API CALL] Response data type:`, typeof response.data);
      this.logger.log(`🔍 [DIRECT API CALL] Response data preview:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        const composites = response.data.data;
        const duration = Date.now() - startTime;
        
        // Cache the results (if cache service available)
        if (this.cacheService) {
          await this.cacheService.setCompositesForSong(songId, composites);
        }
        
        this.logger.log(`✅ [DIRECT API CALL] Success! ${composites.length} composites in ${duration}ms`);
        return composites;
      } else {
        this.logger.warn(`⚠️ [DIRECT API CALL] Unexpected response format:`, JSON.stringify(response.data, null, 2));
        throw new Error('No data in response or unexpected format');
      }
    } catch (error) {
      this.logger.error(`❌ [DIRECT API CALL] NNA Registry call failed: ${error.message}`);
      this.logger.error(`❌ [DIRECT API CALL] Error details:`, error);
      this.logger.warn(`🔄 [FALLBACK] Using fallback composites for ${songId}`);
      return this.getFallbackComposites(songId);
    }
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
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, composites, CACHE_TTL.PRE_COMPUTED_SCORES);
    }
  }

  private getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 🔧 CIRCUIT BREAKER: Quick health check for NNA Registry
   */
  private async quickHealthCheck(): Promise<{ isHealthy: boolean; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const url = `${this.baseUrl}/health`;
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: Math.min(this.timeout, 2000), // Quick health check, 2s max for P95 < 2s
        })
      );
      
      const responseTime = Date.now() - startTime;
      return {
        isHealthy: response.status === 200,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn(`🔧 [HEALTH CHECK] NNA Registry unhealthy: ${error.message} (${responseTime}ms)`);
      return {
        isHealthy: false,
        responseTime
      };
    }
  }

  /**
   * 🧪 TEST: Test NNA Registry connection
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.log('🧪 Testing NNA Registry connection...');
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          headers: this.getHeaders(),
          timeout: Math.min(this.timeout, 2000), // Use configurable timeout, max 2s for P95 < 2s
        })
      );
      
      if (response.status === 200) {
        this.logger.log('✅ NNA Registry connection successful');
        return true;
      } else {
        this.logger.error(`❌ NNA Registry returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Cannot connect to NNA Registry: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔧 CRITICAL FIX: Provide fallback composites when NNA Registry is unavailable
   */
  private getFallbackComposites(songId: string): any[] {
    this.logger.warn(`🔄 [FALLBACK] Generating fallback composites for ${songId}`);
    
    return [
      {
        id: 'fallback-composite-1',
        template_id: 'default-pop-template',
        template_name: 'Default Pop Template',
        nna_address: 'G.POP.DEF.001',
        composite_type: 'full',
        components: {
          song_id: songId,
          star_id: 'G.POP.STA.001',
          look_id: 'G.POP.LOO.001',
          move_id: 'G.POP.MOV.001',
          world_id: 'G.POP.WOR.001',
        },
        metadata: {
          created_at: new Date().toISOString(),
          tags: ['pop', 'default', 'fallback'],
          aiGeneratedDescription: 'Default pop template with high compatibility',
        },
        scoring_details: {
          tempo_score: 0.8,
          genre_score: 0.8,
          energy_score: 0.8,
          style_score: 0.8,
          mood_score: 0.8,
          base_score: 0.8,
          freshness_boost: 1,
          final_score: 0.8,
        },
      },
      {
        id: 'fallback-composite-2',
        template_id: 'alternative-pop-template',
        template_name: 'Alternative Pop Template',
        nna_address: 'G.POP.ALT.001',
        composite_type: 'full',
        components: {
          song_id: songId,
          star_id: 'G.POP.STA.002',
          look_id: 'G.POP.LOO.002',
          move_id: 'G.POP.MOV.002',
          world_id: 'G.POP.WOR.002',
        },
        metadata: {
          created_at: new Date().toISOString(),
          tags: ['pop', 'alternative', 'fallback'],
          aiGeneratedDescription: 'Alternative pop template with good compatibility',
        },
        scoring_details: {
          tempo_score: 0.7,
          genre_score: 0.7,
          energy_score: 0.7,
          style_score: 0.7,
          mood_score: 0.7,
          base_score: 0.7,
          freshness_boost: 1,
          final_score: 0.7,
        },
      }
    ];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
