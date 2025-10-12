import { 
  Controller, 
  Get,
  Post, 
  Body, 
  UseGuards, 
  UseInterceptors,
  HttpStatus,
  Logger 
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
      // 🚀 USE OPTIMIZED SERVICE FOR 15x PERFORMANCE IMPROVEMENT
      this.logger.log(`🚀 [DEBUG] Starting template recommendation for: ${request.song_id}`);
      this.logger.log(`🚀 [DEBUG] Using OptimizedRecommendationsService for song: ${request.song_id}`);
      
      let recommendation;
      let serviceUsed = 'unknown';
      const optimizedStartTime = Date.now();
      
      try {
        recommendation = await this.optimizedRecommendationsService
          .getTemplateRecommendation(request);
        const optimizedDuration = Date.now() - optimizedStartTime;
        this.logger.log(`✅ [DEBUG] Optimized service completed in ${optimizedDuration}ms`);
        serviceUsed = 'optimized';
      } catch (optimizedError) {
        const optimizedDuration = Date.now() - optimizedStartTime;
        this.logger.error(`❌ [DEBUG] Optimized service failed after ${optimizedDuration}ms: ${optimizedError.message}`);
        this.logger.log(`🔄 [DEBUG] Falling back to old service...`);
        
        const fallbackStartTime = Date.now();
        recommendation = await this.recommendationsService
          .getTemplateRecommendation(request);
        const fallbackDuration = Date.now() - fallbackStartTime;
        this.logger.log(`⚠️ [DEBUG] Old service completed in ${fallbackDuration}ms`);
        serviceUsed = 'fallback';
      }

      const responseTime = Date.now() - startTime;
      
      this.logger.log(
        `Template recommendation completed in ${responseTime}ms for song: ${request.song_id}`
      );

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
