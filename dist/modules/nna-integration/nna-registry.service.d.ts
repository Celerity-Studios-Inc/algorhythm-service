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
    convertHfnToMfa(hfn: string): string;
    convertMfaToHfn(mfa: string): string;
}
