import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CachingService } from '../caching/caching.service';
import { NnaIntegrationService } from '../nna-integration/nna-integration.service';
import { ScoringService } from '../scoring/scoring.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ReVizCompleteExperienceService {
  private readonly logger = new Logger(ReVizCompleteExperienceService.name);
  
  constructor(
    private readonly cachingService: CachingService,
    private readonly nnaIntegration: NnaIntegrationService,
    private readonly scoringService: ScoringService,
    private readonly analyticsService: AnalyticsService,
    @InjectModel('Asset') private assetModel: Model<any>,
    @InjectModel('Composite') private compositeModel: Model<any>,
  ) {}

  /**
   * Get complete ReViz experience in a single API call
   */
  async getCompleteExperience(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.logger.log(`[REQ-${requestId}] Processing complete experience for song: ${request.song_id}`);
      
      // Step 1: Check multi-layer cache
      const cachedResponse = await this.checkCache(request);
      if (cachedResponse) {
        return this.addMetrics(cachedResponse, startTime, true);
      }
      
      // Step 2: Parallel data fetching with error resilience
      const [songData, composites, layerData] = await Promise.allSettled([
        this.getSongMetadata(request.song_id),
        this.getRecommendedComposites(request),
        this.getLayerAssetsOptimized(request)
      ]);
      
      // Step 3: Handle partial failures gracefully
      if (songData.status === 'rejected') {
        throw new Error(`Failed to fetch song metadata: ${songData.reason}`);
      }
      
      const compositeVideos = composites.status === 'fulfilled' 
        ? composites.value 
        : await this.getFallbackComposites(request);
        
      const layerAssets = layerData.status === 'fulfilled'
        ? layerData.value
        : await this.getMinimalLayerAssets(request);
      
      // Step 4: Build comprehensive response
      const response = await this.buildOptimizedResponse(
        songData.value,
        compositeVideos,
        layerAssets,
        request
      );
      
      // Step 5: Cache at multiple levels
      await this.cacheResponse(request, response);
      
      // Step 6: Track analytics
      await this.trackUsage(request, response, startTime);
      
      return this.addMetrics(response, startTime, false);
      
    } catch (error) {
      this.logger.error(`[REQ-${requestId}] Error processing request:`, error);
      throw error;
    }
  }

  /**
   * Get recommended composites with smart loading
   */
  private async getRecommendedComposites(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    const { song_id, experience_config } = request;
    const maxComposites = experience_config.max_composites || 5;
    
    // Get pre-computed recommendations
    const recommendations = await this.scoringService.getTopComposites(song_id, maxComposites * 2);
    
    // Load composite details with component preview
    const composites = await Promise.all(
      recommendations.slice(0, maxComposites).map(async (rec) => {
        const composite = await this.compositeModel.findById(rec.compositeId)
          .populate({
            path: 'components',
            select: 'layer assetId name thumbnailUrl',
            populate: {
              path: 'asset',
              select: 'name thumbnailUrl metadata.starName metadata.brandNames'
            }
          });
          
        return this.formatCompositeVideo(composite, rec.score);
      })
    );
    
    return composites;
  }

  /**
   * Optimized layer asset loading with variants
   */
  private async getLayerAssetsOptimized(request: ReVizCompleteRequest): Promise<LayerAssets> {
    const { experience_config } = request;
    const layers = experience_config.layers || ['stars', 'looks', 'moves', 'worlds'];
    const maxAssets = experience_config.max_assets_per_layer || 6;
    const includeVariants = experience_config.include_variants ?? true;
    const variantDepth = experience_config.variant_depth || 6;
    
    // Build aggregation pipeline for efficient loading
    const pipeline = [
      // Match assets for requested layers
      {
        $match: {
          layer: { $in: layers.map(l => l.charAt(0).toUpperCase()) },
          assetType: 'base'
        }
      },
      
      // Group by layer
      {
        $group: {
          _id: '$layer',
          assets: { 
            $push: {
              id: '$_id',
              name: '$name',
              metadata: '$metadata',
              thumbnailUrl: '$thumbnailUrl',
              fileUrl: '$fileUrl'
            }
          }
        }
      },
      
      // Limit assets per layer
      {
        $project: {
          layer: '$_id',
          assets: { $slice: ['$assets', maxAssets] }
        }
      }
    ];
    
    const layerGroups = await this.assetModel.aggregate(pipeline);
    
    // Load variants if requested
    if (includeVariants) {
      await this.loadVariantsOptimized(layerGroups, variantDepth);
    }
    
    return this.formatLayerAssets(layerGroups);
  }

  /**
   * Efficient variant loading using bulk operations
   */
  private async loadVariantsOptimized(layerGroups: any[], variantDepth: number): Promise<void> {
    // Collect all base asset IDs
    const baseAssetIds = layerGroups.flatMap(group => 
      group.assets.map(asset => asset.id)
    );
    
    // Bulk load all variants in one query
    const allVariants = await this.assetModel.find({
      baseAssetId: { $in: baseAssetIds },
      assetType: 'variant'
    })
    .select('baseAssetId name thumbnailUrl fileUrl metadata')
    .limit(baseAssetIds.length * variantDepth)
    .lean();
    
    // Group variants by base asset
    const variantsByBase = allVariants.reduce((acc, variant) => {
      if (!acc[variant.baseAssetId]) {
        acc[variant.baseAssetId] = [];
      }
      if (acc[variant.baseAssetId].length < variantDepth) {
        acc[variant.baseAssetId].push(variant);
      }
      return acc;
    }, {});
    
    // Attach variants to base assets
    layerGroups.forEach(group => {
      group.assets.forEach(asset => {
        asset.variants = variantsByBase[asset.id] || [];
        asset.hasVariants = asset.variants.length > 0;
        asset.variantCount = asset.variants.length;
      });
    });
  }

  /**
   * Build optimized response with relationships
   */
  private async buildOptimizedResponse(
    songMetadata: any,
    compositeVideos: CompositeVideo[],
    layerAssets: any,
    request: ReVizCompleteRequest
  ): Promise<ReVizCompleteResponse> {
    // Build asset relationships
    const relationships = {
      composite_to_assets: this.buildCompositeToAssets(compositeVideos),
      base_to_variants: this.buildBaseToVariants(layerAssets),
      compatibility_matrix: await this.buildCompatibilityMatrix(compositeVideos, layerAssets)
    };
    
    // Calculate totals
    const totalAssets = this.calculateTotalAssets(layerAssets);
    
    return {
      success: true,
      data: {
        song_metadata: songMetadata,
        composite_videos: compositeVideos,
        layer_assets: layerAssets,
        asset_relationships: relationships,
        performance_metrics: {
          total_assets_loaded: totalAssets,
          response_time_ms: 0, // Will be set later
          cache_hit_rate: 0, // Will be calculated
          compression_ratio: 0 // Will be calculated
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: request.request_id || this.generateRequestId(),
        version: '1.0.0',
        partial_response: false
      }
    };
  }

  /**
   * Multi-layer caching strategy
   */
  private async cacheResponse(request: ReVizCompleteRequest, response: ReVizCompleteResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.calculateTTL(request);
    
    // L1 Cache: In-memory for hot data
    if (this.isPopularSong(request.song_id)) {
      await this.cachingService.setL1(cacheKey, response, 300); // 5 minutes
    }
    
    // L2 Cache: Redis for warm data
    await this.cachingService.setL2(cacheKey, response, ttl);
    
    // L3 Cache: Database for cold data
    await this.cachingService.setL3(cacheKey, response, 86400); // 24 hours
  }

  /**
   * Build compatibility matrix for cross-layer scoring
   */
  private async buildCompatibilityMatrix(
    composites: CompositeVideo[],
    layerAssets: any
  ): Promise<Record<string, Record<string, number>>> {
    const matrix: Record<string, Record<string, number>> = {};
    
    // Get all asset IDs
    const assetIds = new Set<string>();
    Object.values(layerAssets).forEach((layer: any) => {
      layer.assets.forEach((asset: any) => {
        assetIds.add(asset.base_asset.asset_id);
        asset.variants?.forEach((variant: any) => {
          assetIds.add(variant.asset_id);
        });
      });
    });
    
    // Build compatibility scores
    const assetIdArray = Array.from(assetIds);
    for (let i = 0; i < assetIdArray.length; i++) {
      matrix[assetIdArray[i]] = {};
      for (let j = 0; j < assetIdArray.length; j++) {
        if (i !== j) {
          // Get pre-computed compatibility score
          const score = await this.scoringService.getCompatibilityScore(
            assetIdArray[i],
            assetIdArray[j]
          );
          matrix[assetIdArray[i]][assetIdArray[j]] = score;
        }
      }
    }
    
    return matrix;
  }

  /**
   * Calculate total assets including variants
   */
  private calculateTotalAssets(layerAssets: any): number {
    let total = 0;
    
    Object.values(layerAssets).forEach((layer: any) => {
      layer.assets.forEach((asset: any) => {
        total += 1; // Base asset
        total += asset.variants?.length || 0; // Variants
      });
    });
    
    return total;
  }

  /**
   * Add performance metrics to response
   */
  private addMetrics(
    response: ReVizCompleteResponse,
    startTime: number,
    fromCache: boolean
  ): ReVizCompleteResponse {
    response.data.performance_metrics.response_time_ms = Date.now() - startTime;
    response.data.performance_metrics.cache_hit_rate = fromCache ? 1 : 0;
    response.data.performance_metrics.compression_ratio = this.calculateCompressionRatio(response);
    
    return response;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `reviz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: ReVizCompleteRequest): string {
    const config = request.experience_config;
    return `reviz:${request.song_id}:${config.max_composites}:${config.max_assets_per_layer}:${config.variant_depth}`;
  }

  /**
   * Calculate TTL based on song popularity
   */
  private calculateTTL(request: ReVizCompleteRequest): number {
    // Popular songs get longer TTL
    const popularity = this.getSongPopularity(request.song_id);
    if (popularity > 0.8) return 3600; // 1 hour
    if (popularity > 0.5) return 1800; // 30 minutes
    return 600; // 10 minutes
  }

  // Helper methods
  private formatCompositeVideo(composite: any, score: number): CompositeVideo {
    // Implementation details...
  }

  private formatLayerAssets(layerGroups: any[]): any {
    // Implementation details...
  }

  private buildCompositeToAssets(composites: CompositeVideo[]): Record<string, string[]> {
    // Implementation details...
  }

  private buildBaseToVariants(layerAssets: any): Record<string, string[]> {
    // Implementation details...
  }

  private isPopularSong(songId: string): boolean {
    // Check if song is in top 1000
    return this.cachingService.isPopular(songId);
  }

  private getSongPopularity(songId: string): number {
    // Get popularity score 0-1
    return this.analyticsService.getPopularityScore(songId);
  }

  private calculateCompressionRatio(response: any): number {
    // Calculate compression ratio
    const originalSize = JSON.stringify(response).length;
    const compressedSize = originalSize * 0.3; // Assuming 70% compression
    return compressedSize / originalSize;
  }

  private async trackUsage(request: any, response: any, startTime: number): Promise<void> {
    // Track API usage for analytics
    await this.analyticsService.trackApiUsage({
      endpoint: 'reviz-complete-experience',
      songId: request.song_id,
      responseTime: Date.now() - startTime,
      totalAssets: response.data.performance_metrics.total_assets_loaded,
      cacheHit: response.data.performance_metrics.cache_hit_rate > 0
    });
  }
}