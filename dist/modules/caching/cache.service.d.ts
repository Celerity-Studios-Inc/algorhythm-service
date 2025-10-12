import { Redis } from 'ioredis';
export declare class CacheService {
    private readonly redisClient;
    private readonly logger;
    constructor(redisClient: Redis | null);
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    deletePattern(pattern: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    mget(keys: string[]): Promise<(any | null)[]>;
    mset(keyValuePairs: Array<{
        key: string;
        value: any;
        ttl?: number;
    }>): Promise<boolean>;
    increment(key: string, delta?: number, ttl?: number): Promise<number>;
    getStats(): Promise<{
        connected: boolean;
        memory_usage: string;
        keyspace: any;
        cache_hits?: number;
        cache_misses?: number;
    }>;
    clearExpired(): Promise<number>;
    private parseKeyspaceInfo;
    getCompositesForSong(songId: string): Promise<any[] | null>;
    setCompositesForSong(songId: string, composites: any[]): Promise<boolean>;
    getBatchComposites(songIds: string[]): Promise<Map<string, any[]>>;
}
