// ========================================
// src/models/compatibility-score.schema.ts
// ========================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CompatibilityScore extends Document {
  @Prop({ required: true, index: true })
  song_id: string;

  @Prop({ required: true, index: true })
  template_id: string;

  @Prop({ required: true, min: 0, max: 1 })
  base_score: number;

  @Prop({ required: true, min: 0, max: 2 })
  freshness_boost: number;

  @Prop({ required: true, min: 0, max: 2 })
  final_score: number;

  @Prop({ type: Object, required: true })
  score_breakdown: {
    tempo_score: number;
    genre_score: number;
    energy_score: number;
    style_score: number;
    mood_score: number;
  };

  @Prop({ type: Object })
  song_metadata: {
    bpm?: number;
    genre?: string;
    energy_level?: string;
    mood?: string;
  };

  @Prop({ type: Object })
  template_metadata: {
    created_at: Date;
    tags: string[];
    components: string[];
  };

  @Prop({ default: Date.now, expires: '30d' }) // Auto-expire after 30 days
  computed_at: Date;

  @Prop({ default: '1.0.0' })
  algorithm_version: string;
}

export const CompatibilityScoreSchema = SchemaFactory.createForClass(CompatibilityScore);

// Create compound indexes for efficient querying
CompatibilityScoreSchema.index({ song_id: 1, template_id: 1 }, { unique: true });
CompatibilityScoreSchema.index({ song_id: 1, final_score: -1 }); // For getting top recommendations
CompatibilityScoreSchema.index({ computed_at: 1 }); // For cleanup/maintenance

// ========================================
// src/models/recommendation-cache.schema.ts
// ========================================
@Schema({ timestamps: true })
export class RecommendationCache extends Document {
  @Prop({ required: true, index: true })
  song_id: string;

  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  recommended_template_id: string;

  @Prop({ type: [String], default: [] })
  alternatives: string[];

  @Prop({ required: true, min: 0, max: 1 })
  compatibility_score: number;

  @Prop({ type: Object })
  user_context: {
    preferences?: {
      energy_preference?: string;
      style_preference?: string;
      genre_preferences?: string[];
    };
    device_info?: {
      platform?: string;
      version?: string;
    };
  };

  @Prop({ default: Date.now, expires: '7d' }) // Auto-expire after 7 days
  created_at: Date;

  @Prop({ type: Boolean, default: false })
  was_selected: boolean; // Track if user selected this recommendation

  @Prop()
  selected_at?: Date;
}

export const RecommendationCacheSchema = SchemaFactory.createForClass(RecommendationCache);

// Indexes for analytics and caching
RecommendationCacheSchema.index({ song_id: 1, user_id: 1, created_at: -1 });
RecommendationCacheSchema.index({ recommended_template_id: 1, was_selected: 1 });

// ========================================
// src/models/analytics-event.schema.ts
// ========================================
@Schema({ timestamps: true })
export class AnalyticsEvent extends Document {
  @Prop({ required: true, index: true })
  event_type: string;

  @Prop({ index: true })
  user_id?: string;

  @Prop({ index: true })
  song_id?: string;

  @Prop({ index: true })
  template_id?: string;

  @Prop()
  layer_type?: string;

  @Prop({ type: Object })
  event_data: Record<string, any>;

  @Prop({ type: Object })
  performance_metrics?: {
    response_time_ms?: number;
    cache_hit?: boolean;
    scoring_time_ms?: number;
    templates_evaluated?: number;
  };

  @Prop({ default: Date.now, index: true })
  timestamp: Date;

  @Prop()
  session_id?: string;

  @Prop()
  request_id?: string;

  @Prop({ default: '1.0.0' })
  version: string;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// Indexes for efficient analytics queries
AnalyticsEventSchema.index({ event_type: 1, timestamp: -1 });
AnalyticsEventSchema.index({ user_id: 1, timestamp: -1 });
AnalyticsEventSchema.index({ template_id: 1, event_type: 1 });

// ========================================
// src/models/user-preference.schema.ts
// ========================================
@Schema({ timestamps: true })
export class UserPreference extends Document {
  @Prop({ required: true, unique: true, index: true })
  user_id: string;

