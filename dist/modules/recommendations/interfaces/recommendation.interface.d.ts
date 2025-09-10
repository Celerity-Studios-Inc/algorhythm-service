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
export declare class TemplateRecommendationResponse {
    success: boolean;
    data: {
        recommendation: TemplateRecommendation;
        alternatives: TemplateRecommendation[];
        total_available: number;
    };
    performance_metrics: PerformanceMetrics;
    metadata: ResponseMetadata;
}
export declare class LayerVariationResponse {
    success: boolean;
    data: {
        variations: LayerVariation[];
        current_selection: LayerVariation;
        total_available: number;
    };
    performance_metrics: PerformanceMetrics;
    metadata: ResponseMetadata;
}
