"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const scoring_service_1 = require("./scoring.service");
const rule_based_scoring_service_1 = require("./algorithms/rule-based-scoring.service");
const freshness_boost_service_1 = require("./algorithms/freshness-boost.service");
const diversity_service_1 = require("./algorithms/diversity.service");
const compatibility_score_schema_1 = require("../../models/compatibility-score.schema");
let ScoringModule = class ScoringModule {
};
exports.ScoringModule = ScoringModule;
exports.ScoringModule = ScoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: compatibility_score_schema_1.CompatibilityScore.name, schema: compatibility_score_schema_1.CompatibilityScoreSchema },
            ]),
        ],
        providers: [
            scoring_service_1.ScoringService,
            rule_based_scoring_service_1.RuleBasedScoringService,
            freshness_boost_service_1.FreshnessBoostService,
            diversity_service_1.DiversityService,
        ],
        exports: [scoring_service_1.ScoringService],
    })
], ScoringModule);
//# sourceMappingURL=scoring.module.js.map