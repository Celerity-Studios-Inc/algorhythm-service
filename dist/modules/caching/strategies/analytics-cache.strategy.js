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
exports.AnalyticsCacheStrategy = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../cache.service");
const cache_keys_1 = require("../../../common/constants/cache-keys");
let AnalyticsCacheStrategy = class AnalyticsCacheStrategy {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    async getRecentEvents() {
        const key = `${cache_keys_1.CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
        return await this.cacheService.get(key);
    }
    async setRecentEvents(events) {
        const key = `${cache_keys_1.CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
        return await this.cacheService.set(key, events, cache_keys_1.CACHE_TTL.ANALYTICS_EVENTS);
    }
    async addRecentEvent(event) {
        const key = `${cache_keys_1.CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
        const existingEvents = await this.cacheService.get(key) || [];
        existingEvents.unshift(event);
        if (existingEvents.length > 100) {
            existingEvents.splice(100);
        }
        return await this.cacheService.set(key, existingEvents, cache_keys_1.CACHE_TTL.ANALYTICS_EVENTS);
    }
    async getUserPreferences(userId) {
        const key = `${cache_keys_1.CACHE_KEYS.USER_PREFERENCES}:${userId}`;
        return await this.cacheService.get(key);
    }
    async setUserPreferences(userId, preferences) {
        const key = `${cache_keys_1.CACHE_KEYS.USER_PREFERENCES}:${userId}`;
        return await this.cacheService.set(key, preferences, cache_keys_1.CACHE_TTL.USER_PREFERENCES);
    }
    async invalidateUserPreferences(userId) {
        const key = `${cache_keys_1.CACHE_KEYS.USER_PREFERENCES}:${userId}`;
        return await this.cacheService.delete(key);
    }
};
exports.AnalyticsCacheStrategy = AnalyticsCacheStrategy;
exports.AnalyticsCacheStrategy = AnalyticsCacheStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService])
], AnalyticsCacheStrategy);
//# sourceMappingURL=analytics-cache.strategy.js.map