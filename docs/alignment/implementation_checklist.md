# AlgoRhythm Fix Implementation Checklist

**Version:** 1.0  
**Last Updated:** October 13, 2025  
**Priority:** 🔴 CRITICAL - Address Immediately  

## 🎯 Overview

This checklist guides you through implementing the critical fixes for AlgoRhythm's performance and architectural issues. Follow each section in order.

**Estimated Time:** 4-6 hours  
**Risk Level:** Low (changes are well-tested patterns)  
**Rollback Plan:** Keep backup of current code before changes  

---

## ✅ Phase 1: Pre-Implementation Preparation (30 min)

### 1.1 Backup Current State

- [ ] Create git branch: `fix/algorhythm-performance-v2`
- [ ] Tag current production: `git tag pre-performance-fix-v2`
- [ ] Document current performance metrics:
  ```bash
  # Run and save output
  curl -X POST https://algorhythm.media/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"song_id": "test_song"}' \
    -w "\nTime: %{time_total}s\n" > before_fix_metrics.txt
  ```
- [ ] Save current logs: `kubectl logs -n algorhythm deployment/algorhythm-service > before_fix_logs.txt`

### 1.2 Verify Dependencies

- [ ] Check NNA Registry service is running and healthy:
  ```bash
  curl https://nna-registry.media/health
  # Expected: {"status": "ok"}
  ```
- [ ] Verify Redis is accessible:
  ```bash
  redis-cli -h $REDIS_HOST ping
  # Expected: PONG
  ```
- [ ] Confirm OptimizedNnaRegistryModule is available:
  ```bash
  cd ../nna-registry-service
  npm run build
  npm link  # Create symlink for local testing
  ```

### 1.3 Review Documentation

- [ ] Read `ALGORHYTHM_PERFORMANCE_DEBUGGING_GUIDE.md`
- [ ] Review `ALGORHYTHM_ARCHITECTURE_CRITICAL_REVIEW.md`
- [ ] Familiarize with `ALGORHYTHM_API_ENDPOINT_STANDARD.md`
- [ ] Check `recommendations.service.ts` (fixed version)
- [ ] Check `recommendations.module.ts` (fixed version)

---

## ✅ Phase 2: Code Changes (2-3 hours)

### 2.1 Update Module Dependencies

**File:** `src/modules/recommendations/recommendations.module.ts`

- [ ] Import `OptimizedNnaRegistryModule`:
  ```typescript
  import { OptimizedNnaRegistryModule } from '@nna-registry/optimized';
  ```

- [ ] Remove legacy import:
  ```typescript
  // DELETE THIS LINE:
  // import { NnaRegistryModule } from '@nna-registry/core';
  ```

- [ ] Update module imports array:
  ```typescript
  @Module({
    imports: [
      OptimizedNnaRegistryModule.forRootAsync({
        // ... configuration
      }),
      CacheModule.registerAsync({
        // ... configuration  
      }),
    ],
    // ...
  })
  ```

- [ ] **Verify:** Run `npm run build` - should compile without errors

### 2.2 Update Service Implementation

**File:** `src/modules/recommendations/recommendations.service.ts`

- [ ] Update constructor injection:
  ```typescript
  constructor(
    private readonly optimizedNnaRegistryService: OptimizedNnaRegistryService,  // ✅ NEW
    // Remove: private readonly nnaRegistryService: NnaRegistryService,  // ❌ OLD
    private readonly scoringService: ScoringService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}
  ```

- [ ] Update all method calls to use `optimizedNnaRegistryService`:
  ```typescript
  // Before:
  await this.nnaRegistryService.findMatchingComposites(...)
  
  // After:
  await this.optimizedNnaRegistryService.findMatchingComposites(...)
  ```

- [ ] Implement proper caching in `getTemplateRecommendation`:
  - [ ] Generate cache key
  - [ ] Check cache first
  - [ ] Query on cache miss
  - [ ] Store result with TTL

- [ ] Add timeout protection to all queries:
  ```typescript
  await this.withTimeout(
    this.optimizedNnaRegistryService.findMatchingComposites(...),
    5000,  // 5 second timeout
    'Query timeout'
  )
  ```

- [ ] Remove or fix mock data fallbacks:
  ```typescript
  // REMOVE silent fallback to mock data
  // Instead throw proper exceptions
  throw new ServiceUnavailableException('Service temporarily unavailable');
  ```

- [ ] **Verify:** Run `npm run build` - should compile without errors

### 2.3 Update Controller Endpoints

**File:** `src/modules/recommendations/recommendations.controller.ts`

