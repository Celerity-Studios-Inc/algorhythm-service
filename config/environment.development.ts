// AlgoRhythm Development Environment Configuration
export const developmentConfig = {
  NODE_ENV: 'development',
  ENVIRONMENT: 'development',
  PORT: 8080,

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'algorhythm-dev-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.dev.reviz.dev',
  NNA_REGISTRY_API_KEY: 'algorhythm-dev-nna-api-key',

  // Logging
  LOG_LEVEL: 'debug',

  // Performance
  CACHE_DEFAULT_TTL: 300,
  SCORE_COMPUTATION_BATCH_SIZE: 1000,

  // Analytics
  ANALYTICS_ENABLED: true,
  ANALYTICS_BATCH_SIZE: 100,

  // Sentry (optional in development)
  SENTRY_DSN: '',
};
