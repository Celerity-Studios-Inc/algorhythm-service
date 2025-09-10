// AlgoRhythm Staging Environment Configuration
export const stagingConfig = {
  NODE_ENV: 'staging',
  ENVIRONMENT: 'staging',
  PORT: 8080,

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-staging?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'algorhythm-stg-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.stg.reviz.dev',
  NNA_REGISTRY_API_KEY: 'algorhythm-stg-nna-api-key',

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
