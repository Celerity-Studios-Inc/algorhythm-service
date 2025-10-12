// AlgoRhythm Development Environment Configuration
export const developmentConfig = {
  NODE_ENV: 'development',
  ENVIRONMENT: 'development',

  // Database Configuration (AlgoRhythm-specific database)
  MONGODB_URI: 'mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev?retryWrites=true&w=majority&appName=algorhythmService',

  // Redis Configuration (shared with NNA Registry)
  REDIS_URL: 'redis://10.0.0.3:6379',

  // Authentication (AlgoRhythm-specific JWT)
  JWT_SECRET: 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39',
  
  // NNA Registry JWT Secret (for fallback verification)
  NNA_REGISTRY_JWT_SECRET: 'a0cdf9eff0b7393cf499c2db888638f71362615fe63599ec78cf7095d1973f39',

  // NNA Registry Integration
  NNA_REGISTRY_BASE_URL: 'https://registry.dev.reviz.dev',
  ALGORHYTHM_BASE_URL: 'https://dev.algorhythm.media',
  NNA_REGISTRY_API_KEY: 'algorhythm-dev-nna-api-key',
  
  // ReViz API Key Authentication (used for API key auth)
  REVIZ_API_KEY: 'algorhythm-dev-api-key-2025',

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
