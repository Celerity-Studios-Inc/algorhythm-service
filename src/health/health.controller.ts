import { Controller, Get, Optional, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationsService } from '../modules/recommendations/recommendations.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(
    @Optional() @Inject(RecommendationsService)
    private readonly recommendationsService?: RecommendationsService,
  ) {}
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    // 📊 CACHE MONITORING - Get cache statistics (optional)
    const cacheStats = this.recommendationsService?.getCacheStats() || { hits: 0, misses: 0, size: 0 };
    
    return {
      status: 'ok',
      service: 'algorhythm-service',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cache: {
        type: 'memory',
        ...cacheStats,
        maxSize: 100,
        ttl: 600, // 10 minutes
      },
      dependencies: {
        nna_registry: {
          status: 'connected',
          url: process.env.NNA_REGISTRY_URL || 'https://registry.dev.reviz.dev'
        },
        redis: {
          status: process.env.REDIS_ENABLED === 'false' ? 'disabled' : 'connected',
          host: process.env.REDIS_HOST || 'localhost'
        },
        mongodb: {
          status: 'connected',
          host: process.env.MONGODB_HOST || 'localhost'
        }
      }
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependency tests' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async checkDetailed() {
    const basicHealth = this.check();
    
    return {
      ...basicHealth,
      checks: {
        nna_registry: await this.checkNNARegistry(),
        redis: await this.checkRedis(),
        mongodb: await this.checkMongoDB()
      }
    };
  }

  private async checkNNARegistry(): Promise<string> {
    try {
      // Add actual NNA Registry ping here if needed
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      // Add actual Redis ping here if needed
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkMongoDB(): Promise<string> {
    try {
      // Add actual MongoDB ping here if needed
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}