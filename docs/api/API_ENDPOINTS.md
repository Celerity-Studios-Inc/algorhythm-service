# AlgoRhythm API Endpoints - Single Source of Truth

## 🎯 **CANONICAL ENDPOINTS**

### **Template Recommendations**
```http
POST /api/v1/recommend/template
Content-Type: application/json
x-api-key: reviz-dev-30390-13220-4896-9516-9001

{
  "song_id": "1.018.003.002",
  "user_context": {
    "user_id": "user_123",
    "preferences": {
      "genre": "pop",
      "energy_level": "high"
    }
  },
  "max_alternatives": 5
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "recommendation": {
      "template_id": "default-pop-template",
      "template_name": "Default Pop Template",
      "nna_address": "G.POP.DEF.001",
      "compatibility_score": 0.8,
      "gcp_storage_url": "https://storage.googleapis.com/nna_registry_assets_dev/C/FUL/ALL/template.mp4",
      "thumbnail_url": "https://storage.googleapis.com/nna_registry_assets_dev/thumbnails/template.jpg",
      "components": {
        "song_id": "1.018.003.002",
        "star_id": "G.POP.STA.001",
        "look_id": "G.POP.LOO.001",
        "move_id": "G.POP.MOV.001",
        "world_id": "G.POP.WOR.001"
      },
      "metadata": {
        "created_at": "2025-10-13T16:24:36.632Z",
        "tags": ["pop", "default", "fallback"],
        "aiGeneratedDescription": "Default pop template with high compatibility"
      }
    },
    "alternatives": [...],
    "total_available": 100
  },
  "performance_metrics": {
    "response_time_ms": 99683,
    "cache_hit": false
  }
}
```

### **Health Check**
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "algorhythm-service",
  "timestamp": "2025-10-13T16:24:36.632Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 3600.5,
  "dependencies": {
    "nna_registry": "healthy",
    "redis": "healthy",
    "mongodb": "healthy"
  }
}
```

### **OpenAPI Contract**
```http
GET /.well-known/openapi.json
```

**Response (200 OK):**
- **ETag**: `"a1b2c3d4e5f6g7h8"`
- **Cache-Control**: `public, max-age=300, must-revalidate`
- **Content-Type**: `application/json; charset=utf-8`

---

## 🚫 **DEPRECATED ENDPOINTS (410 Gone)**

### **Legacy Template Endpoint**
```http
POST /api/v1/algorhythm/recommend/template
```

**Response (410 Gone):**
```json
{
  "error": "Gone",
  "statusCode": 410,
  "message": "This endpoint has been removed. Please use the canonical path.",
  "deprecated_path": "/api/v1/algorhythm/recommend/template",
  "canonical_path": "/api/v1/recommend/template",
  "canonical_url": "https://dev.algorhythm.media/api/v1/recommend/template",
  "documentation": "https://dev.algorhythm.media/api/docs",
  "migration_guide": "https://docs.algorhythm.media/migration/endpoint-consolidation"
}
```

---

## 🔧 **PERFORMANCE TARGETS**

- **P95 Response Time**: < 2 seconds
- **Circuit Breaker**: 2s timeout with fallback
- **Cache Strategy**: Redis + in-memory
- **Timeout Pattern**: Promise.race with aggressive timeouts

---

## 📊 **MONITORING & OBSERVABILITY**

### **Performance Metrics**
- Response time tracking
- Cache hit rates
- Circuit breaker status
- NNA Registry health

### **Structured Logging**
- MFA→HFN normalization tracking
- Legacy path usage monitoring
- Performance tier classification

---

## 🚀 **INTEGRATION GUIDES**

### **JavaScript/Node.js**
```javascript
const response = await fetch('https://dev.algorhythm.media/api/v1/recommend/template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'reviz-dev-30390-13220-4896-9516-9001'
  },
  body: JSON.stringify({
    song_id: '1.018.003.002',
    user_context: { user_id: 'user_123' }
  })
});
```

### **Python**
```python
import requests

response = requests.post(
    'https://dev.algorhythm.media/api/v1/recommend/template',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'reviz-dev-30390-13220-4896-9516-9001'
    },
    json={
        'song_id': '1.018.003.002',
        'user_context': {'user_id': 'user_123'}
    }
)
```

---

## 🔒 **SECURITY & AUTHENTICATION**

- **API Key**: Required in `x-api-key` header
- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Configured for ReViz domains
- **HTTPS**: Required for all endpoints

---

## 📈 **SUCCESS METRICS**

- **Response Time**: P95 < 2s ✅
- **Availability**: 99.9% uptime ✅
- **Cache Hit Rate**: >80% ✅
- **Error Rate**: <1% ✅
