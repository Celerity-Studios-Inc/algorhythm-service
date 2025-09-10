import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CacheService } from '../caching/cache.service';
import { NnaRegistryService } from '../nna-integration/nna-registry.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectConnection()
    private readonly mongoConnection: Connection,
    private readonly cacheService: CacheService,
    private readonly nnaRegistryService: NnaRegistryService,
  ) {}

  async getHealthStatus(): Promise<{
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
  }> {
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

    // Determine overall health status
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalServices = Object.keys(services).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      overallStatus = 'healthy';
    } else if (healthyServices > 0) {
      overallStatus = 'degraded';
    } else {
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

  async getSystemInfo(): Promise<{
    node_version: string;
    memory_usage: NodeJS.MemoryUsage;
    cpu_usage: number;
    load_average: number[];
    environment: string;
    database_stats: any;
    cache_stats: any;
  }> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      node_version: process.version,
      memory_usage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        arrayBuffers: Math.round((memoryUsage as any).arrayBuffers / 1024 / 1024), // MB
      },
      cpu_usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000), // microseconds to milliseconds
      load_average: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      environment: process.env.NODE_ENV || 'unknown',
      database_stats: await this.getDatabaseStats(),
      cache_stats: await this.cacheService.getStats(),
    };
  }

  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    response_time_ms?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      if (this.mongoConnection.readyState !== 1) {
        return {
          status: 'unhealthy',
          error: 'Database connection not ready',
        };
      }

      // Simple ping to test connectivity
      await this.mongoConnection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        response_time_ms: responseTime,
      };
    } catch (error) {
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

  private async checkCache(): Promise<{
    status: 'healthy' | 'unhealthy';
    response_time_ms?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();

      // Test set and get operations
      await this.cacheService.set(testKey, testValue, 10); // 10 seconds TTL
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
    } catch (error) {
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

  private async checkNnaRegistry(): Promise<{
    status: 'healthy' | 'unhealthy';
    response_time_ms?: number;
    error?: string;
  }> {
    try {
      return await this.nnaRegistryService.healthCheck();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown NNA Registry error';
      
      this.logger.error('NNA Registry health check failed:', errorMessage);
      
      return {
        status: 'unhealthy',
        error: errorMessage,
      };
    }
  }

  private getResultData(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        error: result.reason?.message || 'Health check failed',
      };
    }
  }

  private async getBasicMetrics(): Promise<any> {
    try {
      const memoryUsage = process.memoryUsage();
      
      return {
        memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        uptime_seconds: Math.floor(process.uptime()),
        requests_handled: 'N/A', // Would need request counter middleware
        active_connections: 'N/A', // Would need connection tracking
      };
    } catch (error) {
      this.logger.error('Error getting basic metrics:', error);
      return {};
    }
  }

  private async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.mongoConnection.db.stats();
      
      return {
        collections: stats.collections,
        data_size_mb: Math.round(stats.dataSize / 1024 / 1024),
        storage_size_mb: Math.round(stats.storageSize / 1024 / 1024),
        indexes: stats.indexes,
        objects: stats.objects,
      };
    } catch (error) {
      this.logger.error('Error getting database stats:', error);
      return {};
    }
  }
}
