# AlgoRhythm Service Testing Guide

This guide provides comprehensive testing strategies for the AlgoRhythm service across all environments.

## 🎯 **Testing Objectives**

1. **Functional Testing** - Verify all API endpoints work correctly
2. **Integration Testing** - Test NNA Registry and database connections
3. **Performance Testing** - Validate response times and throughput
4. **Daemon Testing** - Verify scheduled tasks and background processes
5. **End-to-End Testing** - Test complete recommendation workflows

## 🚀 **Quick Start Testing**

### **1. Basic Health Check**
```bash
# Test all environments
curl https://dev.algorhythm.dev/api/v1/health
curl https://stg.algorhythm.dev/api/v1/health
curl https://prod.algorhythm.dev/api/v1/health
```

### **2. Run Automated Test Script**
```bash
# Make script executable
chmod +x scripts/test-deployment.sh

# Run comprehensive tests
./scripts/test-deployment.sh
```

### **3. Import Postman Collection**
- Import `scripts/algorhythm-postman-collection.json` into Postman
- Set environment variables for different environments
- Run collection tests

## 📋 **Detailed Testing Checklist**

### **Phase 1: Basic Connectivity**

- [ ] **Health Check Endpoint**
  - [ ] Dev environment responds with 200
  - [ ] Staging environment responds with 200
  - [ ] Production environment responds with 200
  - [ ] Response includes service status (database, cache, NNA Registry)

- [ ] **CORS Configuration**
  - [ ] Preflight requests work
  - [ ] Cross-origin requests allowed from frontend domains

### **Phase 2: Core API Endpoints**

- [ ] **Recommendations API**
  - [ ] POST `/api/v1/recommendations` returns valid recommendations
  - [ ] Handles missing song_id gracefully
  - [ ] Respects limit parameter
  - [ ] Returns proper error codes for invalid requests

- [ ] **Analytics API**
  - [ ] POST `/api/v1/analytics/events` accepts event tracking
  - [ ] GET `/api/v1/analytics/metrics` returns aggregated data
  - [ ] GET `/api/v1/analytics/performance` returns performance metrics

### **Phase 3: Integration Testing**

- [ ] **NNA Registry Integration**
  - [ ] Asset fetching works
  - [ ] Search functionality returns results
  - [ ] Handles NNA Registry downtime gracefully
  - [ ] Proper error handling for invalid addresses

- [ ] **Database Integration**
  - [ ] MongoDB connection stable
  - [ ] Data persistence works
  - [ ] Indexes are properly created
  - [ ] Query performance is acceptable

- [ ] **Redis Cache Integration**
  - [ ] Cache operations work
  - [ ] TTL expiration functions
  - [ ] Cache statistics are accurate
  - [ ] Memory usage is reasonable

### **Phase 4: Daemon Process Testing**

- [ ] **Scheduled Tasks**
  - [ ] Hourly index build runs automatically
  - [ ] 6-hourly freshness updates execute
  - [ ] Daily maintenance tasks complete
  - [ ] Manual triggers work via API

- [ ] **Index Building**
  - [ ] Fetches songs from NNA Registry
  - [ ] Fetches templates from NNA Registry
  - [ ] Computes compatibility scores
  - [ ] Stores results in database
  - [ ] Warms up Redis cache

- [ ] **Score Computation**
  - [ ] Freshness scores update correctly
  - [ ] Diversity scores compute properly
  - [ ] Final scores are calculated accurately

### **Phase 5: Performance Testing**

- [ ] **Response Times**
  - [ ] Health check < 100ms
  - [ ] Recommendations < 500ms
  - [ ] Analytics queries < 200ms
  - [ ] Cache operations < 50ms

- [ ] **Throughput**
  - [ ] Handles 100+ concurrent requests
  - [ ] No memory leaks under load
  - [ ] Database connections remain stable

- [ ] **Resource Usage**
  - [ ] Memory usage stays within limits
  - [ ] CPU usage is reasonable
  - [ ] Network I/O is efficient

## 🧪 **Testing Scenarios**

### **Scenario 1: New User Journey**
1. User requests recommendations for a song
2. System fetches song metadata from NNA Registry
3. Computes compatibility scores with available templates
4. Returns top 5 recommendations
5. Tracks recommendation_viewed event

