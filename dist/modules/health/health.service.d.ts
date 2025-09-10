import { Connection } from 'mongoose';
import { CacheService } from '../caching/cache.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';
export declare class HealthService {
    private readonly mongoConnection;
    private readonly cacheService;
    private readonly nnaRegistryService;
    private readonly logger;
    private readonly startTime;
    constructor(mongoConnection: Connection, cacheService: CacheService, nnaRegistryService: NnaRegistryService);
    getHealthStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        version: string;
        uptime_seconds: number;
        timestamp: string;
        services: {
            database: any;
            cache: any;
            nna_registry: any;
        };
        metrics: any;
    }>;
    getSystemInfo(): Promise<{
        node_version: string;
        memory_usage: NodeJS.MemoryUsage;
        cpu_usage: number;
        load_average: number[];
        environment: string;
        database_stats: any;
        cache_stats: any;
    }>;
    private checkDatabase;
    private checkCache;
    private checkNnaRegistry;
    private getResultData;
    private getBasicMetrics;
    private getDatabaseStats;
}
