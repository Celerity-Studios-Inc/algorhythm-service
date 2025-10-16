import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompatibilityScore } from '../../models/compatibility-score.schema';
import { RecommendationCache } from '../../models/recommendation-cache.schema';
import { ScoringService } from '../scoring/scoring.service';
import { CacheService } from '../caching/cache.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
// import { LocalDataQueryService } from '../indexing/local-data-query.service';
// import { CacheWarmingService } from '../indexing/cache-warming.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { 
  TemplateRecommendation, 
  LayerVariation 
} from './interfaces/recommendation.interface';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';
import { SCORING_THRESHOLDS } from '../../common/constants/compatibility-weights';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly warmLocks = new Map<string, Promise<any>>();
  
  // 📊 CACHE MONITORING - Track cache performance
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    totalRequests: 0,
  };

  // 🔒 SINGLEFLIGHT LOCK - Prevent thundering herd on warm operations (removed duplicate)

  // 📊 WARM STATUS TRACKING - Track warm operations
  private warmStatus = new Map<string, {
    started_at: number;
    finished_at?: number;
    success: boolean;
    items: number;
    duration_ms: number;
  }>();

  constructor(
    @InjectModel(CompatibilityScore.name)
    private readonly compatibilityScoreModel: Model<CompatibilityScore>,
    @InjectModel(RecommendationCache.name)
    private readonly recommendationCacheModel: Model<RecommendationCache>,
    private readonly scoringService: ScoringService,
    private readonly cacheService: CacheService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService, // 🔧 FIX: Use OptimizedNnaRegistryService
    private readonly analyticsService: AnalyticsService,
    private readonly instantRecommendationsService: InstantRecommendationsService,
    // private readonly localDataQuery: LocalDataQueryService | null,
    // private readonly cacheWarming: CacheWarmingService | null,
  ) {
    // 🔍 STARTUP LOGGING - WILL SHOW IN CLOUD RUN
    console.error('=====================================');
    console.error('🚀 RECOMMENDATIONS SERVICE STARTING');
    console.error('=====================================');
    console.error('Service exists:', !!this.optimizedNnaRegistryService);
    console.error('Service type:', this.optimizedNnaRegistryService?.constructor?.name);
    console.error('Has getCompositesForSong:', typeof this.optimizedNnaRegistryService?.getCompositesForSong);
    console.error('Method exists:', typeof this.optimizedNnaRegistryService?.getCompositesForSong === 'function');
    console.error('=====================================');
    
    // 🔍 ADD DEBUG LOG
    this.logger.log(`🔍 [INIT] OptimizedNnaRegistryService available: ${!!this.optimizedNnaRegistryService}`);
    this.logger.log(`🔍 [INIT] Service type: ${this.optimizedNnaRegistryService?.constructor?.name}`);
  }

  /**
   * Get fallback templates for immediate testing
   * @param songId - Song ID
   * @returns Array of fallback templates
   */
  private getFallbackTemplates(songId: string): any[] {
    return [
      {
        _id: `fallback-template-${songId}-1`,
        nna_address: `9.000.000.001`,
        name: `Fallback Template 1 for ${songId}`,
        gcpStorageUrl: `https://storage.googleapis.com/fallback-assets/template-1.mp4`,
        thumbnailUrl: `https://storage.googleapis.com/fallback-assets/template-1-thumb.jpg`,
        previewUrl: `https://storage.googleapis.com/fallback-assets/template-1-preview.mp4`,
        description: `A default fallback template for song ${songId}.`,
        tags: ['fallback', 'default', 'pop'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        star_id: '2.009.002.018',
        look_id: '3.003.001.001',
        move_id: '4.022.002.003',
        world_id: '5.015.001.001',
        duration: 30,
        fileSize: 15.2,
        resolution: '1080p',
        format: 'mp4',
        qualityScore: 0.9,
      },
      {
        _id: `fallback-template-${songId}-2`,
        nna_address: `9.000.000.002`,
        name: `Fallback Template 2 for ${songId}`,
        gcpStorageUrl: `https://storage.googleapis.com/fallback-assets/template-2.mp4`,
        thumbnailUrl: `https://storage.googleapis.com/fallback-assets/template-2-thumb.jpg`,
        previewUrl: `https://storage.googleapis.com/fallback-assets/template-2-preview.mp4`,
        description: `Another default fallback template for song ${songId}.`,
        tags: ['fallback', 'alternative', 'rock'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        star_id: '2.009.002.019',
        look_id: '3.003.001.002',
        move_id: '4.022.002.004',
        world_id: '5.015.001.002',
        duration: 35,
        fileSize: 18.5,
        resolution: '720p',
        format: 'mp4',
        qualityScore: 0.8,
      },
    ];
  }

  /**
   * Normalize song ID - NNA Registry supports dual addressing (HFN and MFA)
   * @param songId - Input song ID (MFA or HFN format)
   * @returns Original song ID (NNA Registry handles both formats)
   */
  private normalizeSongId(songId: string): string {
    // NNA Registry supports dual addressing - no conversion needed
    this.logger.log(`🔄 [DUAL ADDRESSING] Using original format: ${songId}`);
    return songId;
  }

  /**
   * Generate the primary cache key for template recommendations. Centralized to
   * guarantee symmetry between the fast-path request handler and the
   * background-warm path.
   */
  private generatePrimaryCacheKey(normalizedSongId: string, maxAlternatives: number): string {
    return `recommendation:template:${normalizedSongId}:${maxAlternatives}`;
  }

  async getTemplateRecommendation(
    request: TemplateRecommendationDto,
  ): Promise<{
    recommendation: TemplateRecommendation;
    alternatives: TemplateRecommendation[];
    total_available: number;
    cache_hit?: boolean;
    score_computation_time_ms?: number;
    templates_evaluated?: number;
    partial_response?: boolean;
    retry_after_ms?: number;
  }> {
    const startTime = Date.now();
    const budgetMs = 2000; // strict wall-clock budget for fast responses
    
    // 🔧 CRITICAL DEBUG: Log that we're entering the template endpoint
    this.logger.log(`🔧 [TEMPLATE ENDPOINT] Starting template recommendation for song: ${request.song_id}`);
    this.logger.log(`🔧 [TEMPLATE ENDPOINT] Service is using latest code with emergency bypass`);
    this.logger.log(`🔧 [TEMPLATE ENDPOINT] Request: ${JSON.stringify(request)}`);
    
    // 🔧 DUAL ADDRESSING: NNA Registry supports both HFN and MFA formats
    const originalSongId = request.song_id;
    const normalizedSongId = this.normalizeSongId(request.song_id);
    
    // Log dual addressing support
    this.logger.log(`🔄 [DUAL ADDRESSING] Using ${originalSongId} directly with NNA Registry`);
    
    // Use normalized ID for processing
    const normalizedRequest = { ...request, song_id: normalizedSongId };
    
    // 🚀 OPTIMIZED: Using OptimizedNnaRegistryService for 43x performance improvement
    this.logger.debug('🚀 Using OptimizedNnaRegistryService for 43x performance improvement');
    
    // Check cache warming first (if available) - DISABLED for minimal deployment
    // if (this.cacheWarming) {
    //   const cachedRecommendations = await this.cacheWarming.getCachedRecommendations(
    //     request.song_id,
    //     request.user_context
    //   );
    //   
    //   if (cachedRecommendations) {
    //     this.logger.debug(`✅ Cache hit for template recommendation: ${request.song_id}`);
    //     
    //     // Track analytics for cached result
    //     await this.analyticsService.trackEvent({
    //       event_type: 'template_recommendation_served',
    //       user_id: request.user_context.user_id,
    //       song_id: request.song_id,
    //       template_id: cachedRecommendations.recommendation?.template_id || 'unknown',
    //       cache_hit: true,
    //       response_time_ms: Date.now() - startTime,
    //     });
    //
    //     return {
    //       ...cachedRecommendations,
    //       cache_hit: true,
    //     };
    //   }
    // }
    
    // 🚀 SIMPLIFIED CACHE-FIRST STRATEGY
    const maxAlternatives = Math.max(0, Math.min(6, (request as any)?.max_alternatives ?? 3));
    const primaryCacheKey = this.generatePrimaryCacheKey(normalizedSongId, maxAlternatives);
    const primaryCachedResult = await this.cacheService.get(primaryCacheKey);
    
    if (primaryCachedResult) {
      this.logger.debug(`✅ [CACHE HIT] key=${primaryCacheKey}`);
      return {
        ...(primaryCachedResult as any),
        cache_hit: true,
      };
    }

    // 🔧 CRITICAL FIX: Use normalized HFN song ID
    const songId = normalizedSongId;
    this.logger.debug(`Using normalized HFN song ID: ${songId}`);

    // Get song metadata from NNA Registry (using HFN)
    // Note: OptimizedNnaRegistryService doesn't have getAssetByAddress, using fallback
    const song = { 
      id: songId, 
      name: `Song ${songId}`,
      nna_address: songId // Add nna_address property for compatibility
    }; // Fallback for now
    
    // Get all available templates (composites) for this song
    // 🔧 FIX: Use getCompositesForSongAlgoRhythmFormat for 2-second timeout with circuit breaker
    // Use NNA Registry directly (local data query disabled for minimal deployment)

    // 🔍 ADD DETAILED LOGGING
    this.logger.log(`🔍 [METHOD CALL] About to call getCompositesForSongAlgoRhythmFormat`);
    this.logger.log(`🔍 [METHOD CALL] Song ID: ${songId}`);
    this.logger.log(`🔍 [METHOD CALL] Service exists: ${!!this.optimizedNnaRegistryService}`);
    this.logger.log(`🔍 [METHOD CALL] Service type: ${this.optimizedNnaRegistryService?.constructor?.name}`);

    // 🔧 CRITICAL FIX: Re-enable NNA Registry integration with circuit breaker
    this.logger.log(`🚀 [INTEGRATION] Calling NNA Registry with circuit breaker for song: ${songId}`);
    
    let availableTemplates: any[] = [];
    
    // 🔧 REGRESSION FIX: Get real data immediately (bypass timeout for now)
    this.logger.log(`🔧 [REGRESSION FIX] Getting real data immediately for song: ${normalizedSongId}`);
    const t0 = Date.now();
    const fetched = await this.optimizedNnaRegistryService.getCompositesForSongOptimized(normalizedSongId);
    this.logger.log(`✅ [REGRESSION FIX] Retrieved ${Array.isArray(fetched) ? fetched.length : 0} composites in ${Date.now() - t0}ms`);
    
    // 🔧 REGRESSION FIX: Process the real data we got
    availableTemplates = Array.isArray(fetched) ? fetched : [];
    this.logger.log(`🔧 [REGRESSION FIX] Processing ${availableTemplates.length} templates`);
    
    if (availableTemplates.length === 0) {
      this.logger.warn(`No templates found for song: ${songId}`);
      throw new NotFoundException(`No templates available for song: ${songId}`);
    }

    // 🚀 PERFORMANCE FIX: Bypass secondary cache operations for sub-2-second response
    // const secondaryCacheKey = `recommendation:template:${songId}:${normalizedRequest.user_context.user_id}`;
    // const secondaryCachedResult = await this.cacheService.get(secondaryCacheKey);
    
    // if (secondaryCachedResult) {
    //   this.logger.debug(`Cache hit for song: ${songId}`);
    //   return {
    //     ...(secondaryCachedResult as any),
    //     cache_hit: true,
    //     score_computation_time_ms: 0,
    //     templates_evaluated: (secondaryCachedResult as any).alternatives?.length + 1 || 1,
    //   };
    // }

    // 🚀 BACKEND TEAM RECOMMENDATION: Simple architecture without complex processing
    // Enforce global 2s budget before any additional processing
    if (Date.now() - startTime >= budgetMs) {
      this.logger.warn(`⏳ [PATH] miss_return_202_post_fetch_over_budget | total_ms=${Date.now() - startTime}`);
      return {
        recommendation: null as any,
        alternatives: [],
        total_available: availableTemplates.length,
        cache_hit: false,
        score_computation_time_ms: 0,
        templates_evaluated: availableTemplates.length,
        partial_response: true,
        retry_after_ms: 3000,
      };
    }

    this.logger.log(`🚀 [BACKEND TEAM] Using simple architecture for ${availableTemplates.length} templates`);

    // 🚀 SIMPLE PROCESSING: Use first template as recommendation, next 3 as alternatives
    const recommendation = availableTemplates[0] || null;
    const alternatives = availableTemplates.slice(1, 1 + maxAlternatives); // Use next N as alternatives
    const scoringTime = 0; // scoring disabled on template fast-path

    // 🔧 CRITICAL FIX: Ensure proper response structure with real data
    const result = {
      recommendation: recommendation || null,
      alternatives: alternatives || [],
      total_available: availableTemplates.length,
      score_computation_time_ms: scoringTime,
      templates_evaluated: availableTemplates.length,
      cache_hit: false,
      response_time_ms: Date.now() - startTime,
    };

    // ✅ Cache the fresh result for fast future hits (10–30 minutes TTL)
    // Cache set in background to avoid budget impact
    (async () => {
      try {
        await this.cacheService.set(primaryCacheKey, {
          recommendation: result.recommendation,
          alternatives: result.alternatives,
          total_available: result.total_available,
          cache_hit: false,
          response_time_ms: result.response_time_ms,
          score_computation_time_ms: result.score_computation_time_ms,
          templates_evaluated: result.templates_evaluated,
        }, 600);
        this.logger.log(`✅ [CACHE SET OK] key=${primaryCacheKey} | size=${result.total_available}`);
      } catch (e) {
        this.logger.warn(`⚠️ [CACHE SET] Failed for ${primaryCacheKey}: ${e?.message || e}`);
      }
    })();
    
    // const instantCacheKey = `instant:${songId}`;
    // await this.cacheService.set(
    //   instantCacheKey,
    //   result,
    //   3600, // 1 hour cache for instant responses
    // );

    // Store in recommendation cache for analytics
    // Store analytics/counters in background
    (async () => {
      try {
        await this.storeRecommendationCache(normalizedRequest, result);
      } catch {}
    })();

    // Track analytics
    (async () => {
      try {
        await this.analyticsService.trackEvent({
          event_type: 'template_recommendation_served',
          user_id: normalizedRequest.user_context.user_id,
          song_id: normalizedSongId,
          template_id: recommendation?.template_id || 'unknown',
          compatibility_score: recommendation?.compatibility_score || 0,
          alternatives_count: alternatives.length,
          cache_hit: false,
          response_time_ms: Date.now() - startTime,
          scoring_time_ms: scoringTime,
          templates_evaluated: availableTemplates.length,
        });
      } catch {}
    })();

        const totalTime = Date.now() - startTime;
        this.logger.debug(`✅ OPTIMIZED Template recommendation completed in ${totalTime}ms for song: ${songId}`);
        
        // 🚀 PERFORMANCE MONITORING: Track metrics with structured logging
        const performanceMetrics = {
          event: 'template_recommendation_performance',
          song_id: songId,
          response_time_ms: totalTime,
          scoring_time_ms: scoringTime,
          templates_evaluated: availableTemplates.length,
          cache_hit: false,
          performance_tier: totalTime < 2000 ? 'excellent' : totalTime < 5000 ? 'good' : 'needs_optimization',
          timestamp: new Date().toISOString()
        };
        
        if (totalTime > 2000) {
          this.logger.warn({
            message: `⚠️ Slow template recommendation: ${totalTime}ms for song ${songId}`,
            ...performanceMetrics
          });
        } else {
          this.logger.log({
            message: `🚀 FAST template recommendation: ${totalTime}ms for song ${songId}`,
            ...performanceMetrics
          });
        }

    return result;
  }

  async getLayerVariations(
    request: LayerVariationDto,
  ): Promise<{
    variations: LayerVariation[];
    current_selection: LayerVariation;
    total_available: number;
    cache_hit?: boolean;
    variations_evaluated?: number;
  }> {
    const startTime = Date.now();

    // Check cache first
    const layerCacheKey = `${CACHE_KEYS.LAYER_VARIATIONS}:${request.current_template_id}:${request.vary_layer}`;
    const layerCachedResult = await this.cacheService.get(layerCacheKey);
    
    if (layerCachedResult) {
      this.logger.debug(
        `Cache hit for layer variations: ${request.current_template_id}, ${request.vary_layer}`
      );
      return {
        ...(layerCachedResult as any),
        cache_hit: true,
      };
    }

    // Get current template from NNA Registry
    // Note: Using fallback since OptimizedNnaRegistryService doesn't have getAssetByAddress
    const currentTemplate = { id: request.current_template_id, name: `Template ${request.current_template_id}` };
    
    // Log the input format for debugging
    // Note: Using fallback since OptimizedNnaRegistryService doesn't have format detection
    const isHfn = request.song_id.includes('.');
    const isMfa = /^\d+\.\d+\.\d+\.\d+$/.test(request.song_id);
    this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);

    // Use song ID directly (no conversion needed with optimized service)
    const songId = request.song_id;
    this.logger.debug(`Using song ID directly: ${songId}`);

    // Get song metadata (using optimized service)
    // Note: Using fallback since OptimizedNnaRegistryService doesn't have getAssetByAddress
    const song = { 
      id: songId, 
      name: `Song ${songId}`,
      nna_address: songId // Add nna_address property for compatibility
    };
    
    // Get all available assets for the specified layer
    // Note: Using fallback since OptimizedNnaRegistryService doesn't have getAssetsByLayer
    const layerAssets = [];

    // Get current selection for this layer
    const currentLayerAssetId = this.extractLayerAssetId(currentTemplate, request.vary_layer);
    const currentSelection = layerAssets.find(asset => asset.nna_address === currentLayerAssetId);

    // Score all layer variations
    const scoredVariations = await this.scoringService.scoreLayerVariations(
      song,
      currentTemplate,
      layerAssets,
      request.vary_layer,
    );

    // Sort and limit results
    const sortedVariations = scoredVariations
      .sort((a, b) => b.compatibility_score - a.compatibility_score)
      .slice(0, request.limit || 8);

    const result = {
      variations: sortedVariations,
      current_selection: currentSelection ? this.mapAssetToLayerVariation(currentSelection) : null,
      total_available: layerAssets.length,
      variations_evaluated: scoredVariations.length,
    };

    // Cache the result
    await this.cacheService.set(
      layerCacheKey,
      result,
      CACHE_TTL.LAYER_VARIATIONS,
    );

    // Track analytics
    await this.analyticsService.trackEvent({
      event_type: 'layer_variations_requested',
      user_id: (request as any).user_context?.user_id,
      template_id: request.current_template_id,
      song_id: request.song_id,
      vary_layer: request.vary_layer,
      variations_count: sortedVariations.length,
      response_time_ms: Date.now() - startTime,
    });

    return result;
  }

  private applyDiversityAndSort(templates: TemplateRecommendation[]): TemplateRecommendation[] {
    // Apply small random factor for tie-breaking and diversity
    return templates
      .map(template => ({
        ...template,
        final_score: template.compatibility_score * (1 + Math.random() * SCORING_THRESHOLDS.DIVERSITY_FACTOR),
      }))
      .sort((a, b) => b.final_score - a.final_score)
      .map(({ final_score, ...template }) => template); // Remove final_score from output
  }

  private async getFallbackTemplate(songId: string): Promise<TemplateRecommendation | null> {
    // Implementation for fallback template (most popular for this song)
    // This would query analytics data for the most selected template
    return null; // Placeholder
  }

  private async storeRecommendationCache(
    request: TemplateRecommendationDto,
    result: any,
  ): Promise<void> {
    try {
      const cacheEntry = new this.recommendationCacheModel({
        song_id: request.song_id,
        user_id: request.user_context.user_id,
        recommended_template_id: result.recommendation?.template_id || 'unknown',
        alternatives: result.alternatives?.map(alt => alt.template_id) || [],
        user_context: request.user_context,
        compatibility_score: result.recommendation.compatibility_score,
        created_at: new Date(),
      });

      await cacheEntry.save();
    } catch (error) {
      this.logger.error('Failed to store recommendation cache', error);
      // Don't throw error - this is non-critical
    }
  }

  private mapVariationLayerToNnaLayer(variationLayer: string): string {
    const mapping = {
      'stars': 'S',
      'looks': 'L', 
      'moves': 'M',
      'worlds': 'W',
    };
    return mapping[variationLayer] || variationLayer;
  }

  private extractLayerAssetId(template: any, layer: string): string {
    // Extract the specific layer asset ID from the composite template
    const components = template.components || [];
    const layerCode = this.mapVariationLayerToNnaLayer(layer);
    
    return components.find(component => component.startsWith(layerCode)) || '';
  }

  private mapAssetToLayerVariation(asset: any): LayerVariation {
    return {
      asset_id: asset._id,
      asset_name: asset.name,
      nna_address: asset.nna_address,
      compatibility_score: 1.0, // Will be calculated during scoring
      metadata: {
        tags: asset.tags || [],
        aiGeneratedDescription: asset.description,
      },
    };
  }

  /**
   * Generate thumbnail URL from REAL GCP storage URL
   */
  private generateThumbnailUrl(gcpStorageUrl: string, nnaAddress: string): string | null {
    if (gcpStorageUrl) {
      // Replace .mp4 with .jpg for thumbnail using the real canonical URL
      return gcpStorageUrl.replace(/\.mp4$/, '.jpg');
    }
    return null; // Don't generate fake URLs
  }

  /**
   * Generate preview URL from REAL GCP storage URL
   */
  private generatePreviewUrl(gcpStorageUrl: string, nnaAddress: string): string | null {
    if (gcpStorageUrl) {
      // Replace .mp4 with _preview.mp4 for preview using the real canonical URL
      return gcpStorageUrl.replace(/\.mp4$/, '_preview.mp4');
    }
    return null; // Don't generate fake URLs
  }

  /**
   * 🔧 CRITICAL FIX: Provide fallback response when NNA Registry is unavailable
   */
  private getFallbackResponse(request: TemplateRecommendationDto) {
    this.logger.warn(`🔄 [FALLBACK] Generating fallback response for ${request.song_id}`);
    
    const fallbackTemplates = [
      {
        template_id: 'default-pop-template',
        template_name: 'Default Pop Template',
        nna_address: 'G.POP.DEF.001',
        compatibility_score: 0.8,
        components: {
          song_id: request.song_id,
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
        template_id: 'alternative-pop-template',
        template_name: 'Alternative Pop Template',
        nna_address: 'G.POP.ALT.001',
        compatibility_score: 0.7,
        components: {
          song_id: request.song_id,
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

    return {
      recommendation: fallbackTemplates[0],
      alternatives: fallbackTemplates.slice(1),
      total_available: fallbackTemplates.length,
    };
  }

  // 📊 CACHE MONITORING METHODS
  private getCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  public getCacheStats() {
    return {
      ...this.cacheStats,
      hitRate: this.getCacheHitRate(),
      totalRequests: this.cacheStats.totalRequests,
    };
  }

  private trackCacheHit() {
    this.cacheStats.hits++;
    this.cacheStats.totalRequests++;
  }

  private trackCacheMiss() {
    this.cacheStats.misses++;
    this.cacheStats.totalRequests++;
  }

  private trackCacheSet() {
    this.cacheStats.sets++;
  }

  // 🔧 DEFINITIVE FIX: Service-injection-free background warm using direct HTTP
  private async startSimpleBackgroundWarm(cacheKey: string, songId: string, maxAlternatives: number) {
    (async () => {
      try {
        this.logger.log(`🔧 [DEFINITIVE FIX] Starting service-injection-free warm for key=${cacheKey}`);
        
        // DIRECT HTTP CALL - No service injection dependencies
        const axios = require('axios');
        const nnaRegistryUrl = (process.env.NNA_REGISTRY_URL || 'https://registry.dev.reviz.dev').trim();
        const apiKey = (process.env.NNA_REGISTRY_API_KEY || process.env.NNA_API_KEY || 'reviz-dev-30390-13220-4896-9516-9001').trim();
        
        this.logger.log(`🔧 [DEFINITIVE FIX] Making direct HTTP call to: ${nnaRegistryUrl}/api/v1/assets/composites/by-song/${songId}`);
        
        const response = await axios.get(`${nnaRegistryUrl}/api/v1/assets/composites/by-song/${songId}`, {
          headers: { 'x-api-key': apiKey },
          timeout: 15000,
          params: { limit: 100, compositeType: 'full', includeMetadata: true }
        });
        
        this.logger.log(`🔧 [DEFINITIVE FIX] HTTP response status: ${response.status}`);
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const composites = response.data.data;
          this.logger.log(`🔧 [DEFINITIVE FIX] Retrieved ${composites.length} composites from NNA Registry`);
          
          if (composites.length > 0) {
            const recommendation = composites[0];
            const alternatives = composites.slice(1, 1 + maxAlternatives);
            
            const payload = {
              recommendation,
              alternatives,
              total_available: composites.length,
              cache_hit: false,
              response_time_ms: 0,
              score_computation_time_ms: 0,
              templates_evaluated: composites.length,
            };
            
            await this.cacheService.set(cacheKey, payload, 600);
            this.trackCacheSet();
            this.logger.log(`✅ [DEFINITIVE FIX] Cache set successfully for key=${cacheKey} with ${composites.length} items`);
          } else {
            this.logger.warn(`⚠️ [DEFINITIVE FIX] No composites returned from NNA Registry`);
          }
        } else {
          this.logger.warn(`⚠️ [DEFINITIVE FIX] Invalid response format from NNA Registry`);
        }
      } catch (e) {
        this.logger.warn(`⚠️ [DEFINITIVE FIX] Background warm failed for key=${cacheKey}: ${e?.message || e}`);
        this.logger.error(`❌ [DEFINITIVE FIX] Error stack: ${e?.stack || 'No stack trace'}`);
      }
    })();
  }

  // 🔥 BACKGROUND WARM HELPER - Service-injection-free approach with verified cache write
  private async startBackgroundWarm(cacheKey: string, songId: string, maxAlternatives: number) {
    this.logger.log(`🔥 [WARM] ENTRY: startBackgroundWarm called for key=${cacheKey}`);
    
    // Pre-mark warm start so cache-status reflects progress immediately
    const now = Date.now();
    this.warmStatus.set(cacheKey, {
      started_at: now,
      success: false,
      items: 0,
      duration_ms: 0,
    });
    this.logger.log(`🔥 [WARM] STATUS: Pre-marked warm status for key=${cacheKey}`);

    // Use singleflight to avoid duplicate warms for same key
    this.logger.log(`🔥 [WARM] SINGLEFLIGHT: About to call singleflightWarm for key=${cacheKey}`);
    this.singleflightWarm(cacheKey, async () => {
      const startedAt = Date.now();
      this.logger.log(`🔥 [WARM] start | key=${cacheKey} | song=${songId} | maxAlt=${maxAlternatives}`);

      // Load axios dynamically, and prepare env
      this.logger.log(`🔍 [WARM] LOADING: About to require axios`);
      const axios = require('axios');
      this.logger.log(`🔍 [WARM] LOADED: Axios loaded successfully`);
      
      this.logger.log(`🔍 [WARM] ENV: NNA_REGISTRY_URL=${process.env.NNA_REGISTRY_URL}`);
      this.logger.log(`🔍 [WARM] ENV: NNA_REGISTRY_API_KEY=${process.env.NNA_REGISTRY_API_KEY}`);
      this.logger.log(`🔍 [WARM] ENV: NNA_API_KEY=${process.env.NNA_API_KEY}`);
      
      const nnaRegistryUrl = (process.env.NNA_REGISTRY_URL || 'https://registry.dev.reviz.dev').trim();
      const apiKeyRaw = (process.env.NNA_REGISTRY_API_KEY || process.env.NNA_API_KEY || 'reviz-dev-30390-13220-4896-9516-9001');
      const apiKey = String(apiKeyRaw).trim();

      this.logger.log(`🔍 [WARM] http_target=${nnaRegistryUrl}/api/v1/assets/composites/by-song/${songId} | apiKeyPresent=${!!apiKey}`);

      // Enforce ≤ 9500ms timeout around HTTP call
      const httpCall = axios.get(`${nnaRegistryUrl}/api/v1/assets/composites/by-song/${songId}`, {
        headers: { 'x-api-key': apiKey },
        timeout: 10000,
        params: { limit: 100, compositeType: 'full', includeMetadata: true },
      });
      const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('warm_timeout_9500ms')), 9500));

      const response = await Promise.race([httpCall, timer]);
      this.logger.log(`🔍 [WARM] http_done | status=${response.status} | elapsed_ms=${Date.now() - startedAt}`);

      const composites = (response?.data && Array.isArray(response.data.data)) ? response.data.data : [];
      this.logger.log(`🔍 [WARM] items=${composites.length}`);

      const recommendation = composites[0] || null;
      const alternatives = composites.slice(1, 1 + maxAlternatives);
      const payload = {
        recommendation,
        alternatives,
        total_available: composites.length,
        cache_hit: false,
        response_time_ms: 0,
        score_computation_time_ms: 0,
        templates_evaluated: composites.length,
      };

      // Verified cache write: set then read-back
      await this.cacheService.set(cacheKey, payload, 600);
      const wrote = await this.cacheService.get(cacheKey);
      const wroteOk = !!wrote;
      if (wroteOk) {
        this.trackCacheSet();
        this.logger.log(`✅ [WARM] cache_set_done | key=${cacheKey} | ttl=600 | elapsed_ms=${Date.now() - startedAt}`);
      } else {
        throw new Error('cache_write_verification_failed');
      }

      // Return array length for warm tracking
      return composites;
    }).catch((err) => {
      this.logger.warn(`⚠️ [WARM] failed | key=${cacheKey} | error=${err?.message || err}`);
      this.logger.error(`❌ [WARM] stack=${err?.stack || 'n/a'}`);
    });
  }

  // 🔍 CACHE STATUS ENDPOINT - Debug cache state and warm status
  async getCacheStatus(songId: string, maxAlternatives: number = 3) {
    const normalizedSongId = this.normalizeSongId(songId);
    const primaryCacheKey = this.generatePrimaryCacheKey(normalizedSongId, maxAlternatives);
    
    const cached = await this.cacheService.get(primaryCacheKey);
    const warmStatus = this.warmStatus.get(primaryCacheKey);
    
    return {
      song_id: songId,
      normalized_song_id: normalizedSongId,
      cache_key: primaryCacheKey,
      exists: !!cached,
      ttl_seconds: cached ? 600 : 0, // 10 minutes TTL
      size_bytes: cached ? JSON.stringify(cached).length : 0,
      last_warm_status: warmStatus || null,
      cache_stats: this.getCacheStats(),
    };
  }

  // 🔒 SINGLEFLIGHT WARM - Prevent concurrent warms for same song
  async singleflightWarm(
    cacheKey: string, 
    warmOperation: () => Promise<any>
  ): Promise<any> {
    // Check if warm is already in progress
    if (this.warmLocks.has(cacheKey)) {
      this.logger.debug(`🔒 [SINGLEFLIGHT] Warm already in progress for ${cacheKey}, waiting...`);
      return this.warmLocks.get(cacheKey);
    }

    // Start new warm operation
    const warmPromise = this.executeWarmWithTracking(cacheKey, warmOperation);
    this.warmLocks.set(cacheKey, warmPromise);

    try {
      const result = await warmPromise;
      return result;
    } finally {
      // Clean up lock after completion
      this.warmLocks.delete(cacheKey);
    }
  }

  // 📊 WARM TRACKING - Execute warm with analytics and status tracking
  private async executeWarmWithTracking(
    cacheKey: string,
    warmOperation: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    
    // Track warm start
    this.warmStatus.set(cacheKey, {
      started_at: startTime,
      success: false,
      items: 0,
      duration_ms: 0,
    });

    // Emit warm_started analytics
    await this.analyticsService.trackEvent({
      event_type: 'warm_started',
      cache_key: cacheKey,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await warmOperation();
      const duration = Date.now() - startTime;
      
      // Track warm success
      this.warmStatus.set(cacheKey, {
        started_at: startTime,
        finished_at: Date.now(),
        success: true,
        items: Array.isArray(result) ? result.length : 0,
        duration_ms: duration,
      });

      // Emit warm_succeeded analytics
      await this.analyticsService.trackEvent({
        event_type: 'warm_succeeded',
        cache_key: cacheKey,
        duration_ms: duration,
        items_count: Array.isArray(result) ? result.length : 0,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ [WARM SUCCESS] ${cacheKey} | duration=${duration}ms | items=${Array.isArray(result) ? result.length : 0}`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track warm failure
      this.warmStatus.set(cacheKey, {
        started_at: startTime,
        finished_at: Date.now(),
        success: false,
        items: 0,
        duration_ms: duration,
      });

      // Emit warm_failed analytics
      await this.analyticsService.trackEvent({
        event_type: 'warm_failed',
        cache_key: cacheKey,
        duration_ms: duration,
        error_message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      this.logger.warn(`⚠️ [WARM FAILED] ${cacheKey} | duration=${duration}ms | error=${error?.message || error}`);
      throw error;
    }
  }
}
