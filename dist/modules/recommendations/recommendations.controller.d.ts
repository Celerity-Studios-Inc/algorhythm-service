import { RecommendationsService } from './recommendations.service';
import { OptimizedRecommendationsService } from './optimized-recommendations.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { TemplateRecommendationResponse, LayerVariationResponse } from './interfaces/recommendation.interface';
export declare class RecommendationsController {
    private readonly recommendationsService;
    private readonly optimizedRecommendationsService;
    private readonly logger;
    constructor(recommendationsService: RecommendationsService, optimizedRecommendationsService: OptimizedRecommendationsService);
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
