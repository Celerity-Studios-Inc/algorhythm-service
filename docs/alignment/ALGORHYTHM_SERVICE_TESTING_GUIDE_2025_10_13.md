# AlgoRhythm Service Testing Guide - October 13, 2025

## 🎯 **SERVICE OVERVIEW**

**Service URL**: `https://dev.algorhythm.media`  
**Environment**: Development  
**Status**: ⚠️ **SERVICE PERFORMANCE ISSUES DETECTED**  
**Last Update**: October 13, 2025 - 23:59 UTC

**🚨 CRITICAL ROOT CAUSE IDENTIFIED**: NNA Registry using wrong database name (`nna-registry-development` instead of `nna-registry-service-dev`)
**⚠️ IMPACT**: Template endpoint timing out (5+ seconds) - Falls back to mock data
**✅ HEALTH ENDPOINT**: Working (0.22s response time)  

---

## 🚨 **CRITICAL DATABASE CONFIGURATION ISSUE**

### **Root Cause Identified:**
The NNA Registry service is using the **wrong database name**, causing AlgoRhythm to fall back to mock data instead of accessing real assets.

| Component | Current (Wrong) | Correct | Impact |
|-----------|----------------|---------|--------|
| **NNA Registry DB** | `nna-registry-development` | `nna-registry-service-dev` | ❌ **No assets found** |
| **AlgoRhythm Response** | Mock data fallback | Real asset data | ❌ **7-9 second timeouts** |

### **MongoDB Atlas Reference:**
- **Correct Database**: [nna-registry-service-dev/assets](https://cloud.mongodb.com/v2/67fcb7e19f5be765ab9fc6e0#/explorer/67fcbc2857ec1e2a86573fe3/nna-registry-service-dev/assets/find)
- **Contains**: Real asset data for testing
- **Status**: ✅ **Available and accessible**

### **Expected Performance After Fix:**
- **Response Time**: 0.18-2.14 seconds (with real assets)
- **Cache Hit Rate**: 100% (after first call)
- **Data Source**: Real NNA Registry assets
- **Status**: **Exceeding performance requirements**

---

## 🚀 **QUICK START TESTING**

### **1. Health Check (Should Work)**
```bash
curl -s https://dev.algorhythm.media/api/health
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

### **2. Template Endpoint Test (⚠️ CURRENTLY TIMING OUT)**
```bash
curl -X POST https://dev.algorhythm.media/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test_user"}}' \
  --max-time 5
```

**⚠️ CURRENT STATUS**: This endpoint is timing out (5+ seconds) - Performance optimization needed

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
curl -s https://dev.algorhythm.media/api/v1/debug/nna-test
```

### **Template Test (Fallback Data)**
```bash
curl -s https://dev.algorhythm.media/api/v1/debug/template-test
```

### **Environment Variables Check**
```bash
curl -s https://dev.algorhythm.media/api/v1/debug/environment
```

---

## 📊 **PERFORMANCE BENCHMARKS - ISSUES DETECTED**

### **⚠️ CURRENT PERFORMANCE (October 13, 2025):**
- **Template Endpoint**: **TIMING OUT** (5+ seconds) - **NEEDS OPTIMIZATION**
- **Health Endpoint**: **0.22 seconds** (target: <100ms) - **ACCEPTABLE**
- **Circuit Breaker**: **Not functioning properly** - **NEEDS FIX**
- **NNA Registry**: **Unknown** (endpoint timing out) - **NEEDS INVESTIGATION**

### **🚨 PERFORMANCE ISSUES:**
- **Template endpoint**: Timing out at 5+ seconds
- **Health endpoint**: Working but slower than expected
- **Service stability**: Needs performance optimization
- **Action required**: Performance optimization and timeout fixes needed

### **Performance Test Script:**
```bash
#!/bin/bash
echo "🧪 AlgoRhythm Service Performance Test"
echo "======================================"

# Health endpoint test
echo "1. Testing Health Endpoint..."
time curl -s https://dev.algorhythm.media/api/health > /dev/null

# Template endpoint test
echo "2. Testing Template Endpoint..."
time curl -X POST https://dev.algorhythm.media/api/v1/recommend/template \
  -H "Content-Type: application/json" \
  -d '{"song_id": "1.018.003.002", "user_context": {"user_id": "test_user"}}' \
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

### **⚠️ Template Endpoint - PERFORMANCE ISSUES:**
- Response time **TIMING OUT** (5+ seconds) - **NEEDS OPTIMIZATION**
- Returns no response due to timeout - **NOT WORKING**
- NNA Registry integration unknown - **NEEDS INVESTIGATION**
- Circuit breaker not functioning - **NEEDS FIX**

### **⚠️ Performance - ISSUES DETECTED:**
- Health endpoint working - **0.22s response time** (slower than expected)
- Template endpoint timing out - **5+ seconds** (needs optimization)
- Debug endpoints unknown - **NEEDS TESTING**
- NNA Registry status unknown - **NEEDS INVESTIGATION**

---

## 🚀 **NEXT STEPS**

1. **Test Health Endpoint**: Verify service is running
2. **Test Template Endpoint**: Verify performance and data quality
3. **Monitor Performance**: Check response times
4. **Validate Integration**: Confirm NNA Registry connectivity
5. **Report Results**: Document any issues or successes

**⚠️ SERVICE PERFORMANCE ISSUES DETECTED - OPTIMIZATION NEEDED** ⚠️

## 🎯 **REVIZ DEVELOPER NOTIFICATION**

**The AlgoRhythm service is experiencing performance issues that need immediate attention!**

### **📊 CURRENT STATUS:**
- **Template Endpoint**: TIMING OUT (5+ seconds) - **NEEDS OPTIMIZATION**
- **Health Endpoint**: 0.22 seconds - **ACCEPTABLE BUT SLOW**
- **NNA Registry**: Unknown (endpoint timing out) - **NEEDS INVESTIGATION**
- **Service Stability**: Performance issues detected - **NEEDS FIX**

### **🚨 CRITICAL ISSUES:**
- ❌ **Template endpoint timing out** - 5+ seconds (target: <2s)
- ❌ **Circuit breaker not functioning** - Timeouts not working properly
- ❌ **NNA Registry integration unknown** - Needs investigation
- ❌ **Performance optimization needed** - Service needs fixes

**The service needs immediate performance optimization before it can be used in production!** 🚨
