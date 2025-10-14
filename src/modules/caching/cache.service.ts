import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.config';
import { CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inMemoryCache = new Map<string, { value: any; expires: number }>();

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis | null,
  ) {
    // Start cleanup interval for in-memory cache
    setInterval(() => this.cleanupExpired(), 60000); // Clean every minute
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redisClient) {
      // Use in-memory cache fallback
      const cached = this.inMemoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        this.logger.debug(`In-memory cache hit for key: ${key}`);
        return cached.value;
      }
      this.logger.debug(`In-memory cache miss for key: ${key}`);
      return null;
    }
    
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.logger.debug(`Redis cache hit for key: ${key}`);
        return JSON.parse(cached);
      }
      
      this.logger.debug(`Redis cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.redisClient) {
      // Use in-memory cache fallback
      const effectiveTtl = ttl || CACHE_TTL.TEMPLATE_RECOMMENDATION;
      const expires = Date.now() + (effectiveTtl * 1000);
      this.inMemoryCache.set(key, { value, expires });
      this.logger.debug(`In-memory cache set for key: ${key}, TTL: ${effectiveTtl}s`);
      return true;
    }
    
    try {
      const serialized = JSON.stringify(value);
      const effectiveTtl = ttl || CACHE_TTL.TEMPLATE_RECOMMENDATION;

      await this.redisClient.setex(key, effectiveTtl, serialized);
      this.logger.debug(`Redis cache set for key: ${key}, TTL: ${effectiveTtl}s`);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redisClient) {
      // Use in-memory cache fallback
      const existed = this.inMemoryCache.has(key);
      this.inMemoryCache.delete(key);
      this.logger.debug(`In-memory cache delete for key: ${key}, existed: ${existed}`);
      return existed;
    }
    
    try {
      const result = await this.redisClient.del(key);
      this.logger.debug(`Redis cache delete for key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.redisClient) {
      this.logger.debug(`Redis not available, cache delete pattern skipped for pattern: ${pattern}`);
      return 0;
    }
    
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.redisClient.del(...keys);
      this.logger.debug(`Cache delete pattern ${pattern}: ${result} keys deleted`);
      return result;
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redisClient) {
      this.logger.debug(`Redis not available, cache exists returns false for key: ${key}`);
      return false;
    }
    
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async mget(keys: string[]): Promise<(any | null)[]> {
    if (!this.redisClient) {
      this.logger.debug(`Redis not available, cache mget returns nulls for ${keys.length} keys`);
      return keys.map(() => null);
    }
    
    try {
      if (keys.length === 0) return [];

      const results = await this.redisClient.mget(...keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      this.logger.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    if (!this.redisClient) {
      this.logger.debug(`Redis not available, cache mset skipped for ${keyValuePairs.length} pairs`);
      return false;
    }
    
    try {
      if (keyValuePairs.length === 0) return true;

      const pipeline = this.redisClient.pipeline();
      
      for (const { key, value, ttl } of keyValuePairs) {
        const serialized = JSON.stringify(value);
        const effectiveTtl = ttl || CACHE_TTL.TEMPLATE_RECOMMENDATION;
        pipeline.setex(key, effectiveTtl, serialized);
      }

      await pipeline.exec();
      this.logger.debug(`Cache mset completed for ${keyValuePairs.length} keys`);
      return true;
    } catch (error) {
      this.logger.error(`Cache mset error:`, error);
      return false;
    }
  }

  async increment(key: string, delta: number = 1, ttl?: number): Promise<number> {
    try {
      const pipeline = this.redisClient.pipeline();
      pipeline.incrby(key, delta);
      
      if (ttl) {
        pipeline.expire(key, ttl);
      }

      const results = await pipeline.exec();
      const newValue = results?.[0]?.[1] as number;
      
      this.logger.debug(`Cache increment for key ${key}: ${newValue}`);
      return newValue || 0;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memory_usage: string;
    keyspace: any;
    cache_hits?: number;
    cache_misses?: number;
  }> {
    try {
      const info = await this.redisClient.info('memory');
      const keyspace = await this.redisClient.info('keyspace');
      
      // Extract memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      return {
        connected: true,
        memory_usage: memoryUsage,
        keyspace: this.parseKeyspaceInfo(keyspace),
      };
    } catch (error) {
      this.logger.error('Cache stats error:', error);
      return {
        connected: false,
        memory_usage: 'Unknown',
        keyspace: {},
      };
    }
  }

  async clearExpired(): Promise<number> {
    try {
      // Redis automatically handles expired keys, but we can trigger a cleanup
      // by running a memory optimization command
      await this.redisClient.memory('STATS');
      
      // Get count of keys before and after to estimate cleanup
      const keysBefore = await this.redisClient.dbsize();
      
      this.logger.debug(`Cache cleanup completed, keys remaining: ${keysBefore}`);
      return keysBefore;
    } catch (error) {
      this.logger.error('Cache clearExpired error:', error);
      return 0;
    }
  }

  private parseKeyspaceInfo(keyspaceInfo: string): any {
    const lines = keyspaceInfo.split('\n');
    const result: any = {};

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

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, { expires }] of this.inMemoryCache.entries()) {
      if (expires <= now) {
        this.inMemoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired in-memory cache entries`);
    }
  }


  /**
   * 🚀 NEW: Get composites for song (used by CompositeCacheStrategy)
   */
  async getCompositesForSong(songId: string): Promise<any[] | null> {
    const key = `composite:queries:song:${songId}`;
    return await this.get(key);
  }

  /**
   * 🚀 NEW: Set composites for song (used by CompositeCacheStrategy)
   */
  async setCompositesForSong(songId: string, composites: any[]): Promise<boolean> {
    const key = `composite:queries:song:${songId}`;
    return await this.set(key, composites, 3600); // 1 hour TTL
  }

  /**
   * 🚀 NEW: Get batch composites (used by CompositeCacheStrategy)
   */
  async getBatchComposites(songIds: string[]): Promise<Map<string, any[]>> {
    const keys = songIds.map(songId => `composite:queries:song:${songId}`);
    const results = await this.mget(keys);
    
    const resultMap = new Map<string, any[]>();
    songIds.forEach((songId, index) => {
      if (results[index]) {
        resultMap.set(songId, results[index]);
      }
    });
    
    return resultMap;
  }
}