  @Prop({ type: Object })
  preferences: {
    energy_preference?: 'low' | 'moderate' | 'high';
    style_preference?: string;
    genre_preferences?: string[];
    preferred_stars?: string[];
    preferred_looks?: string[];
    preferred_moves?: string[];
    preferred_worlds?: string[];
  };

  @Prop({ type: Object })
  behavior_patterns: {
    most_selected_genres?: string[];
    avg_energy_level?: number;
    completion_rate?: number;
    skip_rate?: number;
  };

  @Prop({ default: Date.now })
  last_updated: Date;

  @Prop({ default: 0 })
  total_recommendations: number;

  @Prop({ default: 0 })
  total_selections: number;

  @Prop({ default: 0 })
  total_completions: number;
}

export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference);

// ========================================
// src/modules/scoring/scoring.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoringService } from './scoring.service';
import { RuleBasedScoringService } from './algorithms/rule-based-scoring.service';
import { FreshnessBoostService } from './algorithms/freshness-boost.service';
import { DiversityService } from './algorithms/diversity.service';
import { CompatibilityScore, CompatibilityScoreSchema } from '../../models/compatibility-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
    ]),
  ],
  providers: [
    ScoringService,
    RuleBasedScoringService,
    FreshnessBoostService,
    DiversityService,
  ],
  exports: [ScoringService],
})
export class ScoringModule {}

// ========================================
// src/modules/scoring/scoring.service.ts
// ========================================
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

