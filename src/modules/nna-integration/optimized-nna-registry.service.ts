import { Injectable, Logger, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
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
    this.timeout = parseInt(this.configService.get<string>('NNA_REGISTRY_TIMEOUT') || '10000', 10); // 10 second timeout to match NNA Registry performance
    
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

    // ✅ HTTP Keep-Alive: reduce TCP/TLS overhead for registry calls
    const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });
    // Nest HttpService wraps axios; set a default agent via axiosRef if available
    try {
      // axiosRef is available on HttpService in NestJS
      (this.httpService as any).axiosRef.defaults.httpsAgent = keepAliveAgent;
      (this.httpService as any).axiosRef.defaults.timeout = this.timeout;
      this.logger.log(`🔧 [INIT] Keep-Alive agent enabled (maxSockets=100)`);
    } catch (e) {
      this.logger.warn(`⚠️ [INIT] Failed to set keep-alive agent: ${e?.message || e}`);
    }
  }

  async onModuleInit() {
    await this.testConnection();
  }

  // Getter methods for external access
  get registryBaseUrl(): string {
    return this.baseUrl;
  }

  get registryApiKey(): string {
    return this.apiKey;
  }

  get registryTimeout(): number {
    return this.timeout;
  }

  get registryCircuitBreaker(): CircuitBreakerService {
    return this.circuitBreaker;
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
    const memoryCache = (global as any).__nna_cache || ((global as any).__nna_cache = new Map());
    const cacheKey = `nna:by-song:${songId}`;
    // 1) Fast in-memory cache (5 min TTL tracked inline)
    const cachedEntry = memoryCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      this.logger.debug(`✅ [MEMCACHE] by-song hit for ${songId} in ${Date.now() - startTime}ms`);
      return cachedEntry.value;
    }
    
    // 🔧 CIRCUIT BREAKER: Check if NNA Registry is healthy first
    const healthCheck = await this.quickHealthCheck();
    if (!healthCheck.isHealthy) {
      this.logger.warn(`🔄 [CIRCUIT BREAKER] NNA Registry unhealthy for ${songId}`);
      throw new Error(`NNA Registry service unavailable: ${healthCheck.responseTime}ms`);
    }
    
    // 2) Distributed cache (if available)
    const cached = this.cacheService ? await this.cacheService.getCompositesForSong(songId) : null;
    if (cached) {
      this.logger.debug(`✅ [DISTCACHE] by-song hit for ${songId} in ${Date.now() - startTime}ms`);
      // refresh in-memory cache too
      memoryCache.set(cacheKey, { value: cached, expiresAt: Date.now() + 5 * 60 * 1000 });
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
        
        // Cache the results
        memoryCache.set(cacheKey, { value: composites, expiresAt: Date.now() + 5 * 60 * 1000 });
        if (this.cacheService) await this.cacheService.setCompositesForSong(songId, composites);
        
        this.logger.log(`✅ [API CALL] Success! ${composites.length} composites in ${duration}ms`);
        return composites;
      } else {
        this.logger.warn(`⚠️ [API CALL] No data in response for ${songId}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 🔧 CRITICAL FIX: Remove all fallback logic - throw proper errors
      if (error.response?.status === 404) {
        this.logger.warn(`🔍 [NOT FOUND] No composites found for song ${songId}`);
        throw new Error(`No composites found for song: ${songId}`);
      } else if (error.response?.status >= 500) {
        this.logger.warn(`🚨 [SERVER ERROR] NNA Registry server error ${error.response.status} for song ${songId}`);
        throw new Error(`NNA Registry server error: ${error.response.status}`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.warn(`🔌 [CONNECTION ERROR] Cannot reach NNA Registry at ${this.baseUrl} for song ${songId}`);
        throw new Error(`Cannot reach NNA Registry: ${error.message}`);
      } else {
        this.logger.warn(`❌ [ERROR] NNA Registry error for ${songId}: ${error.message}`);
        throw new Error(`NNA Registry error: ${error.message}`);
      }
    }

    // 🔧 CRITICAL FIX: No data received - this should not happen
    this.logger.warn(`⚠️ [NO DATA] No data received for ${songId}`);
    throw new Error(`No data received from NNA Registry for song: ${songId}`);
  }


  /**
   * 🎯 NEW: Get composites using AlgoRhythm-compatible endpoint
   * Uses the enhanced NNA Registry endpoint that returns pre-formatted data
   */
  async getCompositesForSongAlgoRhythmFormat(songId: string): Promise<any[]> {
    const startTime = Date.now();
    const cacheKey = `composites:algorhythm:${songId}`;
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.get<any[]>(cacheKey) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for AlgoRhythm composites ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/api/v1/assets/composites/by-song/${songId}/algorhythm`;
      this.logger.debug(`🚀 Fetching AlgoRhythm-formatted composites: ${songId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'x-api-key': this.apiKey },
          timeout: this.timeout
        }).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`NNA Registry AlgoRhythm API error for ${songId}:`, error.message);
            throw error;
          })
        )
      );

      if (response.data && response.data.success) {
        const composites = response.data.data;
        
        // Cache the results
        if (this.cacheService) {
          await this.cacheService.set(cacheKey, composites, 300);
        }
        
        this.logger.debug(`✅ AlgoRhythm composites ${songId} fetched: ${Date.now() - startTime}ms`);
        return composites;
      } else {
        throw new Error(`No AlgoRhythm composites found for song: ${songId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch AlgoRhythm composites ${songId}:`, error.message);
      throw error;
    }
  }

  /**
   * 🎯 NEW: Get layer assets using AlgoRhythm-compatible endpoint
   * Uses the enhanced NNA Registry endpoint that returns pre-formatted layer data
   */
  async getLayerAssetsAlgoRhythmFormatV2(songId: string): Promise<any> {
    const startTime = Date.now();
    const cacheKey = `layers:algorhythm:${songId}`;
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.get(cacheKey) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for AlgoRhythm layers ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/api/v1/assets/layers/by-song/${songId}/algorhythm`;
      this.logger.debug(`🚀 Fetching AlgoRhythm-formatted layers: ${songId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'x-api-key': this.apiKey },
          timeout: this.timeout
        }).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`NNA Registry AlgoRhythm layers API error for ${songId}:`, error.message);
            throw error;
          })
        )
      );

      if (response.data && response.data.success) {
        const layers = response.data.data;
        
        // Cache the results
        if (this.cacheService) {
          await this.cacheService.set(cacheKey, layers, 300);
        }
        
        this.logger.debug(`✅ AlgoRhythm layers ${songId} fetched: ${Date.now() - startTime}ms`);
        return layers;
      } else {
        throw new Error(`No AlgoRhythm layers found for song: ${songId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch AlgoRhythm layers ${songId}:`, error.message);
      throw error;
    }
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
      
      // 🔧 CRITICAL FIX: Remove all fallback logic - throw proper errors
      if (error.response?.status === 404) {
        this.logger.warn(`🔍 [NOT FOUND] No composites found for song ${songId}`);
        throw new Error(`No composites found for song: ${songId}`);
      } else if (error.response?.status >= 500) {
        this.logger.warn(`🚨 [SERVER ERROR] NNA Registry server error: ${error.response.status}`);
        throw new Error(`NNA Registry server error: ${error.response.status}`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        this.logger.warn(`🔌 [CONNECTION ERROR] Cannot reach NNA Registry: ${error.message}`);
        throw new Error(`Cannot reach NNA Registry: ${error.message}`);
      } else {
        this.logger.warn(`❌ [ERROR] NNA Registry error for ${songId}: ${error.message}`);
        throw new Error(`NNA Registry error: ${error.message}`);
      }
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
          timeout: Math.min(this.timeout, 10000), // Quick health check, 10s max to match NNA Registry performance
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
          timeout: Math.min(this.timeout, 10000), // Use configurable timeout, max 10s to match NNA Registry performance
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

  /**
   * Convert HFN to MFA format for NNA Registry calls
   * @param hfn - Human-Friendly Name (e.g., G.POP.TEE.002)
   * @returns Machine-Friendly Address (e.g., 1.018.003.002)
   */
  async convertHfnToMfa(hfn: string): Promise<string> {
    try {
      this.logger.log(`🔄 [HFN→MFA] Converting HFN to MFA: ${hfn}`);
      
      // Parse HFN format: L.CAT.SUB.XXX (e.g., G.POP.TEE.002)
      const hfnParts = hfn.split('.');
      if (hfnParts.length !== 4) {
        this.logger.warn(`Invalid HFN format: ${hfn}`);
        return hfn;
      }

      const [layer, category, subcategory, sequential] = hfnParts;
      
      // Use efficient filtering API to find matching asset
      const url = `${this.baseUrl}/api/v1/assets`;
      this.logger.debug(`Converting HFN: ${hfn} (Layer: ${layer}, Category: ${category}, Subcategory: ${subcategory})`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            layer,
            category,
            subcategory,
            limit: 100,
            sort: 'createdAt',
            order: 'desc',
          },
          timeout: this.timeout,
        })
      );

      if (response.data?.data && Array.isArray(response.data.data)) {
        const assets = response.data.data;
        // Look for an asset with matching name/friendlyName
        const matchingAsset = assets.find(asset => 
          asset.name === hfn || 
          asset.friendlyName === hfn
        );

        if (matchingAsset && matchingAsset.nna_address) {
          this.logger.log(`✅ [HFN→MFA] Found MFA for HFN ${hfn}: ${matchingAsset.nna_address}`);
          return matchingAsset.nna_address;
        }
      }

      this.logger.warn(`No MFA found for HFN: ${hfn}`);
      return hfn; // Return original if no conversion found
    } catch (error) {
      this.logger.warn(`HFN conversion error for ${hfn}:`, error.message);
      return hfn; // Return original if conversion fails
    }
  }

  /**
   * Backend team's exact method name for compatibility
   */
  async getCompositesBySongAlgoRhythmFormat(songId: string, options?: any) {
    const startTime = Date.now();
    const cacheKey = `composites:algorhythm:${songId}`;
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.get(cacheKey) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for AlgoRhythm composites ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/api/v1/assets/composites/by-song/${songId}/algorhythm`;
      this.logger.debug(`🚀 Fetching AlgoRhythm-formatted composites: ${songId}`);
      this.logger.debug(`🔍 [DEBUG] NNA Registry URL: ${url}`);
      this.logger.debug(`🔍 [DEBUG] API Key: ${this.apiKey ? 'SET' : 'NOT SET'}`);
      this.logger.debug(`🔍 [DEBUG] Timeout: ${this.timeout}ms`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'x-api-key': this.apiKey },
          timeout: this.timeout
        }).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`NNA Registry AlgoRhythm API error for ${songId}:`, error.message);
            throw error;
          })
        )
      );

      if (response.data && response.data.success) {
        const composites = response.data.data;
        
        // Cache the results
        if (this.cacheService) {
          await this.cacheService.set(cacheKey, composites, 300); // 5 minutes
        }
        
        this.logger.debug(`✅ AlgoRhythm composites ${songId} fetched: ${Date.now() - startTime}ms`);
        return composites;
      } else {
        throw new Error(`No AlgoRhythm composites found for song: ${songId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch AlgoRhythm composites ${songId}:`, error.message);
      throw error;
    }
  }

  /**
   * Backend team's exact method name for layer assets
   */
  async getLayerAssetsAlgoRhythmFormat(songId: string, options?: any) {
    const startTime = Date.now();
    const cacheKey = `layers:algorhythm:${songId}`;
    
    // Check cache first
    const cached = this.cacheService ? await this.cacheService.get(cacheKey) : null;
    if (cached) {
      this.logger.debug(`✅ Cache hit for AlgoRhythm layers ${songId}: ${Date.now() - startTime}ms`);
      return cached;
    }

    try {
      const url = `${this.baseUrl}/api/v1/assets/composites/layers/${songId}/algorhythm`;
      this.logger.debug(`🚀 Fetching AlgoRhythm-formatted layers: ${songId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'x-api-key': this.apiKey },
          timeout: this.timeout
        }).pipe(
          timeout(this.timeout),
          catchError(error => {
            this.logger.error(`NNA Registry AlgoRhythm layers API error for ${songId}:`, error.message);
            throw error;
          })
        )
      );

      if (response.data && response.data.success) {
        const layers = response.data.data;
        
        // Cache the results
        if (this.cacheService) {
          await this.cacheService.set(cacheKey, layers, 300); // 5 minutes
        }
        
        this.logger.debug(`✅ AlgoRhythm layers ${songId} fetched: ${Date.now() - startTime}ms`);
        return layers;
      } else {
        throw new Error(`No AlgoRhythm layers found for song: ${songId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch AlgoRhythm layers ${songId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get composite by ID for ReViz composite variations
   */
  async getCompositeById(compositeId: string): Promise<any> {
    const cacheKey = `${CACHE_KEYS.COMPOSITE_BY_ID}:${compositeId}`;
    
    try {
      // Check cache first
      if (this.cacheService) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for composite by ID: ${compositeId}`);
          return cached as any;
        }
      }

      const url = `${this.baseUrl}/api/v1/assets/composites/by-id/${compositeId}`;
      this.logger.debug(`🔍 [COMPOSITE BY ID] Calling NNA Registry: ${url}`);
      
      const response = await this.circuitBreaker.executeWithCircuitBreaker(
        () => firstValueFrom(
          this.httpService.get(url, {
            headers: { 'x-api-key': this.apiKey },
            timeout: this.timeout
          }).pipe(
            timeout(this.timeout),
            catchError(error => {
              this.logger.error(`❌ [COMPOSITE BY ID] NNA Registry call failed: ${error.message}`);
              throw error;
            })
          )
        ),
        () => {
          this.logger.warn(`⚠️ [COMPOSITE BY ID] Circuit breaker fallback for composite: ${compositeId}`);
          return null;
        },
        `getCompositeById-${compositeId}`
      );

      const data = response.data;
      this.logger.debug(`✅ [COMPOSITE BY ID] NNA Registry response: ${JSON.stringify(data).substring(0, 200)}...`);

      // Cache the result
      if (this.cacheService && data) {
        await this.cacheService.set(cacheKey, data, CACHE_TTL.COMPOSITE);
      }

      return data;
    } catch (error) {
      this.logger.error(`❌ [COMPOSITE BY ID] Failed to get composite by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 REVIZ INTEGRATION: Get composite variants from NNA Registry
   * 
   * This method calls the NNA Registry composite variants endpoint
   * to get variant assets for a specific composite.
   */
  async getCompositeVariants(compositeId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`🔍 [COMPOSITE VARIANTS] Getting variants for composite: ${compositeId}`);
      
      const url = `${this.baseUrl}/api/v1/assets/composites/by-id/${compositeId}/variants`;
      this.logger.debug(`🔍 [COMPOSITE VARIANTS] Calling NNA Registry: ${url}`);
      
      const response = await this.circuitBreaker.executeWithCircuitBreaker(
        () => firstValueFrom(
          this.httpService.get(url, {
            headers: { 'x-api-key': this.apiKey },
            timeout: this.timeout
          }).pipe(
            timeout(this.timeout),
            catchError(error => {
              this.logger.error(`❌ [COMPOSITE VARIANTS] NNA Registry call failed: ${error.message}`);
              throw error;
            })
          )
        ),
        () => {
          this.logger.warn(`⚠️ [COMPOSITE VARIANTS] Circuit breaker fallback for composite: ${compositeId}`);
          return { 
            data: { success: false, error: 'Circuit breaker fallback' },
            status: 503,
            statusText: 'Service Unavailable',
            headers: {} as any,
            config: { headers: {} } as any
          } as any;
        },
        `getCompositeVariants-${compositeId}`
      );

      const data = response.data;
      const queryTime = Date.now() - startTime;
      
      this.logger.debug(`✅ [COMPOSITE VARIANTS] NNA Registry response in ${queryTime}ms: ${JSON.stringify(data).substring(0, 200)}...`);

      if (!data || !data.success) {
        this.logger.warn(`No composite variants found for composite: ${compositeId}`);
        return { success: false, error: 'No variants found' };
      }

      return data;
    } catch (error) {
      this.logger.error(`❌ [COMPOSITE VARIANTS] Failed to get composite variants: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 REVIZ INTEGRATION: Resolve or generate composite from component IDs
   * 
   * This method calls the NNA Registry composite resolution endpoint to either
   * find an existing composite or trigger generation for the provided components.
   */
  async resolveOrGenerateComposite(componentIds: string[]): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`🔍 [RESOLVE OR GENERATE] Starting resolution for ${componentIds.length} component IDs: ${componentIds.join(', ')}`);
      
      // Map component IDs to components object expected by NNA Registry
      // Expected format: { song: "1.018.003.002", star: "2.009.001.001", look: "3.003.010.002", move: "4.022.002.003", world: "5.004.004.002" }
      this.logger.log(`📊 [DEBUG] Parsing component IDs: ${JSON.stringify(componentIds)}`);
      const components = this.mapComponentIdsToComponents(componentIds);
      
      this.logger.log(`📊 [DEBUG] Mapped components: ${JSON.stringify(components)}`);
      
      if (!components || Object.keys(components).length < 2) {
        this.logger.error(`❌ [RESOLVE OR GENERATE] Invalid component IDs. Components mapped: ${JSON.stringify(components)}`);
        throw new Error(`Invalid component IDs provided. Need at least 2 components. Got: ${Object.keys(components || {}).length}`);
      }
      
      const url = `${this.baseUrl}/api/v1/composites/resolve-or-generate`;
      this.logger.log(`🔍 [RESOLVE OR GENERATE] Calling NNA Registry: ${url}`);
      this.logger.log(`📊 [DEBUG] Base URL: ${this.baseUrl}, API Key: ${this.apiKey ? 'SET' : 'MISSING'}`);
      
      const requestBody = {
        components: components,
        user_context: {
          user_id: 'system',
          email: 'system@algorhythm.media'
        },
        generation_options: {
          priority: 'standard',
          quality: 'standard'
        }
      };
      
      this.logger.log(`📊 [DEBUG] Request body: ${JSON.stringify(requestBody, null, 2)}`);
      
      // Check circuit breaker state before making call
      this.logger.log(`📊 [DEBUG] Circuit breaker key: resolveOrGenerateComposite-${componentIds.join('-')}`);
      
      this.logger.log(`📊 [DEBUG] Executing HTTP request with timeout: ${this.timeout}ms`);
      
      const response = await this.circuitBreaker.executeWithCircuitBreaker(
        () => {
          this.logger.log(`📊 [DEBUG] Making HTTP POST request to: ${url}`);
          return firstValueFrom(
            this.httpService.post(url, requestBody, {
              headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
              timeout: this.timeout
            }).pipe(
              timeout(this.timeout),
              catchError(error => {
                // Handle 404 (composite not found) gracefully - this is expected for CUSTOMIZE flow
                if (error.response?.status === 404) {
                  this.logger.log(`ℹ️ [RESOLVE OR GENERATE] Composite not found (404) - this is expected for non-existent composites`);
                  this.logger.log(`📊 [DEBUG] 404 Response: ${JSON.stringify(error.response?.data || {})}`);
                  // Return a response that indicates composite not found (not an error for CUSTOMIZE)
                  return of({
                    data: {
                      success: false,
                      error: 'Composite not found',
                      status: 'not_found'
                    },
                    status: 404,
                    statusText: 'Not Found',
                    headers: {} as any,
                    config: { headers: {} } as any
                  } as any);
                }
                this.logger.error(`❌ [RESOLVE OR GENERATE] NNA Registry HTTP call failed`);
                this.logger.error(`📊 [DEBUG] Error status: ${error.response?.status || 'unknown'}`);
                this.logger.error(`📊 [DEBUG] Error message: ${error.message}`);
                this.logger.error(`📊 [DEBUG] Error response data: ${JSON.stringify(error.response?.data || {})}`);
                throw error;
              })
            )
          );
        },
        () => {
          this.logger.warn(`⚠️ [RESOLVE OR GENERATE] Circuit breaker fallback triggered - circuit is likely OPEN`);
          return { 
            data: { success: false, error: 'Circuit breaker fallback' },
            status: 503,
            statusText: 'Service Unavailable',
            headers: {} as any,
            config: { headers: {} } as any
          } as any;
        },
        `resolveOrGenerateComposite-${componentIds.join('-')}`
      );
      
      this.logger.log(`📊 [DEBUG] HTTP response received. Status: ${response.status}, StatusText: ${response.statusText}`);

      const data = response.data;
      const queryTime = Date.now() - startTime;
      
      this.logger.log(`✅ [RESOLVE OR GENERATE] NNA Registry response in ${queryTime}ms: ${JSON.stringify(data).substring(0, 500)}...`);

      if (!data) {
        this.logger.warn(`⚠️ [RESOLVE OR GENERATE] No data in response`);
        return { success: false, error: 'No response data from NNA Registry', status: 'not_found' };
      }

      if (!data.success) {
        this.logger.warn(`⚠️ [RESOLVE OR GENERATE] Composite resolution/generation failed: ${data.error || 'Unknown error'}`);
        return { success: false, error: data.error || 'Resolution/generation failed', status: data.status || 'not_found' };
      }

      // Return normalized response
      const result = {
        success: true,
        status: data.data?.status || 'found', // 'found' or 'generating'
        composite_id: data.data?.composite_id || data.data?.compositeId || data.data?.composite_id,
        composite_name: data.data?.composite_name || data.data?.compositeName,
        gcp_storage_url: data.data?.gcp_storage_url || data.data?.gcpStorageUrl,
        thumbnail_url: data.data?.thumbnail_url || data.data?.thumbnailUrl,
        duration_seconds: data.data?.duration_seconds || data.data?.durationSeconds,
        file_size_mb: data.data?.file_size_mb || data.data?.fileSizeMb,
        resolution: data.data?.resolution || '1080p',
        format: data.data?.format || 'mp4'
      };
      
      this.logger.log(`✅ [RESOLVE OR GENERATE] Successfully resolved composite: ${result.composite_id}, status: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ [RESOLVE OR GENERATE] Failed to resolve or generate composite: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map component IDs array to components object expected by NNA Registry
   * Component IDs format: ["1.018.003.002", "2.009.001.001", "3.003.010.002", "4.022.002.003", "5.004.004.002"]
   * Mapped to: { song: "...", star: "...", look: "...", move: "...", world: "..." }
   */
  private mapComponentIdsToComponents(componentIds: string[]): Record<string, string> | null {
    const components: Record<string, string> = {};
    
    for (const componentId of componentIds) {
      // Determine layer based on MFA prefix
      // Format: {layer}.{category}.{subcategory}.{sequential}
      const parts = componentId.split('.');
      if (parts.length < 4) {
        this.logger.warn(`Invalid component ID format: ${componentId}`);
        continue;
      }
      
      const layerPrefix = parts[0];
      
      // Map layer prefix to component name
      // 1 = Song (G), 2 = Star (S), 3 = Look (L), 4 = Move (M), 5 = World (W), P = Personalize
      const layerMap: Record<string, string> = {
        '1': 'song',
        '2': 'star',
        '3': 'look',
        '4': 'move',
        '5': 'world',
        'P': 'personalize'  // Personalize component for generation
      };
      
      const componentName = layerMap[layerPrefix];
      if (componentName) {
        components[componentName] = componentId;
      } else {
        this.logger.warn(`Unknown layer prefix: ${layerPrefix} for component ID: ${componentId}`);
      }
    }
    
    if (Object.keys(components).length < 2) {
      return null;
    }
    
    return components;
  }

  /**
   * 🎯 REVIZ INTEGRATION: Get composite pattern recommendations from NNA Registry
   * 
   * This method calls the new NNA Registry composite pattern recommendations endpoint
   * to get related composites and layer assets with variants.
   */
  async getCompositePatternRecommendations(
    compositeId: string,
    layers: string[] = ['stars', 'looks', 'moves', 'worlds'],
    assetsPerLayer: number = 5,
    variantsPerAsset: number = 3
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`🔍 [COMPOSITE PATTERN] Getting pattern recommendations for composite: ${compositeId}`);
      
      const url = `${this.baseUrl}/api/v1/reviz/composite/pattern-recommendations`;
      this.logger.debug(`🔍 [COMPOSITE PATTERN] Calling NNA Registry: ${url}`);
      
      const requestBody = {
        composite_id: compositeId,
        layers: layers,
        assets_per_layer: assetsPerLayer,
        variants_per_asset: variantsPerAsset
      };
      
      this.logger.debug(`🔍 [COMPOSITE PATTERN] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await this.circuitBreaker.executeWithCircuitBreaker(
        () => firstValueFrom(
          this.httpService.post(url, requestBody, {
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: this.timeout
          }).pipe(
            timeout(this.timeout),
            catchError(error => {
              this.logger.error(`❌ [COMPOSITE PATTERN] NNA Registry call failed: ${error.message}`);
              throw error;
            })
          )
        ),
        () => {
          this.logger.warn(`⚠️ [COMPOSITE PATTERN] Circuit breaker fallback for composite: ${compositeId}`);
          return { 
            data: { success: false, error: 'Circuit breaker fallback' },
            status: 503,
            statusText: 'Service Unavailable',
            headers: {} as any,
            config: { headers: {} } as any
          } as any;
        },
        `getCompositePatternRecommendations-${compositeId}`
      );

      const data = response.data;
      const queryTime = Date.now() - startTime;
      
      this.logger.debug(`✅ [COMPOSITE PATTERN] NNA Registry response in ${queryTime}ms: ${JSON.stringify(data).substring(0, 200)}...`);

      if (!data || !data.success) {
        this.logger.warn(`No composite pattern recommendations found for composite: ${compositeId}`);
        return { success: false, error: 'No pattern recommendations found' };
      }

      return data;
    } catch (error) {
      this.logger.error(`❌ [COMPOSITE PATTERN] Failed to get composite pattern recommendations: ${error.message}`);
      throw error;
    }
  }
}
