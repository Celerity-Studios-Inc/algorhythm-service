"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.CACHE_KEYS = void 0;
exports.CACHE_KEYS = {
    TEMPLATE_RECOMMENDATION: 'recommendation:template',
    LAYER_VARIATIONS: 'recommendation:variations',
    COMPATIBILITY_SCORES: 'scores:compatibility',
    USER_PREFERENCES: 'user:preferences',
    POPULAR_TEMPLATES: 'popular:templates',
    ANALYTICS_EVENTS: 'analytics:events',
    COMPOSITE_QUERIES: 'composite:queries',
    BATCH_COMPOSITES: 'batch:composites',
    PRE_COMPUTED_SCORES: 'precomputed:scores',
    PERFORMANCE_METRICS: 'performance:metrics',
};
exports.CACHE_TTL = {
    TEMPLATE_RECOMMENDATION: 300,
    LAYER_VARIATIONS: 300,
    COMPATIBILITY_SCORES: 86400,
    USER_PREFERENCES: 3600,
    POPULAR_TEMPLATES: 1800,
    ANALYTICS_EVENTS: 60,
    COMPOSITE_QUERIES: 3600,
    BATCH_COMPOSITES: 1800,
    PRE_COMPUTED_SCORES: 86400,
    PERFORMANCE_METRICS: 300,
};
//# sourceMappingURL=cache-keys.js.map