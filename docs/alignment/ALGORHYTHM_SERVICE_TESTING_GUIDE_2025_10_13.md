# AlgoRhythm Service Testing Guide - October 13, 2025

## 🎯 **SERVICE OVERVIEW**

**Service URL**: `https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app`  
**Environment**: Development  
**Status**: ✅ CRITICAL ROUTING FIX DEPLOYED  
**Last Update**: October 13, 2025 - 18:30 UTC  

---

## 🚀 **QUICK START TESTING**

### **1. Health Check (Should Work)**
```bash
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-13T18:30:00.000Z",
  "service": "algorhythm-service",
  "version": "1.0.0",
  "environment": "development",
  "port": 8080,
  "uptime": 123.456,
  "memory": {
    "rss": 105889792,
    "heapTotal": 44957696,
    "heapUsed": 41885824
  },
  "nodeVersion": "v20.19.5"
}
```

### **2. Template Endpoint Test (Should Now Work)**
```bash
curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test_user"}, "max_alternatives": 5}' \
  --max-time 5
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "_id": "composite-123",
        "nna_address": "9.000.000.001",
        "name": "Template Name",
        "gcpStorageUrl": "https://storage.googleapis.com/...",
        "thumbnailUrl": "https://storage.googleapis.com/...",
        "previewUrl": "https://storage.googleapis.com/...",
        "description": "Template description",
        "tags": ["pop", "dance", "modern"],
        "star_id": "2.009.002.018",
        "look_id": "3.003.001.001",
        "move_id": "4.022.002.003",
        "world_id": "5.015.001.001",
        "duration": 30,
        "fileSize": 15.2,
        "resolution": "1080p",
        "format": "mp4",
        "qualityScore": 0.9
      }
    ],
    "metadata": {
      "total_found": 1,
      "processing_time_ms": 1500,
      "source": "nna_registry",
      "cache_hit": false
    }
  },
  "timestamp": "2025-10-13T18:30:00.000Z"
}
```

---

## 🔍 **DEBUG ENDPOINTS**

### **NNA Registry Connectivity Test**
```bash
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/debug/nna-test
```

### **Template Test (Fallback Data)**
```bash
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/debug/template-test
```

### **Environment Variables Check**
```bash
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/debug/environment
```

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Target Performance:**
- **Template Endpoint**: <2 seconds (P95)
- **Health Endpoint**: <100ms
- **Circuit Breaker**: 2-second timeout
- **NNA Registry**: <3 seconds

### **Performance Test Script:**
```bash
#!/bin/bash
echo "🧪 AlgoRhythm Service Performance Test"
echo "======================================"

# Health endpoint test
echo "1. Testing Health Endpoint..."
time curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/health > /dev/null

# Template endpoint test
echo "2. Testing Template Endpoint..."
time curl -X POST https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -H "x-api-key: reviz-dev-30390-13220-4896-9516-9001" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test_user"}, "max_alternatives": 5}' \
  --max-time 5

echo "✅ Performance test completed"
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

#### **1. Health Endpoint 404**
```bash
# Check if service is running
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/health
```
**Solution**: Service may not be deployed yet. Wait 3-5 minutes for deployment.

#### **2. Template Endpoint Timeout**
```bash
# Check debug endpoints first
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/debug/template-test
```
**Solution**: NNA Registry may be slow. Circuit breaker should provide fallback.

#### **3. Authentication Errors**
```bash
# Verify API key is correct
curl -s https://algorhythm-service-dev-5jm4duk5oa-uc.a.run.app/api/v1/debug/environment
```
**Solution**: Ensure `x-api-key` header is included.

---

## 📋 **API REFERENCE**

### **Authentication**
All requests require the API key header:
```bash
-H "x-api-key: reviz-dev-30390-13220-4896-9516-9001"
```

### **Content Type**
All POST requests require:
```bash
-H "Content-Type: application/json"
```

### **Request Timeout**
Use `--max-time 5` for testing to avoid long waits.

---

## 🎯 **SUCCESS CRITERIA**

### **✅ Service Health:**
- Health endpoint returns 200 OK
- Service uptime > 0
- Memory usage reasonable
- Node.js version v20.19.5

### **✅ Template Endpoint:**
- Response time < 2 seconds
- Returns valid recommendations (not null)
- NNA Registry integration working
- Circuit breaker functioning

### **✅ Performance:**
- No timeouts on health endpoint
- Template endpoint responds within 2 seconds
- Debug endpoints working
- NNA Registry accessible

---

## 🚀 **NEXT STEPS**

1. **Test Health Endpoint**: Verify service is running
2. **Test Template Endpoint**: Verify performance and data quality
3. **Monitor Performance**: Check response times
4. **Validate Integration**: Confirm NNA Registry connectivity
5. **Report Results**: Document any issues or successes

**Ready for comprehensive testing!** 🎉
