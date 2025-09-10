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
const winston = require("winston");
const auth_module_1 = require("./modules/auth/auth.module");
const recommendations_module_1 = require("./modules/recommendations/recommendations.module");
const scoring_module_1 = require("./modules/scoring/scoring.module");
const nna_integration_module_1 = require("./modules/nna-integration/nna-integration.module");
const caching_module_1 = require("./modules/caching/caching.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const health_module_1 = require("./modules/health/health.module");
const seeding_module_1 = require("./modules/seeding/seeding.module");
const environment_validation_1 = require("./config/environment-validation");
const redis_config_1 = require("./config/redis.config");
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
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                    retryWrites: true,
                    w: 'majority',
                }),
                inject: [config_1.ConfigService],
            }),
            redis_config_1.RedisModule,
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
            recommendations_module_1.RecommendationsModule,
            scoring_module_1.ScoringModule,
            nna_integration_module_1.NnaIntegrationModule,
            caching_module_1.CachingModule,
            analytics_module_1.AnalyticsModule,
            health_module_1.HealthModule,
            seeding_module_1.SeedingModule,
        ],
        providers: [
            environment_validation_1.EnvironmentValidationService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map