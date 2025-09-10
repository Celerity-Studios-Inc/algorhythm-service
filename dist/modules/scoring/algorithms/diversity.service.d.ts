import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';
export declare class DiversityService {
    applyDiversityBoost(recommendations: TemplateRecommendation[], maxResults?: number): TemplateRecommendation[];
    private groupByStyleFamily;
    private determineStyleFamily;
    private addRandomTieBreaker;
}
