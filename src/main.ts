import { existsSync, readFileSync, readdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { swaggerConfig } from './config/swagger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AnalyticsInterceptor } from './common/interceptors/analytics.interceptor';
// import { AnalyticsService } from './modules/analytics/analytics.service'; // Disabled for minimal deployment
import { EnvironmentValidationService } from './config/environment-validation';
import { Request, Response, Application } from 'express';
import { createHash } from 'crypto';

console.log('🚀 AlgoRhythm Recommendation Engine: Starting application...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🔧 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🏭 ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('🔑 PORT:', process.env.PORT);
console.log('🌐 Binding to: 0.0.0.0:' + (process.env.PORT || 3000));
console.log('🗄️ Database:', process.env.MONGODB_URI ? 'configured' : 'not configured');
console.log('🔐 JWT Secret:', process.env.JWT_SECRET ? 'configured' : 'not configured');
console.log('🔗 Webhook Secret:', process.env.WEBHOOK_SECRET ? 'configured' : 'not configured');

// Log the MongoDB database in use at startup
const dbUri = process.env.MONGODB_URI;
if (dbUri) {
  const dbName = dbUri.split('/').pop()?.split('?')[0];
  console.log('🗄️  AlgoRhythm connecting to MongoDB database:', dbName);
} else {
  console.warn('⚠️  AlgoRhythm: MONGODB_URI is not set!');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validate environment configuration (skip in Cloud Run to avoid startup issues)
  try {
    const envValidation = app.get(EnvironmentValidationService);
    envValidation.validateEnvironment();
  } catch (error) {
    console.log('⚠️ Environment validation skipped:', error.message);
  }

  // Add simple health endpoint before global prefix
  app.use('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'algorhythm-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      port: parseInt(process.env.PORT || '3000'),
      uptime: process.uptime(),
      nodeVersion: process.version
    });
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Enable CORS with specific origins based on environment
  const nodeEnv = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production';
  let allowedOrigins: string[];
  
  if (nodeEnv === 'development') {
    allowedOrigins = [
      'https://dev.algorhythm.media',
      'https://registry.dev.reviz.dev',
      'http://localhost:3000',
      'http://localhost:3001',
      'exp://localhost:8081', // Expo dev
      'exp://192.168.1.100:8081', // Expo dev on network
      'exp://10.0.2.2:8081', // Android emulator
      'exp://192.168.0.100:8081', // iOS simulator
      'http://localhost:8081', // Metro bundler
      'http://192.168.1.100:8081', // Network Metro
    ];
  } else if (nodeEnv === 'staging') {
    allowedOrigins = [
      'https://stg.algorhythm.media',
      'https://registry.stg.reviz.dev',
      'https://stg.reviz.app', // Staging mobile app
    ];
  } else {
    allowedOrigins = [
      'https://algorhythm.media',
      'https://registry.reviz.dev',
      'https://reviz.app', // Production mobile app
      'https://app.reviz.dev', // Alternative production domain
    ];
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-User-Context',
      'X-Request-ID',
      'X-API-Key',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Response-Time', 'X-Cache-Status'],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200,
  });

  // Global pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    // AnalyticsInterceptor disabled for minimal deployment
    // new AnalyticsInterceptor(app.get(AnalyticsService)),
  );

  // Setup Swagger documentation
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AlgoRhythm API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui.css',
  });

  // Serve OpenAPI JSON at well-known path with caching and ETag support
  try {
    const documentJson = JSON.stringify(document);
    const etag = createHash('sha256').update(documentJson).digest('hex').substring(0, 16);

    app.use('/.well-known/openapi.json', (req: Request, res: Response) => {
      const clientEtag = req.headers['if-none-match'];

      if (clientEtag === `"${etag}"`) {
        return res
          .status(304)
          .setHeader('ETag', `"${etag}"`)
          .setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
          .end();
      }

      res
        .status(200)
        .setHeader('Content-Type', 'application/json; charset=utf-8')
        .setHeader('ETag', `"${etag}"`)
        .setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
        .setHeader('Access-Control-Allow-Origin', '*')
        .setHeader('Access-Control-Expose-Headers', 'ETag')
        .setHeader('X-API-Version', '1.0.0')
        .setHeader('X-Contract-Hash', etag)
        .send(documentJson);
    });

    console.log(`📋 OpenAPI spec will be served at /.well-known/openapi.json (ETag: "${etag}")`);
  } catch (err) {
    console.warn('⚠️ Failed to initialize OpenAPI well-known handler:', err instanceof Error ? err.message : err);
  }

  const port = process.env.PORT || 3000;
  
  // ✅ FIX: Bind to 0.0.0.0 for Cloud Run compatibility
  await app.listen(port, '0.0.0.0');
  
  console.log(`🎵 AlgoRhythm Recommendation Engine running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🎯 Environment: ${nodeEnv}`);
  console.log(`🌐 Binding to: 0.0.0.0:${port}`);
}

bootstrap().catch(error => {
  console.error('💥 Failed to start AlgoRhythm:', error);
  process.exit(1);
});
