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
    testBothServices(request: TemplateRecommendationDto): Promise<any>;
    getTemplateRecommendation(request: TemplateRecommendationDto): Promise<TemplateRecommendationResponse>;
    getLayerVariations(request: LayerVariationDto): Promise<LayerVariationResponse>;
}
