import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getRecommendationMetrics(start: Date, end: Date): Promise<{
        success: boolean;
        data: {
            total_recommendations: number;
            total_selections: number;
            selection_rate: number;
            avg_response_time: number;
            cache_hit_rate: number;
            top_songs: Array<{
                song_id: string;
                count: number;
            }>;
            top_templates: Array<{
                template_id: string;
                count: number;
            }>;
        };
        metadata: {
            timestamp: string;
            time_range: {
                start: Date;
                end: Date;
            };
        };
    }>;
    getPerformanceMetrics(start: Date, end: Date): Promise<{
        success: boolean;
        data: {
            avg_response_time: number;
            p95_response_time: number;
            cache_hit_rate: number;
            error_rate: number;
            requests_per_minute: number;
        };
        metadata: {
            timestamp: string;
            time_range: {
                start: Date;
                end: Date;
            };
        };
    }>;
    getPopularTemplates(songId?: string, limit?: number): Promise<{
        success: boolean;
        data: {
            template_id: string;
            selection_count: number;
            avg_score: number;
        }[];
        metadata: {
            timestamp: string;
            filters: {
                song_id: string;
                limit: number;
            };
        };
    }>;
}
