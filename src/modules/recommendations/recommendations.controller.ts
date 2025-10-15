import { 
  Controller, 
  Get,
  Post, 
  Body, 
  UseGuards, 
  UseInterceptors,
  HttpStatus,
  Logger,
  Query 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody 
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CachingInterceptor } from '../../common/interceptors/caching.interceptor';
import { RecommendationsService } from './recommendations.service';
import { OptimizedRecommendationsService } from './optimized-recommendations.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { 
  TemplateRecommendationResponse,
  LayerVariationResponse 
} from './interfaces/recommendation.interface';

@ApiTags('recommendations')
@Controller('recommend')
@UseGuards(ApiKeyGuard)
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly optimizedRecommendationsService: OptimizedRecommendationsService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly cacheService: CacheService,
  ) {}

  @ApiOperation({ 
    summary: 'Get template recommendation for a song',
    description: 'Returns the best video template recommendation based on song compatibility scoring'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Template recommendation generated successfully',
    type: TemplateRecommendationResponse
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Song not found' 
  })
  @ApiBody({ type: TemplateRecommendationDto })
  @Get('debug/services')
  async debugServices() {
    return {
      optimizedRecommendationsService: {
        exists: !!this.optimizedRecommendationsService,
        type: this.optimizedRecommendationsService?.constructor?.name,
        methods: this.optimizedRecommendationsService ? 
          Object.getOwnPropertyNames(Object.getPrototypeOf(this.optimizedRecommendationsService)) : []
      },
      recommendationsService: {
        exists: !!this.recommendationsService,
        type: this.recommendationsService?.constructor?.name,
        hasOptimizedNnaRegistryService: !!(this.recommendationsService as any).optimizedNnaRegistryService
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('debug/cache-status')
  async getCacheStatus(@Query('song_id') songId: string, @Query('max_alternatives') maxAlt?: string) {
    const maxAlternatives = Math.max(0, Math.min(6, Number(maxAlt || 3)));
    return this.recommendationsService.getCacheStatus(songId, maxAlternatives);
  }

  @Get('debug/test-nna-registry')
  async testNnaRegistry(@Query('song_id') songId: string) {
    try {
      this.logger.log(`🧪 [TEST] Testing NNA Registry for song: ${songId}`);
      const result = await this.optimizedNnaRegistryService.getCompositesForSongAlgoRhythmFormat(songId);
      this.logger.log(`✅ [TEST] NNA Registry returned: ${Array.isArray(result) ? result.length : 'NOT_ARRAY'} items`);
      return {
        success: true,
        song_id: songId,
        result_type: Array.isArray(result) ? 'array' : typeof result,
        item_count: Array.isArray(result) ? result.length : 0,
        sample_item: Array.isArray(result) && result.length > 0 ? result[0] : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`❌ [TEST] NNA Registry test failed: ${error.message}`);
      return {
        success: false,
        song_id: songId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('debug/test-both-services')
  async testBothServices(@Body() request: TemplateRecommendationDto) {
    this.logger.log(`🧪 [DEBUG] Testing both services for song: ${request.song_id}`);
    
    const results: any = {
      optimized: null,
      old: null,
      comparison: {}
    };
    
    // Test optimized service
    try {
      const optimizedStartTime = Date.now();
      results.optimized = await this.optimizedRecommendationsService.getTemplateRecommendation(request);
      const optimizedTime = Date.now() - optimizedStartTime;
      this.logger.log(`✅ [DEBUG] Optimized service: ${optimizedTime}ms`);
      results.comparison.optimizedTime = optimizedTime;
    } catch (error) {
      this.logger.error(`❌ [DEBUG] Optimized service failed: ${error.message}`);
      results.comparison.optimizedError = error.message;
    }
    
    // Test old service
    try {
      const oldStartTime = Date.now();
      results.old = await this.recommendationsService.getTemplateRecommendation(request);
      const oldTime = Date.now() - oldStartTime;
      this.logger.log(`⚠️ [DEBUG] Old service: ${oldTime}ms`);
      results.comparison.oldTime = oldTime;
    } catch (error) {
      this.logger.error(`❌ [DEBUG] Old service failed: ${error.message}`);
      results.comparison.oldError = error.message;
    }
    
    return results;
  }

  @Post('template')
  @UseInterceptors(CachingInterceptor)
  async getTemplateRecommendation(
    @Body() request: TemplateRecommendationDto,
  ): Promise<TemplateRecommendationResponse> {
    const startTime = Date.now();

    this.logger.log(
      `Template recommendation requested for song: ${request.song_id}`
    );

    try {
      // 🚀 Controller-level 2s budget: race service vs timer
      const budgetMs = 2000;
      // Use the cache-first fast-path (warms cache and enforces 2s budget internally)
      const servicePromise = this.recommendationsService
        .getTemplateRecommendation(request);
      const timeoutPromise = new Promise<'TIMEOUT'>(resolve => setTimeout(() => resolve('TIMEOUT'), budgetMs));

      const winner = await Promise.race([servicePromise as any, timeoutPromise]);

      if (winner === 'TIMEOUT') {
        // Fire-and-forget a fresh call to warm cache; don't reuse raced promise
        (async () => {
          try {
            await this.recommendationsService.getTemplateRecommendation(request);
            this.logger.log(`♻️ [CONTROLLER] Background warm completed for song ${request.song_id}`);
          } catch (e) {
            this.logger.warn(`⚠️ [CONTROLLER] Background warm failed: ${e?.message || e}`);
          }
        })();

        // Also kick a background warm task (non-blocking, 9.5s timeout) to populate cache for next call
        (async () => {
          try {
            // Normalize song ID for cache key symmetry
            const normalizedSongId = request.song_id?.trim()?.toUpperCase() || request.song_id;
            const maxAlternatives = Math.max(0, Math.min(6, (request as any)?.max_alternatives ?? 3));
            const primaryCacheKey = `recommendation:template:${normalizedSongId}:${maxAlternatives}`;
            
            // Use singleflight warm from service
            await this.recommendationsService.singleflightWarm(primaryCacheKey, async () => {
              const warmCall = this.optimizedNnaRegistryService.getCompositesForSongAlgoRhythmFormat(normalizedSongId);
              const warmTimer = new Promise<'TIMEOUT'>(res => setTimeout(() => res('TIMEOUT'), 9500));
              const warmResult = await Promise.race([warmCall as any, warmTimer]);
              
              if (warmResult !== 'TIMEOUT' && Array.isArray(warmResult) && warmResult.length > 0) {
                const recommendation = warmResult[0];
                const alternatives = warmResult.slice(1, 1 + maxAlternatives);
                await this.cacheService.set(primaryCacheKey, {
                  recommendation,
                  alternatives,
                  total_available: warmResult.length,
                  cache_hit: false,
                  response_time_ms: 0,
                  score_computation_time_ms: 0,
                  templates_evaluated: warmResult.length,
                }, 600);
                return warmResult;
              } else {
                throw new Error('Warm timeout or empty result');
              }
            });
          } catch (e) {
            this.logger.warn(`⚠️ [CONTROLLER BACKGROUND WARM] Failed: ${e?.message || e}`);
          }
        })();

        const responseTime = Date.now() - startTime;
        this.logger.warn(`⏳ [CONTROLLER] 2s budget exceeded, returning 202 for song ${request.song_id}`);
        return {
          success: true,
          data: {
            recommendation: null,
            alternatives: [],
            total_available: 0,
          },
          performance_metrics: {
            response_time_ms: responseTime,
            cache_hit: false,
            score_computation_time_ms: 0,
            templates_evaluated: 0,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            version: '1.0.0',
            retry_after_ms: 3000,
            partial_response: true,
          }
        } as any;
      }

      const recommendation = winner as any;
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `Template recommendation completed in ${responseTime}ms for song: ${request.song_id}`
      );

      // If service indicates partial_response (over budget), return 202-like body
      if (recommendation?.partial_response) {
        return {
          success: true,
          data: {
            recommendation: null,
            alternatives: [],
            total_available: 0,
          },
          performance_metrics: {
            response_time_ms: responseTime,
            cache_hit: false,
            score_computation_time_ms: 0,
            templates_evaluated: 0,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            version: '1.0.0',
            retry_after_ms: recommendation?.retry_after_ms ?? 3000,
            partial_response: true,
          }
        } as any;
      }

      return {
        success: true,
        data: {
          recommendation: recommendation.recommendation,
          alternatives: recommendation.alternatives,
          total_available: recommendation.total_available,
        },
        performance_metrics: {
          response_time_ms: responseTime,
          cache_hit: recommendation.cache_hit || false,
          score_computation_time_ms: recommendation.score_computation_time_ms,
          templates_evaluated: recommendation.templates_evaluated,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          version: '1.0.0',
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `Template recommendation failed after ${responseTime}ms for song: ${request.song_id}`,
        error.stack
      );
      throw error;
    }
  }

  @ApiOperation({ 
    summary: 'Get layer variations',
    description: 'Returns alternative options for a specific layer (stars, looks, moves, worlds) while maintaining compatibility'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Layer variations generated successfully',
    type: LayerVariationResponse
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Template or song not found' 
  })
  @ApiBody({ type: LayerVariationDto })
  @Post('variations')
  @UseInterceptors(CachingInterceptor)
  async getLayerVariations(
    @Body() request: LayerVariationDto,
  ): Promise<LayerVariationResponse> {
    const startTime = Date.now();
    
    this.logger.log(
      `Layer variations requested for template: ${request.current_template_id}, layer: ${request.vary_layer}`
    );

    try {
      const variations = await this.recommendationsService
        .getLayerVariations(request);

      const responseTime = Date.now() - startTime;
      
      this.logger.log(
        `Layer variations completed in ${responseTime}ms for template: ${request.current_template_id}`
      );

      return {
        success: true,
        data: {
          variations: variations.variations,
          current_selection: variations.current_selection,
          total_available: variations.total_available,
        },
        performance_metrics: {
          response_time_ms: responseTime,
          cache_hit: variations.cache_hit || false,
          variations_evaluated: variations.variations_evaluated,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          version: '1.0.0',
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.error(
        `Layer variations failed after ${responseTime}ms for template: ${request.current_template_id}`,
        error.stack
      );
      
      throw error;
    }
  }
}
