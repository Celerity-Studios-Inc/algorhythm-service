import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ScoringService } from '../scoring/scoring.service';

export interface ReVizCompleteRequest {
  // 🔧 FIX: Support both song_id and composite_id for ReViz developers
  song_id?: string;  // For song-based requests
  composite_id?: string;  // For composite-specific requests (ReViz preferred)
  user_context: {
    user_id: string;
    device_info: {
      type: string;
      connection_speed: string;
    };
  };
  experience_config: {
    max_assets_per_layer: number;
    include_variants: boolean;
    variant_depth: number;
  };
}

export interface ReVizCompleteResponse {
  success: boolean;
  data: {
    song_metadata: {
      song_id: string;
      title: string;
      artist: string;
      genre: string;
      tempo: number;
      energy_level: string;
      mood: string[];
    };
    composite_videos: CompositeVideo[];
    layer_assets: {
      stars: LayerAssets;
      looks: LayerAssets;
      moves: LayerAssets;
      worlds: LayerAssets;
    };
    asset_relationships: {
      composite_to_assets: Record<string, string[]>;
      base_to_variants: Record<string, string[]>;
      compatibility_matrix: Record<string, Record<string, number>>;
    };
    performance_metrics: {
      total_assets_loaded: number;
      response_time_ms: number;
      cache_hit_rate: number;
      compression_ratio: number;
    };
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
  };
}

export interface CompositeVideo {
  composite_id: string;
  composite_name: string;
  nna_address: string;
  compatibility_score: number;
  components: {
    song: AssetReference;
    star: AssetReference;
    look: AssetReference;
    move: AssetReference;
    world: AssetReference;
  };
  metadata: {
    created_at: string;
    tags: string[];
    description: string;
    viral_potential: number;
    energy_level: string;
    style_category: string;
  };
  performance: {
    render_time_ms: number;
    file_size_mb: number;
    quality_score: number;
  };
}

export interface LayerAssets {
  layer_type: 'stars' | 'looks' | 'moves' | 'worlds';
  assets: AssetWithVariants[];
  total_count: number;
  recommended_order: string[];
}

export interface AssetWithVariants {
  base_asset: AssetReference;
  variants: AssetReference[];
  metadata: {
    category: string;
    subcategory: string;
    tags: string[];
    ai_metadata: any;
  };
  compatibility: {
    with_song: number;
    with_other_layers: Array<{ layer: string; asset_id: string; score: number }>;
    viral_potential: number;
  };
}

export interface AssetReference {
  asset_id: string;
  nna_address: string;
  name: string;
  type: 'base' | 'variant';
  parent_asset_id?: string;
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_asset_url: string;
    file_size_mb: number;
    duration_seconds?: number;
  };
  technical: {
    resolution: string;
    format: string;
    quality_tier: 'quick' | 'standard' | 'premium' | 'ultra';
    processing_requirements: any;
  };
}

@Injectable()
export class ReVizCompleteExperienceService {
  private readonly logger = new Logger(ReVizCompleteExperienceService.name);

