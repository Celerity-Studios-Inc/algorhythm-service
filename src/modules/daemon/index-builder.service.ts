import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CompatibilityScore, CompatibilityScoreDocument } from '../../models/compatibility-score.schema';
import { RecommendationCache, RecommendationCacheDocument } from '../../models/recommendation-cache.schema';

@Injectable()
export class IndexBuilderService {
  private readonly logger = new Logger(IndexBuilderService.name);

  constructor(
    @InjectModel('CompatibilityScore')
    private readonly compatibilityScoreModel: Model<CompatibilityScoreDocument>,
    @InjectModel('RecommendationCache')
    private readonly recommendationCacheModel: Model<RecommendationCacheDocument>,
    private readonly nnaRegistryService: NnaRegistryService,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async buildRecommendationIndex() {
    this.logger.log('Building recommendation index...');

    try {
      // Get all songs and templates from NNA Registry
      const songs = await this.nnaRegistryService.getAllSongs();
      const templates = await this.nnaRegistryService.getAllTemplates();

      this.logger.log(`Processing ${songs.length} songs and ${templates.length} templates`);

      // Build recommendation index for each song
      const recommendations = [];
      for (const song of songs) {
        const songRecommendations = await this.buildSongRecommendations(song, templates);
        recommendations.push(...songRecommendations);
      }

      // Store recommendations in cache
      await this.storeRecommendations(recommendations);

      this.logger.log(`Built ${recommendations.length} recommendations`);
    } catch (error) {
      this.logger.error('Failed to build recommendation index:', error);
      throw error;
    }
  }

  private async buildSongRecommendations(song: any, templates: any[]) {
    const recommendations = [];

    for (const template of templates) {
      // Get compatibility score
      const compatibilityScore = await this.compatibilityScoreModel.findOne({
        song_id: song.id,
        template_id: template.id,
      });

      if (!compatibilityScore) {
        continue; // Skip if no compatibility score
      }

      // Calculate final score with freshness and diversity
      const finalScore = this.calculateFinalScore(compatibilityScore, song, template);

      recommendations.push({
        song_id: song.id,
        template_id: template.id,
        score: finalScore,
        metadata: {
          song_metadata: song,
          template_metadata: template,
          compatibility_score: compatibilityScore.final_score,
          freshness_boost: compatibilityScore.freshness_boost || 0,
          diversity_score: 0, // Will be computed separately
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Top 50 recommendations per song
  }

  private calculateFinalScore(compatibilityScore: any, song: any, template: any): number {
    let score = compatibilityScore.score;

    // Apply freshness boost
    if (compatibilityScore.freshness_boost) {
      score += compatibilityScore.freshness_boost;
    }

    // Apply diversity score
    if (compatibilityScore.diversity_score) {
      score += compatibilityScore.diversity_score;
    }

    // Apply user preference weights (if available)
    // This would be enhanced with actual user preference data
    const userPreferenceWeight = 1.0; // Default weight
    score *= userPreferenceWeight;

    return Math.min(score, 100); // Cap at 100
  }

  private async storeRecommendations(recommendations: any[]) {
    // Clear existing cache
    await this.recommendationCacheModel.deleteMany({});

    // Store new recommendations
    const cacheEntries = recommendations.map(rec => ({
      song_id: rec.song_id,
      template_id: rec.template_id,
      score: rec.score,
      metadata: rec.metadata,
      created_at: rec.created_at,
      updated_at: rec.updated_at,
    }));

    await this.recommendationCacheModel.insertMany(cacheEntries);

    // Also store in Redis for fast access
    for (const rec of recommendations) {
      const cacheKey = `recommendation:${rec.song_id}:${rec.template_id}`;
      await this.cacheService.set(cacheKey, rec, 3600); // 1 hour TTL
    }
  }

  async warmUpCache() {
    this.logger.log('Warming up cache with popular recommendations...');

    try {
      // Get top recommendations from database
      const topRecommendations = await this.recommendationCacheModel
        .find({})
        .sort({ score: -1 })
        .limit(1000);

      // Pre-load into Redis cache
      for (const rec of topRecommendations) {
        const cacheKey = `recommendation:${rec.song_id}:${rec.recommended_template_id}`;
        await this.cacheService.set(cacheKey, rec, 3600);
      }

      this.logger.log(`Warmed up cache with ${topRecommendations.length} recommendations`);
    } catch (error) {
      this.logger.error('Failed to warm up cache:', error);
    }
  }

  async cleanupOldData() {
    this.logger.log('Cleaning up old data...');

    try {
      // Remove recommendations older than 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      await this.recommendationCacheModel.deleteMany({
        updated_at: { $lt: cutoffDate },
      });

      this.logger.log('Old data cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data:', error);
    }
  }

  async optimizeCache() {
    this.logger.log('Optimizing cache...');

    try {
      // Clear expired cache entries
      await this.cacheService.clearExpired();

      // Rebuild cache with most popular recommendations
      await this.warmUpCache();

      this.logger.log('Cache optimization completed');
    } catch (error) {
      this.logger.error('Failed to optimize cache:', error);
    }
  }
}
