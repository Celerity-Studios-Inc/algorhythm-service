// reviz-complete-experience.dto.ts

export class ReVizCompleteRequest {
  song_id: string;
  
  user_context?: {
    user_id?: string;
    preferences?: {
      preferred_genres?: string[];
      excluded_assets?: string[];
      favorite_styles?: string[];
    };
    device_info?: {
      type: 'mobile' | 'tablet' | 'desktop' | 'tv';
      connection_speed?: 'slow' | 'medium' | 'fast';
      screen_resolution?: string;
    };
  };
  
  experience_config: {
    max_composites?: number; // Default: 5
    max_assets_per_layer?: number; // Default: 6
    include_variants?: boolean; // Default: true
    variant_depth?: number; // Default: 6
    layers?: ('stars' | 'looks' | 'moves' | 'worlds')[]; // Default: all
  };
  
  performance_optimization?: {
    preload_assets?: boolean; // Default: false
    cache_strategy?: 'aggressive' | 'balanced' | 'minimal'; // Default: 'balanced'
    compression?: boolean; // Default: true
    streaming?: boolean; // Default: false for <50MB
  };
  
  request_id?: string; // Optional client-provided ID for tracking
}

export interface ReVizCompleteResponse {
  success: boolean;
  data: {
    song_metadata: {
      song_id: string;
      song_name: string;
      artist_name: string;
      album_name?: string;
      genre: string;
      tempo: number;
      energy_level: 'low' | 'medium' | 'high';
      mood: string;
      duration_seconds: number;
      preview_url?: string;
      album_art_url?: string;
      cultural_tags?: string[];
      recommended_for?: string[];
    };
    
    composite_videos: CompositeVideo[];
    
    layer_assets: {
      stars: LayerAssets;
      looks: LayerAssets;
      moves: LayerAssets;
      worlds: LayerAssets;
    };
    
    asset_relationships: {
      composite_to_assets: Record<string, string[]>; // compositeId -> assetIds[]
      base_to_variants: Record<string, string[]>; // baseAssetId -> variantIds[]
      compatibility_matrix: Record<string, Record<string, number>>; // assetId -> assetId -> score
    };
    
    performance_metrics: {
      total_assets_loaded: number;
      response_time_ms: number;
      cache_hit_rate: number;
      compression_ratio: number;
      data_size_mb?: number;
      streaming_enabled?: boolean;
    };
  };
  
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
    partial_response: boolean;
    next_cursor?: string; // For pagination if needed
  };
  
  errors?: {
    code: string;
    message: string;
    field?: string;
  }[];
}

export interface CompositeVideo {
  composite_id: string;
  composite_name: string;
  compatibility_score: number; // 0-100
  ranking: number; // 1-N
  
  components: {
    star: ComponentAsset;
    look: ComponentAsset;
    move: ComponentAsset;
    world: ComponentAsset;
  };
  
  media: {
    preview_video_url: string;
    thumbnail_url: string;
    duration_seconds: number;
    resolution: string;
    file_size_mb: number;
  };
  
  metadata: {
    tags: string[];
    mood: string;
    energy_level: string;
    style: string;
    recommended_context: string[];
    viral_potential_score: number;
    description?: string;
  };
  
  analytics?: {
    view_count?: number;
    share_count?: number;
    remix_count?: number;
    trending_score?: number;
  };
}

export interface LayerAssets {
  layer_type: 'stars' | 'looks' | 'moves' | 'worlds';
  total_count: number;
  assets: AssetWithVariants[];
}

export interface AssetWithVariants {
  base_asset: AssetDetail;
  variants: AssetDetail[];
  hasVariants: boolean;
  variantCount: number;
  compatibility: {
    with_song: number; // 0-100
    with_composite: number; // 0-100
    cross_layer_average: number; // 0-100
  };
}

export interface AssetDetail {
  asset_id: string;
  asset_name: string;
  asset_type: 'base' | 'variant';
  base_asset_id?: string; // For variants
  variant_name?: string; // For variants
  
  media: {
    thumbnail_url: string;
    preview_url?: string;
    full_resolution_url: string;
    file_size_mb: number;
    duration_seconds?: number; // For video assets
    format: string;
  };
  
  metadata: any; // Layer-specific metadata
  
  compatibility_scores?: {
    [assetId: string]: number; // Compatibility with other assets
  };
  
  analytics?: {
    usage_count: number;
    popularity_score: number;
    trending: boolean;
  };
}

export interface ComponentAsset {
  layer: 'star' | 'look' | 'move' | 'world';
  asset_id: string;
  asset_name: string;
  is_variant: boolean;
  base_asset_id?: string;
  
  media: {
    thumbnail_url: string;
    preview_url?: string;
  };
  
  metadata_summary: {
    // Star specific
    star_name?: string;
    gender?: string;
    age_group?: string;
    
    // Look specific
    brand_names?: string[];
    primary_colors?: string[];
    style?: string;
    
    // Move specific
    dance_style?: string;
    energy_level?: string;
    complexity?: string;
    
    // World specific
    environment?: string;
    atmosphere?: string;
    time_of_day?: string;
  };
}