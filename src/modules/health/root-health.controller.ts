import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Root Health')
@Controller('api')
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
}