  constructor(
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getCompleteExperience(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse> {
    const startTime = Date.now();
    const requestId = `reviz_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // 🔧 FIX: Support both song_id and composite_id requests
    const requestType = request.composite_id ? 'composite' : 'song';
    const requestId_value = request.composite_id || request.song_id;
    
    this.logger.log(`🚀 Processing ReViz complete experience request (${requestType}): ${requestId_value}`);

    try {
      // Check cache first
      const cacheKey = `reviz_complete:${requestType}:${requestId_value}:${JSON.stringify(request.user_context)}`;
      const cachedResult = await this.cacheService.get(cacheKey);
      
      if (cachedResult) {
        this.logger.debug(`✅ Cache hit for ReViz complete experience: ${requestId_value}`);
        return {
          ...(cachedResult as any),
          metadata: {
            ...(cachedResult as any).metadata,
            request_id: requestId,
          },
        };
      }

      let songMetadata;
      let compositeVideos;

      if (request.composite_id) {
        // 🔧 FIX: Composite-specific request (ReViz preferred)
        this.logger.log(`🎬 Processing composite-specific request: ${request.composite_id}`);
        
        // Get the specific composite
        const composite = await this.getCompositeById(request.composite_id);
        if (!composite) {
          throw new Error(`Composite not found: ${request.composite_id}`);
        }

        // Extract song from composite components
        const songId = composite.components?.song?.nna_address || composite.components?.song?.asset_id;
        songMetadata = await this.getSongMetadata(songId);
        
        // Return only this specific composite
        compositeVideos = [composite];
      } else {
        // 🔧 FIX: Song-based request (legacy support)
        this.logger.log(`🎵 Processing song-based request: ${request.song_id}`);
        
        songMetadata = await this.getSongMetadata(request.song_id);
        compositeVideos = await this.getCompositeVideos(request.song_id, 3);
      }

      // Get layer assets with variants
      const layerAssets = await this.getLayerAssetsWithVariants(
        ['stars', 'looks', 'moves', 'worlds'], // Default layers for ReViz
        request.experience_config.max_assets_per_layer,
        request.experience_config.include_variants,
        request.experience_config.variant_depth
      );

      // Build asset relationships
      const assetRelationships = await this.buildAssetRelationships(
        compositeVideos,
        layerAssets
      );

      // Calculate performance metrics
      const totalAssetsLoaded = this.calculateTotalAssets(layerAssets);
      const responseTime = Date.now() - startTime;

      const result: ReVizCompleteResponse = {
        success: true,
        data: {
          song_metadata: songMetadata,
          composite_videos: compositeVideos,
          layer_assets: layerAssets,
          asset_relationships: assetRelationships,
          performance_metrics: {
            total_assets_loaded: totalAssetsLoaded,
            response_time_ms: responseTime,
            cache_hit_rate: cachedResult ? 1.0 : 0.0,
            compression_ratio: 0.6, // Default compression ratio
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      };

      // Cache the result
      await this.cacheService.set(cacheKey, result, 3600); // 1 hour cache

      // Track analytics
      await this.analyticsService.trackEvent({
        event_type: 'reviz_complete_experience_requested',
        user_id: request.user_context.user_id,
        song_id: request.song_id,
        performance_metrics: {
          response_time_ms: responseTime,
          total_assets_loaded: totalAssetsLoaded,
          cache_hit: !!cachedResult,
        },
      });

      this.logger.log(`✅ ReViz complete experience processed: ${responseTime}ms, ${totalAssetsLoaded} assets`);
      return result;

    } catch (error) {
      this.logger.error(`❌ ReViz complete experience failed: ${error.message}`);
      throw error;
    }
  }

  private async getSongMetadata(songId: string) {
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
      song_id: songId,
      title: song.name,
      artist: song.artist,
      genre: song.genre,
      tempo: song.tempo,
      energy_level: song.energy.toString(),
      mood: [song.mood],
    };
  }

  private async getCompositeById(compositeId: string): Promise<CompositeVideo | null> {
    try {
      // Get composite from NNA Registry API using address lookup
      const composite = await this.optimizedNnaRegistryService.getCompositeById(compositeId);
      
      if (!composite) {
        return null;
      }

      // Convert to CompositeVideo format
      return {
        composite_id: composite._id || composite.nna_address,
        composite_name: composite.name || `Composite ${compositeId}`,
        nna_address: composite.nna_address,
        compatibility_score: 0.9, // High score for specific composite
        components: {
          song: this.createAssetReference(composite.components?.song?.nna_address || 'unknown', 'song'),
          star: this.createAssetReference(composite.components?.star?.nna_address || 'unknown', 'star'),
          look: this.createAssetReference(composite.components?.look?.nna_address || 'unknown', 'look'),
          move: this.createAssetReference(composite.components?.move?.nna_address || 'unknown', 'move'),
          world: this.createAssetReference(composite.components?.world?.nna_address || 'unknown', 'world'),
        },
        metadata: {
          created_at: composite.createdAt || new Date().toISOString(),
          tags: composite.tags || ['composite'],
          description: composite.description || `Composite video ${compositeId}`,
          viral_potential: 0.8,
          energy_level: 'high',
          style_category: 'modern',
        },
        performance: {
          render_time_ms: 1500,
          file_size_mb: 8.5,
          quality_score: 0.9,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get composite ${compositeId}: ${error.message}`);
      return null;
    }
  }

