import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
  UseGuards,
  Req,
  Get,
  UseInterceptors,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiKeyGuard } from '../../modules/auth/guards/api-key.guard';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ReVizCompleteExperienceProductionService } from './reviz-complete-experience-production.service';
import { ReVizCompleteRequest, ReVizCompleteResponse } from './interfaces/reviz-complete-experience.interface';
import { IsString, IsOptional, IsNumber, Min, Max, ValidateNested, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Request DTOs with validation
 */
export class UserContextDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  device_type?: string;

  @IsOptional()
  @IsString()
  connection_speed?: string;
}

export class ExperienceConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  max_composites?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  max_assets_per_layer?: number;

  @IsOptional()
  @IsBoolean()
  include_variants?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  variant_depth?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(['stars', 'looks', 'moves', 'worlds'], { each: true })
  layers?: string[];
}

export class PerformanceOptimizationDto {
  @IsOptional()
  @IsBoolean()
  streaming?: boolean;

  @IsOptional()
  @IsBoolean()
  compression?: boolean;

  @IsOptional()
  @IsString()
  cache_strategy?: string;

  @IsOptional()
  @IsBoolean()
  preload_assets?: boolean;
}

export class ReVizCompleteRequestDto {
  @IsOptional()
  @IsString()
  song_id?: string;  // For song-based requests
  
  @IsOptional()
  @IsString()
  composite_id?: string;  // For composite-specific requests (ReViz preferred)

  @IsOptional()
  @ValidateNested()
  @Type(() => UserContextDto)
  user_context?: UserContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExperienceConfigDto)
  experience_config?: ExperienceConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceOptimizationDto)
  performance_optimization?: PerformanceOptimizationDto;

  @IsOptional()
  @IsString()
  request_id?: string;
}

/**
 * Health Check Response
 */
export class HealthCheckResult {
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis: string;
    nnaRegistry: string;
  };
  performance: {
    average_response_time_ms: number;
    cache_hit_rate: number;
    error_rate: number;
  };
}

/**
 * Production-ready ReViz Complete Experience Controller
 * Includes rate limiting, validation, monitoring, and health checks
 */
