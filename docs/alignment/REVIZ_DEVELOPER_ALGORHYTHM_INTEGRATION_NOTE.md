# ReViz Developer Note: AlgoRhythm Service Integration

**Date:** October 13, 2025  
**Status:** Production Ready  
**Performance:** 0.09-0.35s (17x better than 2s target)  
**Cache:** In-memory (optimal for current scale)

---

## 🚀 Service Status

### **AlgoRhythm Service is LIVE and OPTIMIZED**

**Production URLs:**
- **Dev:** https://dev.algorhythm.media
- **Staging:** https://stg.algorhythm.media  
- **Production:** https://algorhythm.media

**Health Check:**
```bash
curl https://dev.algorhythm.media/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "algorhythm-service",
  "cache": {
    "type": "memory",
    "hitRate": 85.2,
    "totalRequests": 1247,
    "maxSize": 100,
    "ttl": 600
  },
  "dependencies": {
    "nna_registry": { "status": "connected" },
    "redis": { "status": "disabled" },
    "mongodb": { "status": "connected" }
  }
}
```

---

## 📡 API Integration

### **Template Recommendation Endpoint**

**Endpoint:** `POST /api/v1/recommend/template`  
**Authentication:** API Key required  
**Performance:** 0.09-0.35s response time

**Request:**
```json
{
  "song_id": "1.018.003.002",
  "user_context": {
    "user_id": "user_123",
    "preferences": {
      "genre": "pop",
      "energy_level": "high",
      "style": "modern"
    }
  },
  "max_alternatives": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation": {
      "template_id": "template_123",
      "template_name": "Pop Dance Template",
      "nna_address": "T.POP.DAN.001",
      "compatibility_score": 0.87,
      "media": {
        "thumbnail_url": "https://storage.googleapis.com/...",
        "preview_url": "https://storage.googleapis.com/...",
        "full_asset_url": "https://storage.googleapis.com/...",
        "file_size_mb": 15.2,
        "duration_seconds": 30,
        "format": "mp4",
        "resolution": "1920x1080"
      },
      "components": {
        "song_id": "1.018.003.002",
        "star_id": "2.000.000.001",
        "look_id": "3.000.000.001",
        "move_id": "4.000.000.001",
        "world_id": "5.000.000.001"
      },
      "metadata": {
        "created_at": "2025-10-13T23:45:00Z",
        "tags": ["pop", "dance", "modern"],
        "aiGeneratedDescription": "High-energy pop dance template"
      },
      "scoring_details": {
        "tempo_score": 0.9,
        "genre_score": 0.85,
        "energy_score": 0.88,
        "style_score": 0.82,
        "mood_score": 0.86,
        "base_score": 0.87,
        "freshness_boost": 1.0,
        "final_score": 0.87
      }
    },
    "alternatives": [
      {
        "template_id": "template_456",
        "template_name": "Alternative Pop Template",
        "compatibility_score": 0.75,
        "media": { /* ... */ },
        "components": { /* ... */ }
      }
    ],
    "total_available": 47
  },
  "performance_metrics": {
    "response_time_ms": 0.23,
    "cache_hit": true,
    "score_computation_time_ms": 12,
    "templates_evaluated": 47
  },
  "metadata": {
    "timestamp": "2025-10-13T23:45:00Z",
    "request_id": "req_1697234700_abc123",
    "version": "1.0.0"
  }
}
```

---

## 🔑 Authentication

### **API Key Required**

**Header:**
```
x-api-key: your-api-key-here
```

**Get API Key:**
1. Contact AlgoRhythm team for API key
2. Or use existing ReViz API key if available
3. Key format: `reviz-dev-30390-13220-4896-9516-9001`

**Example Request:**
```bash
curl -X POST https://dev.algorhythm.media/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-here" \
  -d '{
    "song_id": "1.018.003.002",
    "user_context": {
      "user_id": "user_123",
      "preferences": {
        "genre": "pop",
        "energy_level": "high"
      }
    }
  }'
```

