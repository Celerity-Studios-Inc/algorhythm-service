// AlgoRhythm Production Environment Configuration
export const productionConfig = {
  NODE_ENV: 'production',
  ENVIRONMENT: 'production',

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-production?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'algorhythm-prod-jwt-secret-key',
  
  // NNA Registry JWT Secret (for fallback verification)
  NNA_REGISTRY_JWT_SECRET: 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.reviz.dev',
  ALGORHYTHM_BASE_URL: 'https://prod.algorhythm.media',
  NNA_REGISTRY_API_KEY: 'algorhythm-prod-nna-api-key',
  
  // ReViz API Key Authentication (used for API key auth)
  REVIZ_API_KEY: 'reviz-prod-14816-10560-14098-5656-10119',

  // Logging
  LOG_LEVEL: 'warn',

  // Performance
  CACHE_DEFAULT_TTL: 300,
  SCORE_COMPUTATION_BATCH_SIZE: 1000,

  // Analytics
  ANALYTICS_ENABLED: true,
  ANALYTICS_BATCH_SIZE: 100,

  // Sentry
  SENTRY_DSN: 'https://prod-sentry-dsn@sentry.io/project',
};
