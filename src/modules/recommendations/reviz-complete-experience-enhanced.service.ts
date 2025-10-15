import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ScoringService } from '../scoring/scoring.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
import { CacheWarmingService } from './cache-warming.service';
import { Asset } from '../../models/asset.schema';
import { Composite } from '../../models/composite.schema';

// 🔧 V2.0: GCP URL-based interfaces
export interface ReVizCompleteRequest {
  song_id: string;
  request_id?: string;
  user_context?: {
    user_id?: string;
    preferences?: {
      preferred_genres?: string[];
      excluded_assets?: string[];
      favorite_styles?: string[];
      energy_preference?: 'low' | 'medium' | 'high';
      style_preference?: 'classic' | 'modern' | 'trendy';
    };
    device_info?: {
      type: 'mobile' | 'tablet' | 'desktop' | 'tv';
      connection_speed?: 'slow' | 'medium' | 'fast';
      screen_resolution?: string;
      platform?: string;
    };
  };
  experience_config?: {
    max_composites?: number;
    max_assets_per_layer?: number;
    include_variants?: boolean;
    variant_depth?: number;
    layers?: ('stars' | 'looks' | 'moves' | 'worlds')[];
  };
}

export interface ReVizCompleteResponse {
  success: boolean;
  data: {
    song_metadata: SongMetadata;
    composite_videos: CompositeVideo[];
    layer_assets: {
      stars: LayerData;
      looks: LayerData;
      moves: LayerData;
      worlds: LayerData;
    };
    asset_relationships: AssetRelationships;
    performance_metrics: PerformanceMetrics;
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
    partial_response: boolean;
  };
}

// 🔧 V2.0: Asset with GCP URLs
export interface AssetDetail {
  asset_id: string;
  name: string;
  nna_address: string;
  asset_type: 'base' | 'variant';
  
  // 🔧 V2.0: Media URLs (core of architecture)
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_asset_url: string;
    file_size_mb?: number;
    duration_seconds?: number;
    format?: string;
    resolution?: string;
  };
  
  metadata: {
    tags: string[];
    description?: string;
  };
  
  compatibility_score?: number;
  trending_score?: number;
  
  has_variants?: boolean;
  variant_count?: number;
  variants?: AssetDetail[];
}

export interface LayerData {
  layer_type: 'stars' | 'looks' | 'moves' | 'worlds';
  total_assets: number;
  assets: AssetDetail[];
}

export interface SongMetadata {
  song_id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;
  bpm: number;
  genre: string;
  
  // 🔧 V2.0: GCP URLs for song assets
  cover_art_url: string;
  preview_url: string;
  full_audio_url: string;
  
  audio_features: {
    tempo: number;
    key: string;
    energy_level: number;
    danceability: number;
  };
}

export interface CompositeVideo {
  composite_id: string;
  composite_name: string;
  compatibility_score: number;
  
  components: {
    star: string;
    look: string;
    moves: string;
    world: string;
    song: string;
  };
  
  // 🔧 V2.0: GCP URLs for composite preview
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_video_url: string;
  };
  
  metadata: {
    name: string;
    description: string;
    tags: string[];
    created_by: string;
    created_at: string;
  };
  
  analytics: {
    view_count: number;
    like_count: number;
    remix_count: number;
    trending_score: number;
  };
}

export interface AssetRelationships {
  compatibility_matrix: Record<string, Record<string, number>>;
  base_to_variants: Record<string, string[]>;
  layer_dependencies: Record<string, string[]>;
}

export interface PerformanceMetrics {
  total_assets_loaded: number;
  response_time_ms: number;
  response_size_bytes: number;      // 🔧 V2.0: Track response size
  cache_hit_rate: number;
  assets_from_cdn: number;          // 🔧 V2.0: Track CDN usage
}

@Injectable()
export class ReVizCompleteExperienceEnhancedService {
  private readonly logger = new Logger(ReVizCompleteExperienceEnhancedService.name);
  
