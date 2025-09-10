import { CacheService } from '../cache.service';
export declare class ScoreCacheStrategy {
    private readonly cacheService;
    constructor(cacheService: CacheService);
    getCompatibilityScore(songId: string, templateId: string): Promise<any | null>;
    setCompatibilityScore(songId: string, templateId: string, score: any): Promise<boolean>;
    getCompatibilityScores(songId: string, templateIds: string[]): Promise<(any | null)[]>;
    setCompatibilityScores(songId: string, scores: Array<{
        templateId: string;
        score: any;
    }>): Promise<boolean>;
    invalidateScoresForSong(songId: string): Promise<number>;
    invalidateScoresForTemplate(templateId: string): Promise<number>;
}
