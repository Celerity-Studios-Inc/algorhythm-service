export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
        environment: string;
        port: number;
        uptime: number;
        memory: NodeJS.MemoryUsage;
        nodeVersion: string;
    };
    ready(): {
        status: string;
        timestamp: string;
        service: string;
        ready: boolean;
    };
    live(): {
        status: string;
        timestamp: string;
        service: string;
        alive: boolean;
    };
}
