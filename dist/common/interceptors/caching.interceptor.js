"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CachingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const cache_service_1 = require("../../modules/caching/cache.service");
const cache_keys_1 = require("../constants/cache-keys");
let CachingInterceptor = CachingInterceptor_1 = class CachingInterceptor {
    constructor(cacheService) {
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(CachingInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const { method, url, body } = request;
        const shouldCache = method === 'GET' || this.isCacheablePostEndpoint(url);
        if (!shouldCache) {
            return next.handle();
        }
        const cacheKey = this.generateCacheKey(url, method, body);
        return next.handle().pipe((0, rxjs_1.tap)((responseData) => {
            if (responseData && responseData.success) {
                response.setHeader('X-Cache-Status', 'MISS');
                response.setHeader('X-Cache-Key', cacheKey);
                this.cacheResponse(cacheKey, responseData, url);
            }
        }));
    }
    isCacheablePostEndpoint(url) {
        const cacheableEndpoints = [
            '/api/v1/recommend/template',
            '/api/v1/recommend/variations',
        ];
        return cacheableEndpoints.some(endpoint => url.includes(endpoint));
    }
    generateCacheKey(url, method, body) {
        const baseKey = `${method}:${url}`;
        if (body && Object.keys(body).length > 0) {
            const bodyHash = Buffer.from(JSON.stringify(body)).toString('base64').substring(0, 16);
            return `${baseKey}:${bodyHash}`;
        }
        return baseKey;
    }
    async cacheResponse(key, response, url) {
        try {
            let ttl = cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION;
            if (url.includes('/recommend/template')) {
                ttl = cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION;
            }
            else if (url.includes('/recommend/variations')) {
                ttl = cache_keys_1.CACHE_TTL.LAYER_VARIATIONS;
            }
            await this.cacheService.set(key, response, ttl);
            this.logger.debug(`Cached response for key: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to cache response for key ${key}:`, error);
        }
    }
};
exports.CachingInterceptor = CachingInterceptor;
exports.CachingInterceptor = CachingInterceptor = CachingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], CachingInterceptor);
//# sourceMappingURL=caching.interceptor.js.map