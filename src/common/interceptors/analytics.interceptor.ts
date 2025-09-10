import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AnalyticsService } from '../../modules/analytics/analytics.service';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AnalyticsInterceptor.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const { method, url, body, user, headers } = request;

    // Skip analytics for health checks and non-API endpoints
    if (url.includes('/health') || !url.includes('/api/v1/recommend')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const responseTime = Date.now() - startTime;
          
          // Track successful requests
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
          
          // Track failed requests
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
      })
    );
  }

  private async trackRequest(data: {
    method: string;
    url: string;
    body: any;
    user: any;
    responseTime: number;
    success: boolean;
    response?: any;
    error?: string;
    sessionId?: string;
    requestId?: string;
  }): Promise<void> {
    try {
      let eventType = '';
      let eventData: any = {
        method: data.method,
        url: data.url,
        response_time_ms: data.responseTime,
        success: data.success,
        user_id: data.user?.userId,
        session_id: data.sessionId,
        request_id: data.requestId,
      };

      // Determine event type and extract relevant data
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
      } else if (data.url.includes('/recommend/variations')) {
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
    } catch (error) {
      this.logger.error('Failed to track analytics event:', error);
      // Don't throw - analytics should not break main functionality
    }
  }
}
