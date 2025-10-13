"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = exports.REDIS_CLIENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
exports.REDIS_CLIENT = 'REDIS_CLIENT';
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.REDIS_CLIENT,
                useFactory: (configService) => {
                    const redisEnabled = configService.get('REDIS_ENABLED');
                    if (redisEnabled === 'false') {
                        console.log('🔴 Redis is disabled via REDIS_ENABLED=false');
                        return null;
                    }
                    const redisUrl = configService.get('REDIS_URL');
                    if (!redisUrl) {
                        console.log('🔴 REDIS_URL environment variable is not set!');
                        console.log('🔴 Redis will be disabled - service will use in-memory cache');
                        console.log('🔴 Service will start without Redis (graceful degradation)');
                        return null;
                    }
                    console.log('🔴 Redis URL:', redisUrl.includes('localhost') ? 'fallback-local' : 'cloud-redis');
                    console.log('🔴 Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
                    try {
                        const redis = new ioredis_1.default(redisUrl, {
                            maxRetriesPerRequest: 3,
                            keyPrefix: 'algorhythm:',
                            lazyConnect: true,
                            connectTimeout: 5000,
                            commandTimeout: 3000,
                        });
                        redis.on('connect', () => {
                            console.log('✅ Redis connected successfully');
                        });
                        redis.on('error', (error) => {
                            console.warn('⚠️ Redis connection error (non-blocking):', error.message);
                            console.warn('⚠️ Service will continue without Redis caching');
                        });
                        redis.on('ready', () => {
                            console.log('✅ Redis is ready for commands');
                        });
                        redis.on('close', () => {
                            console.log('⚠️ Redis connection closed');
                        });
                        return redis;
                    }
                    catch (error) {
                        console.warn('⚠️ Redis initialization failed (non-blocking):', error.message);
                        console.warn('⚠️ Service will continue without Redis caching');
                        return null;
                    }
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [exports.REDIS_CLIENT],
    })
], RedisModule);
//# sourceMappingURL=redis.config.js.map