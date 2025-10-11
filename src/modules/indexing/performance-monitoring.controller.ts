import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceMonitoringService } from './performance-monitoring.service';

@ApiTags('Performance Monitoring')
@Controller('performance')
export class PerformanceMonitoringController {
  private readonly logger = new Logger(PerformanceMonitoringController.name);

  constructor(
    private readonly performanceMonitoring: PerformanceMonitoringService,
  ) {}

  @Get('report')
  @ApiOperation({
    summary: 'Get comprehensive performance report',
    description: 'Get detailed performance metrics for local data operations, index updates, and search optimization'
  })
  @ApiResponse({
    status: 200,
    description: 'Performance report retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        indexUpdates: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            averageTime: { type: 'number' },
            lastUpdate: { type: 'string', format: 'date-time' }
          }
        },
        queries: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            averageTime: { type: 'number' },
            slowQueries: { type: 'number' },
            cacheHits: { type: 'number' },
            cacheMisses: { type: 'number' }
          }
        },
        storage: {
          type: 'object',
          properties: {
            totalAssets: { type: 'number' },
            totalComposites: { type: 'number' },
            storageSize: { type: 'number' },
            lastSync: { type: 'string', format: 'date-time' }
          }
        },
        performance: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            memoryUsage: { type: 'number' },
            cpuUsage: { type: 'number' },
            lastCheck: { type: 'string', format: 'date-time' }
          }
        },
        health: { type: 'number' },
        alerts: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getPerformanceReport() {
    this.logger.log('📊 Generating comprehensive performance report');
    
    const report = await this.performanceMonitoring.getPerformanceReport();
    
    this.logger.log(`✅ Performance report generated with health score: ${report.health}`);
    return report;
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get performance metrics summary',
    description: 'Get a summary of key performance metrics and health indicators'
  })
  @ApiResponse({
    status: 200,
    description: 'Performance summary retrieved successfully'
  })
  async getPerformanceSummary() {
    this.logger.log('📊 Generating performance summary');
    
    const summary = this.performanceMonitoring.getMetricsSummary();
    
    this.logger.log(`✅ Performance summary generated with health score: ${summary.health}`);
    return summary;
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get performance alerts',
    description: 'Get current performance alerts and warnings'
  })
  @ApiResponse({
    status: 200,
    description: 'Performance alerts retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' }
    }
  })
  async getPerformanceAlerts() {
    this.logger.log('🚨 Checking performance alerts');
    
    const alerts = this.performanceMonitoring.getPerformanceAlerts();
    
    if (alerts.length > 0) {
      this.logger.warn(`⚠️ Found ${alerts.length} performance alerts`);
    } else {
      this.logger.log('✅ No performance alerts');
    }
    
    return {
      alerts,
      count: alerts.length,
      timestamp: new Date(),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health score',
    description: 'Get overall system health score based on performance metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'Health score retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        health: { type: 'number', minimum: 0, maximum: 100 },
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getHealthScore() {
    this.logger.log('🏥 Checking system health');
    
    const summary = this.performanceMonitoring.getMetricsSummary();
    const health = summary.health;
    
    let status = 'healthy';
    if (health < 50) {
      status = 'critical';
    } else if (health < 80) {
      status = 'warning';
    }
    
    this.logger.log(`✅ System health: ${health}/100 (${status})`);
    
    return {
      health,
      status,
      timestamp: new Date(),
    };
  }
}
