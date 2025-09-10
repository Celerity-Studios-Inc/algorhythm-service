import { Model } from 'mongoose';
import { CompatibilityScore } from '../../models/compatibility-score.schema';
import { RuleBasedScoringService } from './algorithms/rule-based-scoring.service';
import { FreshnessBoostService } from './algorithms/freshness-boost.service';
import { DiversityService } from './algorithms/diversity.service';
import { TemplateRecommendation, LayerVariation } from '../recommendations/interfaces/recommendation.interface';
export declare class ScoringService {
    private readonly compatibilityScoreModel;
    private readonly ruleBasedScoringService;
    private readonly freshnessBoostService;
    private readonly diversityService;
    private readonly logger;
    constructor(compatibilityScoreModel: Model<CompatibilityScore>, ruleBasedScoringService: RuleBasedScoringService, freshnessBoostService: FreshnessBoostService, diversityService: DiversityService);
    scoreTemplates(song: any, templates: any[], userPreferences?: any): Promise<TemplateRecommendation[]>;
    scoreLayerVariations(song: any, currentTemplate: any, layerAssets: any[], layerType: string): Promise<LayerVariation[]>;
    private getCachedScore;
    private computeCompatibilityScore;
    private calculateWeightedScore;
    private cacheScore;
    private extractComponents;
    private substituteLayerAsset;
}