- [ ] Standardize endpoint paths:
  ```typescript
  @Controller('api/v1/algorhythm')  // ✅ CORRECT
  export class RecommendationsController {
    
    @Post('recommend/template')  // ✅ CORRECT
    async recommendTemplate(@Body() dto: TemplateRequestDto) {
      // ...
    }
  }
  ```

- [ ] Add deprecation warnings for old paths (if supporting temporarily):
  ```typescript
  @Post('/api/v1/recommend/template')  // Deprecated
  @ApiDeprecated('Use /api/v1/algorhythm/recommend/template')
  async recommendTemplateDeprecated(@Body() dto: TemplateRequestDto) {
    this.logger.warn('Deprecated endpoint called');
    return this.recommendTemplate(dto);
  }
  ```

- [ ] **Verify:** Endpoints match `ALGORHYTHM_API_ENDPOINT_STANDARD.md`

### 2.4 Update Environment Configuration

**File:** `.env` (development)

- [ ] Add/update required variables:
  ```env
  # NNA Registry (Optimized)
  NNA_DB_HOST=localhost
  NNA_DB_PORT=5432
  NNA_DB_NAME=nna_registry
  NNA_DB_USER=algorhythm_user
  NNA_DB_PASSWORD=<secure_password>
  NNA_DB_SSL=false
  
  # Redis Cache
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  REDIS_DB=0
  
  # Monitoring
  ENABLE_PERFORMANCE_MONITORING=true
  SLOW_QUERY_THRESHOLD_MS=100
  ALERT_ON_SLOW_QUERY=true
  ```

- [ ] **Verify:** All required environment variables are set

### 2.5 Update Package Dependencies

**File:** `package.json`

- [ ] Add OptimizedNnaRegistryModule dependency:
  ```json
  {
    "dependencies": {
      "@nna-registry/optimized": "^2.0.0",
      "cache-manager-redis-yet": "^4.1.0"
    }
  }
  ```

- [ ] Install dependencies:
  ```bash
  npm install
  ```

- [ ] **Verify:** `npm list @nna-registry/optimized` shows correct version

---

## ✅ Phase 3: Testing (1-2 hours)

### 3.1 Local Development Testing

- [ ] Start dependencies:
  ```bash
  # Terminal 1: Redis
  redis-server
  
  # Terminal 2: NNA Registry (if local)
  cd ../nna-registry-service
  npm run start:dev
  
  # Terminal 3: AlgoRhythm
  npm run start:dev
  ```

- [ ] Test health endpoint:
  ```bash
  curl http://localhost:3000/api/v1/algorhythm/health
  # Expected: {"status": "ok", "nna_registry": true, "cache": true}
  ```

- [ ] Test template recommendation (cold):
  ```bash
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "test_song_123"}' \
    -w "\nTime: %{time_total}s\n"
  # Expected: < 0.5s (500ms)
  ```

- [ ] Test template recommendation (warm - same request):
  ```bash
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "test_song_123"}' \
    -w "\nTime: %{time_total}s\n"
  # Expected: < 0.05s (50ms), metadata.cached: true
  ```

- [ ] Verify logs show:
  - [ ] "Using OptimizedNnaRegistryService"
  - [ ] "Cache HIT" on second request
  - [ ] "Database query completed in <100ms"
  - [ ] No timeout errors
  - [ ] No fallback to mock data

### 3.2 Cache Functionality Testing

- [ ] Test cache hit/miss:
  ```bash
  # Clear cache
  redis-cli FLUSHDB
  
  # Make request - should be cache miss
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "test_song_456"}'
  # Check response: metadata.cached should be false
  
  # Make same request - should be cache hit
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "test_song_456"}'
  # Check response: metadata.cached should be true
  ```

- [ ] Check Redis keys:
  ```bash
  redis-cli keys "algorhythm:*"
  # Should see: algorhythm:template:test_song_456
  ```

- [ ] Verify cache expiration:
  ```bash
  redis-cli TTL "algorhythm:template:test_song_456"
  # Should show TTL in seconds (close to 86400)
  ```

### 3.3 Performance Testing

- [ ] Install Apache Bench (if not installed):
  ```bash
  # macOS
  brew install httpd
  
  # Ubuntu
  sudo apt-get install apache2-utils
  ```

- [ ] Create test payload file:
  ```bash
  echo '{"song_id": "load_test_song"}' > test-payload.json
  ```

- [ ] Run load test:
  ```bash
  ab -n 1000 -c 10 -T 'application/json' \
    -p test-payload.json \
    http://localhost:3000/api/v1/algorhythm/recommend/template
  ```

