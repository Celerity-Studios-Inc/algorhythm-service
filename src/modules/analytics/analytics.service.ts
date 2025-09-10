import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../../models/analytics-event.schema';
import { UserPreference } from '../../models/user-preference.schema';
import { CacheService } from '../caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants/cache-keys';

interface AnalyticsEventData {
  event_type: string;
  user_id?: string;
  song_id?: string;
  template_id?: string;
  layer_type?: string;
  compatibility_score?: number;
  alternatives_count?: number;
  variations_count?: number;
  cache_hit?: boolean;
  response_time_ms?: number;
  scoring_time_ms?: number;
  templates_evaluated?: number;
  variations_evaluated?: number;
  session_id?: string;
  request_id?: string;
  [key: string]: any;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private eventQueue: AnalyticsEventData[] = [];
  private readonly batchSize = 100;
  private readonly flushInterval = 30000; // 30 seconds

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEvent>,
    @InjectModel(UserPreference.name)
    private readonly userPreferenceModel: Model<UserPreference>,
    private readonly cacheService: CacheService,
  ) {
    // Start periodic batch processing
    setInterval(() => this.flushEventQueue(), this.flushInterval);
  }

  async trackEvent(eventData: AnalyticsEventData): Promise<void> {
    try {
      // Add to queue for batch processing
      this.eventQueue.push({
        ...eventData,
        timestamp: new Date(),
        version: '1.0.0',
      });

      // Flush if batch size reached
      if (this.eventQueue.length >= this.batchSize) {
        await this.flushEventQueue();
      }

      // Cache event for real-time analytics
      await this.cacheRecentEvent(eventData);

    } catch (error) {
      this.logger.error('Error tracking analytics event:', error);
      // Don't throw error - analytics should not break main functionality
    }
  }

  async getRecommendationMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    total_recommendations: number;
    total_selections: number;
    selection_rate: number;
    avg_response_time: number;
    cache_hit_rate: number;
    top_songs: Array<{ song_id: string; count: number }>;
    top_templates: Array<{ template_id: string; count: number }>;
  }> {
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

      // Get top songs and templates
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
    } catch (error) {
      this.logger.error('Error getting recommendation metrics:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.USER_PREFERENCES}:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      // Get from database
      const preferences = await this.userPreferenceModel.findOne({ user_id: userId });
      
      if (!preferences) {
        // Create default preferences
        const defaultPreferences = {
          user_id: userId,
          preferences: {},
          behavior_patterns: {},
          total_recommendations: 0,
          total_selections: 0,
          total_completions: 0,
          last_updated: new Date(),
        };

        await this.cacheService.set(cacheKey, defaultPreferences, CACHE_TTL.USER_PREFERENCES);
        return defaultPreferences;
      }

      // Cache the result
      await this.cacheService.set(cacheKey, preferences, CACHE_TTL.USER_PREFERENCES);
      return preferences;
    } catch (error) {
      this.logger.error(`Error getting user preferences for ${userId}:`, error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, eventData: AnalyticsEventData): Promise<void> {
    try {
      // Update user behavior based on event
      await this.userPreferenceModel.findOneAndUpdate(
        { user_id: userId },
        {
          $inc: this.buildPreferenceIncrements(eventData),
          $set: { last_updated: new Date() },
          $addToSet: this.buildPreferenceAdditions(eventData),
        },
        { upsert: true, new: true }
      );

      // Invalidate cache
      const cacheKey = `${CACHE_KEYS.USER_PREFERENCES}:${userId}`;
      await this.cacheService.delete(cacheKey);

    } catch (error) {
      this.logger.error(`Error updating user preferences for ${userId}:`, error);
    }
  }

  async getPopularTemplates(
    songId?: string,
    limit: number = 10,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date(),
    }
  ): Promise<Array<{ template_id: string; selection_count: number; avg_score: number }>> {
    try {
      const matchFilter: any = {
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
        { $sort: { selection_count: -1 as const } },
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
    } catch (error) {
      this.logger.error('Error getting popular templates:', error);
      return [];
    }
  }

  async getPerformanceMetrics(timeRange: { start: Date; end: Date }): Promise<{
    avg_response_time: number;
    p95_response_time: number;
    cache_hit_rate: number;
    error_rate: number;
    requests_per_minute: number;
  }> {
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
        error_rate: 0, // Would need error events to calculate
        requests_per_minute: Math.round(requestsPerMinute),
      };
    } catch (error) {
      this.logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      // Insert events in batch
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

      // Update user preferences for events with user_id
      const userEvents = events.filter(e => e.user_id);
      for (const event of userEvents) {
        await this.updateUserPreferences(event.user_id!, event);
      }

      this.logger.debug(`Flushed ${events.length} analytics events`);
    } catch (error) {
      this.logger.error('Error flushing analytics events:', error);
      // Add events back to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  private async cacheRecentEvent(eventData: AnalyticsEventData): Promise<void> {
    try {
      const key = `${CACHE_KEYS.ANALYTICS_EVENTS}:recent`;
      const recentEvents = await this.cacheService.get(key) || [];
      
      (recentEvents as any[]).unshift(eventData);
      // Keep only last 100 events
      if ((recentEvents as any[]).length > 100) {
        (recentEvents as any[]).splice(100);
      }

      await this.cacheService.set(key, recentEvents, CACHE_TTL.ANALYTICS_EVENTS);
    } catch (error) {
      this.logger.error('Error caching recent event:', error);
    }
  }

  private async getTopEntities(
    field: string,
    timeRange: { start: Date; end: Date },
    limit: number = 5
  ): Promise<Array<{ [key: string]: any; count: number }>> {
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
        { $sort: { count: -1 as const } },
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
    } catch (error) {
      this.logger.error(`Error getting top ${field}:`, error);
      return [];
    }
  }

  private buildPreferenceIncrements(eventData: AnalyticsEventData): any {
    const increments: any = {};

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

  private buildPreferenceAdditions(eventData: AnalyticsEventData): any {
    const additions: any = {};

    // Track preferred genres, templates, etc.
    if (eventData.event_type === 'template_selected' && eventData.template_id) {
      additions['preferences.preferred_templates'] = eventData.template_id;
    }

    return additions;
  }
}
