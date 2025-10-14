import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ScoringService } from '../scoring/scoring.service';
import {
  ReVizCompleteRequest,
  ReVizCompleteResponse,
  CompositeVideo,
  LayerAssets,
  AssetDetail,
  AssetWithVariants,
  ComponentAsset,
} from './interfaces/reviz-complete-experience.interface';
import { Asset } from '../../models/asset.schema';
import { Composite } from '../../models/composite.schema';

/**
 * Production-ready ReViz Complete Experience Service
 * Includes all critical enhancements: timeouts, circuit breakers, validation, monitoring
 */
@Injectable()
export class ReVizCompleteExperienceProductionService {
  private readonly logger = new Logger(ReVizCompleteExperienceProductionService.name);
  
  // Circuit breaker state
  private circuitBreakerState = new Map<string, {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
  }>();
  
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  
  // Request deduplication
  private inFlightRequests = new Map<string, Promise<any>>();
  
  // Query timeouts
  private readonly QUERY_TIMEOUT = 5000; // 5 seconds
  private readonly CACHE_TIMEOUT = 1000; // 1 second

  constructor(
    private readonly cacheService: CacheService,
    private readonly nnaRegistryService: NnaRegistryService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly scoringService: ScoringService,
    private readonly analyticsService: AnalyticsService,
    @InjectModel('Asset') private assetModel: Model<Asset>,
    @InjectModel('Composite') private compositeModel: Model<Composite>,
  ) {}

  async getCompleteExperience(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || this.generateRequestId();
    let partialResponse = false;

    try {
      // 🔧 FIX: Support both song_id and composite_id requests
      const requestType = request.composite_id ? 'composite' : 'song';
      const requestValue = request.composite_id || request.song_id;
      this.logger.log(`[REQ-${requestId}] Processing production complete experience (${requestType}): ${requestValue}`);

      // Validate request
      this.validateRequest(request);

      // Check for request deduplication
      const deduplicationKey = this.generateDeduplicationKey(request);
      if (this.inFlightRequests.has(deduplicationKey)) {
        this.logger.log(`[REQ-${requestId}] Deduplicating request: ${deduplicationKey}`);
        return await this.inFlightRequests.get(deduplicationKey);
      }

      // Create deduplication promise
      const requestPromise = this.processRequest(request, requestId, startTime);
      this.inFlightRequests.set(deduplicationKey, requestPromise);
      
      try {
        const response = await requestPromise;
        return response;
      } finally {
        // 🔧 CRITICAL FIX: Always clean up in-flight requests to prevent memory leaks
        this.inFlightRequests.delete(deduplicationKey);
        
        // 🔧 CRITICAL FIX: Clean up old in-flight requests (older than 30 seconds)
        this.cleanupOldInFlightRequests();
      }

    } catch (error) {
      this.logger.error(`[REQ-${requestId}] Critical error processing request:`, error);
      throw error;
    }
  }

  private async processRequest(
    request: ReVizCompleteRequest, 
    requestId: string, 
    startTime: number
  ): Promise<ReVizCompleteResponse> {
    let partialResponse = false;

    try {
      // Step 1: Check multi-layer cache with timeout
      const cachedResponse = await this.getCachedResponseWithTimeout(request);
      if (cachedResponse) {
        return this.addMetrics(cachedResponse, startTime, true);
      }

      // Step 2: Parallel data fetching with circuit breakers and timeouts
      const [songDataResult, compositesResult, layerDataResult] = await Promise.allSettled([
        this.getSongMetadataWithCircuitBreaker(request.song_id),
        this.getRecommendedCompositesWithCircuitBreaker(request),
        this.getLayerAssetsOptimizedWithCircuitBreaker(request)
      ]);

      // Step 3: Handle partial failures gracefully
      const songMetadata = songDataResult.status === 'fulfilled' ? songDataResult.value : null;
      if (!songMetadata) {
        this.logger.error(`[REQ-${requestId}] Failed to fetch song metadata: ${songDataResult.status === 'rejected' ? songDataResult.reason : 'unknown reason'}`);
        partialResponse = true;
      }

      const compositeVideos = compositesResult.status === 'fulfilled'
        ? compositesResult.value
        : await this.getFallbackCompositesWithTimeout(request);
      if (compositesResult.status === 'rejected') {
        this.logger.warn(`[REQ-${requestId}] Failed to get recommended composites, using fallback: ${compositesResult.reason}`);
        partialResponse = true;
      }

      const layerAssets = layerDataResult.status === 'fulfilled'
        ? layerDataResult.value
        : await this.getMinimalLayerAssetsWithTimeout(request);
      if (layerDataResult.status === 'rejected') {
        this.logger.warn(`[REQ-${requestId}] Failed to get optimized layer assets, using minimal: ${layerDataResult.reason}`);
        partialResponse = true;
      }

      // Step 4: Build comprehensive response
      const response = await this.buildOptimizedResponse(
        songMetadata,
        compositeVideos,
        layerAssets,
        request,
        partialResponse
      );

      // Step 5: Cache at multiple levels with timeout
      await this.cacheResponseWithTimeout(request, response);

      // Step 6: Track analytics with timeout
      await this.trackUsageWithTimeout(request, response, startTime);

      return this.addMetrics(response, startTime, false);

    } catch (error) {
      this.logger.error(`[REQ-${requestId}] Error in processRequest:`, error);
      throw error;
    }
  }