---

## 🎯 Song ID Format

### **Use Human-Friendly Names (HFN)**

**Correct Format:**
```
"1.018.003.002"  ✅ Good
"1018003002"     ❌ Bad (will be auto-converted)
```

**Auto-Conversion:**
- Input: `"1018003002"` → Auto-converted to `"1.018.003.002"`
- Input: `"1.018.003.002"` → Used as-is
- The service handles both formats automatically

---

## ⚡ Performance Characteristics

### **Current Performance (Excellent)**

```
Response Times:
- Cache Hit:   0.09-0.15s  (85% of requests)
- Cache Miss:  0.25-0.35s  (15% of requests)
- Average:     0.12s       (17x better than 2s target)

Cache Performance:
- Hit Rate:    85%+
- Cache Size:  100 items max
- TTL:         10 minutes
- Type:        In-memory (optimal for current scale)
```

### **Scaling Strategy**

**Current (0-10K users):**
- ✅ In-memory cache (perfect)
- ✅ Single Cloud Run instance
- ✅ 85%+ cache hit rate
- ✅ 0.09-0.35s response time

**Future (10K+ users):**
- 🔄 Switch to Redis Cloud (30 min setup)
- 🔄 Shared cache across instances
- 🔄 Maintain 85%+ hit rate
- 🔄 Maintain <0.5s response time

---

## 🛠️ Integration Examples

### **React/JavaScript Integration**

```javascript
const getTemplateRecommendation = async (songId, userContext) => {
  try {
    const response = await fetch('https://dev.algorhythm.media/api/v1/recommend/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ALGORHYTHM_API_KEY
      },
      body: JSON.stringify({
        song_id: songId,
        user_context: userContext,
        max_alternatives: 5
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        recommendation: data.data.recommendation,
        alternatives: data.data.alternatives,
        performance: data.performance_metrics
      };
    } else {
      throw new Error('Recommendation failed');
    }
  } catch (error) {
    console.error('AlgoRhythm API Error:', error);
    throw error;
  }
};

// Usage
const recommendation = await getTemplateRecommendation(
  "1.018.003.002",
  {
    user_id: "user_123",
    preferences: {
      genre: "pop",
      energy_level: "high",
      style: "modern"
    }
  }
);

console.log('Best template:', recommendation.recommendation.template_name);
console.log('Score:', recommendation.recommendation.compatibility_score);
console.log('Response time:', recommendation.performance.response_time_ms + 'ms');
```

### **Python Integration**

```python
import requests
import os

def get_template_recommendation(song_id, user_context):
    url = "https://dev.algorhythm.media/api/v1/recommend/template"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": os.getenv("ALGORHYTHM_API_KEY")
    }
    
    payload = {
        "song_id": song_id,
        "user_context": user_context,
        "max_alternatives": 5
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data["success"]:
            return {
                "recommendation": data["data"]["recommendation"],
                "alternatives": data["data"]["alternatives"],
                "performance": data["performance_metrics"]
            }
        else:
            raise Exception("Recommendation failed")
            
    except requests.exceptions.RequestException as e:
        print(f"AlgoRhythm API Error: {e}")
        raise

# Usage
recommendation = get_template_recommendation(
    "1.018.003.002",
    {
        "user_id": "user_123",
        "preferences": {
            "genre": "pop",
            "energy_level": "high",
            "style": "modern"
        }
    }
)

print(f"Best template: {recommendation['recommendation']['template_name']}")
print(f"Score: {recommendation['recommendation']['compatibility_score']}")
print(f"Response time: {recommendation['performance']['response_time_ms']}ms")
```

---

## 🔍 Monitoring & Debugging

### **Health Check Endpoint**

```bash
curl https://dev.algorhythm.media/api/health
```

**Monitor these metrics:**
- `cache.hitRate` - Should be >70%
- `cache.totalRequests` - Track usage
- `dependencies.nna_registry.status` - Should be "connected"
- `dependencies.redis.status` - Currently "disabled" (normal)

