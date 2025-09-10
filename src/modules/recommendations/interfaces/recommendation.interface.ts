import { ApiProperty } from '@nestjs/swagger';

export interface CompatibilityScoreDetails {
  tempo_score: number;
  genre_score: number;
  energy_score: number;
  style_score: number;
  mood_score: number;
  base_score: number;
  freshness_boost: number;
  final_score: number;
}

export interface TemplateRecommendation {
  template_id: string;
  template_name: string;
  nna_address: string;
  compatibility_score: number;
  components: {
    song_id: string;
    star_id: string;
    look_id: string;
    move_id: string;
    world_id: string;
  };
  metadata: {
    created_at: string;
    tags: string[];
    description?: string;
  };
  scoring_details?: CompatibilityScoreDetails;
}

export interface LayerVariation {
  asset_id: string;
  asset_name: string;
  nna_address: string;
  compatibility_score: number;
  metadata: {
    tags: string[];
    description?: string;
  };
  scoring_details?: CompatibilityScoreDetails;
}

export interface PerformanceMetrics {
  response_time_ms: number;
  cache_hit: boolean;
  score_computation_time_ms?: number;
  templates_evaluated?: number;
  variations_evaluated?: number;
}

export interface ResponseMetadata {
  timestamp: string;
  request_id: string;
  version: string;
}

export class TemplateRecommendationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    recommendation: TemplateRecommendation;
    alternatives: TemplateRecommendation[];
    total_available: number;
  };

  @ApiProperty()
  performance_metrics: PerformanceMetrics;

  @ApiProperty()
  metadata: ResponseMetadata;
}

export class LayerVariationResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    variations: LayerVariation[];
    current_selection: LayerVariation;
    total_available: number;
  };

  @ApiProperty()
  performance_metrics: PerformanceMetrics;

  @ApiProperty()
  metadata: ResponseMetadata;
}