// ========================================
// src/modules/scoring/algorithms/rule-based-scoring.service.ts
// ========================================
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RuleBasedScoringService {
  private readonly logger = new Logger(RuleBasedScoringService.name);

  async computeScore(
    song: any,
    template: any,
    userPreferences?: any,
  ): Promise<{
    tempo_score: number;
    genre_score: number;
    energy_score: number;
    style_score: number;
    mood_score: number;
  }> {
    const tempoScore = this.computeTempoCompatibility(song, template);
    const genreScore = this.computeGenreCompatibility(song, template);
    const energyScore = this.computeEnergyCompatibility(song, template);
    const styleScore = this.computeStyleCompatibility(song, template);
    const moodScore = this.computeMoodCompatibility(song, template);

    // Apply user preference adjustments
    const adjustedScores = this.applyUserPreferences({
      tempo_score: tempoScore,
      genre_score: genreScore,
      energy_score: energyScore,
      style_score: styleScore,
      mood_score: moodScore,
    }, userPreferences);

    return adjustedScores;
  }

  private computeTempoCompatibility(song: any, template: any): number {
    const songBPM = song.songMetadata?.bpm;
    if (!songBPM) return 0.5; // Default score if BPM not available

    // Extract BPM hints from template tags
    const templateTags = template.tags || [];
    const bpmHints = templateTags.filter((tag: string) => 
      tag.includes('bpm') || tag.includes('tempo')
    );

    if (bpmHints.length === 0) return 0.5; // Default score

    // Simple BPM matching - in a real implementation, this would be more sophisticated
    let maxCompatibility = 0;
    
    for (const hint of bpmHints) {
      // Extract numeric BPM from tags like "120bpm", "fast-tempo", etc.
      const bpmMatch = hint.match(/(\d+)bpm/);
      if (bpmMatch) {
        const templateBPM = parseInt(bpmMatch[1]);
        const difference = Math.abs(songBPM - templateBPM);
        
        // Score based on BPM difference (perfect match = 1.0, large difference = 0.0)
        const compatibility = Math.max(0, 1 - (difference / 60)); // 60 BPM tolerance
        maxCompatibility = Math.max(maxCompatibility, compatibility);
      }
    }

    return maxCompatibility || 0.5;
  }

  private computeGenreCompatibility(song: any, template: any): number {
    const songGenre = song.songMetadata?.genre?.toLowerCase();
    if (!songGenre) return 0.5;

    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());
    
    // Direct genre match
    if (templateTags.includes(songGenre)) return 1.0;

    // Genre family matching
    const genreFamilies = {
      'pop': ['electronic', 'dance', 'synth'],
      'rock': ['alternative', 'indie', 'punk'],
      'hip-hop': ['rap', 'urban', 'r&b'],
      'electronic': ['edm', 'techno', 'house', 'dance'],
      'jazz': ['blues', 'soul', 'funk'],
      'classical': ['orchestral', 'symphonic'],
    };

    const relatedGenres = genreFamilies[songGenre] || [];
    for (const relatedGenre of relatedGenres) {
      if (templateTags.includes(relatedGenre)) return 0.7; // Partial match
    }

    return 0.3; // No genre compatibility found
  }

  private computeEnergyCompatibility(song: any, template: any): number {
    // Extract energy level from song metadata or tags
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const energyLevels = ['low-energy', 'moderate-energy', 'high-energy'];
    
    const songEnergy = songTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';
    const templateEnergy = templateTags.find(tag => energyLevels.includes(tag)) || 'moderate-energy';

    if (songEnergy === templateEnergy) return 1.0;
    
    // Adjacent energy levels have partial compatibility
    const energyMap = { 'low-energy': 0, 'moderate-energy': 1, 'high-energy': 2 };
    const songLevel = energyMap[songEnergy];
    const templateLevel = energyMap[templateEnergy];
    const difference = Math.abs(songLevel - templateLevel);
    
    return difference === 1 ? 0.6 : 0.2; // Adjacent = 0.6, opposite = 0.2
  }

  private computeStyleCompatibility(song: any, template: any): number {
    // Style compatibility based on visual and aesthetic tags
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const styleKeywords = [
      'modern', 'vintage', 'retro', 'futuristic', 'minimalist', 'colorful',
      'dark', 'bright', 'abstract', 'realistic', 'artistic', 'commercial'
    ];

    const songStyles = songTags.filter(tag => styleKeywords.includes(tag));
    const templateStyles = templateTags.filter(tag => styleKeywords.includes(tag));

    if (songStyles.length === 0 || templateStyles.length === 0) return 0.5;

    // Calculate intersection ratio
    const intersection = songStyles.filter(style => templateStyles.includes(style));
    const union = [...new Set([...songStyles, ...templateStyles])];
    
    return intersection.length / union.length;
  }

  private computeMoodCompatibility(song: any, template: any): number {
    const songTags = (song.tags || []).map((tag: string) => tag.toLowerCase());
    const templateTags = (template.tags || []).map((tag: string) => tag.toLowerCase());

    const moodKeywords = [
      'happy', 'sad', 'energetic', 'calm', 'intense', 'peaceful',
      'aggressive', 'romantic', 'mysterious', 'uplifting', 'dramatic'
    ];

    const songMoods = songTags.filter(tag => moodKeywords.includes(tag));
    const templateMoods = templateTags.filter(tag => moodKeywords.includes(tag));

    if (songMoods.length === 0 || templateMoods.length === 0) return 0.5;

    // Calculate mood compatibility
    const intersection = songMoods.filter(mood => templateMoods.includes(mood));
    return intersection.length > 0 ? intersection.length / Math.max(songMoods.length, templateMoods.length) : 0.3;
  }

  private applyUserPreferences(
    scores: any,
    userPreferences?: any,
  ): any {
    if (!userPreferences) return scores;

    const adjustedScores = { ...scores };

    // Apply energy preference boost
    if (userPreferences.energy_preference) {
      const energyBoost = userPreferences.energy_preference === 'high' ? 1.1 : 
                         userPreferences.energy_preference === 'low' ? 0.9 : 1.0;
      adjustedScores.energy_score *= energyBoost;
    }

    // Apply genre preference boost
    if (userPreferences.genre_preferences && userPreferences.genre_preferences.length > 0) {
      // This would require access to song/template data to check if preferred genres match
      // For now, apply a small boost to genre score
      adjustedScores.genre_score *= 1.05;
    }

    // Normalize scores to [0, 1] range
    Object.keys(adjustedScores).forEach(key => {
      adjustedScores[key] = Math.max(0, Math.min(1, adjustedScores[key]));
    });

    return adjustedScores;
  }
}

// ========================================
// src/modules/scoring/algorithms/freshness-boost.service.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { FRESHNESS_BOOST } from '../../../common/constants/compatibility-weights';