### **Debug Endpoints**

**Service Debug:**
```bash
curl https://dev.algorhythm.media/api/v1/recommend/debug/services
```

**Test Both Services:**
```bash
curl -X POST https://dev.algorhythm.media/api/v1/recommend/debug/test-both-services \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test"}}'
```

---

## 🚨 Error Handling

### **Common Error Responses**

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```
**Fix:** Check API key in headers

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Invalid song_id format",
  "error": "Bad Request"
}
```
**Fix:** Use proper HFN format: "1.018.003.002"

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "NNA Registry timeout",
  "error": "Internal Server Error"
}
```
**Fix:** Service will retry automatically, or use fallback templates

### **Fallback Behavior**

**If AlgoRhythm is unavailable:**
- Service returns mock templates
- Templates are still functional
- User experience is maintained
- No complete failure

---

## 📊 Performance Expectations

### **Response Time Targets**

```
Excellent:  <0.2s  (cache hit)
Good:       0.2-0.5s  (cache miss)
Acceptable: 0.5-1.0s  (NNA Registry call)
Poor:       >1.0s  (investigate)
```

### **Cache Hit Rate Targets**

```
Excellent:  >80%  (current performance)
Good:       60-80%
Poor:       <60%  (consider Redis upgrade)
```

### **Reliability Targets**

```
Uptime:     99.9%+
Success:    >95%
Timeout:    <2s (circuit breaker)
```

---

## 🔄 Migration & Updates

### **Current Architecture**

```
ReViz App → AlgoRhythm API → NNA Registry
                ↓
            In-Memory Cache (100 items, 10min TTL)
```

### **Future Architecture (When Scaling)**

```
ReViz App → AlgoRhythm API → NNA Registry
                ↓
            Redis Cloud (shared cache, persistent)
```

**Migration Trigger:**
- When cache hit rate drops below 50%
- When >2 Cloud Run instances running regularly
- When scale exceeds 10,000 users

**Migration Time:** 30 minutes (Redis Cloud setup)

---

## 📞 Support & Contact

### **Issues & Questions**

**AlgoRhythm Team:**
- GitHub: https://github.com/Celerity-Studios-Inc/algorhythm-service
- Issues: Create GitHub issue for bugs/features

**NNA Registry Team:**
- GitHub: https://github.com/Celerity-Studios-Inc/nna-registry-service
- Issues: Create GitHub issue for integration issues

### **Monitoring & Logs**

**Cloud Run Logs:**
```bash
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=algorhythm-service-dev" \
  --limit=50
```

**Performance Monitoring:**
- Check `/api/health` endpoint regularly
- Monitor cache hit rate
- Track response times
- Watch for error rates

---

## ✅ Integration Checklist

### **Before Going Live**

- [ ] Get API key from AlgoRhythm team
- [ ] Test with sample song IDs
- [ ] Implement error handling
- [ ] Set up monitoring/alerting
- [ ] Test fallback scenarios
- [ ] Verify response time requirements
- [ ] Document integration in your codebase

### **Ongoing Monitoring**

- [ ] Check health endpoint daily
- [ ] Monitor cache hit rate
- [ ] Track response times
- [ ] Watch for error rates
- [ ] Plan for Redis migration when needed

---

## 🎯 Key Takeaways

1. **Service is Production Ready** - 0.09-0.35s response times
2. **Use HFN Song IDs** - Format: "1.018.003.002"
3. **Include API Key** - Required for authentication
4. **Handle Errors Gracefully** - Service has fallbacks
5. **Monitor Performance** - Check health endpoint regularly
6. **Plan for Scaling** - Redis migration when needed

**The AlgoRhythm service is optimized and ready for ReViz integration!** 🚀

---

**Last Updated:** October 13, 2025  
**Next Review:** November 13, 2025 (after 1 month of production usage)
