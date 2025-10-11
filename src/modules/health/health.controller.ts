import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Check if the Algorhythm service is running and healthy'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' },
        version: { type: 'string' },
        environment: { type: 'string' },
        port: { type: 'number' }
      }
    }
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'algorhythm-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000'),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Check if the service is ready to accept traffic'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready'
  })
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'algorhythm-service',
      ready: true
    };
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Check if the service is alive and responding'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive'
  })
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: 'algorhythm-service',
      alive: true
    };
  }
}