// AlgoRhythm Staging Environment Configuration
export const stagingConfig = {
  NODE_ENV: 'staging',
  ENVIRONMENT: 'staging',
  PORT: 8080,

  // Database Configuration (shared with NNA Registry)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-staging?retryWrites=true&w=majority&appName=registryService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://redis.stg.reviz.dev:6379',

  // Authentication (shared with NNA Registry)
  JWT_SECRET: 'stg-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.stg.reviz.dev',
  NNA_REGISTRY_API_KEY: 'stg-api-key',

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
