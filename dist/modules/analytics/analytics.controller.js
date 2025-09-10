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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getRecommendationMetrics(start, end) {
        const metrics = await this.analyticsService.getRecommendationMetrics({ start, end });
        return {
            success: true,
            data: metrics,
            metadata: {
                timestamp: new Date().toISOString(),
                time_range: { start, end },
            },
        };
    }
    async getPerformanceMetrics(start, end) {
        const metrics = await this.analyticsService.getPerformanceMetrics({ start, end });
        return {
            success: true,
            data: metrics,
            metadata: {
                timestamp: new Date().toISOString(),
                time_range: { start, end },
            },
        };
    }
    async getPopularTemplates(songId, limit) {
        const templates = await this.analyticsService.getPopularTemplates(songId, limit);
        return {
            success: true,
            data: templates,
            metadata: {
                timestamp: new Date().toISOString(),
                filters: { song_id: songId, limit },
            },
        };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get recommendation metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Metrics retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'start', type: Date, description: 'Start date for metrics' }),
    (0, swagger_1.ApiQuery)({ name: 'end', type: Date, description: 'End date for metrics' }),
    (0, common_1.Get)('metrics/recommendations'),
    (0, roles_decorator_1.Roles)('admin', 'analyst'),
    __param(0, (0, common_1.Query)('start', new common_1.DefaultValuePipe(new Date(Date.now() - 24 * 60 * 60 * 1000)), common_1.ParseDatePipe)),
    __param(1, (0, common_1.Query)('end', new common_1.DefaultValuePipe(new Date()), common_1.ParseDatePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Date,
        Date]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getRecommendationMetrics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get performance metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Performance metrics retrieved successfully' }),
    (0, common_1.Get)('metrics/performance'),
    (0, roles_decorator_1.Roles)('admin', 'analyst'),
    __param(0, (0, common_1.Query)('start', new common_1.DefaultValuePipe(new Date(Date.now() - 60 * 60 * 1000)), common_1.ParseDatePipe)),
    __param(1, (0, common_1.Query)('end', new common_1.DefaultValuePipe(new Date()), common_1.ParseDatePipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Date,
        Date]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPerformanceMetrics", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get popular templates' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Popular templates retrieved successfully' }),
    (0, common_1.Get)('popular/templates'),
    __param(0, (0, common_1.Query)('song_id')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPopularTemplates", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map