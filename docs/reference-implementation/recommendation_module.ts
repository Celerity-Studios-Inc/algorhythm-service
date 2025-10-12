// ========================================
// src/modules/recommendations/recommendations.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ScoringModule } from '../scoring/scoring.module';
import { CachingModule } from '../caching/caching.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { 
  CompatibilityScore, 
  CompatibilityScoreSchema 
} from '../../models/compatibility-score.schema';
import { 
  RecommendationCache, 
  RecommendationCacheSchema 
} from '../../models/recommendation-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}

// ========================================
// src/modules/recommendations/recommendations.controller.ts
// ========================================
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

// ========================================
// src/modules/recommendations/dto/template-recommendation.dto.ts
// ========================================
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsObject, 
  ValidateNested, 
  IsEnum,
  IsNumber,
  Min,
  Max 
} from 'class-validator';
import { Type } from 'class-transformer';

class UserPreferencesDto {
  @ApiProperty({ 
    description: 'User energy preference',
    enum: ['low', 'moderate', 'high'],
    example: 'high'
  })
  @IsOptional()
  @IsEnum(['low', 'moderate', 'high'])
  energy_preference?: 'low' | 'moderate' | 'high';

  @ApiProperty({ 
    description: 'User style preference',
    example: 'modern'
  })
  @IsOptional()
  @IsString()
  style_preference?: string;

  @ApiProperty({ 
    description: 'User genre preferences',
    example: ['pop', 'electronic']
  })
  @IsOptional()
  @IsString({ each: true })
  genre_preferences?: string[];
}

class DeviceInfoDto {
  @ApiProperty({ 
    description: 'Device platform',
    enum: ['ios', 'android'],
    example: 'ios'
  })
  @IsOptional()
  @IsEnum(['ios', 'android'])
  platform?: 'ios' | 'android';

  @ApiProperty({ 
    description: 'App version',
    example: '1.2.3'
  })
  @IsOptional()
  @IsString()
  version?: string;
}

class UserContextDto {
  @ApiProperty({ 
    description: 'User ID',
    example: 'user_12345'
  })
  @IsString()
  user_id: string;

