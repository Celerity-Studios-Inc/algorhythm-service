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
const nna_registry_service_1 = require("../nna-integration/nna-registry.service");
const analytics_service_1 = require("../analytics/analytics.service");
const instant_recommendations_service_1 = require("./instant-recommendations.service");
const cache_keys_1 = require("../../common/constants/cache-keys");
const compatibility_weights_1 = require("../../common/constants/compatibility-weights");
let RecommendationsService = RecommendationsService_1 = class RecommendationsService {
    constructor(compatibilityScoreModel, recommendationCacheModel, scoringService, cacheService, nnaRegistryService, analyticsService, instantRecommendationsService) {
        this.compatibilityScoreModel = compatibilityScoreModel;
        this.recommendationCacheModel = recommendationCacheModel;
        this.scoringService = scoringService;
        this.cacheService = cacheService;
        this.nnaRegistryService = nnaRegistryService;
        this.analyticsService = analyticsService;
        this.instantRecommendationsService = instantRecommendationsService;
        this.logger = new common_1.Logger(RecommendationsService_1.name);
    }
    async getTemplateRecommendation(request) {
        const startTime = Date.now();
        try {
            const instantResult = await this.instantRecommendationsService.getTemplateRecommendation(request);
            if (instantResult.cache_hit) {
                const responseTime = Date.now() - startTime;
                this.logger.debug(`⚡ Instant service response: ${responseTime}ms`);
                return instantResult;
            }
        }
        catch (error) {
            this.logger.warn('Instant service failed, falling back to standard service:', error.message);
        }
        const primaryCacheKey = `${cache_keys_1.CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${request.song_id}:${JSON.stringify(request.user_context)}`;
        const primaryCachedResult = await this.cacheService.get(primaryCacheKey);
        if (primaryCachedResult) {
            this.logger.debug(`Cache hit for template recommendation: ${request.song_id}`);
            await this.analyticsService.trackEvent({
                event_type: 'template_recommendation_served',
                user_id: request.user_context.user_id,
                song_id: request.song_id,
                template_id: primaryCachedResult.recommendation?.template_id || 'unknown',
                cache_hit: true,
                response_time_ms: Date.now() - startTime,
            });
            return {
                ...primaryCachedResult,
                cache_hit: true,
            };
        }
        const isHfn = this.nnaRegistryService.isHfnFormat(request.song_id);
        const isMfa = this.nnaRegistryService.isMfaFormat(request.song_id);
        this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);
        let songId = request.song_id;
        if (isHfn) {
            this.logger.debug(`Converting HFN to MFA: ${request.song_id}`);
            songId = await this.nnaRegistryService.convertHfnToMfa(request.song_id);
            this.logger.debug(`Converted to MFA: ${songId}`);
        }
        const song = await this.nnaRegistryService.getAssetByAddress(songId);
        if (!song) {
            throw new common_1.NotFoundException(`Song not found: ${songId}`);
        }
        const availableTemplates = await this.nnaRegistryService.getCompositesBySong(songId);
        if (availableTemplates.length === 0) {
            const originalId = request.song_id !== songId ? `${request.song_id} (${songId})` : songId;
            throw new common_1.NotFoundException(`No templates available for song: ${originalId}`);
        }
        const secondaryCacheKey = `recommendations:${songId}:${JSON.stringify(request.user_context.preferences)}`;
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
        const scoredTemplates = availableTemplates.map((template, index) => ({
            template_id: template._id || template.nna_address,
            template_name: template.name || `Template ${index + 1}`,
            nna_address: template.nna_address,
            compatibility_score: 0.8,
            components: {
                song_id: song.nna_address,
                star_id: template.star_id || '2.009.002.018',
                look_id: template.look_id || '3.003.001.001',
                move_id: template.move_id || '4.022.002.003',
                world_id: template.world_id || '5.015.001.001',
            },
            metadata: {
                created_at: template.createdAt || new Date().toISOString(),
                tags: template.tags || [],
                description: template.description || 'Template description',
            },
            scoring_details: {
                tempo_score: 0.8,
                genre_score: 0.8,
                energy_score: 0.8,
                style_score: 0.8,
                mood_score: 0.8,
                base_score: 0.8,
                freshness_boost: 1.0,
                final_score: 0.8,
            },
        }));
        const scoringTime = Date.now() - scoringStartTime;
        const eligibleTemplates = scoredTemplates;
        const sortedTemplates = this.applyDiversityAndSort(eligibleTemplates);
        const recommendation = sortedTemplates[0];
        const alternatives = sortedTemplates.slice(1, (request.max_alternatives || 5) + 1);
        const result = {
            recommendation,
            alternatives,
            total_available: availableTemplates.length,
            score_computation_time_ms: scoringTime,
            templates_evaluated: scoredTemplates.length,
        };
        await this.cacheService.set(secondaryCacheKey, result, cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION);
        const instantCacheKey = `instant:${songId}`;
        await this.cacheService.set(instantCacheKey, result, 3600);
        await this.storeRecommendationCache(request, result);
        await this.analyticsService.trackEvent({
            event_type: 'template_recommendation_served',
            user_id: request.user_context.user_id,
            song_id: request.song_id,
            template_id: recommendation?.template_id || 'unknown',
            compatibility_score: recommendation?.compatibility_score || 0,
            alternatives_count: alternatives.length,
            cache_hit: false,
            response_time_ms: Date.now() - startTime,
            scoring_time_ms: scoringTime,
            templates_evaluated: scoredTemplates.length,
        });
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
        const currentTemplate = await this.nnaRegistryService.getAssetByAddress(request.current_template_id);
        if (!currentTemplate) {
            throw new common_1.NotFoundException(`Template not found: ${request.current_template_id}`);
        }
        const isHfn = this.nnaRegistryService.isHfnFormat(request.song_id);
        const isMfa = this.nnaRegistryService.isMfaFormat(request.song_id);
        this.logger.debug(`Song ID format - HFN: ${isHfn}, MFA: ${isMfa}, ID: ${request.song_id}`);
        let songId = request.song_id;
        if (isHfn) {
            this.logger.debug(`Converting HFN to MFA: ${request.song_id}`);
            songId = await this.nnaRegistryService.convertHfnToMfa(request.song_id);
            this.logger.debug(`Converted to MFA: ${songId}`);
        }
        const song = await this.nnaRegistryService.getAssetByAddress(songId);
        if (!song) {
            throw new common_1.NotFoundException(`Song not found: ${songId}`);
        }
        const layerAssets = await this.nnaRegistryService.getAssetsByLayer(this.mapVariationLayerToNnaLayer(request.vary_layer));
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
                description: asset.description,
            },
        };
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
        nna_registry_service_1.NnaRegistryService,
        analytics_service_1.AnalyticsService,
        instant_recommendations_service_1.InstantRecommendationsService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map