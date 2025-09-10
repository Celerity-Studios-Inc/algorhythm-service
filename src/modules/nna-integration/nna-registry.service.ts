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

  async getAllSongs(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/assets`;
      this.logger.debug('Fetching all songs');

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            layer: 'G', // Songs layer
            limit: 10000,
            sort: 'createdAt',
            order: 'desc',
          },
          timeout: 30000,
        })
      );

      if (response.data?.success && response.data?.data) {
        const songs = response.data.data;
        this.logger.debug(`Retrieved ${songs.length} songs`);
        return songs;
      } else {
        this.logger.warn('No songs found');
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, 'getAllSongs', []);
    }
  }

  async getAllTemplates(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/assets`;
      this.logger.debug('Fetching all templates');

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
          params: {
            layer: 'C', // Composites/Templates layer
            limit: 10000,
            sort: 'createdAt',
            order: 'desc',
          },
          timeout: 30000,
        })
      );

      if (response.data?.success && response.data?.data) {
        const templates = response.data.data;
        this.logger.debug(`Retrieved ${templates.length} templates`);
        return templates;
      } else {
        this.logger.warn('No templates found');
        return [];
      }
    } catch (error) {
      return this.handleHttpError(error, 'getAllTemplates', []);
    }
  }
}
