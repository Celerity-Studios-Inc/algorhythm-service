import { RecommendationsService } from './recommendations.service';
import { OptimizedRecommendationsService } from './optimized-recommendations.service';
import { OptimizedNnaRegistryService } from '../nna-integration/optimized-nna-registry.service';
import { CacheService } from '../caching/cache.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { TemplateRecommendationResponse, LayerVariationResponse } from './interfaces/recommendation.interface';
export declare class RecommendationsController {
    private readonly recommendationsService;
    private readonly optimizedRecommendationsService;
    private readonly optimizedNnaRegistryService;
    private readonly cacheService;
    private readonly logger;
    constructor(recommendationsService: RecommendationsService, optimizedRecommendationsService: OptimizedRecommendationsService, optimizedNnaRegistryService: OptimizedNnaRegistryService, cacheService: CacheService);
    debugServices(): Promise<{
        optimizedRecommendationsService: {
            exists: boolean;
            type: string;
            methods: string[];
        };
        recommendationsService: {
            exists: boolean;
            type: string;
            hasOptimizedNnaRegistryService: boolean;
        };
        timestamp: string;
    }>;
    getCacheStatus(songId: string, maxAlt?: string): Promise<{
        song_id: string;
        normalized_song_id: string;
        cache_key: string;
        exists: boolean;
        ttl_seconds: number;
        size_bytes: number;
        last_warm_status: {
            started_at: number;
            finished_at?: number;
            success: boolean;
            items: number;
            duration_ms: number;
        };
        cache_stats: {
            hitRate: number;
            totalRequests: number;
            hits: number;
            misses: number;
            sets: number;
        };
    }>;
    testNnaRegistry(songId: string): Promise<{
        success: boolean;
        song_id: string;
        result_type: string;
        item_count: number;
        sample_item: any;
        timestamp: string;
        error?: undefined;
        stack?: undefined;
    } | {
        success: boolean;
        song_id: string;
        error: any;
        stack: any;
        timestamp: string;
        result_type?: undefined;
        item_count?: undefined;
        sample_item?: undefined;
    }>;
    testBothServices(request: TemplateRecommendationDto): Promise<any>;
    getTemplates(songId: string, maxAlternatives?: number): Promise<TemplateRecommendationResponse>;
    getTemplateRecommendation(request: TemplateRecommendationDto): Promise<TemplateRecommendationResponse>;
    getLayerVariations(request: LayerVariationDto): Promise<LayerVariationResponse>;
}
