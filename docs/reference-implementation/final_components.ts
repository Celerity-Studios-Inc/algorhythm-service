// ========================================
// src/common/interceptors/caching.interceptor.ts
// ========================================
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CacheService } from '../../modules/caching/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../constants/cache-keys';

@Injectable()
export class CachingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CachingInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body } = request;

    // Only cache GET requests and specific POST endpoints
    const shouldCache = method === 'GET' || this.isCacheablePostEndpoint(url);
    
    if (!shouldCache) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(url, method, body);
    
    // Add cache status to response headers
    return next.handle().pipe(
      tap((responseData) => {
        if (responseData && responseData.success) {
          // Set cache headers
          response.setHeader('X-Cache-Status', 'MISS');
          response.setHeader('X-Cache-Key', cacheKey);

          // Cache successful responses
          this.cacheResponse(cacheKey, responseData, url);
        }
      })
    );
  }

  private isCacheablePostEndpoint(url: string): boolean {
    const cacheableEndpoints = [
      '/api/v1/recommend/template',
      '/api/v1/recommend/variations',
    ];
    
    return cacheableEndpoints.some(endpoint => url.includes(endpoint));
  }

  private generateCacheKey(url: string, method: string, body?: any): string {
    const baseKey = `${method}:${url}`;
    
    if (body && Object.keys(body).length > 0) {
      const bodyHash = Buffer.from(JSON.stringify(body)).toString('base64').substring(0, 16);
      return `${baseKey}:${bodyHash}`;
    }
    
    return baseKey;
  }

  private async cacheResponse(key: string, response: any, url: string): Promise<void> {
    try {
      let ttl = CACHE_TTL.TEMPLATE_RECOMMENDATION;
      
      if (url.includes('/recommend/template')) {
        ttl = CACHE_TTL.TEMPLATE_RECOMMENDATION;
      } else if (url.includes('/recommend/variations')) {
        ttl = CACHE_TTL.LAYER_VARIATIONS;
      }

      await this.cacheService.set(key, response, ttl);
      this.logger.debug(`Cached response for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to cache response for key ${key}:`, error);
    }
  }
}

// ========================================
// src/common/interceptors/analytics.interceptor.ts
// ========================================
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

// ========================================
// src/common/interceptors/logging.interceptor.ts
// ========================================
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

// ========================================
// src/modules/auth/auth.module.ts
// ========================================
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

// ========================================
// src/modules/auth/strategies/jwt.strategy.ts
// ========================================
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { 
      userId: payload.userId || payload.sub, 
      email: payload.email, 
      role: payload.role || 'user' 
    };
  }
}

// ========================================
// src/modules/auth/guards/jwt-auth.guard.ts
// ========================================
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Skip auth for health checks
    const request = context.switchToHttp().getRequest();
    if (request.url.includes('/health')) {
      return true;
    }

    return super.canActivate(context);
  }
}

// ========================================
// src/modules/auth/guards/roles.guard.ts
// ========================================
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false; // No user found
    }

    return requiredRoles.some((role) => user.role === role);
  }
}

// ========================================
// src/common/decorators/roles.decorator.ts
// ========================================
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ========================================
// src/common/filters/http-exception.filter.ts
// ========================================
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Log the error
    this.logger.error(
      `HTTP Exception: ${status} - ${request.method} ${request.url}`,
      exception.stack
    );

    // Format error response
    const errorResponse = {
      success: false,
      error: {
        status,
        message: exception.message,
        ...(typeof exceptionResponse === 'object' && exceptionResponse),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: request.requestId || 'unknown',
    };

    response.status(status).json(errorResponse);
  }
}

// ========================================
// docker/Dockerfile
// ========================================
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image, copy all the files and run nest
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 algorhythm
RUN adduser --system --uid 1001 algorhythm

# Copy necessary files from builder stage
COPY --from=deps --chown=algorhythm:algorhythm /app/node_modules ./node_modules
COPY --from=builder --chown=algorhythm:algorhythm /app/dist ./dist
COPY --from=builder --chown=algorhythm:algorhythm /app/package.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R algorhythm:algorhythm /app/logs

USER algorhythm

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { host: 'localhost', port: 3000, path: '/api/v1/health', timeout: 2000 }; \
  const req = http.get(options, (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }); \
  req.on('error', () => process.exit(1)); \
  req.end();"

