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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const analytics_event_schema_1 = require("../../models/analytics-event.schema");
const user_preference_schema_1 = require("../../models/user-preference.schema");
const cache_service_1 = require("../caching/cache.service");
const cache_keys_1 = require("../../common/constants/cache-keys");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(analyticsEventModel, userPreferenceModel, cacheService) {
        this.analyticsEventModel = analyticsEventModel;
        this.userPreferenceModel = userPreferenceModel;
        this.cacheService = cacheService;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
        this.eventQueue = [];
        this.batchSize = 100;
        this.flushInterval = 30000;
        setInterval(() => this.flushEventQueue(), this.flushInterval);
    }
    async trackEvent(eventData) {
        try {
            this.eventQueue.push({
                ...eventData,
                timestamp: new Date(),
                version: '1.0.0',
            });
            if (this.eventQueue.length >= this.batchSize) {
                await this.flushEventQueue();
            }
            await this.cacheRecentEvent(eventData);
        }
        catch (error) {
            this.logger.error('Error tracking analytics event:', error);
        }
    }
    async getRecommendationMetrics(timeRange) {
        try {
            const pipeline = [
                {
                    $match: {
                        timestamp: { $gte: timeRange.start, $lte: timeRange.end },
                        event_type: { $in: ['template_recommendation_served', 'template_selected'] },
                    },
                },
                {
                    $group: {
                        _id: '$event_type',
                        count: { $sum: 1 },
                        avg_response_time: { $avg: '$performance_metrics.response_time_ms' },
                        cache_hits: {
                            $sum: { $cond: ['$performance_metrics.cache_hit', 1, 0] },
                        },
                        songs: { $push: '$song_id' },
                        templates: { $push: '$template_id' },
                    },
                },
            ];
            const results = await this.analyticsEventModel.aggregate(pipeline);
            const recommendations = results.find(r => r._id === 'template_recommendation_served') || { count: 0, avg_response_time: 0, cache_hits: 0 };
            const selections = results.find(r => r._id === 'template_selected') || { count: 0 };
            const topSongs = await this.getTopEntities('song_id', timeRange);
            const topTemplates = await this.getTopEntities('template_id', timeRange);
            return {
                total_recommendations: recommendations.count,
                total_selections: selections.count,
                selection_rate: recommendations.count > 0 ? selections.count / recommendations.count : 0,
                avg_response_time: recommendations.avg_response_time || 0,
                cache_hit_rate: recommendations.count > 0 ? recommendations.cache_hits / recommendations.count : 0,
                top_songs: topSongs.map(item => ({ song_id: item._id, count: item.count })),
                top_templates: topTemplates.map(item => ({ template_id: item._id, count: item.count })),
            };
        }
        catch (error) {
            this.logger.error('Error getting recommendation metrics:', error);
            throw error;
        }
    }
    async getUserPreferences(userId) {
        try {
            const cacheKey = `${cache_keys_1.CACHE_KEYS.USER_PREFERENCES}:${userId}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached)
                return cached;
            const preferences = await this.userPreferenceModel.findOne({ user_id: userId });
            if (!preferences) {
                const defaultPreferences = {
                    user_id: userId,
                    preferences: {},
                    behavior_patterns: {},
                    total_recommendations: 0,
                    total_selections: 0,
                    total_completions: 0,
                    last_updated: new Date(),
                };
                await this.cacheService.set(cacheKey, defaultPreferences, cache_keys_1.CACHE_TTL.USER_PREFERENCES);
                return defaultPreferences;
            }
            await this.cacheService.set(cacheKey, preferences, cache_keys_1.CACHE_TTL.USER_PREFERENCES);
            return preferences;
        }
        catch (error) {
            this.logger.error(`Error getting user preferences for ${userId}:`, error);
            return null;
        }
    }
    async updateUserPreferences(userId, eventData) {
        try {
            await this.userPreferenceModel.findOneAndUpdate({ user_id: userId }, {
                $inc: this.buildPreferenceIncrements(eventData),
                $set: { last_updated: new Date() },
                $addToSet: this.buildPreferenceAdditions(eventData),
            }, { upsert: true, new: true });
            const cacheKey = `${cache_keys_1.CACHE_KEYS.USER_PREFERENCES}:${userId}`;
            await this.cacheService.delete(cacheKey);
        }
        catch (error) {
            this.logger.error(`Error updating user preferences for ${userId}:`, error);
        }
    }
    async getPopularTemplates(songId, limit = 10, timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
    }) {
        try {
            const matchFilter = {
                timestamp: { $gte: timeRange.start, $lte: timeRange.end },
                event_type: 'template_selected',
            };
            if (songId) {
                matchFilter.song_id = songId;
            }
            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$template_id',
                        selection_count: { $sum: 1 },
                        avg_score: { $avg: '$event_data.compatibility_score' },
                    },
                },
                { $sort: { selection_count: -1 } },
                { $limit: limit },
                {
                    $project: {
                        template_id: '$_id',
                        selection_count: 1,
                        avg_score: { $round: ['$avg_score', 3] },
                        _id: 0,
                    },
                },
            ];
            return await this.analyticsEventModel.aggregate(pipeline);
        }
        catch (error) {
            this.logger.error('Error getting popular templates:', error);
            return [];
        }
    }
    async getPerformanceMetrics(timeRange) {
        try {
            const pipeline = [
                {
                    $match: {
                        timestamp: { $gte: timeRange.start, $lte: timeRange.end },
                        'performance_metrics.response_time_ms': { $exists: true },
                    },
                },
                {
                    $group: {
                        _id: null,
                        response_times: { $push: '$performance_metrics.response_time_ms' },
                        cache_hits: { $sum: { $cond: ['$performance_metrics.cache_hit', 1, 0] } },
                        total_requests: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        avg_response_time: { $avg: '$response_times' },
                        p95_response_time: {
                            $arrayElemAt: [
                                '$response_times',
                                { $floor: { $multiply: [{ $size: '$response_times' }, 0.95] } },
                            ],
                        },
                        cache_hit_rate: { $divide: ['$cache_hits', '$total_requests'] },
                        total_requests: 1,
                    },
                },
            ];
            const results = await this.analyticsEventModel.aggregate(pipeline);
            const result = results[0] || {};
            const durationMinutes = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60);
            const requestsPerMinute = result.total_requests ? result.total_requests / durationMinutes : 0;
            return {
                avg_response_time: Math.round(result.avg_response_time || 0),
                p95_response_time: Math.round(result.p95_response_time || 0),
                cache_hit_rate: Number((result.cache_hit_rate || 0).toFixed(3)),
                error_rate: 0,
                requests_per_minute: Math.round(requestsPerMinute),
            };
        }
        catch (error) {
            this.logger.error('Error getting performance metrics:', error);
            throw error;
        }
    }
    async flushEventQueue() {
        if (this.eventQueue.length === 0)
            return;
        try {
            const events = [...this.eventQueue];
            this.eventQueue = [];
            await this.analyticsEventModel.insertMany(events.map(event => ({
                event_type: event.event_type,
                user_id: event.user_id,
                song_id: event.song_id,
                template_id: event.template_id,
                layer_type: event.layer_type,
                event_data: event,
                performance_metrics: {
                    response_time_ms: event.response_time_ms,
                    cache_hit: event.cache_hit,
                    scoring_time_ms: event.scoring_time_ms,
                    templates_evaluated: event.templates_evaluated,
                },
                timestamp: event.timestamp || new Date(),
                session_id: event.session_id,
                request_id: event.request_id,
                version: event.version || '1.0.0',
            })));
            const userEvents = events.filter(e => e.user_id);
            for (const event of userEvents) {
                await this.updateUserPreferences(event.user_id, event);
            }
            this.logger.debug(`Flushed ${events.length} analytics events`);
        }
        catch (error) {
            this.logger.error('Error flushing analytics events:', error);
            this.eventQueue.unshift(...this.eventQueue);
        }
    }
    async cacheRecentEvent(eventData) {
        try {
            const key = `${cache_keys_1.CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
            const recentEvents = await this.cacheService.get(key) || [];
            recentEvents.unshift(eventData);
            if (recentEvents.length > 100) {
                recentEvents.splice(100);
            }
            await this.cacheService.set(key, recentEvents, cache_keys_1.CACHE_TTL.ANALYTICS_EVENTS);
        }
        catch (error) {
            this.logger.error('Error caching recent event:', error);
        }
    }
    async getTopEntities(field, timeRange, limit = 5) {
        try {
            const pipeline = [
                {
                    $match: {
                        timestamp: { $gte: timeRange.start, $lte: timeRange.end },
                        [field]: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: `${field}`,
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: limit },
                {
                    $project: {
                        [field]: '$_id',
                        count: 1,
                        _id: 0,
                    },
                },
            ];
            return await this.analyticsEventModel.aggregate(pipeline);
        }
        catch (error) {
            this.logger.error(`Error getting top ${field}:`, error);
            return [];
        }
    }
    buildPreferenceIncrements(eventData) {
        const increments = {};
        switch (eventData.event_type) {
            case 'template_recommendation_served':
                increments.total_recommendations = 1;
                break;
            case 'template_selected':
                increments.total_selections = 1;
                break;
            case 'remix_completed':
                increments.total_completions = 1;
                break;
        }
        return increments;
    }
    buildPreferenceAdditions(eventData) {
        const additions = {};
        if (eventData.event_type === 'template_selected' && eventData.template_id) {
            additions['preferences.preferred_templates'] = eventData.template_id;
        }
        return additions;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(analytics_event_schema_1.AnalyticsEvent.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_preference_schema_1.UserPreference.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        cache_service_1.CacheService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map