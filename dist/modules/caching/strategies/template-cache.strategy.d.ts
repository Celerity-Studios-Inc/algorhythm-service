import { CacheService } from '../cache.service';
import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';
export declare class TemplateCacheStrategy {
    private readonly cacheService;
    constructor(cacheService: CacheService);
    getRecommendation(songId: string, userContext: any): Promise<any | null>;
    setRecommendation(songId: string, userContext: any, recommendation: any): Promise<boolean>;
    getPopularTemplates(songId: string): Promise<TemplateRecommendation[] | null>;
    setPopularTemplates(songId: string, templates: TemplateRecommendation[]): Promise<boolean>;
    invalidateRecommendationsForSong(songId: string): Promise<number>;
    private buildRecommendationKey;
    private hashUserContext;
}