- [ ] Verify results:
  - [ ] Median response time: <100ms
  - [ ] 95th percentile: <200ms
  - [ ] 99th percentile: <500ms
  - [ ] 0% failed requests
  - [ ] All requests return real data (not mock)

### 3.4 Error Handling Testing

- [ ] Test invalid song ID:
  ```bash
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "nonexistent_song"}' \
    -w "\nHTTP: %{http_code}\n"
  # Expected: 404 Not Found with proper error message
  ```

- [ ] Test with Redis down:
  ```bash
  # Stop Redis
  redis-cli shutdown
  
  # Make request
  curl -X POST http://localhost:3000/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -d '{"song_id": "test_song"}' \
    -w "\nTime: %{time_total}s\n"
  # Expected: Still works but slower, logs show cache error
  
  # Restart Redis
  redis-server &
  ```

- [ ] Test with NNA Registry down (if possible in dev):
  - Expected: 503 Service Unavailable, NOT mock data

---

## ✅ Phase 4: Deployment Preparation (30 min)

### 4.1 Update Documentation

- [ ] Update API documentation with correct endpoints
- [ ] Update internal wiki with new architecture
- [ ] Update README.md with new dependencies
- [ ] Create migration guide for frontend developers
- [ ] Document rollback procedure

### 4.2 Update CI/CD Pipeline

- [ ] Ensure tests pass:
  ```bash
  npm run test
  npm run test:e2e
  ```

- [ ] Update deployment scripts with new environment variables

- [ ] Add health check to deployment:
  ```yaml
  # kubernetes/deployment.yaml
  livenessProbe:
    httpGet:
      path: /api/v1/algorhythm/health
      port: 3000
    initialDelaySeconds: 30
    periodSeconds: 10
  ```

### 4.3 Create Rollback Plan

- [ ] Document current production state
- [ ] Create rollback script:
  ```bash
  #!/bin/bash
  # rollback.sh
  git checkout main
  git revert HEAD~1
  kubectl rollout undo deployment/algorhythm-service -n production
  ```
- [ ] Test rollback in staging environment

---

## ✅ Phase 5: Staged Deployment (2 hours)

### 5.1 Deploy to Development

- [ ] Commit changes:
  ```bash
  git add .
  git commit -m "fix: Switch to OptimizedNnaRegistryService and fix caching"
  git push origin fix/algorhythm-performance-v2
  ```

- [ ] Deploy to dev environment:
  ```bash
  kubectl apply -f kubernetes/dev/deployment.yaml
  ```

- [ ] Verify deployment:
  ```bash
  kubectl rollout status deployment/algorhythm-service -n dev
  curl https://dev.algorhythm.media/api/v1/algorhythm/health
  ```

- [ ] Run smoke tests:
  - [ ] Template recommendation works
  - [ ] Response time <500ms
  - [ ] Cache is working
  - [ ] Logs show no errors

### 5.2 Deploy to Staging

- [ ] Create PR and get code review approval
- [ ] Merge to staging branch
- [ ] Deploy to staging:
  ```bash
  kubectl apply -f kubernetes/staging/deployment.yaml
  ```

- [ ] Run full test suite:
  ```bash
  npm run test:e2e -- --env=staging
  ```

- [ ] Load test staging:
  ```bash
  ab -n 10000 -c 50 -T 'application/json' \
    -p test-payload.json \
    https://stg.algorhythm.media/api/v1/algorhythm/recommend/template
  ```

- [ ] Monitor for 24 hours:
  - [ ] No error rate increase
  - [ ] Response times improved
  - [ ] Cache hit rate >70%
  - [ ] No timeout errors

### 5.3 Deploy to Production

- [ ] Schedule maintenance window (if needed)
- [ ] Notify stakeholders of deployment
- [ ] Create production deploy PR
- [ ] Get final approval from tech lead

- [ ] Deploy to production:
  ```bash
  kubectl apply -f kubernetes/production/deployment.yaml
  ```

- [ ] Monitor closely for first hour:
  - [ ] Response times
  - [ ] Error rates
  - [ ] Cache performance
  - [ ] Database load

- [ ] Run production smoke tests:
  ```bash
  # Test with real production data
  curl -X POST https://algorhythm.media/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $PROD_API_KEY" \
    -d '{"song_id": "<real_song_id>"}' \
    -w "\nTime: %{time_total}s\n"
  ```

---

## ✅ Phase 6: Post-Deployment Validation (1 hour)

### 6.1 Performance Validation

