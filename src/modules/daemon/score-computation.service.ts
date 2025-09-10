import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { CompatibilityScore, CompatibilityScoreDocument } from '../../models/compatibility-score.schema';
import { RuleBasedScoringService } from '../scoring/algorithms/rule-based-scoring.service';
import { FreshnessBoostService } from '../scoring/algorithms/freshness-boost.service';
import { DiversityService } from '../scoring/algorithms/diversity.service';

@Injectable()
export class ScoreComputationService {
  private readonly logger = new Logger(ScoreComputationService.name);

  constructor(
    @InjectModel(CompatibilityScore.name)
    private readonly compatibilityScoreModel: Model<CompatibilityScoreDocument>,
    private readonly nnaRegistryService: NnaRegistryService,
    private readonly ruleBasedScoringService: RuleBasedScoringService,
    private readonly freshnessBoostService: FreshnessBoostService,
    private readonly diversityService: DiversityService,
  ) {}

  async updateCompatibilityScores() {
    this.logger.log('Updating compatibility scores...');

    try {
      // Get all songs and templates from NNA Registry
      const songs = await this.nnaRegistryService.getAllSongs();
      const templates = await this.nnaRegistryService.getAllTemplates();

      this.logger.log(`Computing scores for ${songs.length} songs and ${templates.length} templates`);

      let processedCount = 0;
      const batchSize = 100;

      // Process in batches to avoid memory issues
      for (let i = 0; i < songs.length; i += batchSize) {
        const songBatch = songs.slice(i, i + batchSize);
        
        for (const song of songBatch) {
          await this.computeSongTemplateScores(song, templates);
          processedCount++;
          
          if (processedCount % 50 === 0) {
            this.logger.log(`Processed ${processedCount}/${songs.length} songs`);
          }
        }
      }

      this.logger.log(`Compatibility score update completed. Processed ${processedCount} songs`);
    } catch (error) {
      this.logger.error('Failed to update compatibility scores:', error);
      throw error;
    }
  }

  private async computeSongTemplateScores(song: any, templates: any[]) {
    for (const template of templates) {
      try {
        // Check if score already exists
        const existingScore = await this.compatibilityScoreModel.findOne({
          song_id: song.id,
          template_id: template.id,
        });

        // Compute base compatibility score
        const baseScore = await this.ruleBasedScoringService.computeScore(song, template);

        // Compute freshness boost
        const freshnessBoost = await this.freshnessBoostService.computeFreshnessBoost(template);

        // Compute diversity score
        const diversityScore = await this.diversityService.computeDiversityScore(song, template);

        // Calculate final score
        const finalScore = Math.min(baseScore + freshnessBoost + diversityScore, 100);

        if (existingScore) {
          // Update existing score
          await this.compatibilityScoreModel.updateOne(
            { song_id: song.id, template_id: template.id },
            {
              score: finalScore,
              base_score: baseScore,
              freshness_boost: freshnessBoost,
              diversity_score: diversityScore,
              updated_at: new Date(),
            }
          );
        } else {
          // Create new score
          await this.compatibilityScoreModel.create({
            song_id: song.id,
            template_id: template.id,
            score: finalScore,
            base_score: baseScore,
            freshness_boost: freshnessBoost,
            diversity_score: diversityScore,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Failed to compute score for song ${song.id} and template ${template.id}:`, error);
      }
    }
  }

  async updateFreshnessScores() {
    this.logger.log('Updating freshness scores...');

    try {
      // Get all templates from NNA Registry
      const templates = await this.nnaRegistryService.getAllTemplates();

      for (const template of templates) {
        const freshnessBoost = await this.freshnessBoostService.computeFreshnessBoost(template);

        // Update all compatibility scores for this template
        await this.compatibilityScoreModel.updateMany(
          { template_id: template.id },
          {
            freshness_boost: freshnessBoost,
            updated_at: new Date(),
          }
        );
      }

      this.logger.log('Freshness scores updated successfully');
    } catch (error) {
      this.logger.error('Failed to update freshness scores:', error);
    }
  }

  async getScoreStats() {
    try {
      const stats = await this.compatibilityScoreModel.aggregate([
        {
          $group: {
            _id: null,
            total_scores: { $sum: 1 },
            avg_score: { $avg: '$score' },
            max_score: { $max: '$score' },
            min_score: { $min: '$score' },
          },
        },
      ]);

      return stats[0] || {
        total_scores: 0,
        avg_score: 0,
        max_score: 0,
        min_score: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get score stats:', error);
      return null;
    }
  }
}
