// ========================================
// src/modules/caching/caching.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { TemplateCacheStrategy } from './strategies/template-cache.strategy';
import { ScoreCacheStrategy } from './strategies/score-cache.strategy';
import { AnalyticsCacheStrategy } from './strategies/analytics-cache.strategy';
import { RedisModule } from '../../config/redis.config';

@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    TemplateCacheStrategy,
    ScoreCacheStrategy,
    AnalyticsCacheStrategy,
  ],
  exports: [CacheService],
})
export class CachingModule {}

// ========================================
// src/modules/caching/cache.service.ts
// ========================================
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.config';
import { CACHE_TTL } from '../../common/constants/cache-keys';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisClient.get(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }
      
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const effectiveTtl = ttl || CACHE_TTL.TEMPLATE_RECOMMENDATION;

      await this.redisClient.setex(key, effectiveTtl, serialized);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${effectiveTtl}s`);
      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.del(key);
      this.logger.debug(`Cache delete for key: ${key}, result: ${result}`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
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
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async mget(keys: string[]): Promise<(any | null)[]> {
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
}

// ========================================
// src/modules/caching/strategies/template-cache.strategy.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';
import { TemplateRecommendation } from '../../recommendations/interfaces/recommendation.interface';

@Injectable()
export class TemplateCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  async getRecommendation(songId: string, userContext: any): Promise<any | null> {
    const key = this.buildRecommendationKey(songId, userContext);
    return await this.cacheService.get(key);
  }

  async setRecommendation(
    songId: string,
    userContext: any,
    recommendation: any,
  ): Promise<boolean> {
    const key = this.buildRecommendationKey(songId, userContext);
    return await this.cacheService.set(
      key,
      recommendation,
      CACHE_TTL.TEMPLATE_RECOMMENDATION,
    );
  }

  async getPopularTemplates(songId: string): Promise<TemplateRecommendation[] | null> {
    const key = `${CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
    return await this.cacheService.get(key);
  }

  async setPopularTemplates(
    songId: string,
    templates: TemplateRecommendation[],
  ): Promise<boolean> {
    const key = `${CACHE_KEYS.POPULAR_TEMPLATES}:${songId}`;
    return await this.cacheService.set(
      key,
      templates,
      CACHE_TTL.POPULAR_TEMPLATES,
    );
  }

  async invalidateRecommendationsForSong(songId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:*`;
    return await this.cacheService.deletePattern(pattern);
  }

  private buildRecommendationKey(songId: string, userContext: any): string {
    // Create a stable hash of user context for caching
    const contextHash = this.hashUserContext(userContext);
    return `${CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${songId}:${contextHash}`;
  }

  private hashUserContext(userContext: any): string {
    // Simple hash of user context for cache key generation
    const relevant = {
      preferences: userContext.preferences || {},
      platform: userContext.device_info?.platform,
    };
    
    return Buffer.from(JSON.stringify(relevant)).toString('base64').substring(0, 16);
  }
}

// ========================================
// src/modules/caching/strategies/score-cache.strategy.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../common/constants/cache-keys';

@Injectable()
export class ScoreCacheStrategy {
  constructor(private readonly cacheService: CacheService) {}

  async getCompatibilityScore(songId: string, templateId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
    return await this.cacheService.get(key);
  }

  async setCompatibilityScore(
    songId: string,
    templateId: string,
    score: any,
  ): Promise<boolean> {
    const key = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`;
    return await this.cacheService.set(
      key,
      score,
      CACHE_TTL.COMPATIBILITY_SCORES,
    );
  }

  async getCompatibilityScores(
    songId: string,
    templateIds: string[],
  ): Promise<(any | null)[]> {
    const keys = templateIds.map(templateId => 
      `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`
    );
    
    return await this.cacheService.mget(keys);
  }

  async setCompatibilityScores(
    songId: string,
    scores: Array<{ templateId: string; score: any }>,
  ): Promise<boolean> {
    const keyValuePairs = scores.map(({ templateId, score }) => ({
      key: `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:${templateId}`,
      value: score,
      ttl: CACHE_TTL.COMPATIBILITY_SCORES,
    }));

    return await this.cacheService.mset(keyValuePairs);
  }

  async invalidateScoresForSong(songId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.COMPATIBILITY_SCORES}:${songId}:*`;
    return await this.cacheService.deletePattern(pattern);
  }

  async invalidateScoresForTemplate(templateId: string): Promise<number> {
    const pattern = `${CACHE_KEYS.COMPATIBILITY_SCORES}:*:${templateId}`;
    return await this.cacheService.deletePattern(pattern);
  }
}

// ========================================
// src/modules/nna-integration/nna-integration.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NnaRegistryService } from './nna-registry.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    }),
  ],
  providers: [NnaRegistryService],
  exports: [NnaRegistryService],
})
export class NnaIntegrationModule {}

// ========================================
// src/modules/nna-integration/nna-registry.service.ts
// ========================================
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

@Injectable()
export class NnaRegistryService {
  private readonly logger = new Logger(NnaRegistryService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('NNA_REGISTRY_BASE_URL');
    this.apiKey = this.configService.get<string>('NNA_REGISTRY_API_KEY');

    if (!this.baseUrl) {
      throw new Error('NNA_REGISTRY_BASE_URL is required');
    }

    this.logger.log(`NNA Registry integration configured for: ${this.baseUrl}`);
  }

  async getAssetByAddress(address: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/api/assets/address/${address}`;
      this.logger.debug(`Fetching asset by address: ${address}`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        })
      );

      if (response.data?.success && response.data?.data) {
        this.logger.debug(`Successfully retrieved asset: ${address}`);
        return response.data.data;
      } else {
        this.logger.warn(`Asset not found or invalid response for: ${address}`);
        return null;
      }
    } catch (error) {
      return this.handleHttpError(error, `getAssetByAddress(${address})`);
    }
  }

  async getAssetsByLayer(layer: string, limit: number = 1000): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/assets`;
      this.logger.debug(`Fetching assets for layer: ${layer}`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            layer,
            limit,
            sort: 'createdAt',
            order: 'desc',
          },
          timeout: 10000,
        })
      );

      if (response.data?.success && response.data?.data) {
        const assets = response.data.data;
        this.logger.debug(`Retrieved ${assets.length} assets for layer: ${layer}`);
        return assets;
      } else {
        this.logger.warn(`No assets found for layer: ${layer}`);
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, `getAssetsByLayer(${layer})`, []);
    }
  }

  async getCompositesBySong(songId: string, limit: number = 1000): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/assets`;
      this.logger.debug(`Fetching composites for song: ${songId}`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            layer: 'C', // Composites layer
            components: songId,
            limit,
            sort: 'createdAt',
            order: 'desc',
          },
          timeout: 15000, // Longer timeout for composite queries
        })
      );

      if (response.data?.success && response.data?.data) {
        const composites = response.data.data;
        this.logger.debug(`Retrieved ${composites.length} composites for song: ${songId}`);
        return composites;
      } else {
        this.logger.warn(`No composites found for song: ${songId}`);
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, `getCompositesBySong(${songId})`, []);
    }
  }

  async searchAssets(query: string, filters?: {
    layer?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/assets/search`;
      this.logger.debug(`Searching assets with query: ${query}`);

      const params: any = {
        q: query,
        limit: filters?.limit || 100,
      };

      if (filters?.layer) params.layer = filters.layer;
      if (filters?.category) params.category = filters.category;
      if (filters?.tags) params.tags = filters.tags.join(',');

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params,
          timeout: 10000,
        })
      );

      if (response.data?.success && response.data?.data) {
        const results = response.data.data;
        this.logger.debug(`Search returned ${results.length} assets for query: ${query}`);
        return results;
      } else {
        this.logger.warn(`No search results for query: ${query}`);
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, `searchAssets(${query})`, []);
    }
  }

  async getAssetMetadata(assetId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/api/assets/${assetId}/metadata`;
      this.logger.debug(`Fetching metadata for asset: ${assetId}`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        })
      );

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      } else {
        return null;
      }
    } catch (error) {
      return this.handleHttpError(error, `getAssetMetadata(${assetId})`, null);
    }
  }

  async batchGetAssets(addresses: string[]): Promise<any[]> {
    if (addresses.length === 0) return [];

    try {
      const url = `${this.baseUrl}/api/assets/batch`;
      this.logger.debug(`Batch fetching ${addresses.length} assets`);

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(url, {
          addresses,
        }, {
          headers: this.getHeaders(),
          timeout: 15000,
        })
      );

      if (response.data?.success && response.data?.data) {
        const assets = response.data.data;
        this.logger.debug(`Batch retrieved ${assets.length} assets`);
        return assets;
      } else {
        this.logger.warn(`Batch request failed or returned no data`);
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, `batchGetAssets(${addresses.length} items)`, []);
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    response_time_ms?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const url = `${this.baseUrl}/api/health`;
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          timeout: 5000,
        })
      );

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          status: 'healthy',
          response_time_ms: responseTime,
        };
      } else {
        return {
          status: 'unhealthy',
          response_time_ms: responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('NNA Registry health check failed:', errorMessage);
      
      return {
        status: 'unhealthy',
        response_time_ms: responseTime,
        error: errorMessage,
      };
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AlgoRhythm/1.0.0',
    };

    // Add API key if available
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Add JWT token if available in request context
    // This would typically be passed from the request context
    // For now, we'll handle this in the calling code

    return headers;
  }

  private handleHttpError(error: any, operation: string, fallbackValue?: any): any {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      this.logger.error(`NNA Registry ${operation} failed with status ${status}: ${message}`);
      
      if (status === 404 && fallbackValue !== undefined) {
        return fallbackValue; // Return fallback for 404 errors
      }

      throw new HttpException(
        `NNA Registry error: ${message}`,
        status >= 500 ? HttpStatus.INTERNAL_SERVER_ERROR : status
      );
    } else if (error.request) {
      // Network error
      this.logger.error(`NNA Registry ${operation} network error:`, error.message);
      throw new HttpException(
        'NNA Registry service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    } else {
      // Other error
      this.logger.error(`NNA Registry ${operation} error:`, error.message);
      throw new HttpException(
        'NNA Registry integration error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Utility methods for address conversion
  convertHfnToMfa(hfn: string): string {
    // Convert Human-Friendly Name to Machine-Friendly Address
    // This would implement the conversion logic based on NNA Registry patterns
    // For now, return as-is since the conversion logic would be complex
    return hfn;
  }

  convertMfaToHfn(mfa: string): string {
    // Convert Machine-Friendly Address to Human-Friendly Name
    // This would implement the reverse conversion logic
    return mfa;
  }
}

// ========================================
// src/modules/nna-integration/dto/asset.dto.ts
// ========================================
import { ApiProperty } from '@nestjs/swagger';

export class AssetDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  layer: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  subcategory: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  nna_address: string;

  @ApiProperty()
  gcpStorageUrl: string;

  @ApiProperty()
  source: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  songMetadata?: {
    songName?: string;
    artistName?: string;
    albumName?: string;
    bpm?: number;
    genre?: string;
    remixedBy?: string;
    originalSongId?: string;
  };

  @ApiProperty({ type: [String], required: false })
  components?: string[];

  @ApiProperty()
  registeredBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ========================================
// src/modules/nna-integration/dto/composite.dto.ts
// ========================================
export class CompositeDto extends AssetDto {
  @ApiProperty({ type: [String] })
  components: string[];

  @ApiProperty()
  songMetadata: {
    songName: string;
    artistName: string;
    albumName?: string;
    bpm?: number;
    genre?: string;
    remixedBy: string;
    originalSongId: string;
  };
}

// ========================================
// src/modules/nna-integration/interfaces/nna-asset.interface.ts
// ========================================
export interface NnaAsset {
  _id: string;
  layer: string;
  category: string;
  subcategory: string;
  name: string;
  nna_address: string;
  gcpStorageUrl: string;
  source: string;
  tags: string[];
  description: string;
  components?: string[];
  songMetadata?: {
    songName?: string;
    artistName?: string;
    albumName?: string;
    bpm?: number;
    genre?: string;
    remixedBy?: string;
    originalSongId?: string;
  };
  registeredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NnaComposite extends NnaAsset {
  components: string[];
  songMetadata: {
    songName: string;
    artistName: string;
    albumName?: string;
    bpm?: number;
    genre?: string;
    remixedBy: string;
    originalSongId: string;
  };
}

export interface NnaSearchResult {
  assets: NnaAsset[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface NnaHealthStatus {
  status: 'healthy' | 'unhealthy';
  response_time_ms?: number;
  error?: string;
}