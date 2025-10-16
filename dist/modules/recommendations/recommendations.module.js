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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const recommendations_controller_1 = require("./recommendations.controller");
const recommendations_service_1 = require("./recommendations.service");
const instant_recommendations_service_1 = require("./instant-recommendations.service");
const reviz_complete_experience_production_service_1 = require("./reviz-complete-experience-production.service");
const reviz_complete_experience_production_controller_1 = require("./reviz-complete-experience-production.controller");
const reviz_composite_experience_service_1 = require("./reviz-composite-experience.service");
const reviz_composite_experience_controller_1 = require("./reviz-composite-experience.controller");
const reviz_composite_variations_service_1 = require("./reviz-composite-variations.service");
const reviz_composite_variations_controller_1 = require("./reviz-composite-variations.controller");
const debug_controller_1 = require("./debug.controller");
const cache_warming_service_1 = require("./cache-warming.service");
const optimized_recommendations_service_1 = require("./optimized-recommendations.service");
const legacy_redirect_controller_1 = require("../legacy/legacy-redirect.controller");
const composite_recommendations_service_1 = require("./composite-recommendations.service");
const scoring_module_1 = require("../scoring/scoring.module");
const caching_module_1 = require("../caching/caching.module");
const nna_integration_module_1 = require("../nna-integration/nna-integration.module");
const analytics_module_1 = require("../analytics/analytics.module");
const compatibility_score_schema_1 = require("../../models/compatibility-score.schema");
const recommendation_cache_schema_1 = require("../../models/recommendation-cache.schema");
const asset_schema_1 = require("../../models/asset.schema");
const composite_schema_1 = require("../../models/composite.schema");
let RecommendationsModule = class RecommendationsModule {
    constructor() {
        console.error('=====================================');
        console.error('🚀 RECOMMENDATIONS MODULE STARTING');
        console.error('=====================================');
        console.error('Module loaded successfully');
        console.error('=====================================');
    }
};
exports.RecommendationsModule = RecommendationsModule;
exports.RecommendationsModule = RecommendationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: compatibility_score_schema_1.CompatibilityScore.name, schema: compatibility_score_schema_1.CompatibilityScoreSchema },
                { name: recommendation_cache_schema_1.RecommendationCache.name, schema: recommendation_cache_schema_1.RecommendationCacheSchema },
                { name: asset_schema_1.Asset.name, schema: asset_schema_1.AssetSchema },
                { name: composite_schema_1.Composite.name, schema: composite_schema_1.CompositeSchema },
            ]),
            scoring_module_1.ScoringModule,
            caching_module_1.CachingModule,
            nna_integration_module_1.NnaIntegrationModule,
            analytics_module_1.AnalyticsModule,
        ],
        controllers: [
            recommendations_controller_1.RecommendationsController,
            reviz_complete_experience_production_controller_1.ReVizCompleteExperienceProductionController,
            reviz_composite_experience_controller_1.ReVizCompositeExperienceController,
            reviz_composite_variations_controller_1.ReVizCompositeVariationsController,
            debug_controller_1.DebugController,
            legacy_redirect_controller_1.LegacyRedirectController
        ],
        providers: [
            recommendations_service_1.RecommendationsService,
            instant_recommendations_service_1.InstantRecommendationsService,
            reviz_complete_experience_production_service_1.ReVizCompleteExperienceProductionService,
            reviz_composite_experience_service_1.ReVizCompositeExperienceService,
            reviz_composite_variations_service_1.ReVizCompositeVariationsService,
            cache_warming_service_1.CacheWarmingService,
            optimized_recommendations_service_1.OptimizedRecommendationsService,
            composite_recommendations_service_1.CompositeRecommendationsService
        ],
        exports: [
            recommendations_service_1.RecommendationsService,
            instant_recommendations_service_1.InstantRecommendationsService,
            reviz_complete_experience_production_service_1.ReVizCompleteExperienceProductionService,
            reviz_composite_experience_service_1.ReVizCompositeExperienceService,
            reviz_composite_variations_service_1.ReVizCompositeVariationsService,
            cache_warming_service_1.CacheWarmingService,
            optimized_recommendations_service_1.OptimizedRecommendationsService,
            composite_recommendations_service_1.CompositeRecommendationsService
        ],
    }),
    __metadata("design:paramtypes", [])
], RecommendationsModule);
//# sourceMappingURL=recommendations.module.js.map