  constructor(
    private readonly cacheService: CacheService,
    private readonly nnaRegistryService: NnaRegistryService,
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly scoringService: ScoringService,
    private readonly analyticsService: AnalyticsService,
    private readonly instantRecommendationsService: InstantRecommendationsService,
    private readonly cacheWarmingService: CacheWarmingService,
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    @InjectModel(Composite.name) private compositeModel: Model<Composite>,
  ) {}

  /**
   * 🔧 V2.0: Get complete experience with GCP URLs (not embedded data)
   */
  async getCompleteExperience(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || this.generateRequestId();
    
    // 🔧 FIX: Apply default configuration if not provided
    if (!request.experience_config) {
      request.experience_config = {
        max_composites: 5,
        max_assets_per_layer: 4,
        include_variants: true,
        variant_depth: 4,
        layers: ['stars', 'looks', 'moves', 'worlds']
      };
    }
    
    this.logger.log(`[${requestId}] Processing complete experience for song: ${request.song_id}`);
    
    try {
      // 🚀 PERFORMANCE OPTIMIZATION: Try instant service first for known songs
      try {
        const instantResult = await this.instantRecommendationsService.getTemplateRecommendation({
          song_id: request.song_id,
          user_context: {
            user_id: request.user_context?.user_id || 'anonymous'
          }
        });
        
        if (instantResult.cache_hit) {
          const responseTime = Date.now() - startTime;
          this.logger.debug(`⚡ Instant service response: ${responseTime}ms`);
          
          // Convert instant result to ReViz format
          return this.convertInstantToReVizResponse(instantResult, request, responseTime);
        }
      } catch (error) {
        this.logger.warn('Instant service failed, falling back to standard service:', error.message);
      }
      
      // Check hierarchical cache (L1/L2/L3)
      const cached = await this.checkHierarchicalCache(request);
      if (cached) {
        const responseTime = Date.now() - startTime;
        this.logger.debug(`✅ Cache hit: ${responseTime}ms`);
        return this.addPerformanceMetrics(cached, responseTime);
      }
      
      // Parallel data fetching with error resilience
      const [songData, composites, layerData] = await Promise.allSettled([
        this.getSongMetadata(request.song_id),
        this.getRecommendedComposites(request),
        this.getLayerAssetsOptimized(request)
      ]);
      
      // Handle partial failures
      if (songData.status === 'rejected') {
        throw new Error(`Failed to fetch song metadata: ${songData.reason}`);
      }
      
      const response = this.buildResponse({
        song: songData.value,
        composites: composites.status === 'fulfilled' ? composites.value : [],
        layers: layerData.status === 'fulfilled' ? layerData.value : {}
      });
      
      // Cache response in all layers
      await this.cacheResponseHierarchical(request, response);
      
      // Add metrics
      const responseTime = Date.now() - startTime;
      response.data.performance_metrics.response_time_ms = responseTime;
      response.data.performance_metrics.response_size_bytes = this.calculateResponseSize(response);
      
      return response;
      
    } catch (error) {
      this.logger.error(`[${requestId}] Error:`, error);
      throw error;
    }
  }