CMD ["node", "dist/main"]

// ========================================
// docker/docker-compose.yml
// ========================================
version: '3.8'

services:
  algorhythm:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - MONGODB_URI=mongodb://mongo:27017/algorhythm_dev
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-algorhythm-secret-change-in-production
      - NNA_REGISTRY_BASE_URL=https://registry.dev.reviz.dev
    depends_on:
      - mongo
      - redis
    networks:
      - algorhythm-network
    volumes:
      - algorhythm-logs:/app/logs

  mongo:
    image: mongo:7.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: algorhythm_dev
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - algorhythm-network

  redis:
    image: redis:7.0-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - algorhythm-network
    command: redis-server --appendonly yes

volumes:
  mongo-data:
  redis-data:
  algorhythm-logs:

networks:
  algorhythm-network:
    driver: bridge

// ========================================
// k8s/dev/deployment.yaml
// ========================================
apiVersion: apps/v1
kind: Deployment
metadata:
  name: algorhythm-api
  namespace: algorhythm-dev
  labels:
    app: algorhythm-api
    environment: dev
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: algorhythm-api
  template:
    metadata:
      labels:
        app: algorhythm-api
        environment: dev
    spec:
      containers:
      - name: algorhythm-api
        image: algorhythm:dev-latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "development"
        - name: PORT
          value: "3000"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: algorhythm-secrets
              key: mongodb-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: algorhythm-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: algorhythm-secrets
              key: jwt-secret
        - name: NNA_REGISTRY_BASE_URL
          value: "https://registry.dev.reviz.dev"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 2
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
      restartPolicy: Always

---
apiVersion: v1
kind: Service
metadata:
  name: algorhythm-api-service
  namespace: algorhythm-dev
  labels:
    app: algorhythm-api
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  selector:
    app: algorhythm-api

// ========================================
// scripts/seed-data.ts
// ========================================
#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ScoringService } from '../src/modules/scoring/scoring.service';
import { NnaRegistryService } from '../src/modules/nna-integration/nna-registry.service';

async function seedCompatibilityScores() {
  const logger = new Logger('SeedData');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const scoringService = app.get(ScoringService);
    const nnaRegistryService = app.get(NnaRegistryService);

    logger.log('Starting compatibility score seeding...');

    // Get all songs
    const songs = await nnaRegistryService.getAssetsByLayer('G', 1000);
    logger.log(`Found ${songs.length} songs`);

    let totalProcessed = 0;
    let batchSize = 10;

    for (let i = 0; i < songs.length; i += batchSize) {
      const songBatch = songs.slice(i, i + batchSize);
      
      await Promise.all(songBatch.map(async (song) => {
        try {
          // Get composites for this song
          const composites = await nnaRegistryService.getCompositesBySong(song.nna_address);
          
          if (composites.length > 0) {
            // Score templates for this song
            await scoringService.scoreTemplates(song, composites);
            totalProcessed++;
            
            if (totalProcessed % 10 === 0) {
              logger.log(`Processed ${totalProcessed}/${songs.length} songs...`);
            }
          }
        } catch (error) {
          logger.error(`Error processing song ${song.nna_address}:`, error.message);
        }
      }));
      
      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.log(`✅ Seeding complete! Processed ${totalProcessed} songs`);
    await app.close();
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedCompatibilityScores();
}

// ========================================
// jest.config.js
// ========================================
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  testTimeout: 10000,
};

// ========================================
// .github/workflows/ci-cd.yml
// ========================================
name: AlgoRhythm CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: 'your-registry.com'
  IMAGE_NAME: 'algorhythm'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        env:
          MONGO_INITDB_DATABASE: algorhythm_test
        ports:
          - 27017:27017
      
      redis:
        image: redis:7.0
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Test
      run: npm run test:cov
      env:
        MONGODB_URI: mongodb://localhost:27017/algorhythm_test
        REDIS_URL: redis://localhost:6379
        JWT_SECRET: test-secret
        NNA_REGISTRY_BASE_URL: https://registry.dev.reviz.dev
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.DOCKER_REGISTRY }}
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./docker/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deployment to production would happen here"
        # kubectl apply -f k8s/production/ 
        # or use your preferred deployment method