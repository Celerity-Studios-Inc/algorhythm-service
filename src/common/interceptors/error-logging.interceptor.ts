import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body, query, params } = request;
    
    const startTime = Date.now();
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    request.requestId = requestId;

    this.logger.log(`🚀 Request started: ${method} ${url} [${requestId}]`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`✅ Request completed: ${method} ${url} [${requestId}] - ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Enhanced error logging
        this.logger.error(
          `❌ Request failed: ${method} ${url} [${requestId}] - ${duration}ms`,
          {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            request: {
              method,
              url,
              headers: this.sanitizeHeaders(headers),
              body: this.sanitizeBody(body),
              query,
              params,
            },
            duration,
            timestamp: new Date().toISOString(),
          }
        );

        return throwError(() => error);
      })
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.key;
    
    return sanitized;
  }
}
