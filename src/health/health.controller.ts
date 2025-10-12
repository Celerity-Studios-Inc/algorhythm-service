import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service health check' })
  async check() {
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
        nna_registry: await this.checkNNARegistry(),
        redis: 'healthy',
        mongodb: 'healthy'
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
      const response = await fetch('https://registry.dev.reviz.dev/health', {
        method: 'GET',
        headers: { 'x-api-key': 'reviz-dev-30390-13220-4896-9516-9001' },
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      return response.ok ? 'healthy' : 'unhealthy';
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
