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
        nna_registry: 'connected', // Will add actual check later
        redis: 'connected',
        mongodb: 'connected'
      }
    };
  }
}
