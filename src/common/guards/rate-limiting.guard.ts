import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

@Injectable()
export class RateLimitingGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitingGuard.name);
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  private readonly config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientId = this.getClientIdentifier(request);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    // Get or create client record
    const clientRecord = this.requestCounts.get(clientId) || { count: 0, resetTime: now + this.config.windowMs };
    
    // Check if window has expired
    if (now > clientRecord.resetTime) {
      clientRecord.count = 0;
      clientRecord.resetTime = now + this.config.windowMs;
    }

    // Increment request count
    clientRecord.count++;
    this.requestCounts.set(clientId, clientRecord);

    // Check rate limit
    if (clientRecord.count > this.config.maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for client ${clientId}: ${clientRecord.count}/${this.config.maxRequests} requests in ${this.config.windowMs}ms`
      );
      
      throw new HttpException(
        {
          success: false,
          error: {
            status: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((clientRecord.resetTime - now) / 1000),
          },
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIdentifier(request: Request): string {
    // Use IP address as primary identifier
    const ip = request.ip || 
               request.connection.remoteAddress || 
               request.socket.remoteAddress ||
               (request.connection as any)?.socket?.remoteAddress ||
               'unknown';
    
    // Add user agent for additional uniqueness
    const userAgent = request.get('User-Agent') || 'unknown';
    
    return `${ip}-${userAgent}`.substring(0, 100); // Limit length
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [clientId, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(clientId);
      }
    }
  }
}
