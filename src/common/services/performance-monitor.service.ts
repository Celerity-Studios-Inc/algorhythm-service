import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly performanceThresholds = {
    responseTime: 2000, // 2 seconds
    memoryUsage: 0.8,    // 80% of available memory
    cpuUsage: 0.9        // 90% CPU usage
  };

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorPerformance() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = usedMemory / totalMemory;

    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent * 100)
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    };

    // Log performance metrics
    if (memoryUsagePercent > this.performanceThresholds.memoryUsage) {
      this.logger.warn({
        message: 'High memory usage detected',
        event: 'performance_warning',
        ...performanceMetrics
      });
    } else {
      this.logger.log({
        message: 'Performance metrics collected',
        event: 'performance_metrics',
        ...performanceMetrics
      });
    }

    // Memory cleanup if needed
    if (memoryUsagePercent > 0.9) {
      this.logger.warn('Triggering garbage collection due to high memory usage');
      if (global.gc) {
        global.gc();
      }
    }
  }

  getPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = usedMemory / totalMemory;

    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        usagePercent: Math.round(memoryUsagePercent * 100),
        total: Math.round(totalMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024)
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      thresholds: this.performanceThresholds
    };
  }
}
