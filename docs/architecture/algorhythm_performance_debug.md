# AlgoRhythm Performance Debugging Guide

**Version:** 1.0  
**Last Updated:** October 13, 2025  
**Status:** Active Debugging  

## 🎯 Executive Summary

This document provides a comprehensive debugging guide for the AlgoRhythm service performance issues, particularly focusing on the template recommendation endpoint that is currently experiencing severe performance degradation.

## 📊 Current Performance Status

### Critical Issues Identified

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Template Endpoint | 112-166s | <500ms | ❌ CRITICAL |
| Composite Endpoint | 50ms | <500ms | ✅ OPTIMAL |
| Database Queries | 8ms | <100ms | ✅ OPTIMAL |
| Cache Hit Rate | 0% | >80% | ❌ FAILING |

### Root Cause Analysis

**Primary Issue:** Template endpoint not using optimized services that made composite endpoint fast (43x improvement).

**Contributing Factors:**
1. Legacy `NnaRegistryService` usage instead of `OptimizedNnaRegistryService`
2. Redis caching not functioning correctly
3. Circuit breaker triggering due to timeouts
4. Fallback to mock data instead of real recommendations

## 🔍 Diagnostic Steps

### Step 1: Verify Service Configuration

Check that AlgoRhythm is using the optimized service:

```bash
# Check service initialization
grep -r "OptimizedNnaRegistryService" src/modules/recommendations/
grep -r "NnaRegistryService" src/modules/recommendations/

# Expected: Should find OptimizedNnaRegistryService
# Problem: If finding legacy NnaRegistryService
```

### Step 2: Test Redis Cache Connection

```bash
# Test Redis connectivity
npm run test:cache

# Manual Redis check
redis-cli ping
redis-cli keys "algorhythm:*"
```

Expected output:
```
PONG
1) "algorhythm:template:song_123"
2) "algorhythm:composite:nna_address_456"
```

### Step 3: Check Database Query Performance

```bash
# Enable query logging
export LOG_LEVEL=debug
npm run start:dev

# Monitor query times in logs
# Should see: "Database query completed in 8ms"
# Problem: Seeing >1000ms queries
```

### Step 4: Verify API Endpoint Paths

Current confusion with multiple paths:
- `/api/v1/recommend/template` (original design)
- `/api/v1/algorhythm/recommend/template` (current response)

**Action Required:** Standardize on ONE path across all documentation and code.

## 🛠 Fix Implementation Plan

### Priority 1: Switch to Optimized Service (CRITICAL)

**File:** `src/modules/recommendations/recommendations.service.ts`

**Current (Broken):**
```typescript
constructor(
  private readonly nnaRegistryService: NnaRegistryService, // ❌ LEGACY
) {}
```

**Fixed:**
```typescript
constructor(
  private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService, // ✅ OPTIMIZED
) {}
```

**Update Module:**
```typescript
// src/modules/recommendations/recommendations.module.ts
@Module({
  imports: [
    OptimizedNnaRegistryModule, // ✅ Add this
    CacheModule.register(),
  ],
  providers: [RecommendationsService],
})
```

### Priority 2: Enable Redis Caching

**File:** `src/modules/recommendations/recommendations.service.ts`

Add caching layer:
```typescript
async getTemplateRecommendation(songId: string): Promise<Recommendation> {
  // 1. Check cache first
  const cacheKey = `algorhythm:template:${songId}`;
  const cached = await this.cacheManager.get(cacheKey);
  
  if (cached) {
    this.logger.debug(`Cache hit for song ${songId}`);
    return cached;
  }

  // 2. Query using optimized service
  const startTime = Date.now();
  const recommendations = await this.optimizedNnaRegistryService
    .findMatchingComposites(songId);
  const queryTime = Date.now() - startTime;
  
  this.logger.debug(`Query completed in ${queryTime}ms`);

  // 3. Score and rank
  const scored = this.scoreService.scoreRecommendations(recommendations);
  const best = scored[0];

  // 4. Cache result (24 hour TTL)
  await this.cacheManager.set(cacheKey, best, 86400);

  return best;
}
```

### Priority 3: Add Performance Monitoring

```typescript
// src/common/interceptors/performance.interceptor.ts
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const route = request.route.path;
        
        // Alert if over threshold
        if (duration > 500) {
          this.logger.warn(`Slow endpoint: ${route} took ${duration}ms`);
        }
      }),
    );
  }
}
```

### Priority 4: Implement Circuit Breaker

