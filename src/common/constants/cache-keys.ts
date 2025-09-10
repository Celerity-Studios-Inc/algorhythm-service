export const CACHE_KEYS = {
  TEMPLATE_RECOMMENDATION: 'recommendation:template',
  LAYER_VARIATIONS: 'recommendation:variations',
  COMPATIBILITY_SCORES: 'scores:compatibility',
  USER_PREFERENCES: 'user:preferences',
  POPULAR_TEMPLATES: 'popular:templates',
  ANALYTICS_EVENTS: 'analytics:events',
} as const;

export const CACHE_TTL = {
  TEMPLATE_RECOMMENDATION: 300,    // 5 minutes
  LAYER_VARIATIONS: 300,          // 5 minutes
  COMPATIBILITY_SCORES: 86400,    // 24 hours
  USER_PREFERENCES: 3600,         // 1 hour
  POPULAR_TEMPLATES: 1800,        // 30 minutes
  ANALYTICS_EVENTS: 60,           // 1 minute
} as const;
