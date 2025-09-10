import { Model } from 'mongoose';
import { CompatibilityScore } from '../../models/compatibility-score.schema';
import { RecommendationCache } from '../../models/recommendation-cache.schema';
import { ScoringService } from '../scoring/scoring.service';
import { CacheService } from '../caching/cache.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { TemplateRecommendation, LayerVariation } from './interfaces/recommendation.interface';
export declare class RecommendationsService {
    private readonly compatibilityScoreModel;
    private readonly recommendationCacheModel;
    private readonly scoringService;
    private readonly cacheService;
    private readonly nnaRegistryService;
    private readonly analyticsService;
    private readonly logger;
    constructor(compatibilityScoreModel: Model<CompatibilityScore>, recommendationCacheModel: Model<RecommendationCache>, scoringService: ScoringService, cacheService: CacheService, nnaRegistryService: NnaRegistryService, analyticsService: AnalyticsService);
    getTemplateRecommendation(request: TemplateRecommendationDto): Promise<{
        recommendation: TemplateRecommendation;
        alternatives: TemplateRecommendation[];
        total_available: number;
        cache_hit?: boolean;
        score_computation_time_ms?: number;
        templates_evaluated?: number;
    }>;
    getLayerVariations(request: LayerVariationDto): Promise<{
        variations: LayerVariation[];
        current_selection: LayerVariation;
        total_available: number;
        cache_hit?: boolean;
        variations_evaluated?: number;
    }>;
    private applyDiversityAndSort;
    private getFallbackTemplate;
    private storeRecommendationCache;
    private mapVariationLayerToNnaLayer;
    private extractLayerAssetId;
    private mapAssetToLayerVariation;
}
