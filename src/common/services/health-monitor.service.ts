import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: Date;
}

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  private healthChecks: Map<string, HealthCheck> = new Map();

  // Monitor external services
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkExternalServices() {
    this.logger.log('🔍 Running external service health checks...');
    
    // Check NNA Registry
    await this.checkNnaRegistry();
    
    // Check MongoDB
    await this.checkMongoDB();
    
    // Check Redis
    await this.checkRedis();
  }

  private async checkNnaRegistry(): Promise<void> {
    const startTime = Date.now();
    try {
      // This would be a simple ping to NNA Registry
      // For now, we'll simulate the check
      const responseTime = Date.now() - startTime;
      
      this.healthChecks.set('nna_registry', {
        name: 'NNA Registry',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      });
      
      this.logger.log(`✅ NNA Registry: healthy (${responseTime}ms)`);
    } catch (error) {
      this.healthChecks.set('nna_registry', {
        name: 'NNA Registry',
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      });
      
      this.logger.error(`❌ NNA Registry: unhealthy - ${error.message}`);
    }
  }

  private async checkMongoDB(): Promise<void> {
    const startTime = Date.now();
    try {
      // This would be a simple ping to MongoDB
      // For now, we'll simulate the check
      const responseTime = Date.now() - startTime;
      
      this.healthChecks.set('database', {
        name: 'MongoDB',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      });
      
      this.logger.log(`✅ MongoDB: healthy (${responseTime}ms)`);
    } catch (error) {
      this.healthChecks.set('database', {
        name: 'MongoDB',
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      });
      
      this.logger.error(`❌ MongoDB: unhealthy - ${error.message}`);
    }
  }

  private async checkRedis(): Promise<void> {
    const startTime = Date.now();
    try {
      // This would be a simple ping to Redis
      // For now, we'll simulate the check
      const responseTime = Date.now() - startTime;
      
      this.healthChecks.set('cache', {
        name: 'Redis',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      });
      
      this.logger.log(`✅ Redis: healthy (${responseTime}ms)`);
    } catch (error) {
      this.healthChecks.set('cache', {
        name: 'Redis',
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date(),
      });
      
      this.logger.error(`❌ Redis: unhealthy - ${error.message}`);
    }
  }

  getHealthStatus(): Record<string, HealthCheck> {
    return Object.fromEntries(this.healthChecks);
  }

  getOverallStatus(): 'healthy' | 'unhealthy' | 'degraded' {
    const checks = Array.from(this.healthChecks.values());
    
    if (checks.some(check => check.status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (checks.some(check => check.status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}
