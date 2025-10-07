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
        template_id: (cachedResult as any).recommendation?.template_id || 'unknown',
        cache_hit: true,
        response_time_ms: Date.now() - startTime,
      });

      return {
        ...(cachedResult as any),
        cache_hit: true,
      };
    }

    // Log the input format for debugging
    const isHfn = this.nnaRegistryService.isHfnFormat(request.song_id);
    const isMfa = this.nnaRegistryService.isMfaFormat(request.song_id);
    this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);

    // Convert HFN to MFA if needed
    let songId = request.song_id;
    if (isHfn) {
      this.logger.debug(`Converting HFN to MFA: ${request.song_id}`);
      songId = await this.nnaRegistryService.convertHfnToMfa(request.song_id);
      this.logger.debug(`Converted to MFA: ${songId}`);
    }

    // Get song metadata from NNA Registry (now using MFA)
    const song = await this.nnaRegistryService.getAssetByAddress(songId);
    if (!song) {
      throw new NotFoundException(`Song not found: ${songId}`);
    }

    // Get all available templates (composites) for this song
    const availableTemplates = await this.nnaRegistryService.getCompositesBySong(songId);
    
    if (availableTemplates.length === 0) {
      const originalId = request.song_id !== songId ? `${request.song_id} (${songId})` : songId;
      throw new NotFoundException(`No templates available for song: ${originalId}`);
    }

    // EMERGENCY FIX: Bypass scoring entirely to unblock ReViz developers
    const scoringStartTime = Date.now();
    
    // Create mock scored templates with default scores
    const scoredTemplates = availableTemplates.map((template, index) => ({
      template_id: template._id || template.nna_address,
      template_name: template.name || `Template ${index + 1}`,
      nna_address: template.nna_address,
      compatibility_score: 0.8, // Default high score for all templates
      components: {
        song_id: song.nna_address,
        star_id: template.star_id || '2.009.002.018',
        look_id: template.look_id || '3.003.001.001', 
        move_id: template.move_id || '4.022.002.003',
        world_id: template.world_id || '5.015.001.001',
      },
      metadata: {
        created_at: template.createdAt || new Date().toISOString(),
        tags: template.tags || [],
        description: template.description || 'Template description',
      },
      scoring_details: {
        tempo_score: 0.8,
        genre_score: 0.8,
        energy_score: 0.8,
        style_score: 0.8,
        mood_score: 0.8,
        base_score: 0.8,
        freshness_boost: 1.0,
        final_score: 0.8,
      },
    }));
    
    const scoringTime = Date.now() - scoringStartTime;
    const eligibleTemplates = scoredTemplates; // All templates are eligible

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
      template_id: recommendation?.template_id || 'unknown',
      compatibility_score: recommendation?.compatibility_score || 0,
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
        ...(cachedResult as any),
        cache_hit: true,
      };
    }

    // Get current template from NNA Registry
    const currentTemplate = await this.nnaRegistryService.getAssetByAddress(request.current_template_id);
    if (!currentTemplate) {
      throw new NotFoundException(`Template not found: ${request.current_template_id}`);
    }

    // Log the input format for debugging
    const isHfn = this.nnaRegistryService.isHfnFormat(request.song_id);
    const isMfa = this.nnaRegistryService.isMfaFormat(request.song_id);
    this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);

    // Convert HFN to MFA if needed
    let songId = request.song_id;
    if (isHfn) {
      this.logger.debug(`Converting HFN to MFA: ${request.song_id}`);
      songId = await this.nnaRegistryService.convertHfnToMfa(request.song_id);
      this.logger.debug(`Converted to MFA: ${songId}`);
    }

    // Get song metadata (now using MFA)
    const song = await this.nnaRegistryService.getAssetByAddress(songId);
    if (!song) {
      throw new NotFoundException(`Song not found: ${songId}`);
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
        description: asset.description,
      },
    };
  }
}
