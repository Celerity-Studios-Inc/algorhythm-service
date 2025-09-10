"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORING_THRESHOLDS = exports.FRESHNESS_BOOST = exports.COMPATIBILITY_WEIGHTS = void 0;
exports.COMPATIBILITY_WEIGHTS = {
    tempo: 0.30,
    genre: 0.25,
    energy: 0.20,
    style: 0.15,
    mood: 0.10,
};
exports.FRESHNESS_BOOST = {
    FIRST_WEEK: 1.20,
    FIRST_MONTH: 1.10,
    FIRST_QUARTER: 1.05,
};
exports.SCORING_THRESHOLDS = {
    MIN_RECOMMENDATION_SCORE: 0.6,
    DIVERSITY_FACTOR: 0.01,
    MAX_ALTERNATIVES: 10,
    MAX_LAYER_VARIATIONS: 8,
};
//# sourceMappingURL=compatibility-weights.js.map