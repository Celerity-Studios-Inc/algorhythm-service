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
var AnalyticsInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const analytics_service_1 = require("../../modules/analytics/analytics.service");
let AnalyticsInterceptor = AnalyticsInterceptor_1 = class AnalyticsInterceptor {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(AnalyticsInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();
        const { method, url, body, user, headers } = request;
        if (url.includes('/health') || !url.includes('/api/v1/recommend')) {
            return next.handle();
        }
        return next.handle().pipe((0, rxjs_1.tap)({
            next: (responseData) => {
                const responseTime = Date.now() - startTime;
                this.trackRequest({
                    method,
                    url,
                    body,
                    user,
                    responseTime,
                    success: true,
                    response: responseData,
                    sessionId: headers['x-session-id'],
                    requestId: headers['x-request-id'],
                });
            },
            error: (error) => {
                const responseTime = Date.now() - startTime;
                this.trackRequest({
                    method,
                    url,
                    body,
                    user,
                    responseTime,
                    success: false,
                    error: error.message,
                    sessionId: headers['x-session-id'],
                    requestId: headers['x-request-id'],
                });
            }
        }));
    }
    async trackRequest(data) {
        try {
            let eventType = '';
            let eventData = {
                method: data.method,
                url: data.url,
                response_time_ms: data.responseTime,
                success: data.success,
                user_id: data.user?.userId,
                session_id: data.sessionId,
                request_id: data.requestId,
            };
            if (data.url.includes('/recommend/template')) {
                eventType = 'template_recommendation_served';
                if (data.body) {
                    eventData.song_id = data.body.song_id;
                    eventData.user_context = data.body.user_context;
                }
                if (data.response?.data) {
                    eventData.template_id = data.response.data.recommendation?.template_id;
                    eventData.compatibility_score = data.response.data.recommendation?.compatibility_score;
                    eventData.alternatives_count = data.response.data.alternatives?.length || 0;
                    eventData.cache_hit = data.response.performance_metrics?.cache_hit;
                }
            }
            else if (data.url.includes('/recommend/variations')) {
                eventType = 'layer_variations_requested';
                if (data.body) {
                    eventData.template_id = data.body.current_template_id;
                    eventData.song_id = data.body.song_id;
                    eventData.vary_layer = data.body.vary_layer;
                    eventData.layer_type = data.body.vary_layer;
                }
                if (data.response?.data) {
                    eventData.variations_count = data.response.data.variations?.length || 0;
                    eventData.cache_hit = data.response.performance_metrics?.cache_hit;
                }
            }
            if (eventType) {
                await this.analyticsService.trackEvent({
                    event_type: eventType,
                    ...eventData,
                    error_message: data.error,
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to track analytics event:', error);
        }
    }
};
exports.AnalyticsInterceptor = AnalyticsInterceptor;
exports.AnalyticsInterceptor = AnalyticsInterceptor = AnalyticsInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsInterceptor);
//# sourceMappingURL=analytics.interceptor.js.map