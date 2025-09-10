"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingModule = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("./cache.service");
const template_cache_strategy_1 = require("./strategies/template-cache.strategy");
const score_cache_strategy_1 = require("./strategies/score-cache.strategy");
const analytics_cache_strategy_1 = require("./strategies/analytics-cache.strategy");
const redis_config_1 = require("../../config/redis.config");
let CachingModule = class CachingModule {
};
exports.CachingModule = CachingModule;
exports.CachingModule = CachingModule = __decorate([
    (0, common_1.Module)({
        imports: [redis_config_1.RedisModule],
        providers: [
            cache_service_1.CacheService,
            template_cache_strategy_1.TemplateCacheStrategy,
            score_cache_strategy_1.ScoreCacheStrategy,
            analytics_cache_strategy_1.AnalyticsCacheStrategy,
        ],
        exports: [cache_service_1.CacheService],
    })
], CachingModule);
//# sourceMappingURL=caching.module.js.map