// src/modules/recommendations/recommendations.service.ts
import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { OptimizedNnaRegistryService } from '@nna-registry/optimized';
import { ScoringService } from './scoring.service';
import { TemplateRequestDto, CompositeRequestDto, LayerVariationRequestDto } from './dto';
import { 
  RecommendationResponse, 
  CompositeRecommendationResponse, 
  LayerVariationResponse 
} from './interfaces';

/**
 * AlgoRhythm Recommendations Service
 * 
 * Core service for providing AI-powered recommendations for video templates,
 * composites, and layer variations. Uses optimized NNA Registry queries with
 * Redis caching for sub-500ms response times.
 * 
 * Performance Targets:
 * - Cold start: <500ms
 * - Warm cache: <50ms
 * - Cache hit rate: >80%
 * 
 * @version 2.0.0 - FIXED: Now using OptimizedNnaRegistryService
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly CACHE_TTL_SECONDS = {
    TEMPLATE: 86400,      // 24 hours
    COMPOSITE: 43200,     // 12 hours
    LAYER_VARIATION: 21600, // 6 hours
  };

  constructor(
    // ✅ FIXED: Using optimized service instead of legacy
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly scoringService: ScoringService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.logger.log('RecommendationsService initialized with OptimizedNnaRegistryService');
  }

  /**
   * Get template recommendation for a song
   * 
   * @param request - Template recommendation request DTO
   * @returns Recommended template with score and metadata
   * @throws NotFoundException if no matching templates found
   * @throws ServiceUnavailableException if service times out
   */
  async getTemplateRecommendation(
    request: TemplateRequestDto,
  ): Promise<RecommendationResponse> {
    const startTime = Date.now();
    const { song_id, user_preferences } = request;

    // Step 1: Generate cache key
    const cacheKey = this.generateCacheKey('template', song_id, user_preferences);
    this.logger.debug(`Processing template recommendation for song: ${song_id}`);

    // Step 2: Check cache with error handling
    try {
      const cached = await this.cacheManager.get<RecommendationResponse>(cacheKey);
      
      if (cached) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Cache HIT for ${cacheKey} in ${duration}ms`);
        
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
            response_time_ms: duration,
            timestamp: new Date().toISOString(),
          },
        };
      }
      
      this.logger.debug(`Cache MISS for ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Cache check failed: ${error.message}`, error.stack);
      // Continue without cache on error - don't fail the request
    }

    // Step 3: Fetch fresh recommendation using OPTIMIZED service
    const recommendation = await this.fetchFreshTemplateRecommendation(request);
    
    // Step 4: Cache the result with proper TTL
    try {
      await this.cacheManager.set(
        cacheKey,
        recommendation,
        this.CACHE_TTL_SECONDS.TEMPLATE,
      );
      this.logger.debug(`Successfully cached result for ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to cache result: ${error.message}`, error.stack);
      // Don't fail request if caching fails - just log and continue
    }

    const totalDuration = Date.now() - startTime;
    this.logger.log(`Template recommendation completed in ${totalDuration}ms (cache miss)`);

    return {
      ...recommendation,
      metadata: {
        ...recommendation.metadata,
        cached: false,
        response_time_ms: totalDuration,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Fetch fresh template recommendation from NNA Registry
   * Private method that handles the actual query and scoring
   */
  private async fetchFreshTemplateRecommendation(
    request: TemplateRequestDto,
  ): Promise<RecommendationResponse> {
    const queryStart = Date.now();

    try {
      // ✅ Use optimized service with timeout protection
      const composites = await this.withTimeout(
        this.optimizedNnaRegistryService.findMatchingComposites({
          songId: request.song_id,
          limit: 20, // Get top 20 for scoring
          includeMetadata: true,
        }),
        5000, // 5 second timeout (should complete in <100ms)
        'NNA Registry query timeout',
      );

      const queryDuration = Date.now() - queryStart;
      this.logger.debug(`NNA Registry query completed in ${queryDuration}ms`);

      if (!composites || composites.length === 0) {
        throw new NotFoundException(
          `No matching templates found for song: ${request.song_id}`,
        );
      }

      // Score and rank composites
      const scoringStart = Date.now();
      const scored = await this.scoringService.scoreTemplates(
        composites,
        request.song_id,
        request.user_preferences,
      );
      const scoringDuration = Date.now() - scoringStart;
      this.logger.debug(`Scoring completed in ${scoringDuration}ms`);

      // Return best match
      const bestMatch = scored[0];
      
      return {
        template_id: bestMatch.composite_id,
        nna_address: bestMatch.nna_address,
        compatibility_score: bestMatch.score,
        layers: {
          stars: bestMatch.layers.stars,
          looks: bestMatch.layers.looks,
          moves: bestMatch.layers.moves,
          worlds: bestMatch.layers.worlds,
          songs: request.song_id,
        },
        reasoning: bestMatch.reasoning,
        alternatives: scored.slice(1, 4).map(alt => ({
          template_id: alt.composite_id,
          nna_address: alt.nna_address,
          compatibility_score: alt.score,
        })),
        metadata: {
          query_time_ms: queryDuration,
          scoring_time_ms: scoringDuration,
          total_candidates: composites.length,
          algorithm_version: this.scoringService.getVersion(),
        },
      };

    } catch (error) {
      if (error.name === 'TimeoutError') {
        // This should NEVER happen with optimized service
        this.logger.error(
          'CRITICAL: NNA Registry query timeout - OptimizedNnaRegistryService should complete in <100ms',
          error.stack,
        );
        throw new ServiceUnavailableException(
          'Recommendation service temporarily unavailable',
        );
      }
      
      // Re-throw other errors (e.g., NotFoundException)
      throw error;
    }
  }

  /**
   * Get composite recommendation
   * Similar to template but with different scoring weights
   */
  async getCompositeRecommendation(
    request: CompositeRequestDto,
  ): Promise<CompositeRecommendationResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('composite', request.composite_id);

    // Check cache
    try {
      const cached = await this.cacheManager.get<CompositeRecommendationResponse>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Cache HIT for composite ${cacheKey} in ${duration}ms`);
        return { ...cached, metadata: { ...cached.metadata, cached: true, response_time_ms: duration } };
      }
    } catch (error) {
      this.logger.error(`Cache check failed: ${error.message}`);
    }

    // Fetch fresh data
    const queryStart = Date.now();
    const composite = await this.withTimeout(
      this.optimizedNnaRegistryService.getCompositeById(request.composite_id),
      5000,
      'Composite query timeout',
    );
    const queryDuration = Date.now() - queryStart;

    if (!composite) {
      throw new NotFoundException(`Composite not found: ${request.composite_id}`);
    }

    const result: CompositeRecommendationResponse = {
      composite_id: composite.id,
      nna_address: composite.nna_address,
      layers: composite.layers,
      metadata: {
        cached: false,
        query_time_ms: queryDuration,
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };

    // Cache result
    try {
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_SECONDS.COMPOSITE);
    } catch (error) {
      this.logger.error(`Failed to cache composite result: ${error.message}`);
    }

    return result;
  }

  /**
   * Get layer variations (alternative layers for same composite)
   */
  async getLayerVariations(
    request: LayerVariationRequestDto,
  ): Promise<LayerVariationResponse> {
    const startTime = Date.now();
    const { composite_id, layer_type, limit = 10 } = request;
    
    const cacheKey = this.generateCacheKey('layer', composite_id, { layer_type });

    // Check cache
    try {
      const cached = await this.cacheManager.get<LayerVariationResponse>(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Cache HIT for layer variations ${cacheKey} in ${duration}ms`);
        return { ...cached, cached: true, response_time_ms: duration };
      }
    } catch (error) {
      this.logger.error(`Cache check failed: ${error.message}`);
    }

    // Fetch variations
    const queryStart = Date.now();
    const variations = await this.withTimeout(
      this.optimizedNnaRegistryService.findLayerVariations({
        compositeId: composite_id,
        layerType: layer_type,
        limit,
      }),
      3000,
      'Layer variations query timeout',
    );
    const queryDuration = Date.now() - queryStart;

    if (!variations || variations.length === 0) {
      throw new NotFoundException(
        `No variations found for ${layer_type} in composite ${composite_id}`,
      );
    }

    // Score variations
    const scored = await this.scoringService.scoreLayerVariations(
      variations,
      composite_id,
      layer_type,
    );

    const result: LayerVariationResponse = {
      composite_id,
      layer_type,
      variations: scored.map(v => ({
        layer_id: v.id,
        nna_address: v.nna_address,
        compatibility_score: v.score,
        metadata: v.metadata,
      })),
      cached: false,
      query_time_ms: queryDuration,
      response_time_ms: Date.now() - startTime,
    };

    // Cache result
    try {
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_SECONDS.LAYER_VARIATION);
    } catch (error) {
      this.logger.error(`Failed to cache layer variations: ${error.message}`);
    }

    return result;
  }

  /**
   * Manually refresh cache for a specific item
   * Used by admin endpoints or scheduled jobs
   */
  async refreshCache(type: 'template' | 'composite' | 'layer', identifier: string): Promise<void> {
    const cacheKey = this.generateCacheKey(type, identifier);
    
    this.logger.log(`Manually refreshing cache for ${cacheKey}`);
    
    try {
      // Delete existing cache entry
      await this.cacheManager.del(cacheKey);
      
      // Trigger fresh fetch based on type
      switch (type) {
        case 'template':
          await this.getTemplateRecommendation({ song_id: identifier });
          break;
        case 'composite':
          await this.getCompositeRecommendation({ composite_id: identifier });
          break;
        default:
          throw new Error(`Unknown cache type: ${type}`);
      }
      
      this.logger.log(`Cache refreshed successfully for ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to refresh cache for ${cacheKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    total_keys: number;
    template_keys: number;
    composite_keys: number;
    layer_keys: number;
  }> {
    // Note: This is Redis-specific. Adjust if using different cache provider
    const keys = await this.cacheManager.store.keys('algorhythm:*');
    
    return {
      total_keys: keys.length,
      template_keys: keys.filter(k => k.includes(':template:')).length,
      composite_keys: keys.filter(k => k.includes(':composite:')).length,
      layer_keys: keys.filter(k => k.includes(':layer:')).length,
    };
  }

  /**
   * Helper: Generate consistent cache keys
   */
  private generateCacheKey(
    type: string,
    identifier: string,
    params?: Record<string, any>,
  ): string {
    const base = `algorhythm:${type}:${identifier}`;
    
    if (!params || Object.keys(params).length === 0) {
      return base;
    }
    
    // Add sorted params to ensure consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join(':');
    
    return `${base}:${sortedParams}`;
  }

  /**
   * Helper: Wrap promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          const error: any = new Error(errorMessage);
          error.name = 'TimeoutError';
          reject(error);
        }, timeoutMs),
      ),
    ]);
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    nna_registry: boolean;
    cache: boolean;
    details?: string;
  }> {
    const checks = {
      nna_registry: false,
      cache: false,
    };

    // Check NNA Registry connection
    try {
      await this.withTimeout(
        this.optimizedNnaRegistryService.healthCheck(),
        2000,
        'NNA Registry health check timeout',
      );
      checks.nna_registry = true;
    } catch (error) {
      this.logger.error(`NNA Registry health check failed: ${error.message}`);
    }

    // Check cache connection
    try {
      await this.cacheManager.set('health:check', 'ok', 10);
      const value = await this.cacheManager.get('health:check');
      checks.cache = value === 'ok';
      await this.cacheManager.del('health:check');
    } catch (error) {
      this.logger.error(`Cache health check failed: ${error.message}`);
    }

    // Determine overall status
    const allHealthy = checks.nna_registry && checks.cache;
    const someHealthy = checks.nna_registry || checks.cache;

    return {
      status: allHealthy ? 'ok' : someHealthy ? 'degraded' : 'down',
      ...checks,
      details: !allHealthy ? 'Some services are unavailable' : undefined,
    };
  }
}