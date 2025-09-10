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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCacheStrategy = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../cache.service");
const cache_keys_1 = require("../../../common/constants/cache-keys");
let TemplateCacheStrategy = class TemplateCacheStrategy {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    async getRecommendation(songId, userContext) {
        const key = this.buildRecommendationKey(songId, userContext);
        return await this.cacheService.get(key);
    }
    async setRecommendation(songId, userContext, recommendation) {
        const key = this.buildRecommendationKey(songId, userContext);
        return await this.cacheService.set(key, recommendation, cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION);
    }
    async getPopularTemplates(songId) {
        const key = `${cache_keys_1.CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
        return await this.cacheService.get(key);
    }
    async setPopularTemplates(songId, templates) {
        const key = `${cache_keys_1.CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
        return await this.cacheService.set(key, templates, cache_keys_1.CACHE_TTL.POPULAR_TEMPLATES);
    }
    async invalidateRecommendationsForSong(songId) {
        const pattern = `${cache_keys_1.CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:*`;
        return await this.cacheService.deletePattern(pattern);
    }
    buildRecommendationKey(songId, userContext) {
        const contextHash = this.hashUserContext(userContext);
        return `${cache_keys_1.CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:${contextHash}`;
    }
    hashUserContext(userContext) {
        const relevant = {
            preferences: userContext.preferences || {},
            platform: userContext.device_info?.platform,
        };
        return Buffer.from(JSON.stringify(relevant)).toString('base64').substring(0, 16);
    }
};
exports.TemplateCacheStrategy = TemplateCacheStrategy;
exports.TemplateCacheStrategy = TemplateCacheStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], TemplateCacheStrategy);
//# sourceMappingURL=template-cache.strategy.js.map