import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AnalyticsService } from '../../modules/analytics/analytics.service';
export declare class AnalyticsInterceptor implements NestInterceptor {
    private readonly analyticsService;
    private readonly logger;
    constructor(analyticsService: AnalyticsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private trackRequest;
}