- [ ] Compare before/after metrics:
  ```bash
  # Run same test as pre-implementation
  curl -X POST https://algorhythm.media/api/v1/algorhythm/recommend/template \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"song_id": "test_song"}' \
    -w "\nTime: %{time_total}s\n" > after_fix_metrics.txt
  
  # Compare
  echo "Before: $(cat before_fix_metrics.txt | grep Time)"
  echo "After: $(cat after_fix_metrics.txt | grep Time)"
  ```

- [ ] Expected improvements:
  - [ ] Response time: 112s → <500ms (224x faster!)
  - [ ] Warm cache: N/A → <50ms
  - [ ] Real data returned: NO → YES

### 6.2 Monitoring Setup

- [ ] Verify metrics are being collected:
  - [ ] Request duration
  - [ ] Cache hit/miss rate
  - [ ] Error rate
  - [ ] Query times

- [ ] Set up alerts:
  ```yaml
  # monitoring/alerts.yaml
  - alert: SlowAlgoRhythmEndpoint
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="algorhythm"}[5m])) > 0.5
    annotations:
      summary: "AlgoRhythm p95 latency > 500ms"
  
  - alert: LowCacheHitRate
    expr: rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) < 0.7
    annotations:
      summary: "AlgoRhythm cache hit rate < 70%"
  ```

- [ ] Create dashboard for monitoring:
  - [ ] Request duration (p50, p95, p99)
  - [ ] Cache hit rate
  - [ ] Error rate
  - [ ] Throughput (req/s)

### 6.3 Frontend Team Communication

- [ ] Send deployment notification:
  ```
  Subject: AlgoRhythm Performance Fix Deployed ✅
  
  Team,
  
  The AlgoRhythm performance fixes have been deployed to production. 
  
  Key changes:
  1. Template endpoint now responds in <500ms (down from 112s)
  2. Warm cache responses in <50ms
  3. Real recommendations now returned (no more mock data)
  4. Canonical endpoint: /api/v1/algorhythm/recommend/template
  
  Old endpoint paths still work but will be deprecated on [DATE].
  
  Please test your integrations and report any issues in #algorhythm-alerts.
  
  Thanks for your patience!
  ```

- [ ] Update API documentation with new performance characteristics

- [ ] Schedule follow-up meeting to review integration

---

## ✅ Success Criteria

All of these should be true after implementation:

### Performance ✅
- [ ] Template endpoint cold start: <500ms
- [ ] Template endpoint warm cache: <50ms
- [ ] Cache hit rate: >70% within 24 hours of deployment
- [ ] No timeout errors in logs
- [ ] Database query time: <100ms average

### Functionality ✅
- [ ] Real recommendations returned (not mock data)
- [ ] All layer types working correctly
- [ ] Error handling provides clear messages
- [ ] Health endpoint returns accurate status

### Reliability ✅
- [ ] Error rate: <0.1%
- [ ] Uptime: >99.9%
- [ ] No silent failures
- [ ] Proper circuit breaker behavior

### Developer Experience ✅
- [ ] One canonical API path
- [ ] Documentation matches implementation
- [ ] Clear error messages
- [ ] Easy to test and debug

---

## 🚨 Rollback Procedure

If issues occur after deployment:

1. **Immediate Rollback** (< 5 minutes):
   ```bash
   kubectl rollout undo deployment/algorhythm-service -n production
   ```

2. **Verify Rollback**:
   ```bash
   curl https://algorhythm.media/api/v1/algorhythm/health
   # Should return to previous version
   ```

3. **Notify Team**:
   - Post in #algorhythm-alerts
   - Update incident tracking
   - Schedule post-mortem

4. **Investigate**:
   - Review logs: `kubectl logs -n production deployment/algorhythm-service`
   - Check metrics dashboard
   - Identify root cause
   - Create fix

---

## 📞 Support Contacts

**During Deployment:**
- Tech Lead: @tech-lead (Slack)
- DevOps: @devops-team (Slack)
- On-call: +1-XXX-XXX-XXXX

**Post-Deployment:**
- #algorhythm-alerts (Slack)
- support@algorhythm.media
- GitHub Issues: https://github.com/reviz/algorhythm/issues

---

## 📚 Related Documents

- `ALGORHYTHM_PERFORMANCE_DEBUGGING_GUIDE.md`
- `ALGORHYTHM_ARCHITECTURE_CRITICAL_REVIEW.md`
- `ALGORHYTHM_API_ENDPOINT_STANDARD.md`
- `recommendations.service.ts` (fixed implementation)
- `recommendations.module.ts` (fixed configuration)

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** October 13, 2025  
**Owner:** AlgoRhythm Technical Team