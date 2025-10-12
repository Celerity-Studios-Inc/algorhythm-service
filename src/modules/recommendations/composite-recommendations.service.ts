import { Injectable, Logger } from '@nestjs/common';
import { CompositeRecommendationDto } from './dto/composite-recommendation.dto';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { CompositeCacheStrategy } from '../caching/strategies/composite-cache.strategy';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class CompositeRecommendationsService {
  private readonly logger = new Logger(CompositeRecommendationsService.name);

  constructor(
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly cacheService: CacheService,
    private readonly compositeCacheStrategy: CompositeCacheStrategy,
  ) {}

  /**
   * 🚀 NEW: Composite-based recommendations as requested by ReViz developers
   */
  async getCompositeRecommendation(
    request: CompositeRecommendationDto,
  ): Promise<{
    composite_metadata: any;
    layer_assets: {
      stars: any[];
      looks: any[];
      moves: any[];
      worlds: any[];
    };
    asset_relationships: any;
    performance_metrics: any;
  }> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Composite recommendation for: ${request.composite_id}`);

    // Step 1: Check cache first
    const cacheKey = `${CACHE_KEYS.COMPOSITE_QUERIES}:composite:${request.composite_id}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      const responseTime = Date.now() - startTime;
      this.logger.debug(`✅ Cache hit: ${responseTime}ms`);
      return cachedResult as any;
    }

    try {
      // Step 2: Fetch composite metadata
      const compositeMetadata = await this.getCompositeMetadata(request.composite_id);
      
      // Step 3: Fetch layer assets for the composite
      const layerAssets = await this.getLayerAssetsForComposite(request);
      
      // Step 4: Build asset relationships
      const assetRelationships = await this.buildAssetRelationships(compositeMetadata, layerAssets);
      
      // Step 5: Format response
      const result = {
        composite_metadata: compositeMetadata,
        layer_assets: layerAssets,
        asset_relationships: assetRelationships,
        performance_metrics: {
          total_assets_loaded: this.countTotalAssets(layerAssets),
          response_time_ms: Date.now() - startTime,
          cache_hit_rate: 0,
          data_size_mb: 0.001, // Fixed value for now
        },
      };

      // Step 6: Cache the result
      await this.cacheService.set(cacheKey, result, CACHE_TTL.COMPOSITE_QUERIES);

      const responseTime = Date.now() - startTime;
      this.logger.debug(`✅ Composite recommendation completed in ${responseTime}ms`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get composite recommendation: ${error.message}`);
      return this.getFallbackCompositeResponse(request);
    }
  }

  /**
   * 🚀 OPTIMIZED: Batch composite recommendations
   */
  async getBatchCompositeRecommendations(
    requests: CompositeRecommendationDto[],
  ): Promise<Map<string, any>> {
    const startTime = Date.now();
    this.logger.debug(`🚀 Batch composite recommendations for ${requests.length} composites`);

    const results = new Map<string, any>();
    const compositeIds = requests.map(req => req.composite_id);

    // Step 1: Check cache for all composites
    const cacheKeys = requests.map(req => 
      `${CACHE_KEYS.COMPOSITE_QUERIES}:composite:${req.composite_id}`
    );
    const cachedResults = await this.cacheService.mget(cacheKeys);
    
    // Process cached results
    requests.forEach((req, index) => {
      if (cachedResults[index]) {
        results.set(req.composite_id, cachedResults[index]);
      }
    });

    // Step 2: Process uncached composites
    const uncachedRequests = requests.filter((req, index) => !cachedResults[index]);
    
    for (const request of uncachedRequests) {
      try {
        const result = await this.getCompositeRecommendation(request);
        results.set(request.composite_id, result);
      } catch (error) {
        this.logger.warn(`Failed to get composite recommendation for ${request.composite_id}: ${error.message}`);
        results.set(request.composite_id, this.getFallbackCompositeResponse(request));
      }
    }

    const responseTime = Date.now() - startTime;
    this.logger.debug(`✅ Batch composite recommendations completed in ${responseTime}ms`);

    return results;
  }

  private async getCompositeMetadata(compositeId: string): Promise<any> {
    // Fetch composite metadata from NNA Registry
    // This will be implemented based on the actual NNA Registry API
    return {
      composite_id: compositeId,
      name: `Composite ${compositeId}`,
      created_at: new Date().toISOString(),
      tags: ['composite', 'full'],
      metadata: {
        duration_seconds: 30,
        file_size_mb: 15.2,
        resolution: '1080p',
        format: 'mp4',
        quality_score: 0.9,
      },
    };
  }

  private async getLayerAssetsForComposite(request: CompositeRecommendationDto): Promise<any> {
    const maxAssets = request.experience_config?.max_assets_per_layer || 4;
    
    // Fetch layer assets for the composite
    // This will be implemented based on the actual NNA Registry API
    return {
      stars: [], // Will be populated with actual star assets
      looks: [], // Will be populated with actual look assets
      moves: [], // Will be populated with actual move assets
      worlds: [], // Will be populated with actual world assets
    };
  }

  private async buildAssetRelationships(compositeMetadata: any, layerAssets: any): Promise<any> {
    // Build relationships between composite and layer assets
    return {
      composite_to_assets: {},
      base_to_variants: {},
      compatibility_matrix: {},
    };
  }

  private countTotalAssets(layerAssets: any): number {
    let total = 0;
    for (const assets of Object.values(layerAssets)) {
      if (Array.isArray(assets)) {
        total += assets.length;
      }
    }
    return total;
  }

  private calculateDataSize(result: any): number {
    // Calculate approximate data size in MB
    const jsonString = JSON.stringify(result);
    return Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
  }

  private getFallbackCompositeResponse(request: CompositeRecommendationDto) {
    return {
      composite_metadata: {
        composite_id: request.composite_id,
        name: 'Fallback Composite',
        created_at: new Date().toISOString(),
        tags: ['fallback'],
        metadata: {
          duration_seconds: 30,
          file_size_mb: 15.2,
          resolution: '1080p',
          format: 'mp4',
          quality_score: 0.5,
        },
      },
      layer_assets: {
        stars: [],
        looks: [],
        moves: [],
        worlds: [],
      },
      asset_relationships: {
        composite_to_assets: {},
        base_to_variants: {},
        compatibility_matrix: {},
      },
      performance_metrics: {
        total_assets_loaded: 0,
        response_time_ms: 0,
        cache_hit_rate: 0,
        data_size_mb: 0.001,
      },
    };
  }
}
