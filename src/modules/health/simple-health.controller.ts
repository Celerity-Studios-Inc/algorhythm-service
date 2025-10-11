import { Controller, Get } from '@nestjs/common';

@Controller()
export class SimpleHealthController {
  @Get('health')
  @Get('api/health')
  @Get('api/v1/health')
  simpleHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'algorhythm-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      port: parseInt(process.env.PORT || '3000'),
      uptime: process.uptime(),
      nodeVersion: process.version
    };
  }
}