### **Scenario 2: Daemon Index Build**
1. Daemon triggers hourly index build
2. Fetches all songs and templates from NNA Registry
3. Computes compatibility scores for all combinations
4. Stores results in MongoDB
5. Warms up Redis cache with top recommendations

### **Scenario 3: Cache Performance**
1. First request hits database (cache miss)
2. Response is cached in Redis
3. Subsequent requests hit cache (cache hit)
4. Cache statistics show hit/miss ratios

### **Scenario 4: Error Handling**
1. NNA Registry is down
2. System returns cached recommendations
3. Logs error appropriately
4. Health check shows NNA Registry as unhealthy

## 🔧 **Testing Tools**

### **1. Automated Script**
- **File**: `scripts/test-deployment.sh`
- **Purpose**: Comprehensive endpoint testing
- **Usage**: `./scripts/test-deployment.sh`

### **2. Postman Collection**
- **File**: `scripts/algorhythm-postman-collection.json`
- **Purpose**: Manual API testing and documentation
- **Usage**: Import into Postman

### **3. Load Testing**
```bash
# Install Apache Bench
brew install httpd

# Test recommendations endpoint
ab -n 100 -c 10 -p test-data.json -T application/json https://algorhythm.dev.reviz.dev/api/v1/recommendations
```

### **4. Database Testing**
```bash
# Connect to MongoDB
mongosh "mongodb+srv://admin:PTtQFc0N9gftuRIX@registryservice.xhmyito.mongodb.net/algorhythm-service-dev"

# Check collections
show collections

# Query compatibility scores
db.compatibilityscores.find().limit(5)
```

### **5. Redis Testing**
```bash
# Connect to Redis
redis-cli -h 10.0.0.3 -p 6379

# Check cache keys
KEYS recommendation:*

# Get cache stats
INFO memory
```

## 📊 **Expected Test Results**

### **Health Check Response**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "cache": "connected",
    "nna_registry": "healthy"
  }
}
```

### **Recommendations Response**
```json
{
  "recommendations": [
    {
      "template_id": "template-123",
      "compatibility_score": 0.85,
      "metadata": {
        "song_metadata": {...},
        "template_metadata": {...}
      }
    }
  ],
  "total": 5,
  "cached": true
}
```

### **Analytics Response**
```json
{
  "total_events": 1250,
  "unique_users": 89,
  "top_songs": [...],
  "top_templates": [...],
  "performance_metrics": {
    "avg_response_time": 245,
    "cache_hit_rate": 0.78
  }
}
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: NNA Registry Connection Failed**
- **Symptom**: Health check shows NNA Registry as unhealthy
- **Solution**: Check NNA Registry service status and API keys

### **Issue 2: Database Connection Timeout**
- **Symptom**: Health check shows database as disconnected
- **Solution**: Verify MongoDB connection string and network access

### **Issue 3: Cache Miss Rate High**
- **Symptom**: Performance metrics show low cache hit rate
- **Solution**: Check Redis connection and TTL settings

### **Issue 4: Daemon Not Running**
- **Symptom**: No index builds in logs
- **Solution**: Check daemon service status and cron configuration

## 📈 **Monitoring & Alerting**

### **Key Metrics to Monitor**
- Response time percentiles (p50, p95, p99)
- Error rates by endpoint
- Cache hit/miss ratios
- Database connection pool usage
- Memory and CPU utilization

### **Alert Thresholds**
- Response time > 1 second
- Error rate > 5%
- Cache hit rate < 70%
- Memory usage > 80%
- Database connections > 80% of pool

## 🎯 **Success Criteria**

The AlgoRhythm service is considered successfully deployed when:

1. ✅ All health checks pass across environments
2. ✅ Recommendations API returns valid results
3. ✅ Analytics tracking works correctly
4. ✅ Daemon processes run on schedule
5. ✅ Performance meets SLA requirements
6. ✅ Error handling works as expected
7. ✅ Integration with NNA Registry is stable

## 📝 **Testing Log Template**

```
Test Date: [DATE]
Environment: [DEV/STAGING/PROD]
Tester: [NAME]

Health Check: ✅/❌
Recommendations: ✅/❌
Analytics: ✅/❌
Daemon: ✅/❌
Performance: ✅/❌

Issues Found:
- [Issue 1]
- [Issue 2]

Notes:
[Additional observations]
```

---

**Next Steps**: After successful testing, proceed with production deployment and monitoring setup.
