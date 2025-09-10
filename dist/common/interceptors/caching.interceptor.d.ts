import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CacheService } from '../../modules/caching/cache.service';
export declare class CachingInterceptor implements NestInterceptor {
    private readonly cacheService;
    private readonly logger;
    constructor(cacheService: CacheService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private isCacheablePostEndpoint;
    private generateCacheKey;
    private cacheResponse;
}
