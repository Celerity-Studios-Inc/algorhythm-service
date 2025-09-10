"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const health_service_1 = require("./health.service");
let HealthController = class HealthController {
    constructor(healthService) {
        this.healthService = healthService;
    }
    async getHealth() {
        return await this.healthService.getHealthStatus();
    }
    async getSystemInfo() {
        return await this.healthService.getSystemInfo();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get service health status' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Health status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                version: { type: 'string' },
                uptime_seconds: { type: 'number' },
                timestamp: { type: 'string' },
                services: {
                    type: 'object',
                    properties: {
                        database: { type: 'object' },
                        cache: { type: 'object' },
                        nna_registry: { type: 'object' },
                    },
                },
                metrics: { type: 'object' },
            },
        },
    }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed system information' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'System info retrieved successfully' }),
    (0, common_1.Get)('info'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getSystemInfo", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService])
], HealthController);
//# sourceMappingURL=health.controller.js.map