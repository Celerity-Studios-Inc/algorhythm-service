"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiversityService = void 0;
const common_1 = require("@nestjs/common");
const compatibility_weights_1 = require("../../../common/constants/compatibility-weights");
let DiversityService = class DiversityService {
    applyDiversityBoost(recommendations, maxResults = 10) {
        if (recommendations.length <= maxResults) {
            return this.addRandomTieBreaker(recommendations);
        }
        const diverseRecommendations = [];
        const used = new Set();
        const styleFamilies = this.groupByStyleFamily(recommendations);
        for (const [family, templates] of styleFamilies.entries()) {
            if (diverseRecommendations.length >= maxResults)
                break;
            const bestFromFamily = templates
                .filter(t => !used.has(t.template_id))
                .sort((a, b) => b.compatibility_score - a.compatibility_score)[0];
            if (bestFromFamily) {
                diverseRecommendations.push(bestFromFamily);
                used.add(bestFromFamily.template_id);
            }
        }
        const remainingSlots = maxResults - diverseRecommendations.length;
        if (remainingSlots > 0) {
            const remaining = recommendations
                .filter(t => !used.has(t.template_id))
                .sort((a, b) => b.compatibility_score - a.compatibility_score)
                .slice(0, remainingSlots);
            diverseRecommendations.push(...remaining);
        }
        return this.addRandomTieBreaker(diverseRecommendations);
    }
    groupByStyleFamily(recommendations) {
        const families = new Map();
        for (const recommendation of recommendations) {
            const family = this.determineStyleFamily(recommendation);
            if (!families.has(family)) {
                families.set(family, []);
            }
            families.get(family).push(recommendation);
        }
        return families;
    }
    determineStyleFamily(recommendation) {
        const tags = recommendation.metadata.tags || [];
        const lowerTags = tags.map(tag => tag.toLowerCase());
        if (lowerTags.some(tag => ['modern', 'futuristic', 'tech'].includes(tag))) {
            return 'modern';
        }
        else if (lowerTags.some(tag => ['vintage', 'retro', 'classic'].includes(tag))) {
            return 'vintage';
        }
        else if (lowerTags.some(tag => ['colorful', 'vibrant', 'bright'].includes(tag))) {
            return 'vibrant';
        }
        else if (lowerTags.some(tag => ['dark', 'moody', 'dramatic'].includes(tag))) {
            return 'dramatic';
        }
        else if (lowerTags.some(tag => ['minimal', 'clean', 'simple'].includes(tag))) {
            return 'minimal';
        }
        return 'general';
    }
    addRandomTieBreaker(recommendations) {
        return recommendations.map(rec => ({
            ...rec,
            compatibility_score: rec.compatibility_score * (1 + Math.random() * compatibility_weights_1.SCORING_THRESHOLDS.DIVERSITY_FACTOR),
        })).sort((a, b) => b.compatibility_score - a.compatibility_score);
    }
};
exports.DiversityService = DiversityService;
exports.DiversityService = DiversityService = __decorate([
    (0, common_1.Injectable)()
], DiversityService);
//# sourceMappingURL=diversity.service.js.map