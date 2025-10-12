import { Injectable, Logger } from '@nestjs/common';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { TemplateRecommendation } from './interfaces/recommendation.interface';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { CompositeCacheStrategy } from '../caching/strategies/composite-cache.strategy';
import { ScoringService } from '../scoring/scoring.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class OptimizedRecommendationsService {
  private readonly logger = new Logger(OptimizedRecommendationsService.name);

  constructor(
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly cacheService: CacheService,
    private readonly compositeCacheStrategy: CompositeCacheStrategy,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * 🚀 OPTIMIZED: Fast template recommendations with caching and pre-computed scores
   */
  async getTemplateRecommendation(
    request: TemplateRecommendationDto,
  ): Promise<{
    recommendation: TemplateRecommendation;
    alternatives: TemplateRecommendation[];
    total_available: number;
    cache_hit?: boolean;
    score_computation_time_ms?: number;
    templates_evaluated?: number;
  }> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Optimized recommendation for song: ${request.song_id}`);

    try {
      // Step 1: Check cache first
      const cacheKey = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${request.song_id}:${request.user_context.user_id}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        const responseTime = Date.now() - startTime;
        this.logger.debug(`✅ Cache hit: ${responseTime}ms`);
        return {
          ...(cachedResult as any),
          cache_hit: true,
          score_computation_time_ms: 0,
          templates_evaluated: (cachedResult as any).alternatives.length + 1,
        };
      }

    // Step 2: Check pre-computed scores
    const precomputedKey = `${CACHE_KEYS.PRE_COMPUTED_SCORES}:${request.song_id}`;
    const precomputedScores = await this.cacheService.get(precomputedKey);
    
    if (precomputedScores) {
      const responseTime = Date.now() - startTime;
      this.logger.debug(`✅ Pre-computed scores hit: ${responseTime}ms`);
      
      const result = this.formatPrecomputedResult(precomputedScores, request);
      await this.cacheService.set(cacheKey, result, CACHE_TTL.TEMPLATE_RECOMMENDATION);
      
      return {
        ...result,
        cache_hit: false,
        score_computation_time_ms: 0,
        templates_evaluated: result.alternatives.length + 1,
      };
    }

    // Step 3: Fast composite fetch with optimized NNA Registry
    const scoreStartTime = Date.now();
    const composites = await this.optimizedNnaRegistryService.getCompositesForSong(request.song_id);
    
    if (composites.length === 0) {
      this.logger.warn(`No composites found for song: ${request.song_id}`);
      return this.getFallbackResponse(request);
    }

    // Step 4: Batch score computation
    const scoredTemplates = await this.scoringService.scoreTemplates(
      { nna_address: request.song_id },
      composites,
      request.user_context
    );

    const scoreComputationTime = Date.now() - scoreStartTime;
    const responseTime = Date.now() - startTime;

    // Step 5: Format response
    const result = this.formatRecommendationResult(scoredTemplates, request);
    
    // Step 6: Cache the result
    await this.cacheService.set(cacheKey, result, CACHE_TTL.TEMPLATE_RECOMMENDATION);

    this.logger.debug(`✅ Recommendation completed in ${responseTime}ms (scoring: ${scoreComputationTime}ms)`);

      return {
        ...result,
        cache_hit: false,
        score_computation_time_ms: scoreComputationTime,
        templates_evaluated: scoredTemplates.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get optimized recommendation for ${request.song_id}:`, error);
      return this.getFallbackResponse(request);
    }
  }

  /**
   * 🚀 OPTIMIZED: Batch recommendations for multiple songs
   */
  async getBatchTemplateRecommendations(
    requests: TemplateRecommendationDto[],
  ): Promise<Map<string, any>> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Batch recommendations for ${requests.length} songs`);

    const results = new Map<string, any>();
    const songIds = requests.map(req => req.song_id);

    // Step 1: Check cache for all songs
    const cacheKeys = requests.map(req => 
      `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${req.song_id}:${req.user_context.user_id}`
    );
    const cachedResults = await this.cacheService.mget(cacheKeys);
    
    // Process cached results
    requests.forEach((req, index) => {
      if (cachedResults[index]) {
        results.set(req.song_id, {
          ...cachedResults[index],
          cache_hit: true,
          score_computation_time_ms: 0,
        });
      }
    });

    // Step 2: Process uncached songs
    const uncachedRequests = requests.filter((req, index) => !cachedResults[index]);
    
    if (uncachedRequests.length > 0) {
      // Batch fetch composites for uncached songs
      const uncachedSongIds = uncachedRequests.map(req => req.song_id);
      const batchComposites = await this.optimizedNnaRegistryService.getBatchCompositesForSongs(uncachedSongIds);
      
      // Process each uncached request
      for (const request of uncachedRequests) {
        const composites = batchComposites.get(request.song_id) || [];
        
        if (composites.length > 0) {
          const scoredTemplates = await this.scoringService.scoreTemplates(
            { nna_address: request.song_id },
            composites,
            request.user_context
          );
          
          const result = this.formatRecommendationResult(scoredTemplates, request);
          results.set(request.song_id, {
            ...result,
            cache_hit: false,
            score_computation_time_ms: 0,
            templates_evaluated: scoredTemplates.length,
          });
        } else {
          results.set(request.song_id, this.getFallbackResponse(request));
        }
      }
    }

    const responseTime = Date.now() - startTime;
    this.logger.debug(`✅ Batch recommendations completed in ${responseTime}ms`);

    return results;
  }

  /**
   * 🚀 OPTIMIZED: Cache warming for popular songs
   */
  async warmCacheForPopularSongs(songIds: string[]): Promise<void> {
    this.logger.log(`🚀 Warming cache for ${songIds.length} popular songs`);
    
    // Pre-compute scores for popular songs
    await this.optimizedNnaRegistryService.precomputeScoresForPopularSongs(songIds);
    
    // Generate recommendations for each song
    for (const songId of songIds) {
      const request: TemplateRecommendationDto = {
        song_id: songId,
        user_context: { user_id: 'system' },
      };
      
      try {
        await this.getTemplateRecommendation(request);
        this.logger.debug(`✅ Cache warmed for song: ${songId}`);
      } catch (error) {
        this.logger.warn(`Failed to warm cache for song ${songId}: ${error.message}`);
      }
    }
  }

  private formatPrecomputedResult(precomputedScores: any, request: TemplateRecommendationDto) {
    // Format pre-computed scores into recommendation format
    return {
      recommendation: precomputedScores.recommendation,
      alternatives: precomputedScores.alternatives || [],
      total_available: precomputedScores.total_available || 0,
    };
  }

  private formatRecommendationResult(scoredTemplates: TemplateRecommendation[], request: TemplateRecommendationDto) {
    if (scoredTemplates.length === 0) {
      return this.getFallbackResponse(request);
    }

    // Sort by compatibility score
    const sortedTemplates = scoredTemplates.sort((a, b) => b.compatibility_score - a.compatibility_score);
    
    return {
      recommendation: sortedTemplates[0],
      alternatives: sortedTemplates.slice(1, 6), // Top 5 alternatives
      total_available: scoredTemplates.length,
    };
  }

  private getFallbackResponse(request: TemplateRecommendationDto) {
    return {
      recommendation: {
        template_id: 'fallback-template',
        template_name: 'Fallback Template',
        nna_address: 'fallback',
        compatibility_score: 0.5,
        components: {
          song_id: request.song_id,
          star_id: 'fallback-star',
          look_id: 'fallback-look',
          move_id: 'fallback-move',
          world_id: 'fallback-world',
        },
        metadata: {
          created_at: new Date().toISOString(),
          tags: ['fallback'],
          aiGeneratedDescription: 'Fallback template for unknown song',
        },
        scoring_details: {
          tempo_score: 0.5,
          genre_score: 0.5,
          energy_score: 0.5,
          style_score: 0.5,
          mood_score: 0.5,
          base_score: 0.5,
          freshness_boost: 1,
          final_score: 0.5,
        },
      },
      alternatives: [],
      total_available: 0,
    };
  }
}
