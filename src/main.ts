import { existsSync, readFileSync, readdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { swaggerConfig } from './config/swagger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AnalyticsInterceptor } from './common/interceptors/analytics.interceptor';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { EnvironmentValidationService } from './config/environment-validation';
import { Request, Response, Application } from 'express';

console.log('🚀 AlgoRhythm Recommendation Engine: Starting application...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🔧 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🏭 ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('🔑 PORT:', process.env.PORT);

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

  // Validate environment configuration
  const envValidation = app.get(EnvironmentValidationService);
  envValidation.validateEnvironment();

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
    ];
  } else if (nodeEnv === 'staging') {
    allowedOrigins = [
      'https://stg.algorhythm.media',
      'https://registry.stg.reviz.dev',
    ];
  } else {
    allowedOrigins = [
      'https://algorhythm.media',
      'https://registry.reviz.dev',
      'https://reviz.app', // Production mobile app
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
    new AnalyticsInterceptor(app.get(AnalyticsService)),
  );

  // Setup Swagger documentation
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AlgoRhythm API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui.css',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🎵 AlgoRhythm Recommendation Engine running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🎯 Environment: ${nodeEnv}`);
}

bootstrap().catch(error => {
  console.error('💥 Failed to start AlgoRhythm:', error);
  process.exit(1);
});
