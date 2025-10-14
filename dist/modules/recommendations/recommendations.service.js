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
var RecommendationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const compatibility_score_schema_1 = require("../../models/compatibility-score.schema");
const recommendation_cache_schema_1 = require("../../models/recommendation-cache.schema");
const scoring_service_1 = require("../scoring/scoring.service");
const cache_service_1 = require("../caching/cache.service");
const optimized_nna_registry_service_1 = require("../nna-integration/optimized-nna-registry.service");
const analytics_service_1 = require("../analytics/analytics.service");
const instant_recommendations_service_1 = require("./instant-recommendations.service");
const cache_keys_1 = require("../../common/constants/cache-keys");
const compatibility_weights_1 = require("../../common/constants/compatibility-weights");
let RecommendationsService = RecommendationsService_1 = class RecommendationsService {
    constructor(compatibilityScoreModel, recommendationCacheModel, scoringService, cacheService, optimizedNnaRegistryService, analyticsService, instantRecommendationsService) {
        this.compatibilityScoreModel = compatibilityScoreModel;
        this.recommendationCacheModel = recommendationCacheModel;
        this.scoringService = scoringService;
        this.cacheService = cacheService;
        this.optimizedNnaRegistryService = optimizedNnaRegistryService;
        this.analyticsService = analyticsService;
        this.instantRecommendationsService = instantRecommendationsService;
        this.logger = new common_1.Logger(RecommendationsService_1.name);
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            totalRequests: 0,
        };
        console.error('=====================================');
        console.error('🚀 RECOMMENDATIONS SERVICE STARTING');
        console.error('=====================================');
        console.error('Service exists:', !!this.optimizedNnaRegistryService);
        console.error('Service type:', this.optimizedNnaRegistryService?.constructor?.name);
        console.error('Has getCompositesForSong:', typeof this.optimizedNnaRegistryService?.getCompositesForSong);
        console.error('Method exists:', typeof this.optimizedNnaRegistryService?.getCompositesForSong === 'function');
        console.error('=====================================');
        this.logger.log(`🔍 [INIT] OptimizedNnaRegistryService available: ${!!this.optimizedNnaRegistryService}`);
        this.logger.log(`🔍 [INIT] Service type: ${this.optimizedNnaRegistryService?.constructor?.name}`);
    }
    getFallbackTemplates(songId) {
        return [
            {
                _id: `fallback-template-${songId}-1`,
                nna_address: `9.000.000.001`,
                name: `Fallback Template 1 for ${songId}`,
                gcpStorageUrl: `https://storage.googleapis.com/fallback-assets/template-1.mp4`,
                thumbnailUrl: `https://storage.googleapis.com/fallback-assets/template-1-thumb.jpg`,
                previewUrl: `https://storage.googleapis.com/fallback-assets/template-1-preview.mp4`,
                description: `A default fallback template for song ${songId}.`,
                tags: ['fallback', 'default', 'pop'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                star_id: '2.009.002.018',
                look_id: '3.003.001.001',
                move_id: '4.022.002.003',
                world_id: '5.015.001.001',
                duration: 30,
                fileSize: 15.2,
                resolution: '1080p',
                format: 'mp4',
                qualityScore: 0.9,
            },
            {
                _id: `fallback-template-${songId}-2`,
                nna_address: `9.000.000.002`,
                name: `Fallback Template 2 for ${songId}`,
                gcpStorageUrl: `https://storage.googleapis.com/fallback-assets/template-2.mp4`,
                thumbnailUrl: `https://storage.googleapis.com/fallback-assets/template-2-thumb.jpg`,
                previewUrl: `https://storage.googleapis.com/fallback-assets/template-2-preview.mp4`,
                description: `Another default fallback template for song ${songId}.`,
                tags: ['fallback', 'alternative', 'rock'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                star_id: '2.009.002.019',
                look_id: '3.003.001.002',
                move_id: '4.022.002.004',
                world_id: '5.015.001.002',
                duration: 35,
                fileSize: 18.5,
                resolution: '720p',
                format: 'mp4',
                qualityScore: 0.8,
            },
        ];
    }
    normalizeSongId(songId) {
        if (songId.includes('.')) {
            return songId;
        }
        if (/^\d+$/.test(songId)) {
            const parts = songId.match(/.{1,3}/g) || [];
            return parts.join('.');
        }
        return songId;
    }
    async getTemplateRecommendation(request) {
        const startTime = Date.now();
        this.logger.log(`🔧 [TEMPLATE ENDPOINT] Starting template recommendation for song: ${request.song_id}`);
        this.logger.log(`🔧 [TEMPLATE ENDPOINT] Service is using latest code with emergency bypass`);
        this.logger.log(`🔧 [TEMPLATE ENDPOINT] Request: ${JSON.stringify(request)}`);
        const originalSongId = request.song_id;
        const normalizedSongId = this.normalizeSongId(request.song_id);
        if (originalSongId !== normalizedSongId) {
            this.logger.log(`🔄 [NORMALIZATION] MFA→HFN: ${originalSongId} → ${normalizedSongId}`);
        }
        const normalizedRequest = { ...request, song_id: normalizedSongId };
        this.logger.debug('🚀 Using OptimizedNnaRegistryService for 43x performance improvement');
        const primaryCacheKey = `${cache_keys_1.CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${normalizedSongId}:${JSON.stringify(normalizedRequest.user_context)}`;
        const primaryCachedResult = await this.cacheService.get(primaryCacheKey);
        if (primaryCachedResult) {
            this.logger.debug(`Cache hit for template recommendation: ${normalizedSongId}`);
            await this.analyticsService.trackEvent({
                event_type: 'template_recommendation_served',
                user_id: normalizedRequest.user_context.user_id,
                song_id: normalizedSongId,
                template_id: primaryCachedResult.recommendation?.template_id || 'unknown',
                cache_hit: true,
                response_time_ms: Date.now() - startTime,
            });
            return {
                ...primaryCachedResult,
                cache_hit: true,
            };
        }
        const songId = normalizedSongId;
        this.logger.debug(`Using normalized HFN song ID: ${songId}`);
        const song = {
            id: songId,
            name: `Song ${songId}`,
            nna_address: songId
        };
        this.logger.log(`🔍 [METHOD CALL] About to call getCompositesForSongOptimized`);
        this.logger.log(`🔍 [METHOD CALL] Song ID: ${songId}`);
        this.logger.log(`🔍 [METHOD CALL] Service exists: ${!!this.optimizedNnaRegistryService}`);
        this.logger.log(`🔍 [METHOD CALL] Service type: ${this.optimizedNnaRegistryService?.constructor?.name}`);
        this.logger.log(`🚀 [INTEGRATION] Calling NNA Registry with circuit breaker for song: ${songId}`);
        let availableTemplates = [];
        try {
            this.logger.log(`🔍 [NNA REGISTRY] Fetching composites for song: ${songId}`);
            this.logger.log(`🔍 [NNA REGISTRY] Service type: ${this.optimizedNnaRegistryService.constructor.name}`);
            this.logger.log(`🔍 [NNA REGISTRY] Method being called: getCompositesForSongOptimized`);
            availableTemplates = await this.optimizedNnaRegistryService.getCompositesForSongOptimized(songId);
            this.logger.log(`✅ [NNA REGISTRY] Retrieved ${availableTemplates.length} composites from NNA Registry`);
            this.logger.log(`🔍 [NNA REGISTRY] Composites preview:`, JSON.stringify(availableTemplates.slice(0, 2), null, 2));
        }
        catch (error) {
            this.logger.warn(`⚠️ [NNA REGISTRY] Failed to fetch composites: ${error.message}`);
            this.logger.log(`🔄 [FALLBACK] Using fallback templates for song: ${songId}`);
            availableTemplates = this.getFallbackTemplates(songId);
        }
        if (availableTemplates.length === 0) {
            this.logger.warn(`No templates found for song: ${songId}`);
            this.logger.warn(`🔄 [FALLBACK] Using fallback response for ${songId}`);
            return this.getFallbackResponse(normalizedRequest);
        }
        const secondaryCacheKey = `recommendation:template:${songId}:${normalizedRequest.user_context.user_id}`;
        const secondaryCachedResult = await this.cacheService.get(secondaryCacheKey);
        if (secondaryCachedResult) {
            this.logger.debug(`Cache hit for song: ${songId}`);
            return {
                ...secondaryCachedResult,
                cache_hit: true,
                score_computation_time_ms: 0,
                templates_evaluated: secondaryCachedResult.alternatives?.length + 1 || 1,
            };
        }
        const scoringStartTime = Date.now();
        this.logger.log(`🎯 [SCORING] Starting real scoring for ${availableTemplates.length} templates`);
        const scoredTemplates = await this.scoringService.scoreTemplates(song, availableTemplates, request.user_context);
        const scoringTime = Date.now() - scoringStartTime;
        const eligibleTemplates = scoredTemplates;
        const sortedTemplates = this.applyDiversityAndSort(eligibleTemplates);
        const recommendation = sortedTemplates[0];
        const alternatives = sortedTemplates.slice(1, (normalizedRequest.max_alternatives || 5) + 1);
        const result = {
            recommendation: recommendation || null,
            alternatives: alternatives || [],
            total_available: availableTemplates.length,
            score_computation_time_ms: scoringTime,
            templates_evaluated: scoredTemplates.length,
            cache_hit: false,
            response_time_ms: Date.now() - startTime,
        };
        await this.cacheService.set(secondaryCacheKey, result, cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION);
        const instantCacheKey = `instant:${songId}`;
        await this.cacheService.set(instantCacheKey, result, 3600);
        await this.storeRecommendationCache(normalizedRequest, result);
        await this.analyticsService.trackEvent({
            event_type: 'template_recommendation_served',
            user_id: normalizedRequest.user_context.user_id,
            song_id: normalizedSongId,
            template_id: recommendation?.template_id || 'unknown',
            compatibility_score: recommendation?.compatibility_score || 0,
            alternatives_count: alternatives.length,
            cache_hit: false,
            response_time_ms: Date.now() - startTime,
            scoring_time_ms: scoringTime,
            templates_evaluated: scoredTemplates.length,
        });
        const totalTime = Date.now() - startTime;
        this.logger.debug(`✅ OPTIMIZED Template recommendation completed in ${totalTime}ms for song: ${songId}`);
        const performanceMetrics = {
            event: 'template_recommendation_performance',
            song_id: songId,
            response_time_ms: totalTime,
            scoring_time_ms: scoringTime,
            templates_evaluated: scoredTemplates.length,
            cache_hit: false,
            performance_tier: totalTime < 2000 ? 'excellent' : totalTime < 5000 ? 'good' : 'needs_optimization',
            timestamp: new Date().toISOString()
        };
        if (totalTime > 2000) {
            this.logger.warn({
                message: `⚠️ Slow template recommendation: ${totalTime}ms for song ${songId}`,
                ...performanceMetrics
            });
        }
        else {
            this.logger.log({
                message: `🚀 FAST template recommendation: ${totalTime}ms for song ${songId}`,
                ...performanceMetrics
            });
        }
        return result;
    }
    async getLayerVariations(request) {
        const startTime = Date.now();
        const layerCacheKey = `${cache_keys_1.CACHE_KEYS.LAYER_VARIATIONS}:${request.current_template_id}:${request.vary_layer}`;
        const layerCachedResult = await this.cacheService.get(layerCacheKey);
        if (layerCachedResult) {
            this.logger.debug(`Cache hit for layer variations: ${request.current_template_id}, ${request.vary_layer}`);
            return {
                ...layerCachedResult,
                cache_hit: true,
            };
        }
        const currentTemplate = { id: request.current_template_id, name: `Template ${request.current_template_id}` };
        const isHfn = request.song_id.includes('.');
        const isMfa = /^\d+\.\d+\.\d+\.\d+$/.test(request.song_id);
        this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);
        const songId = request.song_id;
        this.logger.debug(`Using song ID directly: ${songId}`);
        const song = {
            id: songId,
            name: `Song ${songId}`,
            nna_address: songId
        };
        const layerAssets = [];
        const currentLayerAssetId = this.extractLayerAssetId(currentTemplate, request.vary_layer);
        const currentSelection = layerAssets.find(asset => asset.nna_address === currentLayerAssetId);
        const scoredVariations = await this.scoringService.scoreLayerVariations(song, currentTemplate, layerAssets, request.vary_layer);
        const sortedVariations = scoredVariations
            .sort((a, b) => b.compatibility_score - a.compatibility_score)
            .slice(0, request.limit || 8);
        const result = {
            variations: sortedVariations,
            current_selection: currentSelection ? this.mapAssetToLayerVariation(currentSelection) : null,
            total_available: layerAssets.length,
            variations_evaluated: scoredVariations.length,
        };
        await this.cacheService.set(layerCacheKey, result, cache_keys_1.CACHE_TTL.LAYER_VARIATIONS);
        await this.analyticsService.trackEvent({
            event_type: 'layer_variations_requested',
            user_id: request.user_context?.user_id,
            template_id: request.current_template_id,
            song_id: request.song_id,
            vary_layer: request.vary_layer,
            variations_count: sortedVariations.length,
            response_time_ms: Date.now() - startTime,
        });
        return result;
    }
    applyDiversityAndSort(templates) {
        return templates
            .map(template => ({
            ...template,
            final_score: template.compatibility_score * (1 + Math.random() * compatibility_weights_1.SCORING_THRESHOLDS.DIVERSITY_FACTOR),
        }))
            .sort((a, b) => b.final_score - a.final_score)
            .map(({ final_score, ...template }) => template);
    }
    async getFallbackTemplate(songId) {
        return null;
    }
    async storeRecommendationCache(request, result) {
        try {
            const cacheEntry = new this.recommendationCacheModel({
                song_id: request.song_id,
                user_id: request.user_context.user_id,
                recommended_template_id: result.recommendation?.template_id || 'unknown',
                alternatives: result.alternatives?.map(alt => alt.template_id) || [],
                user_context: request.user_context,
                compatibility_score: result.recommendation.compatibility_score,
                created_at: new Date(),
            });
            await cacheEntry.save();
        }
        catch (error) {
            this.logger.error('Failed to store recommendation cache', error);
        }
    }
    mapVariationLayerToNnaLayer(variationLayer) {
        const mapping = {
            'stars': 'S',
            'looks': 'L',
            'moves': 'M',
            'worlds': 'W',
        };
        return mapping[variationLayer] || variationLayer;
    }
    extractLayerAssetId(template, layer) {
        const components = template.components || [];
        const layerCode = this.mapVariationLayerToNnaLayer(layer);
        return components.find(component => component.startsWith(layerCode)) || '';
    }
    mapAssetToLayerVariation(asset) {
        return {
            asset_id: asset._id,
            asset_name: asset.name,
            nna_address: asset.nna_address,
            compatibility_score: 1.0,
            metadata: {
                tags: asset.tags || [],
                aiGeneratedDescription: asset.description,
            },
        };
    }
    generateThumbnailUrl(gcpStorageUrl, nnaAddress) {
        if (gcpStorageUrl) {
            return gcpStorageUrl.replace(/\.mp4$/, '.jpg');
        }
        return null;
    }
    generatePreviewUrl(gcpStorageUrl, nnaAddress) {
        if (gcpStorageUrl) {
            return gcpStorageUrl.replace(/\.mp4$/, '_preview.mp4');
        }
        return null;
    }
    getFallbackResponse(request) {
        this.logger.warn(`🔄 [FALLBACK] Generating fallback response for ${request.song_id}`);
        const fallbackTemplates = [
            {
                template_id: 'default-pop-template',
                template_name: 'Default Pop Template',
                nna_address: 'G.POP.DEF.001',
                compatibility_score: 0.8,
                components: {
                    song_id: request.song_id,
                    star_id: 'G.POP.STA.001',
                    look_id: 'G.POP.LOO.001',
                    move_id: 'G.POP.MOV.001',
                    world_id: 'G.POP.WOR.001',
                },
                metadata: {
                    created_at: new Date().toISOString(),
                    tags: ['pop', 'default', 'fallback'],
                    aiGeneratedDescription: 'Default pop template with high compatibility',
                },
                scoring_details: {
                    tempo_score: 0.8,
                    genre_score: 0.8,
                    energy_score: 0.8,
                    style_score: 0.8,
                    mood_score: 0.8,
                    base_score: 0.8,
                    freshness_boost: 1,
                    final_score: 0.8,
                },
            },
            {
                template_id: 'alternative-pop-template',
                template_name: 'Alternative Pop Template',
                nna_address: 'G.POP.ALT.001',
                compatibility_score: 0.7,
                components: {
                    song_id: request.song_id,
                    star_id: 'G.POP.STA.002',
                    look_id: 'G.POP.LOO.002',
                    move_id: 'G.POP.MOV.002',
                    world_id: 'G.POP.WOR.002',
                },
                metadata: {
                    created_at: new Date().toISOString(),
                    tags: ['pop', 'alternative', 'fallback'],
                    aiGeneratedDescription: 'Alternative pop template with good compatibility',
                },
                scoring_details: {
                    tempo_score: 0.7,
                    genre_score: 0.7,
                    energy_score: 0.7,
                    style_score: 0.7,
                    mood_score: 0.7,
                    base_score: 0.7,
                    freshness_boost: 1,
                    final_score: 0.7,
                },
            }
        ];
        return {
            recommendation: fallbackTemplates[0],
            alternatives: fallbackTemplates.slice(1),
            total_available: fallbackTemplates.length,
        };
    }
    getCacheHitRate() {
        const total = this.cacheStats.hits + this.cacheStats.misses;
        return total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
    }
    getCacheStats() {
        return {
            ...this.cacheStats,
            hitRate: this.getCacheHitRate(),
            totalRequests: this.cacheStats.totalRequests,
        };
    }
    trackCacheHit() {
        this.cacheStats.hits++;
        this.cacheStats.totalRequests++;
    }
    trackCacheMiss() {
        this.cacheStats.misses++;
        this.cacheStats.totalRequests++;
    }
    trackCacheSet() {
        this.cacheStats.sets++;
    }
};
exports.RecommendationsService = RecommendationsService;
exports.RecommendationsService = RecommendationsService = RecommendationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(compatibility_score_schema_1.CompatibilityScore.name)),
    __param(1, (0, mongoose_1.InjectModel)(recommendation_cache_schema_1.RecommendationCache.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        scoring_service_1.ScoringService,
        cache_service_1.CacheService,
        optimized_nna_registry_service_1.OptimizedNnaRegistryService,
        analytics_service_1.AnalyticsService,
        instant_recommendations_service_1.InstantRecommendationsService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map