  private async getCompositeVideos(songId: string, maxComposites: number) {
    // 🔧 FIX: Use enhanced NNA Registry endpoint for AlgoRhythm format
    this.logger.log(`🔍 [DEBUG] Getting composite videos for song: ${songId}`);
    const templates = await this.optimizedNnaRegistryService.getCompositesBySongAlgoRhythmFormat(songId);
    this.logger.log(`🔍 [DEBUG] Templates received:`, JSON.stringify(templates?.slice(0, 2), null, 2));
    
    if (!templates || !Array.isArray(templates)) {
      this.logger.error(`❌ [DEBUG] Templates is not an array:`, typeof templates, templates);
      return [];
    }
    
    return templates.slice(0, maxComposites).map((template, index) => {
      // Extract components by layer from the NNA Registry data structure
      const components = template.components || [];
      const songComponent = components.find(c => c.layer === 'G');
      const starComponent = components.find(c => c.layer === 'S');
      const lookComponent = components.find(c => c.layer === 'L');
      const moveComponent = components.find(c => c.layer === 'M');
      const worldComponent = components.find(c => c.layer === 'W');
      
      return {
        composite_id: template.composite_id || template._id || template.nna_address,
        composite_name: template.composite_name || template.name || `Template ${index + 1}`,
        nna_address: template.nna_address,
        compatibility_score: template.compatibility_score || 0.8 + (Math.random() * 0.2), // 0.8-1.0
        components: {
          song: this.createAssetReference(songComponent?.asset_id || songId, 'song'),
          star: this.createAssetReference(starComponent?.asset_id || '2.009.002.018', 'star'),
          look: this.createAssetReference(lookComponent?.asset_id || '3.003.001.001', 'look'),
          move: this.createAssetReference(moveComponent?.asset_id || '4.022.002.003', 'move'),
          world: this.createAssetReference(worldComponent?.asset_id || '5.015.001.001', 'world'),
        },
        metadata: {
          created_at: template.created_at || template.createdAt || new Date().toISOString(),
          tags: template.tags || ['nna-layer-G', 'nna-layer-S', 'nna-layer-L', 'nna-layer-M', 'nna-layer-W'],
          aiGeneratedDescription: template.description || `Composite video ${index + 1}`,
          viral_potential: 0.7 + (Math.random() * 0.3),
        energy_level: 'high',
        style_category: 'modern',
      },
      performance: {
        render_time_ms: 1000 + (Math.random() * 2000),
        file_size_mb: 5 + (Math.random() * 10),
        quality_score: 0.8 + (Math.random() * 0.2),
      },
    }));
  }

  private async getLayerAssetsWithVariants(
    layers: string[],
    maxAssetsPerLayer: number,
    includeVariants: boolean,
    variantDepth: number
  ) {
    const result: any = {};

    // Get layer assets for all layers at once
    const layerAssetsData = await this.optimizedNnaRegistryService.getLayerAssetsAlgoRhythmFormat('1.018.003.002'); // Use a default song ID for now

    for (const layer of layers) {
      // Map layer names to NNA Registry layer codes
      const layerMapping = {
        'stars': 'S',
        'looks': 'L', 
        'moves': 'M',
        'worlds': 'W'
      };
      
      const layerCode = layerMapping[layer] || layer;
      const assets = layerAssetsData.layer_assets?.[layer]?.assets || [];
      const selectedAssets = assets.slice(0, maxAssetsPerLayer);

      result[layer] = {
        layer_type: layer,
        assets: await Promise.all(
          selectedAssets.map(async (asset) => {
            const baseAsset = this.createAssetReference(asset.asset_id || asset.nna_address, layer);
            const variants = includeVariants 
              ? await this.getAssetVariants(asset.asset_id || asset.nna_address, variantDepth)
              : [];

            return {
              base_asset: baseAsset,
              variants: variants,
              metadata: {
                category: asset.category || 'Unknown',
                subcategory: asset.subcategory || 'Unknown',
                tags: asset.tags || [],
                ai_metadata: asset.aiMetadata || {},
              },
              compatibility: {
                with_song: 0.7 + (Math.random() * 0.3),
                with_other_layers: [],
                viral_potential: 0.6 + (Math.random() * 0.4),
              },
            };
          })
        ),
        total_count: selectedAssets.length,
        recommended_order: selectedAssets.map(asset => asset.nna_address),
      };
    }

    return result;
  }

