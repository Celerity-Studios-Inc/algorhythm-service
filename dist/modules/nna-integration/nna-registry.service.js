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
        this.baseUrl = this.configService.get('NNA_REGISTRY_URL') || 'https://registry.dev.reviz.dev';
        this.apiKey = this.configService.get('NNA_API_KEY') || 'reviz-dev-30390-13220-4896-9516-9001';
        this.logger.log(`NNA Registry integration configured for: ${this.baseUrl}`);
    }
    async getAssetByAddress(address) {
        try {
            const url = `${this.baseUrl}/api/v1/assets/address/${address}`;
            this.logger.debug(`Fetching asset by address: ${address}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 2000,
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
            const url = `${this.baseUrl}/api/v1/assets`;
            this.logger.debug(`Fetching assets for layer: ${layer}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer,
                    limit,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 2000,
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
            const url = `${this.baseUrl}/api/v1/assets`;
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
                timeout: 2000,
            }));
            if (response.data?.success && response.data?.data) {
                const allComposites = response.data.data;
                const fullComposites = allComposites.filter(composite => {
                    const nnaAddress = composite.nna_address || composite.name || '';
                    return nnaAddress.includes('C.FUL') || nnaAddress.startsWith('C.FUL');
                });
                this.logger.debug(`Retrieved ${allComposites.length} total composites, filtered to ${fullComposites.length} FULL composites for song: ${songId}`);
                if (fullComposites.length === 0) {
                    this.logger.warn(`No FULL composites found for song: ${songId}. Available composites: ${allComposites.map(c => c.nna_address || c.name).join(', ')}`);
                    this.logger.warn(`ReViz API will return empty results - only C.FUL composites are supported for developers`);
                }
                return fullComposites;
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
    async getFullCompositesBySong(songId, limit = 1000) {
        try {
            const url = `${this.baseUrl}/api/v1/assets`;
            this.logger.debug(`🔍 Fetching FULL composites for ReViz developers - song: ${songId}`);
            let response;
            try {
                response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                    headers: this.getHeaders(),
                    params: {
                        layer: 'C',
                        components: songId,
                        limit,
                        sort: 'createdAt',
                        order: 'desc',
                        composite_type: 'full',
                    },
                    timeout: 2000,
                }));
            }
            catch (error) {
                this.logger.warn(`⚠️ First attempt failed, trying without composite_type filter: ${error.message}`);
                response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                    headers: this.getHeaders(),
                    params: {
                        layer: 'C',
                        components: songId,
                        limit,
                        sort: 'createdAt',
                        order: 'desc',
                    },
                    timeout: 2000,
                }));
            }
            if (response.data?.success && response.data?.data) {
                const allComposites = response.data.data;
                this.logger.debug(`📊 Raw API response: ${allComposites.length} total composites for song: ${songId}`);
                if (allComposites.length > 0) {
                    this.logger.debug(`🔍 Sample composite: ${JSON.stringify(allComposites[0], null, 2)}`);
                }
                const fullComposites = allComposites.filter(composite => {
                    const nnaAddress = composite.nna_address || composite.name || '';
                    const compositeType = composite.composite_type || composite.compositeType || '';
                    const category = composite.category || '';
                    const subcategory = composite.subcategory || '';
                    const isFullComposite = nnaAddress.includes('C.FUL') ||
                        nnaAddress.startsWith('C.FUL') ||
                        nnaAddress.includes('FUL') ||
                        compositeType === 'full' ||
                        compositeType === 'full_curated' ||
                        compositeType === 'FULL' ||
                        category === 'FUL' ||
                        subcategory === 'FUL';
                    this.logger.debug(`🔍 Composite ${nnaAddress}: type=${compositeType}, category=${category}, isFull=${isFullComposite}`);
                    return isFullComposite;
                });
                this.logger.debug(`✅ ReViz API: Retrieved ${allComposites.length} total, ${fullComposites.length} FULL composites for song: ${songId}`);
                if (fullComposites.length === 0) {
                    this.logger.warn(`❌ ReViz API: No FULL composites available for song: ${songId}`);
                    this.logger.warn(`📋 Available composite types: ${allComposites.map(c => c.composite_type || c.category || 'unknown').join(', ')}`);
                    this.logger.warn(`🔄 FALLBACK: Returning any composites that contain song ${songId}`);
                    const fallbackComposites = allComposites.filter(composite => {
                        const components = composite.components || [];
                        return components.includes(songId) ||
                            components.some(comp => comp.includes(songId)) ||
                            composite.song_id === songId ||
                            composite.songId === songId;
                    });
                    if (fallbackComposites.length > 0) {
                        this.logger.warn(`🔄 FALLBACK: Found ${fallbackComposites.length} composites containing song ${songId}`);
                        return fallbackComposites;
                    }
                }
                return fullComposites;
            }
            else {
                this.logger.warn(`❌ ReViz API: No composites found for song: ${songId}`);
                this.logger.warn(`📋 API Response: ${JSON.stringify(response.data, null, 2)}`);
                return [];
            }
        }
        catch (error) {
            this.logger.error(`💥 ReViz API Error for song ${songId}:`, error);
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                this.logger.warn(`🚨 NNA Registry unavailable, returning mock composites for song ${songId}`);
                return [
                    {
                        _id: 'mock_composite_1',
                        nna_address: 'C.FUL.ALL.025',
                        name: 'C.FUL.ALL.025',
                        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.025:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.mp4',
                        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.025:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.jpg',
                        previewUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.025:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001_preview.mp4',
                        composite_type: 'full',
                        category: 'FUL',
                        components: [songId, '2.009.002.018', '3.003.001.001', '4.022.002.003', '5.015.001.001'],
                        createdAt: new Date().toISOString(),
                        tags: ['composite', 'full', 'all-layers']
                    },
                    {
                        _id: 'mock_composite_2',
                        nna_address: 'C.FUL.ALL.003',
                        name: 'C.FUL.ALL.003',
                        gcpStorageUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.003:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.mp4',
                        thumbnailUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.003:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001.jpg',
                        previewUrl: 'https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/C.FUL.ALL.003:1.018.003.002+2.009.002.018+3.003.001.001+4.022.002.003+5.015.001.001_preview.mp4',
                        composite_type: 'full',
                        category: 'FUL',
                        components: [songId, '2.009.002.018', '3.003.001.001', '4.022.002.003', '5.015.001.001'],
                        createdAt: new Date().toISOString(),
                        tags: ['composite', 'full', 'all-layers']
                    }
                ];
            }
            return this.handleHttpError(error, `getFullCompositesBySong(${songId})`, []);
        }
    }
    async searchAssets(query, filters) {
        try {
            const url = `${this.baseUrl}/api/v1/assets/search`;
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
                timeout: 2000,
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
            const url = `${this.baseUrl}/api/v1/assets/${assetId}/metadata`;
            this.logger.debug(`Fetching metadata for asset: ${assetId}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 2000,
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
            const url = `${this.baseUrl}/api/v1/assets/batch`;
            this.logger.debug(`Batch fetching ${addresses.length} assets`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                addresses,
            }, {
                headers: this.getHeaders(),
                timeout: 2000,
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
            const url = `${this.baseUrl}/api/v1/health`;
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                timeout: 2000,
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
            headers['x-api-key'] = this.apiKey;
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
    isHfnFormat(id) {
        return /^[GLMSWBPTC]\.\w+\.\w+\.\d+$/.test(id);
    }
    isMfaFormat(id) {
        return /^\d+\.\d+\.\d+\.\d+$/.test(id);
    }
    async convertHfnToMfa(hfn) {
        try {
            const hfnParts = hfn.split('.');
            if (hfnParts.length !== 4) {
                this.logger.warn(`Invalid HFN format: ${hfn}`);
                return hfn;
            }
            const [layer, category, subcategory, sequential] = hfnParts;
            const url = `${this.baseUrl}/api/v1/assets`;
            this.logger.debug(`Converting HFN: ${hfn} (Layer: ${layer}, Category: ${category}, Subcategory: ${subcategory})`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer,
                    category,
                    subcategory,
                    limit: 100,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 2000,
            }));
            if (response.data?.success && response.data?.data) {
                const assets = response.data.data;
                const matchingAsset = assets.find(asset => asset.name === hfn ||
                    asset.friendlyName === hfn);
                if (matchingAsset && matchingAsset.nna_address) {
                    this.logger.debug(`Found MFA for HFN ${hfn}: ${matchingAsset.nna_address}`);
                    return matchingAsset.nna_address;
                }
            }
            this.logger.warn(`No MFA found for HFN: ${hfn}`);
            return hfn;
        }
        catch (error) {
            this.logger.warn(`HFN conversion error for ${hfn}:`, error.message);
            return hfn;
        }
    }
    async getAllSongs() {
        try {
            const url = `${this.baseUrl}/api/v1/assets`;
            this.logger.debug('Fetching all songs');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer: 'G',
                    limit: 10000,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 2000,
            }));
            if (response.data?.success && response.data?.data) {
                const songs = response.data.data;
                this.logger.debug(`Retrieved ${songs.length} songs`);
                return songs;
            }
            else {
                this.logger.warn('No songs found');
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, 'getAllSongs', []);
        }
    }
    async getAllTemplates() {
        try {
            const url = `${this.baseUrl}/api/v1/assets`;
            this.logger.debug('Fetching all templates');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                headers: this.getHeaders(),
                params: {
                    layer: 'C',
                    limit: 10000,
                    sort: 'createdAt',
                    order: 'desc',
                },
                timeout: 2000,
            }));
            if (response.data?.success && response.data?.data) {
                const templates = response.data.data;
                this.logger.debug(`Retrieved ${templates.length} templates`);
                return templates;
            }
            else {
                this.logger.warn('No templates found');
                return [];
            }
        }
        catch (error) {
            return this.handleHttpError(error, 'getAllTemplates', []);
        }
    }
};
exports.NnaRegistryService = NnaRegistryService;
exports.NnaRegistryService = NnaRegistryService = NnaRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], NnaRegistryService);
//# sourceMappingURL=nna-registry.service.js.map