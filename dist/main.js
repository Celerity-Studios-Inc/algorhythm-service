"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const swagger_config_1 = require("./config/swagger.config");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const analytics_interceptor_1 = require("./common/interceptors/analytics.interceptor");
const analytics_service_1 = require("./modules/analytics/analytics.service");
const environment_validation_1 = require("./config/environment-validation");
console.log('🚀 AlgoRhythm Recommendation Engine: Starting application...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🔧 Node version:', process.version);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🏭 ENVIRONMENT:', process.env.ENVIRONMENT);
console.log('🔑 PORT:', process.env.PORT);
const dbUri = process.env.MONGODB_URI;
if (dbUri) {
    const dbName = dbUri.split('/').pop()?.split('?')[0];
    console.log('🗄️  AlgoRhythm connecting to MongoDB database:', dbName);
}
else {
    console.warn('⚠️  AlgoRhythm: MONGODB_URI is not set!');
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const envValidation = app.get(environment_validation_1.EnvironmentValidationService);
    envValidation.validateEnvironment();
    app.setGlobalPrefix('api/v1');
    const nodeEnv = process.env.NODE_ENV || process.env.ENVIRONMENT || 'production';
    let allowedOrigins;
    if (nodeEnv === 'development') {
        allowedOrigins = [
            'https://dev.algorhythm.media',
            'https://registry.dev.reviz.dev',
            'http://localhost:3000',
            'http://localhost:3001',
            'exp://localhost:8081',
        ];
    }
    else if (nodeEnv === 'staging') {
        allowedOrigins = [
            'https://stg.algorhythm.media',
            'https://registry.stg.reviz.dev',
        ];
    }
    else {
        allowedOrigins = [
            'https://algorhythm.media',
            'https://registry.reviz.dev',
            'https://reviz.app',
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
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 200,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor(), new analytics_interceptor_1.AnalyticsInterceptor(app.get(analytics_service_1.AnalyticsService)));
    const document = swagger_1.SwaggerModule.createDocument(app, swagger_config_1.swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
//# sourceMappingURL=main.js.map