  private async getAssetVariants(baseAssetId: string, variantDepth: number) {
    // Simulate variant generation
    const variants: AssetReference[] = [];
    for (let i = 0; i < variantDepth; i++) {
      variants.push({
        asset_id: `${baseAssetId}_variant_${i + 1}`,
        nna_address: `${baseAssetId}.${i + 1}`,
        name: `Variant ${i + 1}`,
        type: 'variant',
        parent_asset_id: baseAssetId,
        media: {
          thumbnail_url: `https://example.com/thumbnails/${baseAssetId}_${i + 1}.jpg`,
          preview_url: `https://example.com/previews/${baseAssetId}_${i + 1}.mp4`,
          full_asset_url: `https://example.com/assets/${baseAssetId}_${i + 1}.mp4`,
          file_size_mb: 2 + (Math.random() * 8),
          duration_seconds: 30 + (Math.random() * 60),
        },
        technical: {
          resolution: '1080p',
          format: 'mp4',
          quality_tier: 'standard',
          processing_requirements: {},
        },
      });
    }
    return variants;
  }

  private async buildAssetRelationships(compositeVideos: CompositeVideo[], layerAssets: any) {
    const compositeToAssets: Record<string, string[]> = {};
    const baseToVariants: Record<string, string[]> = {};
    const compatibilityMatrix: Record<string, Record<string, number>> = {};

    // Build composite to assets mapping
    compositeVideos.forEach(composite => {
      // Extract asset IDs from components array
      const starComponent = composite.components?.star;
      const lookComponent = composite.components?.look;
      const moveComponent = composite.components?.move;
      const worldComponent = composite.components?.world;
      
      compositeToAssets[composite.composite_id] = [
        starComponent?.asset_id || 'unknown',
        lookComponent?.asset_id || 'unknown',
        moveComponent?.asset_id || 'unknown',
        worldComponent?.asset_id || 'unknown',
      ].filter(id => id !== 'unknown');
    });

    // Build base to variants mapping
    Object.values(layerAssets).forEach((layer: any) => {
      layer.assets.forEach((asset: AssetWithVariants) => {
        baseToVariants[asset.base_asset.asset_id] = asset.variants.map(v => v.asset_id);
      });
    });

    // Build compatibility matrix
    Object.values(layerAssets).forEach((layer: any) => {
      layer.assets.forEach((asset: AssetWithVariants) => {
        compatibilityMatrix[asset.base_asset.asset_id] = {};
        Object.values(layerAssets).forEach((otherLayer: any) => {
          otherLayer.assets.forEach((otherAsset: AssetWithVariants) => {
            compatibilityMatrix[asset.base_asset.asset_id][otherAsset.base_asset.asset_id] = 
              0.5 + (Math.random() * 0.5);
          });
        });
      });
    });

    return {
      composite_to_assets: compositeToAssets,
      base_to_variants: baseToVariants,
      compatibility_matrix: compatibilityMatrix,
    };
  }

  private createAssetReference(assetId: string, type: string): AssetReference {
    return {
      asset_id: assetId,
      nna_address: assetId,
      name: `${type.toUpperCase()}_${assetId.split('.').pop()}`,
      type: 'base',
      media: {
        thumbnail_url: `https://example.com/thumbnails/${assetId}.jpg`,
        preview_url: `https://example.com/previews/${assetId}.mp4`,
        full_asset_url: `https://example.com/assets/${assetId}.mp4`,
        file_size_mb: 3 + (Math.random() * 7),
        duration_seconds: 45 + (Math.random() * 30),
      },
      technical: {
        resolution: '1080p',
        format: 'mp4',
        quality_tier: 'standard',
        processing_requirements: {},
      },
    };
  }

  private calculateTotalAssets(layerAssets: any): number {
    let total = 0;
    Object.values(layerAssets).forEach((layer: any) => {
      layer.assets.forEach((asset: AssetWithVariants) => {
        total += 1; // Base asset
        total += asset.variants.length; // Variants
      });
    });
    return total;
  }
}