@Injectable()
export class FreshnessBoostService {
  calculateBoost(createdAt: Date): number {
    if (!createdAt) return 1.0;

    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      return FRESHNESS_BOOST.FIRST_WEEK; // 20% boost for first week
    } else if (ageInDays < 30) {
      return FRESHNESS_BOOST.FIRST_MONTH; // 10% boost for first month
    } else if (ageInDays < 90) {
      return FRESHNESS_BOOST.FIRST_QUARTER; // 5% boost for first quarter
    }

    return 1.0; // No boost for older content
  }

  getBoostedScore(baseScore: number, createdAt: Date): number {
    const boost = this.calculateBoost(createdAt);
    return Math.min(baseScore * boost, 1.0); // Cap at 1.0
  }
}

// ========================================
// src/modules/scoring/algorithms/diversity.service.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';
import { SCORING_THRESHOLDS } from '../../../common/constants/compatibility-weights';

@Injectable()
export class DiversityService {
  applyDiversityBoost(
    recommendations: TemplateRecommendation[],
    maxResults: number = 10,
  ): TemplateRecommendation[] {
    if (recommendations.length <= maxResults) {
      return this.addRandomTieBreaker(recommendations);
    }

    // Group by similar characteristics to ensure diversity
    const diverseRecommendations: TemplateRecommendation[] = [];
    const used = new Set<string>();

    // First pass: include top recommendations from different "style families"
    const styleFamilies = this.groupByStyleFamily(recommendations);
    
    for (const [family, templates] of styleFamilies.entries()) {
      if (diverseRecommendations.length >= maxResults) break;
      
      // Take the best recommendation from each style family
      const bestFromFamily = templates
        .filter(t => !used.has(t.template_id))
        .sort((a, b) => b.compatibility_score - a.compatibility_score)[0];
      
      if (bestFromFamily) {
        diverseRecommendations.push(bestFromFamily);
        used.add(bestFromFamily.template_id);
      }
    }

    // Second pass: fill remaining slots with highest scoring unused templates
    const remainingSlots = maxResults - diverseRecommendations.length;
    if (remainingSlots > 0) {
      const remaining = recommendations
        .filter(t => !used.has(t.template_id))
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, remainingSlots);
      
      diverseRecommendations.push(...remaining);
    }

    return this.addRandomTieBreaker(diverseRecommendations);
  }

  private groupByStyleFamily(
    recommendations: TemplateRecommendation[],
  ): Map<string, TemplateRecommendation[]> {
    const families = new Map<string, TemplateRecommendation[]>();

    for (const recommendation of recommendations) {
      const family = this.determineStyleFamily(recommendation);
      
      if (!families.has(family)) {
        families.set(family, []);
      }
      
      families.get(family)!.push(recommendation);
    }

    return families;
  }

  private determineStyleFamily(recommendation: TemplateRecommendation): string {
    const tags = recommendation.metadata.tags || [];
    const lowerTags = tags.map(tag => tag.toLowerCase());

    // Determine style family based on tags
    if (lowerTags.some(tag => ['modern', 'futuristic', 'tech'].includes(tag))) {
      return 'modern';
    } else if (lowerTags.some(tag => ['vintage', 'retro', 'classic'].includes(tag))) {
      return 'vintage';
    } else if (lowerTags.some(tag => ['colorful', 'vibrant', 'bright'].includes(tag))) {
      return 'vibrant';
    } else if (lowerTags.some(tag => ['dark', 'moody', 'dramatic'].includes(tag))) {
      return 'dramatic';
    } else if (lowerTags.some(tag => ['minimal', 'clean', 'simple'].includes(tag))) {
      return 'minimal';
    }

    return 'general'; // Default family
  }

  private addRandomTieBreaker(
    recommendations: TemplateRecommendation[],
  ): TemplateRecommendation[] {
    // Add small random factor for tie-breaking
    return recommendations.map(rec => ({
      ...rec,
      compatibility_score: rec.compatibility_score * (1 + Math.random() * SCORING_THRESHOLDS.DIVERSITY_FACTOR),
    })).sort((a, b) => b.compatibility_score - a.compatibility_score);
  }
}