  @ApiProperty({ 
    description: 'User preferences',
    type: UserPreferencesDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;

  @ApiProperty({ 
    description: 'Device information',
    type: DeviceInfoDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device_info?: DeviceInfoDto;
}

export class TemplateRecommendationDto {
  @ApiProperty({ 
    description: 'Song ID in NNA format',
    example: 'G.POP.TEN.001'
  })
  @IsString()
  song_id: string;

  @ApiProperty({ 
    description: 'User context for personalization',
    type: UserContextDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UserContextDto)
  user_context: UserContextDto;

  @ApiProperty({ 
    description: 'Maximum number of alternative recommendations',
    minimum: 1,
    maximum: 20,
    default: 5,
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  max_alternatives?: number = 5;

  @ApiProperty({ 
    description: 'Include detailed scoring information',
    default: false,
    example: false
  })
  @IsOptional()
  include_scoring_details?: boolean = false;
}

// ========================================
// src/modules/recommendations/dto/layer-variation.dto.ts
// ========================================
export class LayerVariationDto {
  @ApiProperty({ 
    description: 'Current template ID',
    example: 'C.001.001.001'
  })
  @IsString()
  current_template_id: string;

  @ApiProperty({ 
    description: 'Layer to vary',
    enum: ['stars', 'looks', 'moves', 'worlds'],
    example: 'stars'
  })
  @IsEnum(['stars', 'looks', 'moves', 'worlds'])
  vary_layer: 'stars' | 'looks' | 'moves' | 'worlds';

  @ApiProperty({ 
    description: 'Song ID for compatibility scoring',
    example: 'G.POP.TEN.001'
  })
  @IsString()
  song_id: string;

  @ApiProperty({ 
    description: 'Maximum number of variations to return',
    minimum: 1,
    maximum: 20,
    default: 8,
    example: 8
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 8;

  @ApiProperty({ 
    description: 'Include detailed scoring information',
    default: false,
    example: false
  })
  @IsOptional()
  include_scoring_details?: boolean = false;
}

// ========================================
// src/modules/recommendations/interfaces/recommendation.interface.ts
// ========================================
import { ApiProperty } from '@nestjs/swagger';

export interface CompatibilityScoreDetails {
  tempo_score: number;
  genre_score: number;
  energy_score: number;
  style_score: number;
  mood_score: number;
  base_score: number;
  freshness_boost: number;
  final_score: number;
}

export interface TemplateRecommendation {
  template_id: string;
  template_name: string;
  nna_address: string;
  compatibility_score: number;
  components: {
    song_id: string;
    star_id: string;
    look_id: string;
    move_id: string;
    world_id: string;
  };
  metadata: {
    created_at: string;
    tags: string[];
    description?: string;
  };
  scoring_details?: CompatibilityScoreDetails;
}

export interface LayerVariation {
  asset_id: string;
  asset_name: string;
  nna_address: string;
  compatibility_score: number;
  metadata: {
    tags: string[];
    description?: string;
  };
  scoring_details?: CompatibilityScoreDetails;
}

export interface PerformanceMetrics {
  response_time_ms: number;
  cache_hit: boolean;
  score_computation_time_ms?: number;
  templates_evaluated?: number;
  variations_evaluated?: number;
}

export interface ResponseMetadata {
  timestamp: string;
  request_id: string;
  version: string;
}

export class TemplateRecommendationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    recommendation: TemplateRecommendation;
    alternatives: TemplateRecommendation[];
    total_available: number;
  };

  @ApiProperty()
  performance_metrics: PerformanceMetrics;

  @ApiProperty()
  metadata: ResponseMetadata;
}

export class LayerVariationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    variations: LayerVariation[];
    current_selection: LayerVariation;
    total_available: number;
  };

  @ApiProperty()
  performance_metrics: PerformanceMetrics;

  @ApiProperty()
  metadata: ResponseMetadata;
}

// ========================================
// src/modules/recommendations/recommendations.service.ts
// ========================================
import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompatibilityScore } from '../../models/compatibility-score.schema';
import { RecommendationCache } from '../../models/recommendation-cache.schema';
import { ScoringService } from '../scoring/scoring.service';
import { CacheService } from '../caching/cache.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { AnalyticsService } from '../analytics/analytics.service';
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

  constructor(
    @InjectModel(CompatibilityScore.name)
    private readonly compatibilityScoreModel: Model<CompatibilityScore>,
    @InjectModel(RecommendationCache.name)
    private readonly recommendationCacheModel: Model<RecommendationCache>,
    private readonly scoringService: ScoringService,
    private readonly cacheService: CacheService,
    private readonly nnaRegistryService: NnaRegistryService,
    private readonly analyticsService: AnalyticsService,
  ) {}

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
    
    // Check cache first
    const cacheKey = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${request.song_id}:${JSON.stringify(request.user_context)}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      this.logger.debug(`Cache hit for template recommendation: ${request.song_id}`);
      
      // Track analytics for cached result
      await this.analyticsService.trackEvent({
        event_type: 'template_recommendation_served',
        user_id: request.user_context.user_id,
        song_id: request.song_id,
        template_id: cachedResult.recommendation.template_id,
        cache_hit: true,
        response_time_ms: Date.now() - startTime,
      });

      return {
        ...cachedResult,
        cache_hit: true,
      };
    }

    // Get song metadata from NNA Registry
    const song = await this.nnaRegistryService.getAssetByAddress(request.song_id);
    if (!song) {
      throw new NotFoundException(`Song not found: ${request.song_id}`);
    }

    // Get all available templates (composites) for this song
    const availableTemplates = await this.nnaRegistryService.getCompositesBySong(request.song_id);
    
    if (availableTemplates.length === 0) {
      throw new NotFoundException(`No templates available for song: ${request.song_id}`);
    }

    // Score all templates
    const scoringStartTime = Date.now();
    const scoredTemplates = await this.scoringService.scoreTemplates(
      song,
      availableTemplates,
      request.user_context.preferences,
    );
    const scoringTime = Date.now() - scoringStartTime;

    // Filter templates that meet minimum score threshold
    const eligibleTemplates = scoredTemplates.filter(
      template => template.compatibility_score >= SCORING_THRESHOLDS.MIN_RECOMMENDATION_SCORE
    );

    if (eligibleTemplates.length === 0) {
      // Fallback: return most popular template for this song
      const popularTemplate = await this.getFallbackTemplate(request.song_id);
      if (popularTemplate) {
        eligibleTemplates.push(popularTemplate);
      }
    }

    // Sort by compatibility score (with freshness boost and diversity applied)
    const sortedTemplates = this.applyDiversityAndSort(eligibleTemplates);

    // Select top recommendation and alternatives
    const recommendation = sortedTemplates[0];
    const alternatives = sortedTemplates.slice(1, (request.max_alternatives || 5) + 1);

    const result = {
      recommendation,
      alternatives,
      total_available: availableTemplates.length,
      score_computation_time_ms: scoringTime,
      templates_evaluated: scoredTemplates.length,
    };

    // Cache the result
    await this.cacheService.set(
      cacheKey,
      result,
      CACHE_TTL.TEMPLATE_RECOMMENDATION,
    );

    // Store in recommendation cache for analytics
    await this.storeRecommendationCache(request, result);

    // Track analytics
    await this.analyticsService.trackEvent({
      event_type: 'template_recommendation_served',
      user_id: request.user_context.user_id,
      song_id: request.song_id,
      template_id: recommendation.template_id,
      compatibility_score: recommendation.compatibility_score,
      alternatives_count: alternatives.length,
      cache_hit: false,
      response_time_ms: Date.now() - startTime,
      scoring_time_ms: scoringTime,
      templates_evaluated: scoredTemplates.length,
    });

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
    const cacheKey = `${CACHE_KEYS.LAYER_VARIATIONS}:${request.current_template_id}:${request.vary_layer}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      this.logger.debug(
        `Cache hit for layer variations: ${request.current_template_id}, ${request.vary_layer}`
      );
      return {
        ...cachedResult,
        cache_hit: true,
      };
    }

    // Get current template from NNA Registry
    const currentTemplate = await this.nnaRegistryService.getAssetByAddress(request.current_template_id);
    if (!currentTemplate) {
      throw new NotFoundException(`Template not found: ${request.current_template_id}`);
    }

    // Get song metadata
    const song = await this.nnaRegistryService.getAssetByAddress(request.song_id);
    if (!song) {
      throw new NotFoundException(`Song not found: ${request.song_id}`);
    }

    // Get all available assets for the specified layer
    const layerAssets = await this.nnaRegistryService.getAssetsByLayer(
      this.mapVariationLayerToNnaLayer(request.vary_layer)
    );

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
      cacheKey,
      result,
      CACHE_TTL.LAYER_VARIATIONS,
    );

    // Track analytics
    await this.analyticsService.trackEvent({
      event_type: 'layer_variations_requested',
      user_id: request.user_context?.user_id,
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
        recommended_template_id: result.recommendation.template_id,
        alternatives: result.alternatives.map(alt => alt.template_id),
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
        description: asset.description,
      },
    };
  }
}