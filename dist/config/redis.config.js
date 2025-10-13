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
                    const redisUrl = configService.get('REDIS_URL');
                    if (!redisUrl) {
                        console.error('❌ REDIS_URL environment variable is not set!');
                        console.error('❌ Please ensure REDIS_URL is loaded from Secret Manager');
                        if (process.env.NODE_ENV === 'development' && process.env.ALLOW_LOCALHOST_REDIS === 'true') {
                            console.warn('⚠️ Using localhost Redis fallback for development');
                            const fallbackUrl = 'redis://localhost:6379';
                            console.log('🔴 Redis URL (fallback):', fallbackUrl);
                            return new ioredis_1.default(fallbackUrl, {
                                maxRetriesPerRequest: 3,
                                keyPrefix: 'algorhythm:',
                                lazyConnect: true,
                            });
                        }
                        throw new Error('REDIS_URL environment variable is required');
                    }
                    console.log('🔴 Redis URL:', redisUrl.includes('localhost') ? 'fallback-local' : 'cloud-redis');
                    console.log('🔴 Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
                    const redis = new ioredis_1.default(redisUrl, {
                        maxRetriesPerRequest: 3,
                        keyPrefix: 'algorhythm:',
                        lazyConnect: true,
                    });
                    redis.on('connect', () => {
                        console.log('✅ Redis connected successfully');
                    });
                    redis.on('error', (error) => {
                        console.error('❌ Redis connection error:', error);
                        console.error('❌ Redis URL (masked):', redisUrl.replace(/:[^@]*@/, ':***@'));
                    });
                    redis.on('ready', () => {
                        console.log('✅ Redis is ready for commands');
                    });
                    redis.on('close', () => {
                        console.log('⚠️ Redis connection closed');
                    });
                    return redis;
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [exports.REDIS_CLIENT],
    })
], RedisModule);
//# sourceMappingURL=redis.config.js.map