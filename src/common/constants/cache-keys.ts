export const CACHE_KEYS = {
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
  COMPOSITE_BY_ID: 'composite:by_id',
  LAYER_ASSETS_ALGORHYTHM: 'layer_assets:algorhythm',
} as const;

export const CACHE_TTL = {
  TEMPLATE_RECOMMENDATION: 300,    // 5 minutes
  LAYER_VARIATIONS: 300,          // 5 minutes
  COMPATIBILITY_SCORES: 86400,    // 24 hours
  USER_PREFERENCES: 3600,         // 1 hour
  POPULAR_TEMPLATES: 1800,        // 30 minutes
  ANALYTICS_EVENTS: 60,           // 1 minute
  COMPOSITE_QUERIES: 3600,         // 1 hour
  BATCH_COMPOSITES: 1800,         // 30 minutes
  PRE_COMPUTED_SCORES: 86400,     // 24 hours
  PERFORMANCE_METRICS: 300,       // 5 minutes
  COMPOSITE: 1800,                // 30 minutes
  LAYER_ASSETS: 300,              // 5 minutes
} as const;
