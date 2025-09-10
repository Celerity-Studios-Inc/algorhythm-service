import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IndexBuilderService } from './index-builder.service';
import { ScoreComputationService } from './score-computation.service';

@Injectable()
export class DaemonService {
  private readonly logger = new Logger(DaemonService.name);

  constructor(
    private readonly indexBuilderService: IndexBuilderService,
    private readonly scoreComputationService: ScoreComputationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async buildRecommendationIndex() {
    this.logger.log('Starting hourly recommendation index build...');
    
    try {
      // Step 1: Update compatibility scores
      await this.scoreComputationService.updateCompatibilityScores();
      
      // Step 2: Build recommendation index
      await this.indexBuilderService.buildRecommendationIndex();
      
      // Step 3: Warm up cache with popular recommendations
      await this.indexBuilderService.warmUpCache();
      
      this.logger.log('Recommendation index build completed successfully');
    } catch (error) {
      this.logger.error('Failed to build recommendation index:', error);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async updateFreshnessScores() {
    this.logger.log('Updating freshness scores...');
    
    try {
      await this.scoreComputationService.updateFreshnessScores();
      this.logger.log('Freshness scores updated successfully');
    } catch (error) {
      this.logger.error('Failed to update freshness scores:', error);
    }
  }

  @Cron('0 0 * * *') // Daily at midnight
  async performMaintenance() {
    this.logger.log('Starting daily maintenance...');
    
    try {
      // Clean up old analytics data
      await this.indexBuilderService.cleanupOldData();
      
      // Optimize cache
      await this.indexBuilderService.optimizeCache();
      
      this.logger.log('Daily maintenance completed successfully');
    } catch (error) {
      this.logger.error('Failed to perform daily maintenance:', error);
    }
  }

  // Manual trigger methods for testing
  async triggerIndexBuild() {
    this.logger.log('Manually triggering index build...');
    await this.buildRecommendationIndex();
  }

  async triggerScoreUpdate() {
    this.logger.log('Manually triggering score update...');
    await this.scoreComputationService.updateCompatibilityScores();
  }
}