```typescript
// src/modules/recommendations/recommendations.service.ts
private async getRecommendationsWithCircuitBreaker(songId: string) {
  try {
    return await promiseTimeout(
      this.optimizedNnaRegistryService.findMatchingComposites(songId),
      5000 // 5 second timeout
    );
  } catch (error) {
    if (error.name === 'TimeoutError') {
      this.logger.error(`Timeout getting recommendations for ${songId}`);
      // Return cached fallback or error
      return this.getFallbackRecommendations(songId);
    }
    throw error;
  }
}
```

## 📈 Performance Testing Protocol

### Test 1: Cold Start Performance
```bash
# Clear cache
redis-cli FLUSHDB

# Make request
curl -X POST http://localhost:3000/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -d '{"song_id": "test_song_123"}'

# Expected: <500ms
# Monitor: Response time + cache miss logged
```

### Test 2: Warm Cache Performance
```bash
# Make same request again
curl -X POST http://localhost:3000/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -d '{"song_id": "test_song_123"}'

# Expected: <50ms
# Monitor: Response time + cache hit logged
```

### Test 3: Load Testing
```bash
# Install Apache Bench
brew install httpd # macOS

# Run load test
ab -n 1000 -c 10 -T 'application/json' \
  -p test-payload.json \
  http://localhost:3000/api/v1/recommend/template

# Expected: 
# - Median: <100ms
# - 95th percentile: <200ms
# - 99th percentile: <500ms
```

## 🐛 Common Issues & Solutions

### Issue: "Module not found: OptimizedNnaRegistryModule"

**Solution:**
```bash
# Ensure dependency is installed
cd ../nna-registry-service
npm run build

# Link for local development
npm link
cd ../algorhythm-service
npm link nna-registry-service
```

### Issue: Redis connection refused

**Solution:**
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine

# Update .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Issue: Mock data being returned

**Symptom:**
```json
{
  "template_id": "default-pop-template",
  "nna_address": "G.POP.DEF.001"
}
```

**Solution:** This indicates the service is falling back. Check:
1. NNA Registry service is running
2. Database connection is active
3. Query isn't timing out

## 📊 Success Metrics

After implementing fixes, verify:

- [ ] Template endpoint responds in <500ms (cold)
- [ ] Template endpoint responds in <50ms (warm)
- [ ] Cache hit rate >80% after warm-up
- [ ] No timeout errors in logs
- [ ] Real recommendations returned (not fallback)
- [ ] Database queries complete in <100ms
- [ ] Load test passes with p95 <200ms

## 🔄 Continuous Monitoring

### Set Up Application Monitoring

```typescript
// src/main.ts
app.use(prometheusMiddleware);

// Metrics to track:
// - algorhythm_request_duration_ms
// - algorhythm_cache_hits_total
// - algorhythm_cache_misses_total
// - algorhythm_nna_query_duration_ms
// - algorhythm_errors_total
```

### Alert Thresholds

```yaml
alerts:
  - name: SlowTemplateEndpoint
    condition: p95_response_time > 500ms
    severity: critical
    
  - name: LowCacheHitRate
    condition: cache_hit_rate < 70%
    severity: warning
    
  - name: HighErrorRate
    condition: error_rate > 1%
    severity: critical
```

## 📝 Next Steps

1. **Immediate (Today):**
   - Switch to OptimizedNnaRegistryService
   - Enable Redis caching
   - Test cold/warm performance

2. **Short-term (This Week):**
   - Add performance monitoring
   - Implement circuit breaker
   - Complete load testing

3. **Medium-term (Next Sprint):**
   - Set up continuous monitoring
   - Implement alerting
   - Document runbooks

## 🆘 Escalation Path

If issues persist after implementing fixes:

1. Check NNA Registry service health
2. Verify database indices are in place
3. Profile slow queries with EXPLAIN ANALYZE
4. Consider increasing Redis memory limits
5. Review network latency between services

## 📚 Related Documentation

- `ALGORHYTHM_ARCHITECTURE.md` - Overall system design
- `NNA_REGISTRY_OPTIMIZATION.md` - Backend optimizations applied
- `REVIZ_API_USAGE_GUIDE_REAL_DATA.md` - Integration examples
- `CRITICAL_PATH_IMPLEMENTATION_STATUS.md` - Current status

---

**Document Owner:** AlgoRhythm Team  
**Review Schedule:** Weekly until performance is stable  
**Emergency Contact:** Check #algorhythm-alerts Slack channel