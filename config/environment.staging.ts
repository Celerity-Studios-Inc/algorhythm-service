// AlgoRhythm Staging Environment Configuration
export const stagingConfig = {
  NODE_ENV: 'staging',
  ENVIRONMENT: 'staging',

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-staging?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'algorhythm-stg-jwt-secret-key',
  
  // NNA Registry JWT Secret (for fallback verification)
  NNA_REGISTRY_JWT_SECRET: '6156d9df271a1fcc2f3f631112a8a7d8fafd710df5d99cab0bf865328c19c896',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.stg.reviz.dev',
  ALGORHYTHM_BASE_URL: 'https://stg.algorhythm.media',
  NNA_REGISTRY_API_KEY: 'algorhythm-stg-nna-api-key',
  
  // ReViz API Key Authentication (used for API key auth)
  REVIZ_API_KEY: 'reviz-stg-22280-20750-3046-22387-16913',

  // Logging
  LOG_LEVEL: 'info',

  // Performance
  CACHE_DEFAULT_TTL: 300,
  SCORE_COMPUTATION_BATCH_SIZE: 1000,

  // Analytics
  ANALYTICS_ENABLED: true,
  ANALYTICS_BATCH_SIZE: 100,

  // Sentry
  SENTRY_DSN: 'https://stg-sentry-dsn@sentry.io/project',
};
