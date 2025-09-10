// AlgoRhythm Production Environment Configuration
export const productionConfig = {
  NODE_ENV: 'production',
  ENVIRONMENT: 'production',
  PORT: 8080,

  // Database Configuration (shared with NNA Registry)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-production?retryWrites=true&w=majority&appName=registryService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://redis.reviz.dev:6379',

  // Authentication (shared with NNA Registry)
  JWT_SECRET: 'prod-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.reviz.dev',
  NNA_REGISTRY_API_KEY: 'prod-api-key',

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
