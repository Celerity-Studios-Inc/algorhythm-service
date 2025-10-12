import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Root Health')
@Controller()
export class RootHealthController {
  @Get('health')
  @ApiOperation({
    summary: 'Root health check endpoint',
    description: 'Check if the Algorhythm service is running and healthy (root level)'
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

  @Get('api/v1/health')
  @ApiOperation({
    summary: 'API v1 health check endpoint',
    description: 'Check if the Algorhythm service is running and healthy (API v1 level)'
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
  checkV1() {
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
}
