/**
 * 🔧 REVIZ DEVELOPER REQUEST: Updated interface for composite_id-based requests
 * 
 * Changes from original:
 * - ✅ Replaced song_id with composite_id
 * - ✅ Removed max_composites parameter (only returns assets for one composite)
 * - ✅ Simplified request structure
 * - ✅ Real GCP URLs (not mock data)
 */

export interface ReVizCompositeRequest {
  composite_id: string;  // 🔧 FIX: Replaced song_id with composite_id
  user_context?: {
    user_id?: string;
    device_type?: 'mobile' | 'tablet' | 'desktop' | 'tv';
    connection_speed?: 'slow' | 'medium' | 'fast';
    preferences?: {
      preferred_genres?: string[];
      excluded_assets?: string[];
      favorite_styles?: string[];
      energy_preference?: 'low' | 'medium' | 'high';
      style_preference?: 'classic' | 'modern' | 'trendy';
    };
  };
  experience_config: {
    max_assets_per_layer?: number;  // 🔧 FIX: Removed max_composites
    include_variants?: boolean;
    variant_depth?: number;
    layers?: ('stars' | 'looks' | 'moves' | 'worlds')[];
  };
  request_id?: string;
}

export interface ReVizCompositeResponse {
  success: boolean;
  data: {
    composite_info: {
      composite_id: string;
      composite_name: string;
      gcp_storage_url: string;  // 🔧 REAL GCP URL
      thumbnail_url: string;    // 🔧 REAL GCP URL
      duration_seconds: number;
      file_size_mb: number;
      resolution: string;
      format: string;
      compatibility_score: number;
    };
    layer_assets: {
      stars: LayerAssets;
      looks: LayerAssets;
      moves: LayerAssets;
      worlds: LayerAssets;
    };
    asset_relationships: {
      compatibility_matrix: Record<string, Record<string, number>>;
      base_to_variants: Record<string, string[]>;
      layer_dependencies: Record<string, string[]>;
    };
    performance_metrics: {
      total_assets_loaded: number;
      response_time_ms: number;
      response_size_bytes: number;
      cache_hit_rate: number;
      assets_from_cdn: number;
    };
  };
  metadata: {
    request_id: string;
    timestamp: string;
    version: string;
    partial_response: boolean;
    fallback_reason?: string; // 🔧 FIX: Add optional fallback reason
  };
}

export interface LayerAssets {
  layer_type: string;
  total_assets: number;
  assets: AssetDetail[];
}

export interface AssetDetail {
  asset_id: string;
  asset_name: string;
  gcp_storage_url: string;  // 🔧 REAL GCP URL
  thumbnail_url: string;    // 🔧 REAL GCP URL
  duration_seconds: number;
  file_size_mb: number;
  resolution: string;
  format: string;
  compatibility_score: number;
  layer: string;
  category: string;
  subcategory: string;
  metadata: Record<string, any>;
  variants?: AssetWithVariants[];
}

export interface AssetWithVariants {
  variant_id: string;
  variant_name: string;
  gcp_storage_url: string;  // 🔧 REAL GCP URL
  thumbnail_url: string;    // 🔧 REAL GCP URL
  compatibility_score: number;
  differences: string[];
}

export interface ComponentAsset {
  component_id: string;
  component_type: string;
  gcp_storage_url: string;  // 🔧 REAL GCP URL
  thumbnail_url: string;    // 🔧 REAL GCP URL
  compatibility_score: number;
}
