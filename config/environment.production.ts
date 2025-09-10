// AlgoRhythm Production Environment Configuration
export const productionConfig = {
  NODE_ENV: 'production',
  ENVIRONMENT: 'production',
  PORT: 8080,

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-production?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'algorhythm-prod-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.reviz.dev',
  ALGORHYTHM_BASE_URL: 'https://prod.algorhythm.dev',
  NNA_REGISTRY_API_KEY: 'algorhythm-prod-nna-api-key',

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
