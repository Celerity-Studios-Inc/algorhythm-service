import { 
  Controller, 
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CachingInterceptor } from '../../common/interceptors/caching.interceptor';
import { RecommendationsService } from './recommendations.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { 
  TemplateRecommendationResponse,
  LayerVariationResponse 
} from './interfaces/recommendation.interface';

@ApiTags('recommendations')
@Controller('recommend')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
  private readonly logger = new Logger(RecommendationsController.name);

  constructor(
    private readonly recommendationsService: RecommendationsService,
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
      const recommendation = await this.recommendationsService
        .getTemplateRecommendation(request);

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
