import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class NnaRegistryService {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKey;
    constructor(httpService: HttpService, configService: ConfigService);
    getAssetByAddress(address: string): Promise<any>;
    getAssetsByLayer(layer: string, limit?: number): Promise<any[]>;
    getCompositesBySong(songId: string, limit?: number): Promise<any[]>;
    getFullCompositesBySong(songId: string, limit?: number): Promise<any[]>;
    searchAssets(query: string, filters?: {
        layer?: string;
        category?: string;
        tags?: string[];
        limit?: number;
    }): Promise<any[]>;
    getAssetMetadata(assetId: string): Promise<any>;
    batchGetAssets(addresses: string[]): Promise<any[]>;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        response_time_ms?: number;
        error?: string;
    }>;
    private getHeaders;
    private handleHttpError;
    isHfnFormat(id: string): boolean;
    isMfaFormat(id: string): boolean;
    convertHfnToMfa(hfn: string): Promise<string>;
    getAllSongs(): Promise<any[]>;
    getAllTemplates(): Promise<any[]>;
}
