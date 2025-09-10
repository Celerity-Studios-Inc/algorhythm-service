import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    getHealth(): Promise<{
        status: "healthy" | "degraded" | "unhealthy";
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
}
