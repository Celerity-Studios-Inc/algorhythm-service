import { Injectable, Logger } from '@nestjs/common';
import { LocalDataQueryService } from './local-data-query.service';
import { LocalDataStorageService } from './local-data-storage.service';
import { SearchOptimizationService } from './search-optimization.service';

/**
 * Cache Warming Service
 * 
 * This service pre-computes and caches recommendations using local data
 * to provide ultra-fast response times for ReViz integration.
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly cache = new Map<string, any>();
  private readonly cacheStats = {
    hits: 0,
    misses: 0,
    totalQueries: 0,
    averageResponseTime: 0,
  };

  constructor(
    private readonly localDataQuery: LocalDataQueryService,
    private readonly localDataStorage: LocalDataStorageService,
    private readonly searchOptimization: SearchOptimizationService,
  ) {}

  /**
   * Warm cache for all known songs
   */
  async warmCacheForAllSongs(): Promise<void> {
    try {
      this.logger.log(`🔥 Starting cache warming for all songs`);

      const startTime = Date.now();
      const stats = await this.localDataStorage.getStorageStats();
      
      // Get all unique song IDs from local storage
      const songIds = await this.getAllSongIds();
      
      this.logger.log(`📊 Found ${songIds.length} unique songs to warm cache for`);

      // Warm cache for each song
      for (const songId of songIds) {
        await this.warmCacheForSong(songId);
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`✅ Cache warming completed for ${songIds.length} songs in ${totalTime}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to warm cache for all songs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Warm cache for a specific song
   */
  async warmCacheForSong(songId: string): Promise<void> {
    try {
      this.logger.log(`🔥 Warming cache for song: ${songId}`);

      const startTime = Date.now();

      // Get all assets for this song
      const assets = await this.localDataQuery.getAssetsBySong(songId);
      
      // Get all composites for this song
      const composites = await this.localDataQuery.getCompositesBySong(songId);
      
      // Get full composites (C.FUL) for this song
      const fullComposites = await this.localDataQuery.getFullCompositesBySong(songId);

      // Pre-compute recommendations for different user contexts
      const userContexts = this.generateUserContexts();
      
      for (const userContext of userContexts) {
        const cacheKey = this.generateCacheKey(songId, userContext);
        const recommendations = await this.precomputeRecommendations(songId, userContext, assets, composites, fullComposites);
        
        this.cache.set(cacheKey, {
          ...recommendations,
          cachedAt: new Date(),
          songId,
          userContext,
        });
      }

      const queryTime = Date.now() - startTime;
      this.logger.log(`✅ Cache warmed for song ${songId} in ${queryTime}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to warm cache for song ${songId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(songId: string, userContext: any): Promise<any | null> {
    try {
      const startTime = Date.now();
      const cacheKey = this.generateCacheKey(songId, userContext);
      
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        this.cacheStats.hits++;
        this.cacheStats.totalQueries++;
        this.updateAverageResponseTime(Date.now() - startTime);
        
        this.logger.debug(`✅ Cache hit for song ${songId}`);
        return cached;
      } else {
        this.cacheStats.misses++;
        this.cacheStats.totalQueries++;
        this.updateAverageResponseTime(Date.now() - startTime);
        
        this.logger.debug(`❌ Cache miss for song ${songId}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get cached recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Pre-compute recommendations for a song and user context
   */
  private async precomputeRecommendations(
    songId: string,
    userContext: any,
    assets: any[],
    composites: any[],
    fullComposites: any[]
  ): Promise<any> {
    try {
      // Filter for full composites (C.FUL)
      const fullCompositesFiltered = fullComposites.filter(composite => 
        composite.compositeType === 'C.FUL'
      );

      // Generate template recommendations
      const templateRecommendations = this.generateTemplateRecommendations(
        fullCompositesFiltered,
        userContext
      );

      // Generate layer variations
      const layerVariations = this.generateLayerVariations(
        assets,
        userContext
      );

      return {
        recommendation: templateRecommendations.primary,
        alternatives: templateRecommendations.alternatives,
        layerVariations,
        total_available: fullCompositesFiltered.length,
        cache_hit: true,
        score_computation_time_ms: 0,
        templates_evaluated: fullCompositesFiltered.length,
        gcp_storage_url: templateRecommendations.primary?.gcpStorageUrl || null,
        thumbnail_url: templateRecommendations.primary?.thumbnailUrl || null,
        preview_url: templateRecommendations.primary?.previewUrl || null,
        media: templateRecommendations.primary?.media || null,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to precompute recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate template recommendations from full composites
   */
  private generateTemplateRecommendations(composites: any[], userContext: any): any {
    if (composites.length === 0) {
      return {
        primary: null,
        alternatives: [],
      };
    }

    // Sort composites by compatibility score
    const sortedComposites = composites.sort((a, b) => {
      const scoreA = a.compatibilityScores?.overall || 0;
      const scoreB = b.compatibilityScores?.overall || 0;
      return scoreB - scoreA;
    });

    const primary = sortedComposites[0];
    const alternatives = sortedComposites.slice(1, 4); // Top 3 alternatives

    return {
      primary: {
        template_id: primary._id,
        name: primary.name,
        layer: primary.layer,
        category: primary.category,
        subcategory: primary.subcategory,
        gcpStorageUrl: primary.gcpStorageUrl,
        thumbnailUrl: primary.thumbnailUrl,
        previewUrl: primary.previewUrl,
        description: primary.description,
        compatibility_score: primary.compatibilityScores?.overall || 0,
        freshness_score: primary.freshnessScore || 0,
        media: {
          gcp_storage_url: primary.gcpStorageUrl,
          thumbnail_url: primary.thumbnailUrl,
          preview_url: primary.previewUrl,
        },
      },
      alternatives: alternatives.map(composite => ({
        template_id: composite._id,
        name: composite.name,
        layer: composite.layer,
        category: composite.category,
        subcategory: composite.subcategory,
        gcpStorageUrl: composite.gcpStorageUrl,
        thumbnailUrl: composite.thumbnailUrl,
        previewUrl: composite.previewUrl,
        description: composite.description,
        compatibility_score: composite.compatibilityScores?.overall || 0,
        freshness_score: composite.freshnessScore || 0,
        media: {
          gcp_storage_url: composite.gcpStorageUrl,
          thumbnail_url: composite.thumbnailUrl,
          preview_url: composite.previewUrl,
        },
      })),
    };
  }

  /**
   * Generate layer variations from assets
   */
  private generateLayerVariations(assets: any[], userContext: any): any[] {
    // Group assets by layer
    const assetsByLayer = assets.reduce((acc, asset) => {
      if (!acc[asset.layer]) {
        acc[asset.layer] = [];
      }
      acc[asset.layer].push(asset);
      return acc;
    }, {} as Record<string, any[]>);

    // Generate variations for each layer
    return Object.entries(assetsByLayer).map(([layer, layerAssets]) => ({
      layer,
      assets: (layerAssets as any[]).slice(0, 3), // Top 3 assets per layer
      count: (layerAssets as any[]).length,
    }));
  }

  /**
   * Generate user contexts for cache warming
   */
  private generateUserContexts(): any[] {
    return [
      { user_id: 'default', preferences: {} },
      { user_id: 'energy_high', preferences: { energy_level: 'high' } },
      { user_id: 'energy_low', preferences: { energy_level: 'low' } },
      { user_id: 'style_modern', preferences: { style: 'modern' } },
      { user_id: 'style_classic', preferences: { style: 'classic' } },
    ];
  }

  /**
   * Generate cache key for song and user context
   */
  private generateCacheKey(songId: string, userContext: any): string {
    return `recommendation:${songId}:${JSON.stringify(userContext)}`;
  }

  /**
   * Get all unique song IDs from local storage
   */
  private async getAllSongIds(): Promise<string[]> {
    try {
      // This would query the local storage for all unique song IDs
      // For now, return mock data
      return ['1.018.003.002', '1.018.003.001', '1.018.003.003'];
    } catch (error) {
      this.logger.error(`❌ Failed to get all song IDs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.averageResponseTime = 
      (this.cacheStats.averageResponseTime * (total - 1) + responseTime) / total;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      ...this.cacheStats,
      cacheSize: this.cache.size,
      hitRate: this.cacheStats.totalQueries > 0 
        ? (this.cacheStats.hits / this.cacheStats.totalQueries) * 100 
        : 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
    this.cacheStats.totalQueries = 0;
    this.cacheStats.averageResponseTime = 0;
    this.logger.log(`🗑️ Cache cleared`);
  }
}
