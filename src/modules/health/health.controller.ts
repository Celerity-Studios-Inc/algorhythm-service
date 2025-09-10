import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        version: { type: 'string' },
        uptime_seconds: { type: 'number' },
        timestamp: { type: 'string' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            cache: { type: 'object' },
            nna_registry: { type: 'object' },
          },
        },
        metrics: { type: 'object' },
      },
    },
  })
  @Get()
  async getHealth() {
    return await this.healthService.getHealthStatus();
  }

  @ApiOperation({ summary: 'Get detailed system information' })
  @ApiResponse({ status: 200, description: 'System info retrieved successfully' })
  @Get('info')
  async getSystemInfo() {
    return await this.healthService.getSystemInfo();
  }
}
