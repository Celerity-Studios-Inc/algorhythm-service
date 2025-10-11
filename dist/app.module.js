"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const nest_winston_1 = require("nest-winston");
const core_1 = require("@nestjs/core");
const winston = require("winston");
const auth_module_1 = require("./modules/auth/auth.module");
const recommendations_module_1 = require("./modules/recommendations/recommendations.module");
const scoring_module_1 = require("./modules/scoring/scoring.module");
const nna_integration_module_1 = require("./modules/nna-integration/nna-integration.module");
const caching_module_1 = require("./modules/caching/caching.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const health_module_1 = require("./modules/health/health.module");
const seeding_module_1 = require("./modules/seeding/seeding.module");
const daemon_module_1 = require("./modules/daemon/daemon.module");
const environment_validation_1 = require("./config/environment-validation");
const redis_config_1 = require("./config/redis.config");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const error_logging_interceptor_1 = require("./common/interceptors/error-logging.interceptor");
const rate_limiting_guard_1 = require("./common/guards/rate-limiting.guard");
const health_monitor_service_1 = require("./common/services/health-monitor.service");
const algorhythm_module_1 = require("./modules/algorhythm/algorhythm.module");
const webhook_module_1 = require("./modules/webhooks/webhook.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    `.env.${process.env.NODE_ENV || 'development'}`,
                    '.env',
                ],
            }),
            ...(process.env.MONGODB_URI ? [mongoose_1.MongooseModule.forRootAsync({
                    imports: [config_1.ConfigModule],
                    useFactory: async (configService) => {
                        const mongoUri = configService.get('MONGODB_URI');
                        console.log('🗄️  MongoDB URI: cloud-database');
                        return {
                            uri: mongoUri,
                            retryWrites: true,
                            w: 'majority',
                        };
                    },
                    inject: [config_1.ConfigService],
                })] : []),
            ...(process.env.REDIS_URL ? [redis_config_1.RedisModule] : []),
            throttler_1.ThrottlerModule.forRoot({
                ttl: 60000,
                limit: 100,
            }),
            nest_winston_1.WinstonModule.forRoot({
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context }) => {
                            return `[${timestamp}] ${level}: [${context}] ${message}`;
                        })),
                    }),
                    new winston.transports.File({
                        filename: 'logs/algorhythm-error.log',
                        level: 'error',
                        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                    }),
                    new winston.transports.File({
                        filename: 'logs/algorhythm-combined.log',
                        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                    }),
                ],
            }),
            auth_module_1.AuthModule,
            nna_integration_module_1.NnaIntegrationModule,
            algorhythm_module_1.AlgorhythmModule,
            webhook_module_1.WebhookModule,
            ...(process.env.MONGODB_URI ? [
                recommendations_module_1.RecommendationsModule,
                scoring_module_1.ScoringModule,
                seeding_module_1.SeedingModule,
                daemon_module_1.DaemonModule,
                analytics_module_1.AnalyticsModule,
                health_module_1.HealthModule,
            ] : []),
            ...(process.env.REDIS_URL ? [caching_module_1.CachingModule] : []),
        ],
        providers: [
            environment_validation_1.EnvironmentValidationService,
            health_monitor_service_1.HealthMonitorService,
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: error_logging_interceptor_1.ErrorLoggingInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: rate_limiting_guard_1.RateLimitingGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map