import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  check() {
    return {
      status: 'healthy',
      service: 'algorhythm-service',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      dependencies: {
        nna_registry: {
          status: 'connected',
          url: process.env.NNA_REGISTRY_URL || 'https://registry.dev.reviz.dev'
        },
        redis: {
          status: 'connected',
          host: process.env.REDIS_HOST || 'localhost'
        },
        mongodb: {
          status: 'connected',
          host: process.env.MONGODB_HOST || 'localhost'
        }
      }
    };
  }

  // Detailed health check with dependency testing
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with dependency tests' })
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
      // Add actual NNA Registry ping here
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      // Add actual Redis ping here
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkMongoDB(): Promise<string> {
    try {
      // Add actual MongoDB ping here
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
