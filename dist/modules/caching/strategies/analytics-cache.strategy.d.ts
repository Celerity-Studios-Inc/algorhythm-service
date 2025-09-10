import { CacheService } from '../cache.service';
export declare class AnalyticsCacheStrategy {
    private readonly cacheService;
    constructor(cacheService: CacheService);
    getRecentEvents(): Promise<any[] | null>;
    setRecentEvents(events: any[]): Promise<boolean>;
    addRecentEvent(event: any): Promise<boolean>;
    getUserPreferences(userId: string): Promise<any | null>;
    setUserPreferences(userId: string, preferences: any): Promise<boolean>;
    invalidateUserPreferences(userId: string): Promise<boolean>;
}