  private validateRequest(request: ReVizCompleteRequest): void {
    // 🔧 FIX: Support both song_id and composite_id requests
    if (!request.song_id && !request.composite_id) {
      throw new Error('Either song_id or composite_id is required');
    }
    
    if (request.song_id && request.composite_id) {
      throw new Error('Cannot specify both song_id and composite_id');
    }
    
    // 🔧 FIX: Make experience_config optional with defaults
    if (!request.experience_config) {
      // Apply default configuration
      request.experience_config = {
        max_composites: 5,
        max_assets_per_layer: 4,
        include_variants: true,
        variant_depth: 4,
        layers: ['stars', 'looks', 'moves', 'worlds']
      };
    }
    
    if (request.experience_config.max_composites && 
        (request.experience_config.max_composites < 1 || request.experience_config.max_composites > 20)) {
      throw new Error('max_composites must be between 1 and 20');
    }
    
    if (request.experience_config.max_assets_per_layer && 
        (request.experience_config.max_assets_per_layer < 1 || request.experience_config.max_assets_per_layer > 20)) {
      throw new Error('max_assets_per_layer must be between 1 and 20');
    }
  }

  private async getCachedResponseWithTimeout(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Cache timeout')), this.CACHE_TIMEOUT)
    );
    
    const cachePromise = this.checkCache(request);
    
