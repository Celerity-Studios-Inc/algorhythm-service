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
var NnaRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NnaRegistryService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let NnaRegistryService = NnaRegistryService_1 = class NnaRegistryService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(NnaRegistryService_1.name);
        this.baseUrl = this.configService.get('NNA_REGISTRY_BASE_URL');
        this.apiKey = this.configService.get('NNA_REGISTRY_API_KEY');
        if (!this.baseUrl) {
            throw new Error('NNA_REGISTRY_BASE_URL is required');
        }
        this.logger.log(`NNA Registry integration configured for: ${this.baseUrl}`);
    }
    async getAssetByAddress(address) {
        try {
            const url = `${this.baseUrl}/api/assets/address/${address}`;
            this.logger.debug(`Fetching asset by address: ${address}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 5000,
            }));
            if (response.data?.success && response.data?.data) {
                this.logger.debug(`Successfully retrieved asset: ${address}`);
                return response.data.data;
            }
            else {
                this.logger.warn(`Asset not found or invalid response for: ${address}`);
                return null;
            }
        }
        catch (error) {
            return this.handleHttpError(error, `getAssetByAddress(${address})`);
        }
    }
    async getAssetsByLayer(layer, limit = 1000) {
        try {
            const url = `${this.baseUrl}/api/assets`;
            this.logger.debug(`Fetching assets for layer: ${layer}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer,
                    limit,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 10000,
            }));
            if (response.data?.success && response.data?.data) {
                const assets = response.data.data;
                this.logger.debug(`Retrieved ${assets.length} assets for layer: ${layer}`);
                return assets;
            }
            else {
                this.logger.warn(`No assets found for layer: ${layer}`);
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, `getAssetsByLayer(${layer})`, []);
        }
    }
    async getCompositesBySong(songId, limit = 1000) {
        try {
            const url = `${this.baseUrl}/api/assets`;
            this.logger.debug(`Fetching composites for song: ${songId}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer: 'C',
                    components: songId,
                    limit,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 15000,
            }));
            if (response.data?.success && response.data?.data) {
                const composites = response.data.data;
                this.logger.debug(`Retrieved ${composites.length} composites for song: ${songId}`);
                return composites;
            }
            else {
                this.logger.warn(`No composites found for song: ${songId}`);
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, `getCompositesBySong(${songId})`, []);
        }
    }
    async searchAssets(query, filters) {
        try {
            const url = `${this.baseUrl}/api/assets/search`;
            this.logger.debug(`Searching assets with query: ${query}`);
            const params = {
                q: query,
                limit: filters?.limit || 100,
            };
            if (filters?.layer)
                params.layer = filters.layer;
            if (filters?.category)
                params.category = filters.category;
            if (filters?.tags)
                params.tags = filters.tags.join(',');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params,
                timeout: 10000,
            }));
            if (response.data?.success && response.data?.data) {
                const results = response.data.data;
                this.logger.debug(`Search returned ${results.length} assets for query: ${query}`);
                return results;
            }
            else {
                this.logger.warn(`No search results for query: ${query}`);
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, `searchAssets(${query})`, []);
        }
    }
    async getAssetMetadata(assetId) {
        try {
            const url = `${this.baseUrl}/api/assets/${assetId}/metadata`;
            this.logger.debug(`Fetching metadata for asset: ${assetId}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 5000,
            }));
            if (response.data?.success && response.data?.data) {
                return response.data.data;
            }
            else {
                return null;
            }
        }
        catch (error) {
            return this.handleHttpError(error, `getAssetMetadata(${assetId})`, null);
        }
    }
    async batchGetAssets(addresses) {
        if (addresses.length === 0)
            return [];
        try {
            const url = `${this.baseUrl}/api/assets/batch`;
            this.logger.debug(`Batch fetching ${addresses.length} assets`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                addresses,
            }, {
                headers: this.getHeaders(),
                timeout: 15000,
            }));
            if (response.data?.success && response.data?.data) {
                const assets = response.data.data;
                this.logger.debug(`Batch retrieved ${assets.length} assets`);
                return assets;
            }
            else {
                this.logger.warn(`Batch request failed or returned no data`);
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, `batchGetAssets(${addresses.length} items)`, []);
        }
    }
    async healthCheck() {
        const startTime = Date.now();
        try {
            const url = `${this.baseUrl}/api/health`;
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 5000,
            }));
            const responseTime = Date.now() - startTime;
            if (response.status === 200) {
                return {
                    status: 'healthy',
                    response_time_ms: responseTime,
                };
            }
            else {
                return {
                    status: 'unhealthy',
                    response_time_ms: responseTime,
                    error: `HTTP ${response.status}`,
                };
            }
        }
        catch (error) {
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
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'AlgoRhythm/1.0.0',
        };
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        return headers;
    }
    handleHttpError(error, operation, fallbackValue) {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.message;
            this.logger.error(`NNA Registry ${operation} failed with status ${status}: ${message}`);
            if (status === 404 && fallbackValue !== undefined) {
                return fallbackValue;
            }
            throw new common_1.HttpException(`NNA Registry error: ${message}`, status >= 500 ? common_1.HttpStatus.INTERNAL_SERVER_ERROR : status);
        }
        else if (error.request) {
            this.logger.error(`NNA Registry ${operation} network error:`, error.message);
            throw new common_1.HttpException('NNA Registry service unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        else {
            this.logger.error(`NNA Registry ${operation} error:`, error.message);
            throw new common_1.HttpException('NNA Registry integration error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    convertHfnToMfa(hfn) {
        return hfn;
    }
    convertMfaToHfn(mfa) {
        return mfa;
    }
};
exports.NnaRegistryService = NnaRegistryService;
exports.NnaRegistryService = NnaRegistryService = NnaRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], NnaRegistryService);
//# sourceMappingURL=nna-registry.service.js.map