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
const cache_keys_1 = require("../../common/constants/cache-keys");
const compatibility_weights_1 = require("../../common/constants/compatibility-weights");
let RecommendationsService = RecommendationsService_1 = class RecommendationsService {
    constructor(compatibilityScoreModel, recommendationCacheModel, scoringService, cacheService, nnaRegistryService, analyticsService) {
        this.compatibilityScoreModel = compatibilityScoreModel;
        this.recommendationCacheModel = recommendationCacheModel;
        this.scoringService = scoringService;
        this.cacheService = cacheService;
        this.nnaRegistryService = nnaRegistryService;
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(RecommendationsService_1.name);
    }
    async getTemplateRecommendation(request) {
        const startTime = Date.now();
        const cacheKey = `${cache_keys_1.CACHE_KEYS.TEMPLATE_RECOMMENDATION}:${request.song_id}:${JSON.stringify(request.user_context)}`;
        const cachedResult = await this.cacheService.get(cacheKey);
        if (cachedResult) {
            this.logger.debug(`Cache hit for template recommendation: ${request.song_id}`);
            await this.analyticsService.trackEvent({
                event_type: 'template_recommendation_served',
                user_id: request.user_context.user_id,
                song_id: request.song_id,
                template_id: cachedResult.recommendation.template_id,
                cache_hit: true,
                response_time_ms: Date.now() - startTime,
            });
            return {
                ...cachedResult,
                cache_hit: true,
            };
        }
        const song = await this.nnaRegistryService.getAssetByAddress(request.song_id);
        if (!song) {
            throw new common_1.NotFoundException(`Song not found: ${request.song_id}`);
        }
        const availableTemplates = await this.nnaRegistryService.getCompositesBySong(request.song_id);
        if (availableTemplates.length === 0) {
            throw new common_1.NotFoundException(`No templates available for song: ${request.song_id}`);
        }
        const scoringStartTime = Date.now();
        const scoredTemplates = await this.scoringService.scoreTemplates(song, availableTemplates, request.user_context.preferences);
        const scoringTime = Date.now() - scoringStartTime;
        const eligibleTemplates = scoredTemplates.filter(template => template.compatibility_score >= compatibility_weights_1.SCORING_THRESHOLDS.MIN_RECOMMENDATION_SCORE);
        if (eligibleTemplates.length === 0) {
            const popularTemplate = await this.getFallbackTemplate(request.song_id);
            if (popularTemplate) {
                eligibleTemplates.push(popularTemplate);
            }
        }
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
        await this.cacheService.set(cacheKey, result, cache_keys_1.CACHE_TTL.TEMPLATE_RECOMMENDATION);
        await this.storeRecommendationCache(request, result);
        await this.analyticsService.trackEvent({
            event_type: 'template_recommendation_served',
            user_id: request.user_context.user_id,
            song_id: request.song_id,
            template_id: recommendation.template_id,
            compatibility_score: recommendation.compatibility_score,
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
        const cacheKey = `${cache_keys_1.CACHE_KEYS.LAYER_VARIATIONS}:${request.current_template_id}:${request.vary_layer}`;
        const cachedResult = await this.cacheService.get(cacheKey);
        if (cachedResult) {
            this.logger.debug(`Cache hit for layer variations: ${request.current_template_id}, ${request.vary_layer}`);
            return {
                ...cachedResult,
                cache_hit: true,
            };
        }
        const currentTemplate = await this.nnaRegistryService.getAssetByAddress(request.current_template_id);
        if (!currentTemplate) {
            throw new common_1.NotFoundException(`Template not found: ${request.current_template_id}`);
        }
        const song = await this.nnaRegistryService.getAssetByAddress(request.song_id);
        if (!song) {
            throw new common_1.NotFoundException(`Song not found: ${request.song_id}`);
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
        await this.cacheService.set(cacheKey, result, cache_keys_1.CACHE_TTL.LAYER_VARIATIONS);
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
                recommended_template_id: result.recommendation.template_id,
                alternatives: result.alternatives.map(alt => alt.template_id),
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
        analytics_service_1.AnalyticsService])
], RecommendationsService);
//# sourceMappingURL=recommendations.service.js.map