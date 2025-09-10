import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompatibilityScore } from '../../models/compatibility-score.schema';
import { RuleBasedScoringService } from './algorithms/rule-based-scoring.service';
import { FreshnessBoostService } from './algorithms/freshness-boost.service';
import { DiversityService } from './algorithms/diversity.service';
import { TemplateRecommendation, LayerVariation } from '../recommendations/interfaces/recommendation.interface';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectModel(CompatibilityScore.name)
    private readonly compatibilityScoreModel: Model<CompatibilityScore>,
    private readonly ruleBasedScoringService: RuleBasedScoringService,
    private readonly freshnessBoostService: FreshnessBoostService,
    private readonly diversityService: DiversityService,
  ) {}

  async scoreTemplates(
    song: any,
    templates: any[],
    userPreferences?: any,
  ): Promise<TemplateRecommendation[]> {
    this.logger.debug(`Scoring ${templates.length} templates for song: ${song.nna_address}`);

    const scoredTemplates: TemplateRecommendation[] = [];

    for (const template of templates) {
      try {
        // Check for cached score
        let compatibilityScore = await this.getCachedScore(song.nna_address, template.nna_address);

        if (!compatibilityScore) {
          // Compute new score
          compatibilityScore = await this.computeCompatibilityScore(song, template, userPreferences);
          
          // Cache the score
          await this.cacheScore(song, template, compatibilityScore);
        }

        // Apply freshness boost
        const freshnessBoost = this.freshnessBoostService.calculateBoost(template.createdAt);
        const finalScore = Math.min(compatibilityScore.base_score * freshnessBoost, 1.0);

        const templateRecommendation: TemplateRecommendation = {
          template_id: template._id,
          template_name: template.name,
          nna_address: template.nna_address,
          compatibility_score: finalScore,
          components: this.extractComponents(template),
          metadata: {
            created_at: template.createdAt,
            tags: template.tags || [],
            description: template.description,
          },
          scoring_details: {
            ...compatibilityScore.score_breakdown,
            base_score: compatibilityScore.base_score,
            freshness_boost: freshnessBoost,
            final_score: finalScore,
          },
        };

        scoredTemplates.push(templateRecommendation);
      } catch (error) {
        this.logger.error(`Failed to score template ${template.nna_address}:`, error);
        // Continue with other templates
      }
    }

    this.logger.debug(`Successfully scored ${scoredTemplates.length} templates`);
    return scoredTemplates;
  }

  async scoreLayerVariations(
    song: any,
    currentTemplate: any,
    layerAssets: any[],
    layerType: string,
  ): Promise<LayerVariation[]> {
    this.logger.debug(
      `Scoring ${layerAssets.length} ${layerType} variations for template: ${currentTemplate.nna_address}`
    );

    const scoredVariations: LayerVariation[] = [];

    for (const asset of layerAssets) {
      try {
        // Create a hypothetical template with this asset substituted
        const hypotheticalTemplate = this.substituteLayerAsset(currentTemplate, asset, layerType);
        
        // Score this hypothetical template
        const compatibilityScore = await this.computeCompatibilityScore(song, hypotheticalTemplate);
        const freshnessBoost = this.freshnessBoostService.calculateBoost(asset.createdAt);
        const finalScore = Math.min(compatibilityScore.base_score * freshnessBoost, 1.0);

        const layerVariation: LayerVariation = {
          asset_id: asset._id,
          asset_name: asset.name,
          nna_address: asset.nna_address,
          compatibility_score: finalScore,
          metadata: {
            tags: asset.tags || [],
            description: asset.description,
          },
          scoring_details: {
            ...compatibilityScore.score_breakdown,
            base_score: compatibilityScore.base_score,
            freshness_boost: freshnessBoost,
            final_score: finalScore,
          },
        };

        scoredVariations.push(layerVariation);
      } catch (error) {
        this.logger.error(`Failed to score layer variation ${asset.nna_address}:`, error);
        // Continue with other variations
      }
    }

    this.logger.debug(`Successfully scored ${scoredVariations.length} layer variations`);
    return scoredVariations;
  }

  private async getCachedScore(songId: string, templateId: string): Promise<any> {
    try {
      const cachedScore = await this.compatibilityScoreModel.findOne({
        song_id: songId,
        template_id: templateId,
      }).exec();

      if (cachedScore) {
        // Check if the cached score is recent enough (within 24 hours)
        const age = Date.now() - cachedScore.computed_at.getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age < maxAge) {
          return cachedScore;
        }
      }
    } catch (error) {
      this.logger.error('Error retrieving cached score:', error);
    }

    return null;
  }

  private async computeCompatibilityScore(
    song: any,
    template: any,
    userPreferences?: any,
  ): Promise<{
    base_score: number;
    score_breakdown: {
      tempo_score: number;
      genre_score: number;
      energy_score: number;
      style_score: number;
      mood_score: number;
    };
  }> {
    // Use rule-based scoring algorithm
    const scoreBreakdown = await this.ruleBasedScoringService.computeScore(
      song,
      template,
      userPreferences,
    );

    const baseScore = this.calculateWeightedScore(scoreBreakdown);

    return {
      base_score: baseScore,
      score_breakdown: scoreBreakdown,
    };
  }

  private calculateWeightedScore(scoreBreakdown: any): number {
    const weights = {
      tempo: 0.30,
      genre: 0.25,
      energy: 0.20,
      style: 0.15,
      mood: 0.10,
    };

    return (
      scoreBreakdown.tempo_score * weights.tempo +
      scoreBreakdown.genre_score * weights.genre +
      scoreBreakdown.energy_score * weights.energy +
      scoreBreakdown.style_score * weights.style +
      scoreBreakdown.mood_score * weights.mood
    );
  }

  private async cacheScore(song: any, template: any, compatibilityScore: any): Promise<void> {
    try {
      const scoreDoc = new this.compatibilityScoreModel({
        song_id: song.nna_address,
        template_id: template.nna_address,
        base_score: compatibilityScore.base_score,
        freshness_boost: 1.0, // Will be calculated dynamically
        final_score: compatibilityScore.base_score,
        score_breakdown: compatibilityScore.score_breakdown,
        song_metadata: {
          bpm: song.songMetadata?.bpm,
          genre: song.songMetadata?.genre,
          energy_level: song.tags?.find((tag: string) => 
            ['low-energy', 'high-energy', 'moderate-energy'].includes(tag)
          ),
          mood: song.tags?.find((tag: string) => 
            ['happy', 'sad', 'energetic', 'calm', 'intense'].includes(tag)
          ),
        },
        template_metadata: {
          created_at: template.createdAt,
          tags: template.tags || [],
          components: template.components || [],
        },
        computed_at: new Date(),
        algorithm_version: '1.0.0',
      });

      await scoreDoc.save();
    } catch (error) {
      this.logger.error('Failed to cache compatibility score:', error);
      // Don't throw error - caching is non-critical
    }
  }

  private extractComponents(template: any): any {
    const components = template.components || [];
    
    return {
      song_id: components.find((c: string) => c.startsWith('G.')) || '',
      star_id: components.find((c: string) => c.startsWith('S.')) || '',
      look_id: components.find((c: string) => c.startsWith('L.')) || '',
      move_id: components.find((c: string) => c.startsWith('M.')) || '',
      world_id: components.find((c: string) => c.startsWith('W.')) || '',
    };
  }

  private substituteLayerAsset(originalTemplate: any, newAsset: any, layerType: string): any {
    const layerMapping = {
      'stars': 'S',
      'looks': 'L',
      'moves': 'M',
      'worlds': 'W',
    };

    const layerCode = layerMapping[layerType];
    const newComponents = [...(originalTemplate.components || [])];
    
    // Replace the component for the specified layer
    const index = newComponents.findIndex(component => component.startsWith(layerCode));
    if (index >= 0) {
      newComponents[index] = newAsset.nna_address;
    }

    return {
      ...originalTemplate,
      components: newComponents,
      // Merge relevant metadata from the new asset
      tags: [...(originalTemplate.tags || []), ...(newAsset.tags || [])],
    };
  }
}
