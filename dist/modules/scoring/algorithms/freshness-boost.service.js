"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreshnessBoostService = void 0;
const common_1 = require("@nestjs/common");
const compatibility_weights_1 = require("../../../common/constants/compatibility-weights");
let FreshnessBoostService = class FreshnessBoostService {
    calculateBoost(createdAt) {
        if (!createdAt)
            return 1.0;
        const now = new Date();
        const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) {
            return compatibility_weights_1.FRESHNESS_BOOST.FIRST_WEEK;
        }
        else if (ageInDays < 30) {
            return compatibility_weights_1.FRESHNESS_BOOST.FIRST_MONTH;
        }
        else if (ageInDays < 90) {
            return compatibility_weights_1.FRESHNESS_BOOST.FIRST_QUARTER;
        }
        return 1.0;
    }
    getBoostedScore(baseScore, createdAt) {
        const boost = this.calculateBoost(createdAt);
        return Math.min(baseScore * boost, 1.0);
    }
};
exports.FreshnessBoostService = FreshnessBoostService;
exports.FreshnessBoostService = FreshnessBoostService = __decorate([
    (0, common_1.Injectable)()
], FreshnessBoostService);
//# sourceMappingURL=freshness-boost.service.js.map