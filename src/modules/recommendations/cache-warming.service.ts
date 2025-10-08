import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../caching/cache.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReVizCompleteExperienceProductionService } from './reviz-complete-experience-production.service';
import { ReVizCompleteRequest } from './interfaces/reviz-complete-experience.interface';

/**
 * Cache Warming Service
 * Pre-warms caches for popular songs to ensure optimal performance
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private isWarming = false;

  constructor(
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
    private readonly revizService: ReVizCompleteExperienceProductionService,
  ) {}

  /**
   * Warm cache for top trending songs
   * Runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async warmTopSongs(): Promise<void> {
    if (this.isWarming) {
      this.logger.warn('Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔥 Starting cache warming for top songs...');
      
      // Get top 100 songs by trending score
      const topSongs = await this.getTopTrendingSongs(100);
      this.logger.log(`📊 Found ${topSongs.length} trending songs to warm`);

      let successCount = 0;
      let errorCount = 0;

      // Warm cache for each song with different configurations
      for (const song of topSongs) {
        try {
          await this.warmSongCache(song.id, song.popularity);
          successCount++;
        } catch (error) {
          this.logger.error(`Failed to warm cache for song ${song.id}:`, error);
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Cache warming completed in ${duration}ms - Success: ${successCount}, Errors: ${errorCount}`);

    } catch (error) {
      this.logger.error('❌ Cache warming failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm cache for specific song with multiple configurations
   */
  private async warmSongCache(songId: string, popularity: number): Promise<void> {
    const configurations = this.getWarmingConfigurations(popularity);
    
    for (const config of configurations) {
      const request: ReVizCompleteRequest = {
        song_id: songId,
        experience_config: config,
        request_id: `warm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      try {
        // Generate response to warm cache
        const response = await this.revizService.getCompleteExperience(request);
        
        // Cache at multiple levels based on popularity
        const cacheKey = this.generateCacheKey(request);
        const ttl = this.calculateTTL(popularity);

        // Cache with appropriate TTL based on popularity
        await this.cacheService.set(cacheKey, response, ttl);

        this.logger.debug(`🔥 Warmed cache for song ${songId} with config: ${JSON.stringify(config)}`);

      } catch (error) {
        this.logger.warn(`Failed to warm cache for song ${songId} with config ${JSON.stringify(config)}:`, error);
      }
    }
  }

  /**
   * Get warming configurations based on song popularity
   */
  private getWarmingConfigurations(popularity: number): any[] {
    const baseConfig = {
      max_composites: 5,
      max_assets_per_layer: 6,
      include_variants: true,
      variant_depth: 6,
      layers: ['stars', 'looks', 'moves', 'worlds']
    };

    const configurations = [baseConfig];

    // Add mobile-optimized config for popular songs
    if (popularity > 0.7) {
      configurations.push({
        ...baseConfig,
        max_composites: 3,
        max_assets_per_layer: 4,
        include_variants: false,
        layers: ['stars', 'looks']
      });
    }

    // Add desktop-optimized config for very popular songs
    if (popularity > 0.9) {
      configurations.push({
        ...baseConfig,
        max_composites: 10,
        max_assets_per_layer: 8,
        variant_depth: 8
      });
    }

    return configurations;
  }

  /**
   * Get top trending songs from analytics
   */
  private async getTopTrendingSongs(limit: number): Promise<Array<{ id: string; popularity: number }>> {
    try {
      // This would integrate with your analytics service
      // For now, return mock data
      const mockSongs = [
        { id: '1.013.017.001', popularity: 0.95 },
        { id: '1.018.001.001', popularity: 0.92 },
        { id: '1.018.004.002', popularity: 0.88 },
        { id: '1.020.007.004', popularity: 0.85 },
        { id: '1.018.004.001', popularity: 0.82 },
        { id: '1.018.010.001', popularity: 0.78 },
        { id: '1.020.007.003', popularity: 0.75 },
        { id: '1.013.015.001', popularity: 0.72 },
        { id: '1.020.007.002', popularity: 0.68 },
        { id: '1.020.007.001', popularity: 0.65 },
      ];

      return mockSongs.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get top trending songs:', error);
      return [];
    }
  }

  /**
   * Manual cache warming trigger
   */
  async warmSpecificSong(songId: string): Promise<void> {
    this.logger.log(`🔥 Manual cache warming for song: ${songId}`);
    
    try {
      const popularity = 0.8; // Mock popularity score for now
      await this.warmSongCache(songId, popularity);
      this.logger.log(`✅ Manual cache warming completed for song: ${songId}`);
    } catch (error) {
      this.logger.error(`❌ Manual cache warming failed for song ${songId}:`, error);
      throw error;
    }
  }

  /**
   * Warm cache for user's recent songs
   */
  async warmUserCache(userId: string): Promise<void> {
    this.logger.log(`🔥 Warming cache for user: ${userId}`);
    
    try {
      // Get user's recent songs from analytics
      const recentSongs = await this.getUserRecentSongs(userId, 20);
      
      for (const song of recentSongs) {
        try {
          await this.warmSongCache(song.id, song.popularity);
        } catch (error) {
          this.logger.warn(`Failed to warm cache for user ${userId} song ${song.id}:`, error);
        }
      }
      
      this.logger.log(`✅ User cache warming completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ User cache warming failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's recent songs
   */
  private async getUserRecentSongs(userId: string, limit: number): Promise<Array<{ id: string; popularity: number }>> {
    try {
      // This would integrate with your analytics service to get user's recent songs
      // For now, return mock data
      return [
        { id: '1.013.017.001', popularity: 0.9 },
        { id: '1.018.001.001', popularity: 0.85 },
        { id: '1.018.004.002', popularity: 0.8 },
      ].slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get user recent songs:', error);
      return [];
    }
  }

  /**
   * Clear and rebuild cache for all songs
   */
  async rebuildAllCache(): Promise<void> {
    this.logger.log('🔥 Rebuilding entire cache...');
    
    try {
      // Clear existing cache (using pattern deletion)
      await this.cacheService.deletePattern('reviz:*');
      
      // Warm cache for all songs
      await this.warmTopSongs();
      
      this.logger.log('✅ Cache rebuild completed');
    } catch (error) {
      this.logger.error('❌ Cache rebuild failed:', error);
      throw error;
    }
  }

  /**
   * Get cache warming status
   */
  getWarmingStatus(): any {
    return {
      is_warming: this.isWarming,
      timestamp: new Date().toISOString(),
      last_warmup: this.getLastWarmupTime(),
    };
  }

  private getLastWarmupTime(): string {
    // This would track the last warmup time
    return new Date().toISOString();
  }

  private generateCacheKey(request: ReVizCompleteRequest): string {
    const config = request.experience_config;
    return `reviz:${request.song_id}:${config.max_composites}:${config.max_assets_per_layer}:${config.variant_depth}:${config.layers?.join('-') || 'all'}`;
  }

  private calculateTTL(popularity: number): number {
    if (popularity > 0.8) return 7200; // 2 hours
    if (popularity > 0.5) return 3600; // 1 hour
    return 1800; // 30 minutes
  }
}
