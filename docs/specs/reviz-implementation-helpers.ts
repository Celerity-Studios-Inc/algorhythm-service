// ============================================================================
// REVIZ V2.0 IMPLEMENTATION HELPERS & CODE SNIPPETS
// GCP URL-Based Architecture
// ============================================================================

// ============================================================================
// 1. MODULE CONFIGURATION (CRITICAL FIX)
// File: src/modules/recommendations/recommendations.module.ts
// ============================================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
import { ReVizCompleteExperienceService } from './reviz-complete-experience.service';
import { ReVizCompleteExperienceController } from './reviz-complete-experience.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { CachingModule } from '../caching/caching.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { AnalyticsModule } from '../analytics/analytics.module';

// Import all schemas
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';
import { CompatibilityScore, CompatibilityScoreSchema } from '../../models/compatibility-score.schema';
import { RecommendationCache, RecommendationCacheSchema } from '../../models/recommendation-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      // 🔧 CRITICAL: Must include Asset and Composite models
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [
    RecommendationsController, 
    ReVizCompleteExperienceController
  ],
  providers: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService
  ],
  exports: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService
  ],
})
export class RecommendationsModule {}

// ============================================================================
// 2. SERVICE WITH GCP URL SUPPORT
// File: src/modules/recommendations/reviz-complete-experience.service.ts
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from '../../models/asset.schema';
import { Composite } from '../../models/composite.schema';

@Injectable()
export class ReVizCompleteExperienceService {
  private readonly logger = new Logger(ReVizCompleteExperienceService.name);
  
  constructor(
    // 🔧 CORRECT: Use Asset.name and Composite.name
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    @InjectModel(Composite.name) private compositeModel: Model<Composite>,
    // ... other dependencies
  ) {}

  /**
   * Get complete experience with GCP URLs (V2.0)
   */
  async getCompleteExperience(request: ReVizCompleteRequest): Promise<ReVizCompleteResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    this.logger.log(`[${requestId}] Processing complete experience for song: ${request.song_id}`);
    
    try {
      // Check cache first
      const cached = await this.checkCache(request);
      if (cached) {
        return cached;
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
      
      // Cache response
      await this.cacheResponse(request, response);
      
      // Add metrics
      response.data.performance_metrics.response_time_ms = Date.now() - startTime;
      
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
          variant_name: variant.variantName,
          
          // GCP URLs
          media: {
            gcpStorageUrl: variant.gcpStorageUrl,
            thumbnailUrl: variant.thumbnailUrl,
            previewUrl: variant.previewUrl
          },
          
          compatibility_score: variant.compatibilityScore,
          trending_score: variant.trendingScore?.score,
          tags: variant.tags
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
}

// ============================================================================
// 3. CONTROLLER (SIMPLIFIED - NO STREAMING NEEDED)
// File: src/modules/recommendations/reviz-complete-experience.controller.ts
// ============================================================================

import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/reviz')
@UseGuards(JwtAuthGuard)
export class ReVizCompleteExperienceController {
  constructor(
    private readonly revizService: ReVizCompleteExperienceService
  ) {}

  /**
   * 🔧 V2.0: Simple endpoint - no streaming needed (responses always small)
   */
  @Post('complete-experience')
  async getCompleteExperience(
    @Body() request: ReVizCompleteRequest
  ): Promise<ReVizCompleteResponse> {
    return await this.revizService.getCompleteExperience(request);
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0'
    };
  }
}

// ============================================================================
// 4. TYPE DEFINITIONS (V2.0 WITH URLS)
// File: src/modules/recommendations/dto/reviz-complete.dto.ts
// ============================================================================

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
    };
  };
  experience_config: {
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

// ============================================================================
// 5. DATABASE MIGRATION SCRIPT
// File: scripts/migrate-to-gcp-urls.ts
// ============================================================================

import { connect, connection } from 'mongoose';
import { Asset } from '../src/models/asset.schema';

async function migrateToGCPURLs() {
  try {
    // Connect to database
    await connect(process.env.MONGODB_URI);
    console.log('✓ Connected to database');
    
    // Find assets without GCP URLs
    const assetsToMigrate = await Asset.find({
      $or: [
        { gcpStorageUrl: { $exists: false } },
        { thumbnailUrl: { $exists: false } },
        { previewUrl: { $exists: false } }
      ]
    });
    
    console.log(`Found ${assetsToMigrate.length} assets to migrate`);
    
    let success = 0;
    let failed = 0;
    
    for (const asset of assetsToMigrate) {
      try {
        // Generate GCP URLs based on asset name and layer
        const layerName = { 'S': 'stars', 'L': 'looks', 'M': 'moves', 'W': 'worlds', 'G': 'songs' }[asset.layer];
        const baseUrl = `https://storage.googleapis.com/reviz-assets/${layerName}/${asset.name}`;
        
        // Set URLs
        asset.gcpStorageUrl = asset.fileUrl || `${baseUrl}/full.mp4`;
        asset.thumbnailUrl = `${baseUrl}/thumb.jpg`;
        asset.previewUrl = `${baseUrl}/preview.mp4`;
        
        await asset.save();
        success++;
        console.log(`✓ ${asset.name}`);
      } catch (error) {
        failed++;
        console.error(`✗ ${asset.name}: ${error.message}`);
      }
    }
    
    console.log(`\nMigration complete: ${success} success, ${failed} failed`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

// Run migration
migrateToGCPURLs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

// ============================================================================
// 6. VERIFICATION SCRIPT
// File: scripts/verify-gcp-urls.ts
// ============================================================================

async function verifyGCPURLs() {
  await connect(process.env.MONGODB_URI);
  
  const total = await Asset.countDocuments({});
  const withURLs = await Asset.countDocuments({
    gcpStorageUrl: { $exists: true },
    thumbnailUrl: { $exists: true },
    previewUrl: { $exists: true }
  });
  
  console.log(`Total assets: ${total}`);
  console.log(`With GCP URLs: ${withURLs}`);
  console.log(`Missing URLs: ${total - withURLs}`);
  
  if (total === withURLs) {
    console.log('✓ All assets have GCP URLs');
  } else {
    console.log('✗ Some assets missing GCP URLs - run migration');
  }
  
  await connection.close();
}

// ============================================================================
// 7. TEST HELPERS
// File: test/helpers/reviz-test-helpers.ts
// ============================================================================

export const mockReVizRequest = {
  song_id: 'G.POP.TEN.003',
  experience_config: {
    max_composites: 5,
    max_assets_per_layer: 6,
    include_variants: true,
    variant_depth: 6
  }
};

export const mockAssetWithURLs = {
  asset_id: 'S.POP.IDF.002',
  name: 'S.POP.IDF.002',
  nna_address: 'S.001.002.002',
  asset_type: 'base',
  media: {
    thumbnail_url: 'https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/thumb.jpg',
    preview_url: 'https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/preview.mp4',
    full_asset_url: 'https://storage.googleapis.com/reviz-assets/stars/S.POP.IDF.002/full.mp4'
  },
  metadata: { tags: ['pop', 'female'] },
  compatibility_score: 0.95
};

export function validateGCPURLFormat(url: string): boolean {
  return url.startsWith('https://storage.googleapis.com/reviz-');
}

export function validateResponseSize(response: any): boolean {
  const size = Buffer.byteLength(JSON.stringify(response));
  return size < 5 * 1024 * 1024; // < 5MB
}

// ============================================================================
// END OF IMPLEMENTATION HELPERS
// ============================================================================