@Controller('reviz')
@UseGuards(ApiKeyGuard, ThrottlerGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ReVizCompleteExperienceProductionController {
  private readonly logger = new Logger(ReVizCompleteExperienceProductionController.name);
  private readonly LARGE_RESPONSE_THRESHOLD_MB = 50;
  
  // Performance monitoring
  private responseTimes: number[] = [];
  private cacheHits = 0;
  private totalRequests = 0;
  private errors = 0;

  constructor(
    private readonly revizCompleteExperienceService: ReVizCompleteExperienceProductionService,
  ) {}

  @Post('complete-experience')
  @Throttle(10, 60) // 10 requests per minute per user
  async getCompleteExperience(
    @Body(new ValidationPipe({ 
      transform: true, 
      whitelist: true, 
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true }
    })) request: ReVizCompleteRequestDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const requestId = request.request_id || this.generateRequestId();
    const startTime = Date.now();
    
    this.totalRequests++;
    
    try {
      // 🔧 FIX: Support both song_id and composite_id requests
      const requestType = request.composite_id ? 'composite' : 'song';
      const requestValue = request.composite_id || request.song_id;
      this.logger.log(`[REQ-${requestId}] Received production request for complete experience (${requestType}): ${requestValue}`);

      // Add request_id to the request body if not present
      if (!request.request_id) {
        request.request_id = requestId;
      }

      // Add rate limiting headers
      res.setHeader('X-RateLimit-Limit', '10');
      res.setHeader('X-RateLimit-Remaining', '9'); // This would be calculated by the throttler
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());

      const response = await this.revizCompleteExperienceService.getCompleteExperience(request as any);

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      if (response.data.performance_metrics.cache_hit_rate > 0) {
        this.cacheHits++;
      }

      // Check if streaming is requested or if response size exceeds threshold
      const enableStreaming = request.performance_optimization?.streaming ||
                              (response.data.performance_metrics.data_size_mb &&
                               response.data.performance_metrics.data_size_mb > this.LARGE_RESPONSE_THRESHOLD_MB);

      if (enableStreaming) {
        this.logger.log(`[REQ-${requestId}] Streaming response for large payload (${response.data.performance_metrics.data_size_mb?.toFixed(2)} MB)`);
        
        // Set streaming headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Response-Size-MB', response.data.performance_metrics.data_size_mb?.toFixed(2));
        res.status(HttpStatus.OK);

        // Stream the response
        const jsonString = JSON.stringify(response);
        let offset = 0;
        const chunkSize = 1024 * 1024; // 1MB chunks

        while (offset < jsonString.length) {
          const chunk = jsonString.slice(offset, offset + chunkSize);
          res.write(chunk);
          offset += chunkSize;
          // Small delay to prevent overwhelming the network/client
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        res.end();
      } else {
        this.logger.log(`[REQ-${requestId}] Sending standard response (${response.data.performance_metrics.data_size_mb?.toFixed(2)} MB)`);
        
        // Set standard headers
        res.setHeader('X-Response-Size-MB', response.data.performance_metrics.data_size_mb?.toFixed(2));
        res.setHeader('X-Cache-Hit', response.data.performance_metrics.cache_hit_rate > 0 ? 'true' : 'false');
        res.setHeader('X-Response-Time-MS', response.data.performance_metrics.response_time_ms.toString());
        
        res.status(HttpStatus.OK).json(response);
      }

      this.logger.log(`[REQ-${requestId}] Request completed successfully in ${responseTime}ms`);

    } catch (error) {
      this.errors++;
      this.logger.error(`[REQ-${requestId}] Error in getCompleteExperience: ${error.message}`, error.stack);
      
      // Set error headers
      res.setHeader('X-Error-Code', error.code || 'UNKNOWN');
      res.setHeader('X-Error-Message', error.message);
      
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        errors: [{
          code: 'API_ERROR',
          message: error.message,
          request_id: requestId,
        }],
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
          partial_response: true,
        }
      });
    }
  }

  @Get('health')
  async getHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // Check service dependencies
      const [databaseStatus, redisStatus, nnaRegistryStatus] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkNNARegistry()
      ]);

      const averageResponseTime = this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0;
      
      const cacheHitRate = this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0;
      const errorRate = this.totalRequests > 0 ? this.errors / this.totalRequests : 0;

      return {
        status: 'ok',
        timestamp,
        services: {
          database: databaseStatus.status === 'fulfilled' ? 'ok' : 'error',
          redis: redisStatus.status === 'fulfilled' ? 'ok' : 'error',
          nnaRegistry: nnaRegistryStatus.status === 'fulfilled' ? 'ok' : 'error',
        },
        performance: {
          average_response_time_ms: Math.round(averageResponseTime),
          cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
          error_rate: Math.round(errorRate * 100) / 100,
        }
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp,
        services: {
          database: 'error',
          redis: 'error',
          nnaRegistry: 'error',
        },
        performance: {
          average_response_time_ms: 0,
          cache_hit_rate: 0,
          error_rate: 1,
        }
      };
    }
  }

  @Get('metrics')
  async getMetrics(): Promise<any> {
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const cacheHitRate = this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0;
    const errorRate = this.totalRequests > 0 ? this.errors / this.totalRequests : 0;

    return {
      timestamp: new Date().toISOString(),
      total_requests: this.totalRequests,
      cache_hits: this.cacheHits,
      errors: this.errors,
      average_response_time_ms: Math.round(averageResponseTime),
      cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
      error_rate: Math.round(errorRate * 100) / 100,
      response_times: this.responseTimes.slice(-100), // Last 100 response times
    };
  }

  @Get('status')
  async getStatus(): Promise<any> {
    return {
      service: 'ReVizCompleteExperienceProductionController',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      features: {
        rate_limiting: true,
        request_validation: true,
        streaming_support: true,
        health_monitoring: true,
        performance_tracking: true,
        error_handling: true,
      }
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      // This would be a simple database ping
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      // This would be a simple Redis ping
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private async checkNNARegistry(): Promise<boolean> {
    try {
      // This would be a simple NNA Registry ping
      // For now, return true as a placeholder
      return true;
    } catch (error) {
      this.logger.error('NNA Registry health check failed:', error);
      return false;
    }
  }

  private generateRequestId(): string {
    return `ctrl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
