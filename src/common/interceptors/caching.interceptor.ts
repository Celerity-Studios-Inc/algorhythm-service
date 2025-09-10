import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CacheService } from '../../modules/caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../constants/cache-keys';

@Injectable()
export class CachingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CachingInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body } = request;

    // Only cache GET requests and specific POST endpoints
    const shouldCache = method === 'GET' || this.isCacheablePostEndpoint(url);
    
    if (!shouldCache) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(url, method, body);
    
    // Add cache status to response headers
    return next.handle().pipe(
      tap((responseData) => {
        if (responseData && responseData.success) {
          // Set cache headers
          response.setHeader('X-Cache-Status', 'MISS');
          response.setHeader('X-Cache-Key', cacheKey);

          // Cache successful responses
          this.cacheResponse(cacheKey, responseData, url);
        }
      })
    );
  }

  private isCacheablePostEndpoint(url: string): boolean {
    const cacheableEndpoints = [
      '/api/v1/recommend/template',
      '/api/v1/recommend/variations',
    ];
    
    return cacheableEndpoints.some(endpoint => url.includes(endpoint));
  }

  private generateCacheKey(url: string, method: string, body?: any): string {
    const baseKey = `${method}:${url}`;
    
    if (body && Object.keys(body).length > 0) {
      const bodyHash = Buffer.from(JSON.stringify(body)).toString('base64').substring(0, 16);
      return `${baseKey}:${bodyHash}`;
    }
    
    return baseKey;
  }

  private async cacheResponse(key: string, response: any, url: string): Promise<void> {
    try {
      let ttl = CACHE_TTL.TEMPLATE_RECOMMENDATION;
      
      if (url.includes('/recommend/template')) {
        ttl = CACHE_TTL.TEMPLATE_RECOMMENDATION;
      } else if (url.includes('/recommend/variations')) {
        ttl = CACHE_TTL.LAYER_VARIATIONS;
      }

      await this.cacheService.set(key, response, ttl);
      this.logger.debug(`Cached response for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to cache response for key ${key}:`, error);
    }
  }
}