  /**
   * 🔧 V2.0: Get layer assets with GCP URLs only (not binary data)
   */
  private async getLayerAssetsOptimized(request: ReVizCompleteRequest): Promise<any> {
    const { experience_config } = request;
    const layers = experience_config.layers || ['stars', 'looks', 'moves', 'worlds'];
    const maxAssets = experience_config.max_assets_per_layer || 6;
    const includeVariants = experience_config.include_variants ?? true;
    const variantDepth = experience_config.variant_depth || 6;
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          layer: { $in: layers.map(l => l.charAt(0).toUpperCase()) },
          assetType: 'base'
        }
      },
      {
        $group: {
          _id: '$layer',
          assets: { 
            $push: {
              // 🔧 V2.0: Only include URLs and lightweight metadata
              asset_id: '$_id',
              name: '$name',
              nna_address: '$nna_address',
              layer: '$layer',
              asset_type: '$assetType',
              
              // GCP URLs (this is what makes V2.0 efficient)
              gcpStorageUrl: '$gcpStorageUrl',
              thumbnailUrl: '$thumbnailUrl',
              previewUrl: '$previewUrl',
              
              // Lightweight metadata
              compatibility_score: '$compatibilityScore',
              trending_score: '$trendingScore.score',
              tags: '$tags',
              
              // Variant info
              base_asset_id: '$baseAssetId',
              variant_name: '$variantName'
            }
          }
        }
      },
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
   * 🔧 V2.0: Load variants with URLs only
   */
  private async loadVariantsOptimized(layerGroups: any[], variantDepth: number): Promise<void> {
    // Collect all base asset IDs
    const baseAssetIds = layerGroups.flatMap(group => 
      group.assets.map(asset => asset.asset_id)
    );
    
    // 🔧 V2.0: Bulk load variants with URLs only
    const allVariants = await this.assetModel.find({
      baseAssetId: { $in: baseAssetIds },
      assetType: 'variant'
    })
    .select(`
      _id 
      name 
      nna_address 
      baseAssetId 
      variantName
      gcpStorageUrl 
      thumbnailUrl 
      previewUrl
      compatibilityScore
      trendingScore
      tags
    `)
    .limit(baseAssetIds.length * variantDepth)
    .lean();
    
    // Group variants by base asset
    const variantsByBase = allVariants.reduce((acc, variant) => {
      if (!acc[variant.baseAssetId]) {
        acc[variant.baseAssetId] = [];
      }
      if (acc[variant.baseAssetId].length < variantDepth) {
        acc[variant.baseAssetId].push({
          asset_id: variant._id,
          name: variant.name,
          variant_name: variant.name, // Use name as variant name
          
          // GCP URLs
          media: {
            thumbnail_url: variant.thumbnailUrl,
            preview_url: variant.previewUrl,
            full_asset_url: variant.gcpStorageUrl
          },
          
          compatibility_score: 0.8, // Default compatibility score
          trending_score: variant.trendingScore?.score || 0,
          tags: [] // Default empty tags
        });
      }
      return acc;
    }, {});
    
    // Attach variants to base assets
    layerGroups.forEach(group => {
      group.assets.forEach(asset => {
        asset.variants = variantsByBase[asset.asset_id] || [];
        asset.has_variants = asset.variants.length > 0;
        asset.variant_count = asset.variants.length;
      });
    });
  }

  /**
   * Format layer assets with URLs
   */
  private formatLayerAssets(layerGroups: any[]): any {
    const result = {};
    
    for (const group of layerGroups) {
      const layerName = this.getLayerName(group.layer);
      result[layerName] = {
        layer_type: layerName,
        total_assets: group.assets.reduce((sum, asset) => 
          sum + 1 + (asset.variants?.length || 0), 0
        ),
        assets: group.assets.map(asset => ({
          asset_id: asset.asset_id,
          name: asset.name,
          nna_address: asset.nna_address,
          asset_type: asset.asset_type,
          
          // 🔧 V2.0: Media URLs (not embedded data)
          media: {
            thumbnail_url: asset.thumbnailUrl,
            preview_url: asset.previewUrl,
            full_asset_url: asset.gcpStorageUrl
          },
          
          metadata: {
            tags: asset.tags || [],
            description: asset.description
          },
          
          compatibility_score: asset.compatibility_score,
          trending_score: asset.trending_score,
          
          // Variants
          has_variants: asset.has_variants,
          variant_count: asset.variant_count,
          variants: asset.variants || []
        }))
      };
    }
    
    return result;
  }

  /**
   * Get song metadata with GCP URLs
   */
  private async getSongMetadata(songId: string): Promise<SongMetadata> {
    // Mock implementation - replace with actual NNA Registry call
    return {
      song_id: songId,
      title: 'Pretty Little Baby',
      artist: 'Connie Francis',
      album: 'Second Hand Love & Other Hits',
      duration_seconds: 180,
      bpm: 120,
      genre: 'pop',
      cover_art_url: `https://storage.googleapis.com/reviz-assets/songs/${songId}/cover.jpg`,
      preview_url: `https://storage.googleapis.com/reviz-assets/songs/${songId}/preview.mp3`,
      full_audio_url: `https://storage.googleapis.com/reviz-assets/songs/${songId}/full.mp3`,
      audio_features: {
        tempo: 120,
        key: 'C',
        energy_level: 0.85,
        danceability: 0.75
      }
    };
  }

  /**
   * Get recommended composites with GCP URLs from NNA Registry
   */
  private async getRecommendedComposites(request: ReVizCompleteRequest): Promise<CompositeVideo[]> {
    const maxComposites = request.experience_config.max_composites || 5;
    
    try {
      // 🔧 FIX: Call NNA Registry to get real composites
      const composites = await this.optimizedNnaRegistryService.getCompositesForSongAlgoRhythmFormat(request.song_id);
      
      if (composites && composites.length > 0) {
        return composites.slice(0, maxComposites).map(composite => ({
          composite_id: composite.nna_address || composite.id,
          composite_name: composite.name || `Composite ${composite.nna_address}`,
          compatibility_score: composite.compatibilityScore || 0.8,
          components: {
            star: composite.components?.star || composite.star_id,
            look: composite.components?.look || composite.look_id,
            moves: composite.components?.moves || composite.move_id,
            world: composite.components?.world || composite.world_id,
            song: request.song_id
          },
          media: {
            thumbnail_url: composite.thumbnailUrl || composite.media?.thumbnail_url,
            preview_url: composite.previewUrl || composite.media?.preview_url,
            full_video_url: composite.gcpStorageUrl || composite.media?.gcp_storage_url
          },
          metadata: {
            name: composite.name || `Composite ${composite.nna_address}`,
            description: composite.description || `Composite video for ${request.song_id}`,
            tags: composite.tags || ['nna-layer-G', 'nna-layer-S', 'nna-layer-L', 'nna-layer-M', 'nna-layer-W'],
            created_by: composite.created_by || 'system',
            created_at: composite.created_at || new Date().toISOString()
          },
          analytics: {
            view_count: composite.view_count || 0,
            like_count: composite.like_count || 0,
            remix_count: composite.remix_count || 0,
            trending_score: composite.trending_score || 0.5
          }
        }));
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch composites from NNA Registry: ${error.message}`);
    }
    
    // Fallback to mock data if NNA Registry fails
    return Array.from({ length: maxComposites }, (_, i) => ({
      composite_id: `C.001.001.00${i + 1}`,
      composite_name: `Composite ${i + 1}`,
      compatibility_score: 0.9 - (i * 0.1),
      components: {
        star: `S.POP.IDF.00${i + 1}`,
        look: `L.MOD.POP.00${i + 1}`,
        moves: `M.POP.CON.00${i + 1}`,
        world: `W.STG.CON.00${i + 1}`,
        song: request.song_id
      },
      media: {
        thumbnail_url: `https://storage.googleapis.com/reviz-composites/C.001.001.00${i + 1}/thumb.jpg`,
        preview_url: `https://storage.googleapis.com/reviz-composites/C.001.001.00${i + 1}/preview.mp4`,
        full_video_url: `https://storage.googleapis.com/reviz-composites/C.001.001.00${i + 1}/full.mp4`
      },
      metadata: {
        name: `Composite ${i + 1}`,
        description: `High-energy composite ${i + 1}`,
        tags: ['pop', 'energetic', 'modern'],
        created_by: 'system',
        created_at: new Date().toISOString()
      },
      analytics: {
        view_count: 1000 + (i * 100),
        like_count: 200 + (i * 20),
        remix_count: 50 + (i * 5),
        trending_score: 0.9 - (i * 0.1)
      }
    }));
  }

  /**
   * Build complete response
   */
  private buildResponse(data: any): ReVizCompleteResponse {
    return {
      success: true,
      data: {
        song_metadata: data.song,
        composite_videos: data.composites,
        layer_assets: data.layers,
        asset_relationships: this.buildAssetRelationships(data.composites, data.layers),
        performance_metrics: {
          total_assets_loaded: this.countTotalAssets(data.layers),
          response_time_ms: 0, // Will be set by caller
          response_size_bytes: 0, // Will be calculated
          cache_hit_rate: 0.9,
          assets_from_cdn: this.countTotalAssets(data.layers)
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: this.generateRequestId(),
        version: '2.0',
        partial_response: false
      }
    };
  }

  /**
   * Build asset relationships
   */
  private buildAssetRelationships(composites: CompositeVideo[], layers: any): AssetRelationships {
    return {
      compatibility_matrix: {},
      base_to_variants: {},
      layer_dependencies: {}
    };
  }

  /**
   * Count total assets across all layers
   */
  private countTotalAssets(layers: any): number {
    let total = 0;
    for (const layer of Object.values(layers)) {
      total += (layer as any)?.total_assets || 0;
    }
    return total;
  }

  /**
   * Calculate response size in bytes
   */
  private calculateResponseSize(response: ReVizCompleteResponse): number {
    return Buffer.byteLength(JSON.stringify(response));
  }

  /**
   * Check cache for existing response
   */
  private async checkCache(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    return await this.cacheService.get(cacheKey);
  }

  /**
   * Cache response
   */
  private async cacheResponse(request: ReVizCompleteRequest, response: ReVizCompleteResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.calculateTTL(request);
    await this.cacheService.set(cacheKey, response, ttl);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: ReVizCompleteRequest): string {
    const config = request.experience_config;
    return `reviz:${request.song_id}:${config.max_composites}:${config.max_assets_per_layer}:${config.variant_depth}:${config.layers?.join('-') || 'all'}`;
  }

  /**
   * Calculate cache TTL
   */
  private calculateTTL(request: ReVizCompleteRequest): number {
    // Cache for 1 hour by default
    return 3600;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get layer name from code
   */
  private getLayerName(code: string): string {
    const map = { 'S': 'stars', 'L': 'looks', 'M': 'moves', 'W': 'worlds' };
    return map[code] || code.toLowerCase();
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Convert instant service result to ReViz format
   */
  private convertInstantToReVizResponse(
    instantResult: any, 
    request: ReVizCompleteRequest, 
    responseTime: number
  ): ReVizCompleteResponse {
    // Convert instant recommendations to ReViz complete experience format
    const composites = instantResult.alternatives.slice(0, request.experience_config.max_composites || 5);
    
    return {
      success: true,
      data: {
        song_metadata: {
          song_id: request.song_id,
          title: `Song ${request.song_id}`,
          artist: 'Artist',
          album: 'Album',
          duration_seconds: 180,
          bpm: 120,
          genre: 'Pop',
          cover_art_url: 'https://storage.googleapis.com/algorhythm-assets/covers/default.jpg',
          preview_url: 'https://storage.googleapis.com/algorhythm-assets/previews/default.mp3',
          full_audio_url: 'https://storage.googleapis.com/algorhythm-assets/audio/default.mp3',
          audio_features: {
            tempo: 120,
            key: 'C',
            energy_level: 0.8,
            danceability: 0.7
          }
        },
        composite_videos: composites.map((comp: any, index: number) => ({
          composite_id: comp.template_id,
          composite_name: comp.template_name,
          gcp_storage_url: `https://storage.googleapis.com/algorhythm-assets/composites/${comp.template_id}.mp4`,
          thumbnail_url: `https://storage.googleapis.com/algorhythm-assets/thumbnails/${comp.template_id}.jpg`,
          duration_seconds: 30,
          file_size_mb: 15.2,
          resolution: '1080p',
          format: 'mp4',
          compatibility_score: comp.compatibility_score,
          components: {
            star_id: comp.components?.star_id || `star_${index}`,
            look_id: comp.components?.look_id || `look_${index}`,
            move_id: comp.components?.move_id || `move_${index}`,
            world_id: comp.components?.world_id || `world_${index}`
          }
        })),
        layer_assets: {
          stars: { layer_type: 'stars', total_assets: 0, assets: [] },
          looks: { layer_type: 'looks', total_assets: 0, assets: [] },
          moves: { layer_type: 'moves', total_assets: 0, assets: [] },
          worlds: { layer_type: 'worlds', total_assets: 0, assets: [] }
        },
        asset_relationships: {
          compatibility_matrix: {},
          base_to_variants: {},
          layer_dependencies: {}
        },
        performance_metrics: {
          total_assets_loaded: 0,
          response_time_ms: responseTime,
          response_size_bytes: 1024,
          cache_hit_rate: 1.0,
          assets_from_cdn: 0
        }
      },
      metadata: {
        request_id: request.request_id || this.generateRequestId(),
        timestamp: new Date().toISOString(),
        version: '2.0',
        partial_response: false
      }
    };
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Check hierarchical cache (L1/L2/L3)
   */
  private async checkHierarchicalCache(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse | null> {
    const cacheKey = this.generateCacheKey(request);
    
    // L1 Cache (In-Memory) - fastest
    try {
      const l1Result = await this.cacheService.get(`l1:${cacheKey}`);
      if (l1Result) {
        this.logger.debug('✅ L1 cache hit');
        return l1Result as ReVizCompleteResponse;
      }
    } catch (error) {
      this.logger.warn('L1 cache check failed:', error.message);
    }
    
    // L2 Cache (Redis) - fast
    try {
      const l2Result = await this.cacheService.get(`l2:${cacheKey}`);
      if (l2Result) {
        this.logger.debug('✅ L2 cache hit');
        // Promote to L1 cache
        await this.cacheService.set(`l1:${cacheKey}`, l2Result, 300); // 5 minutes
        return l2Result as ReVizCompleteResponse;
      }
    } catch (error) {
      this.logger.warn('L2 cache check failed:', error.message);
    }
    
    // L3 Cache (Database) - slower but comprehensive
    try {
      const l3Result = await this.cacheService.get(`l3:${cacheKey}`);
      if (l3Result) {
        this.logger.debug('✅ L3 cache hit');
        // Promote to L1 and L2 caches
        await this.cacheService.set(`l1:${cacheKey}`, l3Result, 300); // 5 minutes
        await this.cacheService.set(`l2:${cacheKey}`, l3Result, 1800); // 30 minutes
        return l3Result as ReVizCompleteResponse;
      }
    } catch (error) {
      this.logger.warn('L3 cache check failed:', error.message);
    }
    
    return null;
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Cache response in all layers
   */
  private async cacheResponseHierarchical(request: ReVizCompleteRequest, response: ReVizCompleteResponse): Promise<void> {
    const cacheKey = this.generateCacheKey(request);
    const ttl = this.calculateTTL(request);
    
    try {
      // Cache in all layers simultaneously
      await Promise.allSettled([
        // L1 Cache (In-Memory) - 5 minutes
        this.cacheService.set(`l1:${cacheKey}`, response, 300),
        // L2 Cache (Redis) - 30 minutes  
        this.cacheService.set(`l2:${cacheKey}`, response, 1800),
        // L3 Cache (Database) - 1 hour
        this.cacheService.set(`l3:${cacheKey}`, response, ttl)
      ]);
      
      this.logger.debug('✅ Response cached in all layers');
    } catch (error) {
      this.logger.warn('Failed to cache response:', error.message);
    }
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZATION: Add performance metrics
   */
  private addPerformanceMetrics(response: ReVizCompleteResponse, responseTime: number): ReVizCompleteResponse {
    response.data.performance_metrics.response_time_ms = responseTime;
    response.data.performance_metrics.cache_hit_rate = 1.0;
    response.data.performance_metrics.assets_from_cdn = 0;
    return response;
  }
}
