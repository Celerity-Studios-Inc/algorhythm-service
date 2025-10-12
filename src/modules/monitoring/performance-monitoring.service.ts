import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class ApiPerformanceMonitoringService {
  private readonly logger = new Logger(ApiPerformanceMonitoringService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 🚀 Track query performance and alert on slow queries
   */
  async trackQueryPerformance(
    queryType: string,
    duration: number,
    metadata?: any,
  ): Promise<void> {
    const performanceData = {
      query_type: queryType,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    // Log slow queries
    if (duration > 5000) { // 5 seconds
      this.logger.warn(`🐌 SLOW QUERY: ${queryType} took ${duration}ms`, performanceData);
    } else if (duration > 2000) { // 2 seconds
      this.logger.debug(`⚠️  MODERATE QUERY: ${queryType} took ${duration}ms`, performanceData);
    } else {
      this.logger.debug(`✅ FAST QUERY: ${queryType} took ${duration}ms`, performanceData);
    }

    // Store performance metrics
    await this.storePerformanceMetrics(performanceData);
  }

  /**
   * 🚀 Track API endpoint performance
   */
  async trackEndpointPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    metadata?: any,
  ): Promise<void> {
    const performanceData = {
      endpoint,
      method,
      duration_ms: duration,
      status_code: statusCode,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    // Alert on slow endpoints
    if (duration > 10000) { // 10 seconds
      this.logger.error(`🚨 CRITICAL SLOW ENDPOINT: ${method} ${endpoint} took ${duration}ms`);
    } else if (duration > 5000) { // 5 seconds
      this.logger.warn(`🐌 SLOW ENDPOINT: ${method} ${endpoint} took ${duration}ms`);
    }

    // Store endpoint metrics
    await this.storeEndpointMetrics(performanceData);
  }

  /**
   * 🚀 Track cache performance
   */
  async trackCachePerformance(
    cacheKey: string,
    hit: boolean,
    duration: number,
    metadata?: any,
  ): Promise<void> {
    const performanceData = {
      cache_key: cacheKey,
      cache_hit: hit,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    };

    if (hit) {
      this.logger.debug(`✅ CACHE HIT: ${cacheKey} in ${duration}ms`);
    } else {
      this.logger.debug(`❌ CACHE MISS: ${cacheKey} in ${duration}ms`);
    }

    // Store cache metrics
    await this.storeCacheMetrics(performanceData);
  }

  /**
   * 🚀 Get performance summary
   */
  async getPerformanceSummary(): Promise<any> {
    const cacheKey = `${CACHE_KEYS.PERFORMANCE_METRICS}:summary`;
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Generate performance summary
    const summary = await this.generatePerformanceSummary();
    
    // Cache the summary for 5 minutes
    await this.cacheService.set(cacheKey, summary, 300);
    
    return summary;
  }

  /**
   * 🚀 Get slow query alerts
   */
  async getSlowQueryAlerts(): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.PERFORMANCE_METRICS}:slow_queries`;
    return await this.cacheService.get(cacheKey) || [];
  }

  private async storePerformanceMetrics(data: any): Promise<void> {
    const cacheKey = `${CACHE_KEYS.PERFORMANCE_METRICS}:queries:${Date.now()}`;
    await this.cacheService.set(cacheKey, data, CACHE_TTL.PERFORMANCE_METRICS);
  }

  private async storeEndpointMetrics(data: any): Promise<void> {
    const cacheKey = `${CACHE_KEYS.PERFORMANCE_METRICS}:endpoints:${Date.now()}`;
    await this.cacheService.set(cacheKey, data, CACHE_TTL.PERFORMANCE_METRICS);
  }

  private async storeCacheMetrics(data: any): Promise<void> {
    const cacheKey = `${CACHE_KEYS.PERFORMANCE_METRICS}:cache:${Date.now()}`;
    await this.cacheService.set(cacheKey, data, CACHE_TTL.PERFORMANCE_METRICS);
  }

  private async generatePerformanceSummary(): Promise<any> {
    // This would typically query the performance metrics from cache
    // For now, return a mock summary
    return {
      total_queries: 0,
      average_response_time_ms: 0,
      slow_queries_count: 0,
      cache_hit_rate: 0,
      error_rate: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
