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
var RecommendationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const caching_interceptor_1 = require("../../common/interceptors/caching.interceptor");
const recommendations_service_1 = require("./recommendations.service");
const template_recommendation_dto_1 = require("./dto/template-recommendation.dto");
const layer_variation_dto_1 = require("./dto/layer-variation.dto");
const recommendation_interface_1 = require("./interfaces/recommendation.interface");
let RecommendationsController = RecommendationsController_1 = class RecommendationsController {
    constructor(recommendationsService) {
        this.recommendationsService = recommendationsService;
        this.logger = new common_1.Logger(RecommendationsController_1.name);
    }
    async getTemplateRecommendation(request) {
        const startTime = Date.now();
        this.logger.log(`Template recommendation requested for song: ${request.song_id}`);
        try {
            const recommendation = await this.recommendationsService
                .getTemplateRecommendation(request);
            const responseTime = Date.now() - startTime;
            this.logger.log(`Template recommendation completed in ${responseTime}ms for song: ${request.song_id}`);
            return {
                success: true,
                data: {
                    recommendation: recommendation.recommendation,
                    alternatives: recommendation.alternatives,
                    total_available: recommendation.total_available,
                },
                performance_metrics: {
                    response_time_ms: responseTime,
                    cache_hit: recommendation.cache_hit || false,
                    score_computation_time_ms: recommendation.score_computation_time_ms,
                    templates_evaluated: recommendation.templates_evaluated,
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    version: '1.0.0',
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.logger.error(`Template recommendation failed after ${responseTime}ms for song: ${request.song_id}`, error.stack);
            throw error;
        }
    }
    async getLayerVariations(request) {
        const startTime = Date.now();
        this.logger.log(`Layer variations requested for template: ${request.current_template_id}, layer: ${request.vary_layer}`);
        try {
            const variations = await this.recommendationsService
                .getLayerVariations(request);
            const responseTime = Date.now() - startTime;
            this.logger.log(`Layer variations completed in ${responseTime}ms for template: ${request.current_template_id}`);
            return {
                success: true,
                data: {
                    variations: variations.variations,
                    current_selection: variations.current_selection,
                    total_available: variations.total_available,
                },
                performance_metrics: {
                    response_time_ms: responseTime,
                    cache_hit: variations.cache_hit || false,
                    variations_evaluated: variations.variations_evaluated,
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    version: '1.0.0',
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.logger.error(`Layer variations failed after ${responseTime}ms for template: ${request.current_template_id}`, error.stack);
            throw error;
        }
    }
};
exports.RecommendationsController = RecommendationsController;
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get template recommendation for a song',
        description: 'Returns the best video template recommendation based on song compatibility scoring'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Template recommendation generated successfully',
        type: recommendation_interface_1.TemplateRecommendationResponse
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid request parameters'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'Song not found'
    }),
    (0, swagger_1.ApiBody)({ type: template_recommendation_dto_1.TemplateRecommendationDto }),
    (0, common_1.Post)('template'),
    (0, common_1.UseInterceptors)(caching_interceptor_1.CachingInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [template_recommendation_dto_1.TemplateRecommendationDto]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "getTemplateRecommendation", null);
__decorate([
    (0, swagger_1.ApiOperation)({
        summary: 'Get layer variations',
        description: 'Returns alternative options for a specific layer (stars, looks, moves, worlds) while maintaining compatibility'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Layer variations generated successfully',
        type: recommendation_interface_1.LayerVariationResponse
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Invalid request parameters'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.NOT_FOUND,
        description: 'Template or song not found'
    }),
    (0, swagger_1.ApiBody)({ type: layer_variation_dto_1.LayerVariationDto }),
    (0, common_1.Post)('variations'),
    (0, common_1.UseInterceptors)(caching_interceptor_1.CachingInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [layer_variation_dto_1.LayerVariationDto]),
    __metadata("design:returntype", Promise)
], RecommendationsController.prototype, "getLayerVariations", null);
exports.RecommendationsController = RecommendationsController = RecommendationsController_1 = __decorate([
    (0, swagger_1.ApiTags)('recommendations'),
    (0, common_1.Controller)('recommend'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [recommendations_service_1.RecommendationsService])
], RecommendationsController);
//# sourceMappingURL=recommendations.controller.js.map