"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cache_service_1 = require("../caching/cache.service");
const nna_registry_service_1 = require("../nna-integration/nna-registry.service");
let HealthService = HealthService_1 = class HealthService {
    constructor(mongoConnection, cacheService, nnaRegistryService) {
        this.mongoConnection = mongoConnection;
        this.cacheService = cacheService;
        this.nnaRegistryService = nnaRegistryService;
        this.logger = new common_1.Logger(HealthService_1.name);
        this.startTime = Date.now();
    }
    async getHealthStatus() {
        const checks = await Promise.allSettled([
            this.checkDatabase(),
            this.checkCache(),
            this.checkNnaRegistry(),
        ]);
        const [dbResult, cacheResult, nnaResult] = checks;
        const services = {
            database: this.getResultData(dbResult),
            cache: this.getResultData(cacheResult),
            nna_registry: this.getResultData(nnaResult),
        };
        const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
        const totalServices = Object.keys(services).length;
        let overallStatus;
        if (healthyServices === totalServices) {
            overallStatus = 'healthy';
        }
        else if (healthyServices > 0) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'unhealthy';
        }
        return {
            status: overallStatus,
            version: '1.0.0',
            uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
            timestamp: new Date().toISOString(),
            services,
            metrics: await this.getBasicMetrics(),
        };
    }
    async getSystemInfo() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            node_version: process.version,
            memory_usage: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024),
            },
            cpu_usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000),
            load_average: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
            environment: process.env.NODE_ENV || 'unknown',
            database_stats: await this.getDatabaseStats(),
            cache_stats: await this.cacheService.getStats(),
        };
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            if (this.mongoConnection.readyState !== 1) {
                return {
                    status: 'unhealthy',
                    error: 'Database connection not ready',
                };
            }
            await this.mongoConnection.db.admin().ping();
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                response_time_ms: responseTime,
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error('Database health check failed:', errorMessage);
            return {
                status: 'unhealthy',
                response_time_ms: responseTime,
                error: errorMessage,
            };
        }
    }
    async checkCache() {
        const startTime = Date.now();
        try {
            const testKey = 'health-check-test';
            const testValue = Date.now().toString();
            await this.cacheService.set(testKey, testValue, 10);
            const retrieved = await this.cacheService.get(testKey);
            await this.cacheService.delete(testKey);
            if (retrieved !== testValue) {
                throw new Error('Cache value mismatch');
            }
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                response_time_ms: responseTime,
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown cache error';
            this.logger.error('Cache health check failed:', errorMessage);
            return {
                status: 'unhealthy',
                response_time_ms: responseTime,
                error: errorMessage,
            };
        }
    }
    async checkNnaRegistry() {
        try {
            return await this.nnaRegistryService.healthCheck();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown NNA Registry error';
            this.logger.error('NNA Registry health check failed:', errorMessage);
            return {
                status: 'unhealthy',
                error: errorMessage,
            };
        }
    }
    getResultData(result) {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        else {
            return {
                status: 'unhealthy',
                error: result.reason?.message || 'Health check failed',
            };
        }
    }
    async getBasicMetrics() {
        try {
            const memoryUsage = process.memoryUsage();
            return {
                memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                uptime_seconds: Math.floor(process.uptime()),
                requests_handled: 'N/A',
                active_connections: 'N/A',
            };
        }
        catch (error) {
            this.logger.error('Error getting basic metrics:', error);
            return {};
        }
    }
    async getDatabaseStats() {
        try {
            const stats = await this.mongoConnection.db.stats();
            return {
                collections: stats.collections,
                data_size_mb: Math.round(stats.dataSize / 1024 / 1024),
                storage_size_mb: Math.round(stats.storageSize / 1024 / 1024),
                indexes: stats.indexes,
                objects: stats.objects,
            };
        }
        catch (error) {
            this.logger.error('Error getting database stats:', error);
            return {};
        }
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        cache_service_1.CacheService,
        nna_registry_service_1.NnaRegistryService])
], HealthService);
//# sourceMappingURL=health.service.js.map