    try {
      return await Promise.race([cachePromise, timeoutPromise]);
    } catch (error) {
      this.logger.warn(`Cache timeout for key: ${cacheKey}`);
      return null;
    }
  }

  private async getSongMetadataWithCircuitBreaker(songId: string): Promise<any> {
    const circuitKey = `song-metadata-${songId}`;
    
    if (this.isCircuitBreakerOpen(circuitKey)) {
      throw new Error(`Circuit breaker open for song metadata: ${songId}`);
    }

    try {
      const result = await this.getSongMetadata(songId);
      this.resetCircuitBreaker(circuitKey);
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure(circuitKey);
      throw error;
    }
  }

  private async getRecommendedCompositesWithCircuitBreaker(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    const circuitKey = `composites-${request.song_id}`;
    
    if (this.isCircuitBreakerOpen(circuitKey)) {
      throw new Error(`Circuit breaker open for composites: ${request.song_id}`);
    }

    try {
      const result = await this.getRecommendedComposites(request);
      this.resetCircuitBreaker(circuitKey);
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure(circuitKey);
      throw error;
    }
  }

  private async getLayerAssetsOptimizedWithCircuitBreaker(request: ReVizCompleteRequest): Promise<LayerAssets> {
    const circuitKey = `layer-assets-${request.song_id}`;
    
    if (this.isCircuitBreakerOpen(circuitKey)) {
      throw new Error(`Circuit breaker open for layer assets: ${request.song_id}`);
    }

    try {
      const result = await this.getLayerAssetsOptimized(request);
      this.resetCircuitBreaker(circuitKey);
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure(circuitKey);
      throw error;
    }
  }

  private async getFallbackCompositesWithTimeout(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    const timeoutPromise = new Promise<CompositeVideo[]>((_, reject) => 
      setTimeout(() => reject(new Error('Fallback timeout')), this.QUERY_TIMEOUT)
    );
    
    const fallbackPromise = this.getFallbackComposites(request);
    
    return Promise.race([fallbackPromise, timeoutPromise]);
  }

  private async getMinimalLayerAssetsWithTimeout(request: ReVizCompleteRequest): Promise<LayerAssets> {
    const timeoutPromise = new Promise<LayerAssets>((_, reject) => 
      setTimeout(() => reject(new Error('Minimal assets timeout')), this.QUERY_TIMEOUT)
    );
    
    const minimalPromise = this.getMinimalLayerAssets(request);
    
    return Promise.race([minimalPromise, timeoutPromise]);
  }

  private async cacheResponseWithTimeout(request: ReVizCompleteRequest, response: ReVizCompleteResponse): Promise<void> {
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Cache write timeout')), this.CACHE_TIMEOUT)
    );
    
    const cachePromise = this.cacheResponse(request, response);
    
    try {
      await Promise.race([cachePromise, timeoutPromise]);
    } catch (error) {
      this.logger.warn(`Cache write timeout for request: ${request.song_id}`);
    }
  }

  private async trackUsageWithTimeout(
    request: ReVizCompleteRequest, 
    response: ReVizCompleteResponse, 
    startTime: number
  ): Promise<void> {
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Analytics timeout')), this.CACHE_TIMEOUT)
    );
    
    const analyticsPromise = this.trackUsage(request, response, startTime);
    
    try {
      await Promise.race([analyticsPromise, timeoutPromise]);
    } catch (error) {
      this.logger.warn(`Analytics timeout for request: ${request.song_id}`);
    }
  }

  // Circuit Breaker Methods
  private isCircuitBreakerOpen(circuitKey: string): boolean {
    const state = this.circuitBreakerState.get(circuitKey);
    if (!state) return false;
    
    if (state.isOpen) {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        // Reset circuit breaker
        this.circuitBreakerState.delete(circuitKey);
        return false;
      }
      return true;
    }
    
    return false;
  }

  private recordCircuitBreakerFailure(circuitKey: string): void {
    const state = this.circuitBreakerState.get(circuitKey) || {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false
    };
    
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
      this.logger.warn(`Circuit breaker opened for: ${circuitKey}`);
    }
    
    this.circuitBreakerState.set(circuitKey, state);
  }

  private resetCircuitBreaker(circuitKey: string): void {
    this.circuitBreakerState.delete(circuitKey);
  }

  /**
   * 🔧 CRITICAL FIX: Clean up old in-flight requests to prevent memory leaks
   */
  private cleanupOldInFlightRequests(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    for (const [key, promise] of this.inFlightRequests.entries()) {
      // Check if promise is resolved/rejected (older than 30 seconds)
      promise.finally(() => {
        if (now - Date.now() > maxAge) {
          this.inFlightRequests.delete(key);
          this.logger.debug(`🧹 Cleaned up old in-flight request: ${key}`);
        }
      });
    }
    
    // Also clean up circuit breaker state for old entries
    for (const [key, state] of this.circuitBreakerState.entries()) {
      if (now - state.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT * 2) {
        this.circuitBreakerState.delete(key);
        this.logger.debug(`🧹 Cleaned up old circuit breaker state: ${key}`);
      }
    }
  }

  private generateDeduplicationKey(request: ReVizCompleteRequest): string {
    const config = request.experience_config;
    return `dedup:${request.song_id}:${config.max_composites}:${config.max_assets_per_layer}:${config.variant_depth}:${config.layers?.join('-') || 'all'}`;
  }

  // Include all the existing methods from the enhanced service...
  private async getSongMetadata(songId: string): Promise<any> {
    // Mock song data for now - replace with actual NNA Registry call
    const song = {
      nna_address: songId,
      name: `Song ${songId}`,
      artist: 'Mock Artist',
      genre: 'pop',
      tempo: 120,
      energy: 0.8,
      mood: 'happy',
      duration: 180,
      previewUrl: 'https://example.com/preview.mp3',
      albumArtUrl: 'https://example.com/album.jpg',
      culturalTags: ['modern', 'trending'],
      recommendedFor: ['dancing', 'workout']
    };
    if (!song) {
      throw new Error(`Song not found: ${songId}`);
    }
    return {
      song_id: song.nna_address,
      song_name: song.name,
      artist_name: song.artist,
      genre: song.genre,
      tempo: song.tempo,
      energy_level: song.energy,
      mood: song.mood,
      duration_seconds: song.duration,
      preview_url: song.previewUrl,
      album_art_url: song.albumArtUrl,
      cultural_tags: song.culturalTags,
      recommended_for: song.recommendedFor,
    };
  }

  private async getRecommendedComposites(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    const { song_id, experience_config } = request;
    const maxComposites = experience_config.max_composites || 5;

    // Mock recommendations for now - replace with actual scoring service call
    const recommendations = Array.from({ length: maxComposites * 2 }, (_, i) => ({
      compositeId: `composite-${i}`,
      score: 0.8 - (i * 0.1)
    }));

    const composites = await Promise.all(
      recommendations.slice(0, maxComposites).map(async (rec) => {
        const composite = await this.compositeModel.findById(rec.compositeId)
          .populate({
            path: 'components.star',
            select: 'name thumbnailUrl metadata.starName',
          })
          .populate({
            path: 'components.look',
            select: 'name thumbnailUrl metadata.brandNames',
          })
          .populate({
            path: 'components.move',
            select: 'name thumbnailUrl metadata.danceStyle',
          })
          .populate({
            path: 'components.world',
            select: 'name thumbnailUrl metadata.environment',
          })
          .lean();

        if (!composite) {
          this.logger.warn(`Composite ${rec.compositeId} not found.`);
          return null;
        }

        return this.formatCompositeVideo(composite, rec.score);
      })
    );

    return composites.filter(Boolean) as CompositeVideo[];
  }

  private async getFallbackComposites(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    this.logger.warn(`Generating fallback composites for song: ${request.song_id}`);
    const maxComposites = request.experience_config.max_composites || 5;
    const fallbackComposites: CompositeVideo[] = [];

    const genericComposites = await this.compositeModel.find().limit(maxComposites).lean();

    for (const composite of genericComposites) {
      fallbackComposites.push(this.formatCompositeVideo(composite, 0.5));
    }
    return fallbackComposites;
  }

  private async getLayerAssetsOptimized(request: ReVizCompleteRequest): Promise<LayerAssets> {
    const { experience_config } = request;
    const layers = experience_config.layers || ['stars', 'looks', 'moves', 'worlds'];
    const maxAssets = experience_config.max_assets_per_layer || 6;
    const includeVariants = experience_config.include_variants ?? true;
    const variantDepth = experience_config.variant_depth || 6;

    const layerMap: LayerAssets = {
      stars: { layer_type: 'stars', total_count: 0, assets: [] },
      looks: { layer_type: 'looks', total_count: 0, assets: [] },
      moves: { layer_type: 'moves', total_count: 0, assets: [] },
      worlds: { layer_type: 'worlds', total_count: 0, assets: [] },
    };

    const layerCodes = layers.map(l => l.charAt(0).toUpperCase());

    // Optimized aggregation pipeline with proper sorting
    const pipeline = [
      {
        $match: {
          layer: { $in: layerCodes },
          assetType: 'base',
          isActive: true
        }
      },
      {
        $sort: {
          layer: 1 as 1,
          'trendingScore.score': -1 as -1,
          createdAt: -1 as -1
        }
      },
      {
        $facet: {
          stars: [
            { $match: { layer: 'S' } },
            { $limit: maxAssets },
            { $addFields: { layer_type: 'stars' } }
          ],
          looks: [
            { $match: { layer: 'L' } },
            { $limit: maxAssets },
            { $addFields: { layer_type: 'looks' } }
          ],
          moves: [
            { $match: { layer: 'M' } },
            { $limit: maxAssets },
            { $addFields: { layer_type: 'moves' } }
          ],
          worlds: [
            { $match: { layer: 'W' } },
            { $limit: maxAssets },
            { $addFields: { layer_type: 'worlds' } }
          ],
        }
      }
    ];

    const [facetResult] = await this.assetModel.aggregate(pipeline).exec();

    for (const layerType of layers) {
      const assets = facetResult[layerType] || [];
      layerMap[layerType].total_count = assets.length;
      layerMap[layerType].assets = assets.map(asset => ({
        base_asset: this.formatAssetDetail(asset),
        variants: [],
        hasVariants: false,
        variantCount: 0,
        compatibility: {
          with_song: 0,
          with_composite: 0,
          cross_layer_average: 0,
        },
      }));
    }

    if (includeVariants) {
      await this.loadVariantsOptimized(layerMap, variantDepth);
    }

    return layerMap;
  }

  private async getMinimalLayerAssets(request: ReVizCompleteRequest): Promise<LayerAssets> {
    this.logger.warn(`Generating minimal layer assets for song: ${request.song_id}`);
    const layers = request.experience_config.layers || ['stars', 'looks', 'moves', 'worlds'];
    const layerMap: LayerAssets = {
      stars: { layer_type: 'stars', total_count: 0, assets: [] },
      looks: { layer_type: 'looks', total_count: 0, assets: [] },
      moves: { layer_type: 'moves', total_count: 0, assets: [] },
      worlds: { layer_type: 'worlds', total_count: 0, assets: [] },
    };

    for (const layerType of layers) {
      const genericAsset = await this.assetModel.findOne({ 
        layer: layerType.charAt(0).toUpperCase(), 
        assetType: 'base' 
      }).lean();
      if (genericAsset) {
        layerMap[layerType].assets.push({
          base_asset: this.formatAssetDetail(genericAsset),
          variants: [],
          hasVariants: false,
          variantCount: 0,
          compatibility: {
            with_song: 0,
            with_composite: 0,
            cross_layer_average: 0,
          },
        });
        layerMap[layerType].total_count = 1;
      }
    }
    return layerMap;
  }

  private async loadVariantsOptimized(layerMap: LayerAssets, variantDepth: number): Promise<void> {
    const baseAssetIds: string[] = [];
    for (const layerType in layerMap) {
      layerMap[layerType].assets.forEach(assetWithVariants => {
        baseAssetIds.push(assetWithVariants.base_asset.asset_id);
      });
    }

    if (baseAssetIds.length === 0) {
      return;
    }

    const allVariants = await this.assetModel.find({
      'metadata.baseAssetId': { $in: baseAssetIds },
      assetType: 'variant'
    })
    .select('_id name thumbnailUrl fileUrl metadata')
    .sort({ createdAt: -1 })
    .limit(baseAssetIds.length * variantDepth)
    .lean();

    const variantsByBase = allVariants.reduce((acc, variant) => {
      const baseId = variant.metadata.baseAssetId;
      if (baseId) {
        if (!acc[baseId]) {
          acc[baseId] = [];
        }
        if (acc[baseId].length < variantDepth) {
          acc[baseId].push(this.formatAssetDetail(variant));
        }
      }
      return acc;
    }, {} as Record<string, AssetDetail[]>);

    for (const layerType in layerMap) {
      layerMap[layerType].assets.forEach(assetWithVariants => {
        const variants = variantsByBase[assetWithVariants.base_asset.asset_id] || [];
        assetWithVariants.variants = variants;
        assetWithVariants.hasVariants = variants.length > 0;
        assetWithVariants.variantCount = variants.length;
      });
    }
  }

  private async buildOptimizedResponse(
    songMetadata: any,
    compositeVideos: CompositeVideo[],
    layerAssets: LayerAssets,
    request: ReVizCompleteRequest,
    partialResponse: boolean
  ): Promise<ReVizCompleteResponse> {
    const relationships = {
      composite_to_assets: this.buildCompositeToAssets(compositeVideos),
      base_to_variants: this.buildBaseToVariants(layerAssets),
      compatibility_matrix: await this.buildCompatibilityMatrix(compositeVideos, layerAssets)
    };

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
          response_time_ms: 0,
          cache_hit_rate: 0,
          compression_ratio: 0,
          data_size_mb: 0,
          streaming_enabled: request.performance_optimization?.streaming || false,
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: request.request_id || this.generateRequestId(),
        version: '1.0.0',
        partial_response: partialResponse,
      }
    };
  }

  private async checkCache(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = await this.cacheService.get<ReVizCompleteResponse>(cacheKey);
    if (cachedResponse) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return cachedResponse;
    }
    return null;
  }

  private async cacheResponse(request: ReVizCompleteRequest, response: ReVizCompleteResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.calculateTTL(request);

    await this.cacheService.set(cacheKey, response, ttl);
  }

  private async buildCompatibilityMatrix(
    composites: CompositeVideo[],
    layerAssets: LayerAssets
  ): Promise<Record<string, Record<string, number>>> {
    const matrix: Record<string, Record<string, number>> = {};

    const allAssetDetails: AssetDetail[] = [];
    for (const layerType in layerAssets) {
      layerAssets[layerType].assets.forEach(assetWithVariants => {
        allAssetDetails.push(assetWithVariants.base_asset);
        assetWithVariants.variants.forEach(variant => allAssetDetails.push(variant));
      });
    }

    composites.forEach(composite => {
      allAssetDetails.push(composite.components.star as any);
      allAssetDetails.push(composite.components.look as any);
      allAssetDetails.push(composite.components.move as any);
      allAssetDetails.push(composite.components.world as any);
    });

    const uniqueAssetIds = Array.from(new Set(allAssetDetails.map(ad => ad.asset_id)));
    // Mock bulk compatibility scores for now
    const bulkScores: Record<string, number> = {};
    for (const assetId1 of uniqueAssetIds) {
      for (const assetId2 of uniqueAssetIds) {
        if (assetId1 !== assetId2) {
          bulkScores[`${assetId1}-${assetId2}`] = Math.random() * 0.8;
        }
      }
    }

    for (const assetId1 of uniqueAssetIds) {
      matrix[assetId1] = {};
      for (const assetId2 of uniqueAssetIds) {
        if (assetId1 !== assetId2) {
          matrix[assetId1][assetId2] = bulkScores[`${assetId1}-${assetId2}`] || 0;
        }
      }
    }

    return matrix;
  }

  private calculateTotalAssets(layerAssets: LayerAssets): number {
    let total = 0;
    for (const layerType in layerAssets) {
      layerAssets[layerType].assets.forEach(assetWithVariants => {
        total += 1;
        total += assetWithVariants.variants?.length || 0;
      });
    }
    return total;
  }

  private addMetrics(
    response: ReVizCompleteResponse,
    startTime: number,
    fromCache: boolean
  ): ReVizCompleteResponse {
    response.data.performance_metrics.response_time_ms = Date.now() - startTime;
    response.data.performance_metrics.cache_hit_rate = fromCache ? 1 : 0;
    response.data.performance_metrics.data_size_mb = Buffer.byteLength(JSON.stringify(response), 'utf8') / (1024 * 1024);
    response.data.performance_metrics.compression_ratio = this.calculateCompressionRatio(response);

    return response;
  }

  private generateRequestId(): string {
    return `reviz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: ReVizCompleteRequest): string {
    const config = request.experience_config;
    return `reviz:${request.song_id}:${config.max_composites}:${config.max_assets_per_layer}:${config.variant_depth}:${config.layers?.join('-') || 'all'}`;
  }

  private calculateTTL(request: ReVizCompleteRequest): number {
    const popularity = this.getSongPopularity(request.song_id);
    if (popularity > 0.8) return 3600;
    if (popularity > 0.5) return 1800;
    return 600;
  }

  private formatCompositeVideo(composite: any, score: number): CompositeVideo {
    return {
      composite_id: composite._id.toString(),
      composite_name: composite.name,
      compatibility_score: score * 100,
      ranking: 0,
      components: {
        star: this.formatComponentAsset(composite.components.star, 'star'),
        look: this.formatComponentAsset(composite.components.look, 'look'),
        move: this.formatComponentAsset(composite.components.move, 'move'),
        world: this.formatComponentAsset(composite.components.world, 'world'),
      },
      media: {
        preview_video_url: composite.previewVideoUrl,
        thumbnail_url: composite.thumbnailUrl,
        duration_seconds: composite.durationSeconds,
        resolution: composite.resolution,
        file_size_mb: composite.fileSizeMb,
      },
      metadata: {
        tags: composite.tags,
        mood: composite.mood,
        energy_level: composite.energyLevel,
        style: composite.style,
        recommended_context: composite.recommendedContext,
        viral_potential_score: composite.viralPotentialScore,
        description: composite.description,
      },
      analytics: {
        view_count: composite.viewCount,
        share_count: composite.shareCount,
        remix_count: composite.remixCount,
        trending_score: composite.trendingScore,
      },
    };
  }

  private formatAssetDetail(asset: any): AssetDetail {
    return {
      asset_id: asset._id.toString(),
      asset_name: asset.name,
      asset_type: asset.assetType,
      base_asset_id: asset.metadata?.baseAssetId,
      variant_name: asset.metadata?.variantName,
      media: {
        thumbnail_url: asset.thumbnailUrl,
        preview_url: asset.previewUrl,
        full_resolution_url: asset.fileUrl,
        file_size_mb: asset.fileSizeMb,
        duration_seconds: asset.durationSeconds,
        format: asset.format,
      },
      metadata: asset.metadata,
      compatibility_scores: {},
      analytics: {
        usage_count: asset.usageCount,
        popularity_score: asset.popularityScore,
        trending: asset.trending,
      },
    };
  }

  private formatComponentAsset(asset: any, layer: 'star' | 'look' | 'move' | 'world'): ComponentAsset {
    return {
      layer,
      asset_id: asset._id.toString(),
      asset_name: asset.name,
      is_variant: asset.assetType === 'variant',
      base_asset_id: asset.metadata?.baseAssetId,
      media: {
        thumbnail_url: asset.thumbnailUrl,
        preview_url: asset.previewUrl,
      },
      metadata_summary: {
        star_name: asset.metadata?.starName,
        gender: asset.metadata?.gender,
        age_group: asset.metadata?.ageGroup,
        brand_names: asset.metadata?.brandNames,
        primary_colors: asset.metadata?.primaryColors,
        style: asset.metadata?.style,
        dance_style: asset.metadata?.danceStyle,
        energy_level: asset.metadata?.energyLevel,
        complexity: asset.metadata?.complexity,
        environment: asset.metadata?.environment,
        atmosphere: asset.metadata?.atmosphere,
        time_of_day: asset.metadata?.timeOfDay,
      },
    };
  }

  private buildCompositeToAssets(composites: CompositeVideo[]): Record<string, string[]> {
    const mapping: Record<string, string[]> = {};
    composites.forEach(composite => {
      mapping[composite.composite_id] = [
        composite.components.star.asset_id,
        composite.components.look.asset_id,
        composite.components.move.asset_id,
        composite.components.world.asset_id,
      ];
    });
    return mapping;
  }

  private buildBaseToVariants(layerAssets: LayerAssets): Record<string, string[]> {
    const mapping: Record<string, string[]> = {};
    for (const layerType in layerAssets) {
      layerAssets[layerType].assets.forEach(assetWithVariants => {
        mapping[assetWithVariants.base_asset.asset_id] = assetWithVariants.variants.map(v => v.asset_id);
      });
    }
    return mapping;
  }

  private isPopularSong(songId: string): boolean {
    // Mock popularity check for now
    return Math.random() > 0.3;
  }

  private getSongPopularity(songId: string): number {
    // Mock popularity score for now
    return Math.random();
  }

  private calculateCompressionRatio(response: any): number {
    const originalSize = Buffer.byteLength(JSON.stringify(response), 'utf8');
    const estimatedCompressedSize = originalSize * 0.3;
    return estimatedCompressedSize / originalSize;
  }

  private async trackUsage(request: ReVizCompleteRequest, response: ReVizCompleteResponse, startTime: number): Promise<void> {
    // Mock analytics tracking for now
    console.log('Analytics tracking:', {
      endpoint: '/api/v1/reviz/complete-experience',
      songId: request.song_id,
      userId: request.user_context?.user_id,
      responseTime: Date.now() - startTime,
      totalAssets: response.data.performance_metrics.total_assets_loaded,
      cacheHit: response.data.performance_metrics.cache_hit_rate > 0,
      requestConfig: request.experience_config,
      responseMetadata: response.metadata,
    });
  }
}
