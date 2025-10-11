import { Injectable, Logger } from '@nestjs/common';
import { LocalDataStorageService } from './local-data-storage.service';
import { RealTimeIndexService } from './real-time-index.service';
import { SearchOptimizationService } from './search-optimization.service';
import { CacheWarmingService } from './cache-warming.service';

/**
 * Performance Monitoring Service
 * 
 * This service monitors and tracks performance metrics for local data operations,
 * index updates, and search optimization to ensure optimal system performance.
 */
@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly metrics = {
    indexUpdates: {
      total: 0,
      successful: 0,
      failed: 0,
      averageTime: 0,
      lastUpdate: null,
    },
    queries: {
      total: 0,
      averageTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    },
    storage: {
      totalAssets: 0,
      totalComposites: 0,
      storageSize: 0,
      lastSync: null,
    },
    performance: {
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastCheck: null,
    },
  };

  constructor(
    private readonly localDataStorage: LocalDataStorageService,
    private readonly realTimeIndex: RealTimeIndexService,
    private readonly searchOptimization: SearchOptimizationService,
    private readonly cacheWarming: CacheWarmingService,
  ) {}

  /**
   * Track index update performance
   */
  async trackIndexUpdate(operation: string, startTime: number, success: boolean): Promise<void> {
    try {
      const duration = Date.now() - startTime;
      
      this.metrics.indexUpdates.total++;
      if (success) {
        this.metrics.indexUpdates.successful++;
      } else {
        this.metrics.indexUpdates.failed++;
      }
      
      // Update average time
      const total = this.metrics.indexUpdates.total;
      this.metrics.indexUpdates.averageTime = 
        (this.metrics.indexUpdates.averageTime * (total - 1) + duration) / total;
      
      this.metrics.indexUpdates.lastUpdate = new Date();
      
      this.logger.debug(`📊 Index update tracked: ${operation} in ${duration}ms (success: ${success})`);
    } catch (error) {
      this.logger.error(`❌ Failed to track index update: ${error.message}`);
    }
  }

  /**
   * Track query performance
   */
  async trackQuery(queryType: string, startTime: number, cacheHit: boolean = false): Promise<void> {
    try {
      const duration = Date.now() - startTime;
      
      this.metrics.queries.total++;
      if (cacheHit) {
        this.metrics.queries.cacheHits++;
      } else {
        this.metrics.queries.cacheMisses++;
      }
      
      // Update average time
      const total = this.metrics.queries.total;
      this.metrics.queries.averageTime = 
        (this.metrics.queries.averageTime * (total - 1) + duration) / total;
      
      // Track slow queries (> 100ms)
      if (duration > 100) {
        this.metrics.queries.slowQueries++;
        this.logger.warn(`🐌 Slow query detected: ${queryType} took ${duration}ms`);
      }
      
      this.logger.debug(`📊 Query tracked: ${queryType} in ${duration}ms (cache: ${cacheHit ? 'hit' : 'miss'})`);
    } catch (error) {
      this.logger.error(`❌ Failed to track query: ${error.message}`);
    }
  }

  /**
   * Update storage metrics
   */
  async updateStorageMetrics(): Promise<void> {
    try {
      const stats = await this.localDataStorage.getStorageStats();
      
      this.metrics.storage.totalAssets = stats.assets;
      this.metrics.storage.totalComposites = stats.composites;
      this.metrics.storage.storageSize = stats.total;
      this.metrics.storage.lastSync = stats.lastUpdated;
      
      this.logger.debug(`📊 Storage metrics updated: ${stats.total} total items`);
    } catch (error) {
      this.logger.error(`❌ Failed to update storage metrics: ${error.message}`);
    }
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics(): Promise<void> {
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.performance.uptime = uptime;
      this.metrics.performance.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // MB
      this.metrics.performance.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // seconds
      this.metrics.performance.lastCheck = new Date();
      
      this.logger.debug(`📊 Performance metrics updated: ${this.metrics.performance.memoryUsage.toFixed(2)}MB memory`);
    } catch (error) {
      this.logger.error(`❌ Failed to update performance metrics: ${error.message}`);
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<any> {
    try {
      // Update all metrics
      await this.updateStorageMetrics();
      await this.updatePerformanceMetrics();
      
      const cacheStats = this.cacheWarming.getCacheStats();
      const indexStats = await this.realTimeIndex.getIndexStats();
      const searchStats = await this.searchOptimization.getSearchStats();
      
      return {
        timestamp: new Date(),
        indexUpdates: this.metrics.indexUpdates,
        queries: this.metrics.queries,
        storage: this.metrics.storage,
        performance: this.metrics.performance,
        cache: cacheStats,
        index: indexStats,
        search: searchStats,
        health: this.calculateHealthScore(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get performance report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get health score based on performance metrics
   */
  private calculateHealthScore(): number {
    try {
      let score = 100;
      
      // Deduct points for failed operations
      if (this.metrics.indexUpdates.total > 0) {
        const failureRate = this.metrics.indexUpdates.failed / this.metrics.indexUpdates.total;
        score -= failureRate * 50; // Up to 50 points for failures
      }
      
      // Deduct points for slow queries
      if (this.metrics.queries.total > 0) {
        const slowQueryRate = this.metrics.queries.slowQueries / this.metrics.queries.total;
        score -= slowQueryRate * 30; // Up to 30 points for slow queries
      }
      
      // Deduct points for high memory usage
      if (this.metrics.performance.memoryUsage > 500) { // 500MB
        score -= 20;
      }
      
      // Deduct points for low cache hit rate
      if (this.metrics.queries.total > 0) {
        const cacheHitRate = this.metrics.queries.cacheHits / this.metrics.queries.total;
        if (cacheHitRate < 0.8) { // Less than 80% cache hit rate
          score -= 20;
        }
      }
      
      return Math.max(0, Math.min(100, score));
    } catch (error) {
      this.logger.error(`❌ Failed to calculate health score: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts(): string[] {
    const alerts: string[] = [];
    
    // Check for high failure rate
    if (this.metrics.indexUpdates.total > 0) {
      const failureRate = this.metrics.indexUpdates.failed / this.metrics.indexUpdates.total;
      if (failureRate > 0.1) { // More than 10% failure rate
        alerts.push(`High index update failure rate: ${(failureRate * 100).toFixed(1)}%`);
      }
    }
    
    // Check for slow queries
    if (this.metrics.queries.total > 0) {
      const slowQueryRate = this.metrics.queries.slowQueries / this.metrics.queries.total;
      if (slowQueryRate > 0.2) { // More than 20% slow queries
        alerts.push(`High slow query rate: ${(slowQueryRate * 100).toFixed(1)}%`);
      }
    }
    
    // Check for high memory usage
    if (this.metrics.performance.memoryUsage > 1000) { // 1GB
      alerts.push(`High memory usage: ${this.metrics.performance.memoryUsage.toFixed(2)}MB`);
    }
    
    // Check for low cache hit rate
    if (this.metrics.queries.total > 0) {
      const cacheHitRate = this.metrics.queries.cacheHits / this.metrics.queries.total;
      if (cacheHitRate < 0.7) { // Less than 70% cache hit rate
        alerts.push(`Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
      }
    }
    
    return alerts;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.indexUpdates = {
      total: 0,
      successful: 0,
      failed: 0,
      averageTime: 0,
      lastUpdate: null,
    };
    
    this.metrics.queries = {
      total: 0,
      averageTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    
    this.logger.log(`📊 Metrics reset`);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): any {
    return {
      timestamp: new Date(),
      indexUpdates: {
        total: this.metrics.indexUpdates.total,
        successRate: this.metrics.indexUpdates.total > 0 
          ? (this.metrics.indexUpdates.successful / this.metrics.indexUpdates.total) * 100 
          : 0,
        averageTime: this.metrics.indexUpdates.averageTime,
      },
      queries: {
        total: this.metrics.queries.total,
        averageTime: this.metrics.queries.averageTime,
        cacheHitRate: this.metrics.queries.total > 0 
          ? (this.metrics.queries.cacheHits / this.metrics.queries.total) * 100 
          : 0,
        slowQueries: this.metrics.queries.slowQueries,
      },
      storage: this.metrics.storage,
      performance: this.metrics.performance,
      health: this.calculateHealthScore(),
      alerts: this.getPerformanceAlerts(),
    };
  }
}
