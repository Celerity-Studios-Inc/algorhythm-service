import { Model } from 'mongoose';
import { AnalyticsEvent } from '../../models/analytics-event.schema';
import { UserPreference } from '../../models/user-preference.schema';
import { CacheService } from '../caching/cache.service';
interface AnalyticsEventData {
    event_type: string;
    user_id?: string;
    song_id?: string;
    template_id?: string;
    layer_type?: string;
    compatibility_score?: number;
    alternatives_count?: number;
    variations_count?: number;
    cache_hit?: boolean;
    response_time_ms?: number;
    scoring_time_ms?: number;
    templates_evaluated?: number;
    variations_evaluated?: number;
    session_id?: string;
    request_id?: string;
    [key: string]: any;
}
export declare class AnalyticsService {
    private readonly analyticsEventModel;
    private readonly userPreferenceModel;
    private readonly cacheService;
    private readonly logger;
    private eventQueue;
    private readonly batchSize;
    private readonly flushInterval;
    constructor(analyticsEventModel: Model<AnalyticsEvent>, userPreferenceModel: Model<UserPreference>, cacheService: CacheService);
    trackEvent(eventData: AnalyticsEventData): Promise<void>;
    getRecommendationMetrics(timeRange: {
        start: Date;
        end: Date;
    }): Promise<{
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
    }>;
    getUserPreferences(userId: string): Promise<any>;
    updateUserPreferences(userId: string, eventData: AnalyticsEventData): Promise<void>;
    getPopularTemplates(songId?: string, limit?: number, timeRange?: {
        start: Date;
        end: Date;
    }): Promise<Array<{
        template_id: string;
        selection_count: number;
        avg_score: number;
    }>>;
    getPerformanceMetrics(timeRange: {
        start: Date;
        end: Date;
    }): Promise<{
        avg_response_time: number;
        p95_response_time: number;
        cache_hit_rate: number;
        error_rate: number;
        requests_per_minute: number;
    }>;
    private flushEventQueue;
    private cacheRecentEvent;
    private getTopEntities;
    private buildPreferenceIncrements;
    private buildPreferenceAdditions;
}
export {};
