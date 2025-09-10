import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    // Generate request ID for tracking
    const requestId = this.generateRequestId();
    request.requestId = requestId;
    response.setHeader('X-Request-ID', requestId);

    this.logger.log(
      `➡️  ${method} ${url} - ${ip} - ${userAgent.substring(0, 100)} [${requestId}]`
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;
          
          this.logger.log(
            `⬅️  ${method} ${url} - ${statusCode} - ${responseTime}ms [${requestId}]`
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `❌ ${method} ${url} - ${statusCode} - ${responseTime}ms - ${error.message} [${requestId}]`
          );
        }
      })
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
