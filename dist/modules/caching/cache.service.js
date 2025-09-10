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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const redis_config_1 = require("../../config/redis.config");
const cache_keys_1 = require("../../common/constants/cache-keys");
let CacheService = CacheService_1 = class CacheService {
    constructor(redisClient) {
        this.redisClient = redisClient;
        this.logger = new common_1.Logger(CacheService_1.name);
    }
    async get(key) {
        try {
            const cached = await this.redisClient.get(key);
            if (cached) {
                this.logger.debug(`Cache hit for key: ${key}`);
                return JSON.parse(cached);
            }
            this.logger.debug(`Cache miss for key: ${key}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const serialized = JSON.stringify(value);
            const effectiveTtl = ttl || cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION;
            await this.redisClient.setex(key, effectiveTtl, serialized);
            this.logger.debug(`Cache set for key: ${key}, TTL: ${effectiveTtl}s`);
            return true;
        }
        catch (error) {
            this.logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }
    async delete(key) {
        try {
            const result = await this.redisClient.del(key);
            this.logger.debug(`Cache delete for key: ${key}, result: ${result}`);
            return result > 0;
        }
        catch (error) {
            this.logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }
    async deletePattern(pattern) {
        try {
            const keys = await this.redisClient.keys(pattern);
            if (keys.length === 0)
                return 0;
            const result = await this.redisClient.del(...keys);
            this.logger.debug(`Cache delete pattern ${pattern}: ${result} keys deleted`);
            return result;
        }
        catch (error) {
            this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
            return 0;
        }
    }
    async exists(key) {
        try {
            const result = await this.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            this.logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async mget(keys) {
        try {
            if (keys.length === 0)
                return [];
            const results = await this.redisClient.mget(...keys);
            return results.map(result => result ? JSON.parse(result) : null);
        }
        catch (error) {
            this.logger.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
            return keys.map(() => null);
        }
    }
    async mset(keyValuePairs) {
        try {
            if (keyValuePairs.length === 0)
                return true;
            const pipeline = this.redisClient.pipeline();
            for (const { key, value, ttl } of keyValuePairs) {
                const serialized = JSON.stringify(value);
                const effectiveTtl = ttl || cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION;
                pipeline.setex(key, effectiveTtl, serialized);
            }
            await pipeline.exec();
            this.logger.debug(`Cache mset completed for ${keyValuePairs.length} keys`);
            return true;
        }
        catch (error) {
            this.logger.error(`Cache mset error:`, error);
            return false;
        }
    }
    async increment(key, delta = 1, ttl) {
        try {
            const pipeline = this.redisClient.pipeline();
            pipeline.incrby(key, delta);
            if (ttl) {
                pipeline.expire(key, ttl);
            }
            const results = await pipeline.exec();
            const newValue = results?.[0]?.[1];
            this.logger.debug(`Cache increment for key ${key}: ${newValue}`);
            return newValue || 0;
        }
        catch (error) {
            this.logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    async getStats() {
        try {
            const info = await this.redisClient.info('memory');
            const keyspace = await this.redisClient.info('keyspace');
            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';
            return {
                connected: true,
                memory_usage: memoryUsage,
                keyspace: this.parseKeyspaceInfo(keyspace),
            };
        }
        catch (error) {
            this.logger.error('Cache stats error:', error);
            return {
                connected: false,
                memory_usage: 'Unknown',
                keyspace: {},
            };
        }
    }
    parseKeyspaceInfo(keyspaceInfo) {
        const lines = keyspaceInfo.split('\n');
        const result = {};
        for (const line of lines) {
            if (line.startsWith('db')) {
                const match = line.match(/db(\d+):keys=(\d+),expires=(\d+),avg_ttl=(\d+)/);
                if (match) {
                    result[`db${match[1]}`] = {
                        keys: parseInt(match[2]),
                        expires: parseInt(match[3]),
                        avg_ttl: parseInt(match[4]),
                    };
                }
            }
        }
        return result;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_config_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.Redis])
], CacheService);
//# sourceMappingURL=cache.service.js.map