export interface CompositeRecommendationResponse {
  composite_metadata: {
    composite_id: string;
    name: string;
    created_at: string;
    tags: string[];
    metadata: {
      duration_seconds: number;
      file_size_mb: number;
      resolution: string;
      format: string;
      quality_score: number;
    };
  };
  layer_assets: {
    stars: any[];
    looks: any[];
    moves: any[];
    worlds: any[];
  };
  asset_relationships: {
    composite_to_assets: Record<string, any>;
    base_to_variants: Record<string, any>;
    compatibility_matrix: Record<string, any>;
  };
  performance_metrics: {
    total_assets_loaded: number;
    response_time_ms: number;
    cache_hit_rate: number;
    data_size_mb: number;
  };
}
