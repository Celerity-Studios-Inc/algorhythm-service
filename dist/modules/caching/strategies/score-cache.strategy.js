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
exports.ScoreCacheStrategy = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../cache.service");
const cache_keys_1 = require("../../../common/constants/cache-keys");
let ScoreCacheStrategy = class ScoreCacheStrategy {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    async getCompatibilityScore(songId, templateId) {
        const key = `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
        return await this.cacheService.get(key);
    }
    async setCompatibilityScore(songId, templateId, score) {
        const key = `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
        return await this.cacheService.set(key, score, cache_keys_1.CACHE_TTL.COMPATIBILITY_SCORES);
    }
    async getCompatibilityScores(songId, templateIds) {
        const keys = templateIds.map(templateId => `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`);
        return await this.cacheService.mget(keys);
    }
    async setCompatibilityScores(songId, scores) {
        const keyValuePairs = scores.map(({ templateId, score }) => ({
            key: `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`,
            value: score,
            ttl: cache_keys_1.CACHE_TTL.COMPATIBILITY_SCORES,
        }));
        return await this.cacheService.mset(keyValuePairs);
    }
    async invalidateScoresForSong(songId) {
        const pattern = `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:*`;
        return await this.cacheService.deletePattern(pattern);
    }
    async invalidateScoresForTemplate(templateId) {
        const pattern = `${cache_keys_1.CACHE_KEYS.COMPATIBILITY_SCORES}:*:${templateId}`;
        return await this.cacheService.deletePattern(pattern);
    }
};
exports.ScoreCacheStrategy = ScoreCacheStrategy;
exports.ScoreCacheStrategy = ScoreCacheStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], ScoreCacheStrategy);
//# sourceMappingURL=score-cache.strategy.js.map