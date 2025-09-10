// AlgoRhythm Development Environment Configuration
export const developmentConfig = {
  NODE_ENV: 'development',
  ENVIRONMENT: 'development',
  PORT: 8080,

  // Database Configuration (shared with NNA Registry)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/nna-registry-service-dev?retryWrites=true&w=majority&appName=registryService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://localhost:6379',

  // Authentication (shared with NNA Registry)
  JWT_SECRET: 'dev-jwt-secret-key',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.dev.reviz.dev',
  NNA_REGISTRY_API_KEY: 'dev-api-key',

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
