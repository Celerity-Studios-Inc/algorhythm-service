import { RecommendationsService } from './recommendations.service';
import { TemplateRecommendationDto } from './dto/template-recommendation.dto';
import { LayerVariationDto } from './dto/layer-variation.dto';
import { TemplateRecommendationResponse, LayerVariationResponse } from './interfaces/recommendation.interface';
export declare class RecommendationsController {
    private readonly recommendationsService;
    private readonly logger;
    constructor(recommendationsService: RecommendationsService);
    getTemplateRecommendation(request: TemplateRecommendationDto): Promise<TemplateRecommendationResponse>;
    getLayerVariations(request: LayerVariationDto): Promise<LayerVariationResponse>;
}
