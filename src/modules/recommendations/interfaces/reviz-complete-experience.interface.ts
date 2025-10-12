export interface ReVizCompleteRequest {
  song_id?: string;  // For song-based requests
  composite_id?: string;  // For composite-specific requests (ReViz preferred)
  user_context?: {
    user_id?: string;
    device_type?: string;
    connection_speed?: string;
  };
  experience_config: {
    max_composites?: number;
    max_assets_per_layer?: number;
    include_variants?: boolean;
    variant_depth?: number;
    layers?: string[];
  };
  performance_optimization?: {
    streaming?: boolean;
    compression?: boolean;
    cache_strategy?: string;
    preload_assets?: boolean;
  };
  request_id?: string;
}

export interface ReVizCompleteResponse {
  success: boolean;
  data: {
    song_metadata?: any;
    composite_videos: CompositeVideo[];
    layer_assets: LayerAssets;
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
      data_size_mb: number;
      streaming_enabled: boolean;
    };
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
    partial_response: boolean;
  };
}

export interface CompositeVideo {
  composite_id: string;
  composite_name: string;
  compatibility_score: number;
  ranking: number;
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
    energy_level: number;
    style: string;
    recommended_context: string;
    viral_potential_score: number;
    description: string;
  };
  analytics: {
    view_count: number;
    share_count: number;
    remix_count: number;
    trending_score: number;
  };
}

export interface LayerAssets {
  stars: LayerAssetGroup;
  looks: LayerAssetGroup;
  moves: LayerAssetGroup;
  worlds: LayerAssetGroup;
}

export interface LayerAssetGroup {
  layer_type: string;
  total_count: number;
  assets: AssetWithVariants[];
}

export interface AssetWithVariants {
  base_asset: AssetDetail;
  variants: AssetDetail[];
  hasVariants: boolean;
  variantCount: number;
  compatibility: {
    with_song: number;
    with_composite: number;
    cross_layer_average: number;
  };
}

export interface AssetDetail {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  base_asset_id?: string;
  variant_name?: string;
  media: {
    thumbnail_url: string;
    preview_url: string;
    full_resolution_url: string;
    file_size_mb: number;
    duration_seconds: number;
    format: string;
  };
  metadata: any;
  compatibility_scores: Record<string, number>;
  analytics: {
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
    preview_url: string;
  };
  metadata_summary: {
    star_name?: string;
    gender?: string;
    age_group?: string;
    brand_names?: string[];
    primary_colors?: string[];
    style?: string;
    dance_style?: string;
    energy_level?: number;
    complexity?: string;
    environment?: string;
    atmosphere?: string;
    time_of_day?: string;
  };
}
